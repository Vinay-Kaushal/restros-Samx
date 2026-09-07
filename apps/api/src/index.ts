import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { menuRouter } from "./routes/menu";
import { ordersRouter } from "./routes/orders";
import { paymentsRouter } from "./routes/payments";
import { triviaRouter } from "./routes/trivia";
import { statsRouter } from "./routes/stats";
import { attachWebSocketServer } from "./realtime/ws";
import { scheduleRecurringJobs } from "./jobs/queue";

const app = express();
app.use(helmet());
app.use(cors());
// Capture the raw request body so the Razorpay webhook can verify its
// signature against the exact bytes Razorpay signed - re-serializing the
// parsed JSON would produce a different byte string and fail verification.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf.toString();
    }
  })
);

// This is a public, unauthenticated endpoint by design - anyone who scans a
// QR code reaches it. That means it also needs to survive someone scanning
// it and then hammering it with a script instead of a browser. This limit
// is deliberately generous (a real customer placing several orders in a
// session shouldn't hit it) while still stopping obvious abuse.
const orderCreationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many orders from this device - please wait a few minutes." }
});
app.use("/api/r/:slug/orders", orderCreationLimiter);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api", menuRouter);
app.use("/api", ordersRouter);
app.use("/api", paymentsRouter);
app.use("/api", triviaRouter);
app.use("/api", statsRouter);

const server = createServer(app);
attachWebSocketServer(server);

const PORT = Number(process.env.PORT ?? 4000);
server.listen(PORT, () => {
  console.log(`API + WebSocket server listening on :${PORT}`);
});

scheduleRecurringJobs().catch((err) => console.error("Failed to schedule jobs", err));
