"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/server/prisma";

const baseSchema = z.object({
  blockId: z.coerce.number().int().positive(),
  date: z.string().min(1),
  start: z.string().min(1),
  end: z.string().min(1),
  note: z.string().optional(),
});

const createSchema = baseSchema;

const updateSchema = baseSchema.extend({
  entryId: z.string().min(1),
});

const deleteSchema = z.object({
  entryId: z.string().min(1),
});

function combineDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

function calculateDurationMinutes(start: Date, end: Date) {
  const diff = end.getTime() - start.getTime();
  return diff > 0 ? Math.round(diff / 60000) : 0;
}

export async function createTimeEntry(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Nicht angemeldet");
  }

  const blockOverride = formData.get("blockIdOverride");
  const parsed = createSchema.safeParse({
    blockId: blockOverride ?? formData.get("blockId"),
    date: formData.get("date"),
    start: formData.get("start"),
    end: formData.get("end"),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    throw new Error("Ungueltige Eingaben");
  }

  const { blockId, date, start, end, note } = parsed.data;
  const startDate = combineDateTime(date, start);
  const endDate = combineDateTime(date, end);

  const durationMinutes = calculateDurationMinutes(startDate, endDate);

  await prisma.timeEntry.create({
    data: {
      userId: session.user.id,
      blockId,
      start: startDate,
      end: endDate,
      durationMinutes,
      note: note?.trim() || undefined,
      source: "MANUAL",
    },
  });

  await prisma.favoriteBlock.upsert({
    where: { userId_blockId: { userId: session.user.id, blockId } },
    update: { lastUsedAt: new Date() },
    create: { userId: session.user.id, blockId, lastUsedAt: new Date() },
  });

  revalidatePath("/");
}

export async function updateTimeEntry(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Nicht angemeldet");
  }

  const parsed = updateSchema.safeParse({
    entryId: formData.get("entryId"),
    blockId: formData.get("blockId"),
    date: formData.get("date"),
    start: formData.get("start"),
    end: formData.get("end"),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    throw new Error("Ungueltige Eingaben");
  }

  const { entryId, blockId, date, start, end, note } = parsed.data;
  const startDate = combineDateTime(date, start);
  const endDate = combineDateTime(date, end);
  const durationMinutes = calculateDurationMinutes(startDate, endDate);

  await prisma.timeEntry.update({
    where: { id: entryId, userId: session.user.id },
    data: {
      blockId,
      start: startDate,
      end: endDate,
      durationMinutes,
      note: note?.trim() || undefined,
      editedById: session.user.id,
    },
  });

  await prisma.favoriteBlock.upsert({
    where: { userId_blockId: { userId: session.user.id, blockId } },
    update: { lastUsedAt: new Date() },
    create: { userId: session.user.id, blockId, lastUsedAt: new Date() },
  });

  revalidatePath("/");
}

export async function deleteTimeEntry(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Nicht angemeldet");
  }

  const parsed = deleteSchema.safeParse({
    entryId: formData.get("entryId"),
  });

  if (!parsed.success) {
    throw new Error("Ungueltige Eingaben");
  }

  const { entryId } = parsed.data;

  await prisma.timeEntry.update({
    where: { id: entryId, userId: session.user.id },
    data: {
      deletedAt: new Date(),
    },
  });

  revalidatePath("/");
}

