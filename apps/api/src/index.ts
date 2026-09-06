import express from "express";
import cors from "cors";
import { createServer } from "http";
import { menuRouter } from "./routes/menu";
import { ordersRouter } from "./routes/orders";
import { attachWebSocketServer } from "./realtime/ws";
import { scheduleRecurringJobs } from "./jobs/queue";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api", menuRouter);
app.use("/api", ordersRouter);

const server = createServer(app);
attachWebSocketServer(server);

const PORT = Number(process.env.PORT ?? 4000);
server.listen(PORT, () => {
  console.log(`API + WebSocket server listening on :${PORT}`);
});

scheduleRecurringJobs().catch((err) => console.error("Failed to schedule jobs", err));
