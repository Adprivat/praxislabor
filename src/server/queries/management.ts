import { endOfDay, startOfDay, subDays } from "date-fns";

import { calculateDurationMinutes } from "@/lib/domain";
import { prisma } from "@/server/prisma";

interface ManagementQueryOptions {
  userId?: string;
  rangeStart: Date;
  rangeEnd: Date;
}

export interface UserSummary {
  userId: string;
  name: string;
  email: string;
  totalMinutes: number;
  billableMinutes: number;
  expectedMinutes: number;
  overtimeMinutes: number;
}

export interface CategorySummary {
  categoryId: number;
  name: string;
  minutes: number;
  billableMinutes: number;
}

export interface BlockSummary {
  blockId: number;
  label: string;
  categoryName: string;
  minutes: number;
  billableMinutes: number;
}

export interface EntryDetail {
  id: string;
  userId: string;
  userName: string;
  blockId: number | null;
  blockLabel: string;
  categoryName: string;
  start: string;
  end: string | null;
  durationMinutes: number;
  note: string | null;
  isBillable: boolean;
}

export interface ManagementOverview {
  rangeStart: string;
  rangeEnd: string;
  totals: {
    totalMinutes: number;
    billableMinutes: number;
    nonBillableMinutes: number;
  };
  perUser: UserSummary[];
  perCategory: CategorySummary[];
  perBlock: BlockSummary[];
  entries: EntryDetail[];
  users: Array<{ id: string; name: string; email: string }>;
}

export async function getManagementOverview(
  options: ManagementQueryOptions,
): Promise<ManagementOverview> {
  const { rangeStart, rangeEnd, userId } = options;

  const entries = await prisma.timeEntry.findMany({
    where: {
      deletedAt: null,
      userId: userId || undefined,
      start: {
        gte: rangeStart,
        lte: rangeEnd,
      },
    },
    include: {
      user: true,
      block: {
        include: {
          category: true,
        },
      },
    },
    orderBy: {
      start: "desc",
    },
  });

  const userIds = Array.from(new Set(entries.map((entry) => entry.userId)));

  const schedules = await prisma.workSchedule.findMany({
    where: userIds.length > 0 ? { userId: { in: userIds } } : undefined,
    orderBy: {
      validFrom: "desc",
    },
  });

  const activeSchedules = new Map<string, typeof schedules[number]>();
  for (const schedule of schedules) {
    if (schedule.validFrom <= rangeEnd && !activeSchedules.has(schedule.userId)) {
      activeSchedules.set(schedule.userId, schedule);
    }
  }

  const totals = {
    totalMinutes: 0,
    billableMinutes: 0,
    nonBillableMinutes: 0,
  };

  const perUser = new Map<string, UserSummary>();
  const perCategory = new Map<number, CategorySummary>();
  const perBlock = new Map<number, BlockSummary>();
  const entryDetails: EntryDetail[] = [];

  for (const entry of entries) {
    const startIso = entry.start.toISOString();
    const endIso = entry.end ? entry.end.toISOString() : null;
    const duration = entry.durationMinutes ?? calculateDurationMinutes(startIso, endIso ?? undefined);
    const block = entry.block;
    const category = block?.category;
    const isBillable = Boolean(block?.isBillable);

    entryDetails.push({
      id: entry.id,
      userId: entry.userId,
      userName: entry.user.name,
      blockId: block?.id ?? null,
      blockLabel: block?.label ?? "Unbekannt",
      categoryName: category?.name ?? "Nicht zugewiesen",
      start: startIso,
      end: endIso,
      durationMinutes: duration,
      note: entry.note ?? null,
      isBillable,
    });

    totals.totalMinutes += duration;
    if (isBillable) {
      totals.billableMinutes += duration;
    }

    const userSummary = perUser.get(entry.userId) ?? {
      userId: entry.userId,
      name: entry.user.name,
      email: entry.user.email,
      totalMinutes: 0,
      billableMinutes: 0,
      expectedMinutes: 0,
      overtimeMinutes: 0,
    };
    userSummary.totalMinutes += duration;
    if (isBillable) {
      userSummary.billableMinutes += duration;
    }
    perUser.set(entry.userId, userSummary);

    if (category) {
      const categorySummary = perCategory.get(category.id) ?? {
        categoryId: category.id,
        name: category.name,
        minutes: 0,
        billableMinutes: 0,
      };
      categorySummary.minutes += duration;
      if (isBillable) {
        categorySummary.billableMinutes += duration;
      }
      perCategory.set(category.id, categorySummary);
    }

    if (block) {
      const blockSummary = perBlock.get(block.id) ?? {
        blockId: block.id,
        label: block.label,
        categoryName: category?.name ?? "-",
        minutes: 0,
        billableMinutes: 0,
      };
      blockSummary.minutes += duration;
      if (isBillable) {
        blockSummary.billableMinutes += duration;
      }
      perBlock.set(block.id, blockSummary);
    }
  }

  totals.nonBillableMinutes = totals.totalMinutes - totals.billableMinutes;

  const workdays = countWorkdays(rangeStart, rangeEnd);

  for (const summary of perUser.values()) {
    const schedule = activeSchedules.get(summary.userId);
    if (!schedule) {
      summary.expectedMinutes = 0;
      summary.overtimeMinutes = summary.totalMinutes;
      continue;
    }

    const dailyTarget = schedule.weeklyMinutes / 5;
    summary.expectedMinutes = Math.round(workdays * dailyTarget);
    summary.overtimeMinutes = summary.totalMinutes - summary.expectedMinutes;
  }

  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });

  const perUserArray = Array.from(perUser.values()).sort((a, b) => b.totalMinutes - a.totalMinutes);
  const perCategoryArray = Array.from(perCategory.values()).sort((a, b) => b.minutes - a.minutes);
  const perBlockArray = Array.from(perBlock.values())
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 15);

  return {
    rangeStart: rangeStart.toISOString(),
    rangeEnd: rangeEnd.toISOString(),
    totals,
    perUser: perUserArray,
    perCategory: perCategoryArray,
    perBlock: perBlockArray,
    entries: entryDetails,
    users,
  };
}

export function determineRange(period: string | undefined, from?: string, to?: string) {
  const now = new Date();
  let upperBound = to ? endOfDay(new Date(to)) : endOfDay(now);
  let lowerBound: Date;

  if (period === "month") {
    lowerBound = startOfDay(subDays(upperBound, 29));
  } else if (period === "year") {
    lowerBound = startOfDay(subDays(upperBound, 364));
  } else if (period === "custom" && from) {
    lowerBound = startOfDay(new Date(from));
  } else {
    lowerBound = startOfDay(subDays(upperBound, 6));
  }

  if (lowerBound > upperBound) {
    const tmpLower = lowerBound;
    lowerBound = startOfDay(upperBound);
    upperBound = endOfDay(tmpLower);
  }

  return { rangeStart: lowerBound, rangeEnd: upperBound };
}

function countWorkdays(rangeStart: Date, rangeEnd: Date) {
  const start = startOfDay(rangeStart);
  const end = startOfDay(rangeEnd);
  let count = 0;
  const cursor = new Date(start);

  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return count;
}
