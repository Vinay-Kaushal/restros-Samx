import { PrismaClient } from "@prisma/client";

// Single shared instance across the app - avoids exhausting Postgres
// connections when Bun's watch mode hot-reloads this module.
export const prisma = new PrismaClient();
