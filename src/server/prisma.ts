import { PrismaClient } from "@prisma/client";

import { env } from "@/env";

type PrismaClientSingleton = {
  client: PrismaClient | null;
};

const globalForPrisma = globalThis as typeof globalThis & PrismaClientSingleton;

export const prisma =
  globalForPrisma.client ??
  new PrismaClient({
    log:
      env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.client = prisma;
}
