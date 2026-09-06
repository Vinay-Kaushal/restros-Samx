import express from "express";
import cors from "cors";
import { createServer } from "http";
import { menuRouter } from "./routes/menu";
import { ordersRouter } from "./routes/orders";
import { paymentsRouter } from "./routes/payments";
import { triviaRouter } from "./routes/trivia";
import { statsRouter } from "./routes/stats";
import { attachWebSocketServer } from "./realtime/ws";
import { scheduleRecurringJobs } from "./jobs/queue";

const app = express();
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
