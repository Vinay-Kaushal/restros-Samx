import type { Request, Response, NextFunction } from "express";

// Simple shared-secret check for menu-mutation endpoints. The admin Next.js
// app holds this secret server-side only (its own .env, never shipped to
// the browser) and attaches it when proxying a request from its own
// authenticated dashboard session - see apps/admin/app/api/admin-menu/*.
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const secret = req.headers["x-admin-secret"];
  if (!process.env.ADMIN_API_SECRET || secret !== process.env.ADMIN_API_SECRET) {
    return res.status(403).json({ error: "Not authorized" });
  }
  next();
}
