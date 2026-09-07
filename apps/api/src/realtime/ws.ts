import type { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import type { RealtimeEvent } from "@repo/types";
import { redisSub, ordersChannel } from "../lib/redis";

// A "room" is one restaurant. This is deliberately coarse (not per-table) -
// the demand ticker and the admin feed both operate at the restaurant level.
// Section 11 of the plan (Waiting Lounge) reuses this exact same room concept
// keyed by restaurantId + mealSlotId, so this is the one real-time primitive
// the whole app is built on.
const rooms = new Map<string, Set<WebSocket>>();
const subscribedChannels = new Set<string>();

function joinRoom(restaurantId: string, socket: WebSocket) {
  if (!rooms.has(restaurantId)) rooms.set(restaurantId, new Set());
  rooms.get(restaurantId)!.add(socket);
  ensureSubscribed(restaurantId);
}

function leaveRoom(restaurantId: string, socket: WebSocket) {
  rooms.get(restaurantId)?.delete(socket);
}

function ensureSubscribed(restaurantId: string) {
  const channel = ordersChannel(restaurantId);
  if (subscribedChannels.has(channel)) return;
  subscribedChannels.add(channel);
  redisSub.subscribe(channel);
}

// Redis is what makes this work across multiple API instances: an order
// created on instance A publishes here, and instance B's ws clients (in the
// same restaurant room) still get the update, because both instances share
// this one subscription.
redisSub.on("message", (channel, message) => {
  const restaurantId = channel.split(":")[1];
  const room = rooms.get(restaurantId);
  if (!room) return;
  for (const socket of room) {
    if (socket.readyState === WebSocket.OPEN) socket.send(message);
  }
});

export function broadcastToRestaurant(restaurantId: string, event: RealtimeEvent) {
  // Publishing (rather than sending directly) is what lets this reach every
  // API instance's connected clients, not just the one that handled the request.
  redisPubPublish(restaurantId, event);
}

// Kept as a separate function so route handlers only need one import path.
import { redisPub } from "../lib/redis";
function redisPubPublish(restaurantId: string, event: RealtimeEvent) {
  redisPub.publish(ordersChannel(restaurantId), JSON.stringify(event));
}

export function attachWebSocketServer(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket, req) => {
    const url = new URL(req.url ?? "", "http://localhost");
    const restaurantId = url.searchParams.get("restaurantId");

    if (!restaurantId) {
      socket.close(1008, "restaurantId query param is required");
      return;
    }

    joinRoom(restaurantId, socket);

    // Inbound messages - currently just the waiting-lounge trivia score
    // broadcast. Re-publishing through Redis (not sending directly) keeps
    // this consistent across multiple API instances, same as every other
    // event in this file.
    socket.on("message", (raw) => {
      try {
        const message = JSON.parse(raw.toString());
        if (message.type === "lounge:score" && message.restaurantId === restaurantId) {
          redisPubPublish(restaurantId, message);
        }
      } catch {
        // Ignore malformed client messages rather than crashing the connection.
      }
    });

    socket.on("close", () => leaveRoom(restaurantId, socket));
  });

  return wss;
}
