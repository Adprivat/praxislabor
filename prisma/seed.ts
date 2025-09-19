import { Prisma, PrismaClient, TeamRole, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

import {
  BASE_ACTIVITY_BLOCKS,
  BASE_ACTIVITY_CATEGORIES,
  BASE_ACTIVITY_TAGS,
} from "@/data/catalog";

const prisma = new PrismaClient();

const SEED_USERS = [
  {
    id: "user-1",
    email: "p.muster@firma.de",
    name: "Patricia Muster",
    role: UserRole.EMPLOYEE,
    password: "test1234",
  },
  {
    id: "user-2",
    email: "m.lead@firma.de",
    name: "Maximilian Lead",
    role: UserRole.MANAGER,
    password: "test1234",
  },
  {
    id: "user-3",
    email: "a.admin@firma.de",
    name: "Alex Admin",
    role: UserRole.ADMIN,
    password: "admin123",
  },
] as const;

const SEED_TEAM = {
  id: "team-dev",
  name: "Produktteam",
};

const now = new Date();
const tzOffset = now.getTimezoneOffset() * 60000;
const THIRTY_DAYS_AGO = new Date(now.getTime() - 30 * 86400000);

function isoRange(dayOffset: number, startHour: number, durationMinutes: number) {
  const startLocal = new Date(now.getTime() - dayOffset * 86400000);
  startLocal.setHours(startHour, 0, 0, 0);
  const endLocal = new Date(startLocal.getTime() + durationMinutes * 60000);

  return {
    start: new Date(startLocal.getTime() - tzOffset).toISOString(),
    end: new Date(endLocal.getTime() - tzOffset).toISOString(),
    durationMinutes,
  };
}

const SEED_ENTRIES: Prisma.TimeEntryCreateManyInput[] = [
  (() => {
    const range = isoRange(1, 8, 240);
    return {
      id: "entry-1",
      userId: "user-1",
      blockId: 101,
      start: range.start,
      end: range.end,
      durationMinutes: range.durationMinutes,
      note: "Ticket #4512",
      source: "MANUAL",
    } satisfies Prisma.TimeEntryCreateManyInput;
  })(),
  (() => {
    const range = isoRange(1, 13, 120);
    return {
      id: "entry-2",
      userId: "user-1",
      blockId: 201,
      start: range.start,
      end: range.end,
      durationMinutes: range.durationMinutes,
      source: "QUICK_SELECT",
    } satisfies Prisma.TimeEntryCreateManyInput;
  })(),
  (() => {
    const range = isoRange(2, 9, 180);
    return {
      id: "entry-3",
      userId: "user-1",
      blockId: 102,
      start: range.start,
      end: range.end,
      durationMinutes: range.durationMinutes,
      note: "Code Review API",
      source: "MANUAL",
    } satisfies Prisma.TimeEntryCreateManyInput;
  })(),
  (() => {
    const range = isoRange(2, 13, 60);
    return {
      id: "entry-4",
      userId: "user-1",
      blockId: 205,
      start: range.start,
      end: range.end,
      durationMinutes: range.durationMinutes,
      note: "Kundenstatus ACME",
      source: "MANUAL",
    } satisfies Prisma.TimeEntryCreateManyInput;
  })(),
  (() => {
    const range = isoRange(5, 8, 420);
    return {
      id: "entry-5",
      userId: "user-1",
      blockId: 401,
      start: range.start,
      end: range.end,
      durationMinutes: range.durationMinutes,
      note: "Kurzurlaub",
      source: "ADMIN_ADJUSTMENT",
    } satisfies Prisma.TimeEntryCreateManyInput;
  })(),
];

async function main() {
  console.info("[seed] resetting database ...");
  await prisma.$transaction([
    prisma.timeEntryHistory.deleteMany(),
    prisma.timeEntryTag.deleteMany(),
    prisma.timeEntry.deleteMany(),
    prisma.favoriteBlock.deleteMany(),
    prisma.absence.deleteMany(),
    prisma.workSchedule.deleteMany(),
    prisma.teamMembership.deleteMany(),
    prisma.team.deleteMany(),
    prisma.user.deleteMany(),
    prisma.activityBlock.deleteMany(),
    prisma.activityTag.deleteMany(),
    prisma.activityCategory.deleteMany(),
  ]);

  console.info("[seed] creating activity catalog ...");
  await prisma.activityCategory.createMany({
    data: BASE_ACTIVITY_CATEGORIES.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      color: category.color,
      sortOrder: category.sortOrder,
      active: category.active,
    })),
  });

  await prisma.activityTag.createMany({
    data: BASE_ACTIVITY_TAGS.map((tag) => ({
      id: tag.id,
      name: tag.name,
      description: undefined,
      categoryId: tag.categoryId,
      sortOrder: tag.sortOrder,
      active: tag.active,
    })),
  });

  await prisma.activityBlock.createMany({
    data: BASE_ACTIVITY_BLOCKS.map((block) => ({
      id: block.id,
      label: block.label,
      categoryId: block.categoryId,
      tagId: block.tagId,
      description: block.description,
      isBillable: block.isBillable,
      active: block.active,
      sortOrder: block.sortOrder,
    })),
  });

  console.info("[seed] creating base users ...");
  for (const user of SEED_USERS) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: true,
        passwordHash: hashedPassword,
      },
      create: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: true,
        passwordHash: hashedPassword,
      },
    });
  }

  console.info("[seed] creating team and memberships ...");
  await prisma.team.upsert({
    where: { id: SEED_TEAM.id },
    update: { name: SEED_TEAM.name },
    create: {
      id: SEED_TEAM.id,
      name: SEED_TEAM.name,
    },
  });

  await prisma.teamMembership.createMany({
    data: [
      {
        id: "membership-1",
        teamId: SEED_TEAM.id,
        userId: "user-1",
        role: TeamRole.MEMBER,
      },
      {
        id: "membership-2",
        teamId: SEED_TEAM.id,
        userId: "user-2",
        role: TeamRole.LEAD,
      },
    ],
    skipDuplicates: true,
  });

  console.info("[seed] creating work schedules ...");
  await prisma.workSchedule.createMany({
    data: [
      {
        userId: "user-1",
        validFrom: THIRTY_DAYS_AGO,
        weeklyMinutes: 40 * 60,
        createdById: "user-3",
      },
      {
        userId: "user-2",
        validFrom: THIRTY_DAYS_AGO,
        weeklyMinutes: 40 * 60,
        createdById: "user-3",
      },
    ],
  });

  console.info("[seed] creating time entries ...");
  await prisma.timeEntry.createMany({
    data: SEED_ENTRIES,
    skipDuplicates: true,
  });

  console.info("[seed] creating favorites ...");
  const favorites = [
    {
      userId: "user-1",
      blockId: 101,
      lastUsedAt: SEED_ENTRIES[0]?.start ? new Date(SEED_ENTRIES[0].start) : undefined,
    },
    {
      userId: "user-1",
      blockId: 201,
      lastUsedAt: SEED_ENTRIES[1]?.start ? new Date(SEED_ENTRIES[1].start) : undefined,
    },
  ];

  await prisma.favoriteBlock.createMany({
    data: favorites.map(({ userId, blockId, lastUsedAt }) => ({
      userId,
      blockId,
      lastUsedAt,
    })),
    skipDuplicates: true,
  });

  console.info("[seed] done.");
}

main()
  .catch((error) => {
    console.error("[seed] failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
