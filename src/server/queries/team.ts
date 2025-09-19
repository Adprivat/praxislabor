import { prisma } from "@/server/prisma";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  lastActiveAt: string | null;
  createdAt: string;
  entryCount: number;
}

export interface TeamOverview {
  active: TeamMember[];
  inactive: TeamMember[];
}

export async function getTeamOverview(): Promise<TeamOverview> {
  const users = await prisma.user.findMany({
    where: {
      role: "EMPLOYEE",
    },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const userIds = users.map((user) => user.id);

  const entryGroups = userIds.length
    ? await prisma.timeEntry.groupBy({
        by: ["userId"],
        _count: { userId: true },
        where: {
          userId: { in: userIds },
          deletedAt: null,
        },
      })
    : [];

  const latestEntries = userIds.length
    ? await prisma.timeEntry.findMany({
        where: {
          userId: { in: userIds },
          deletedAt: null,
        },
        select: {
          userId: true,
          start: true,
        },
        orderBy: {
          start: "desc",
        },
      })
    : [];

  const entryCountMap = new Map<string, number>();
  for (const group of entryGroups) {
    entryCountMap.set(group.userId, group._count.userId);
  }

  const lastActiveMap = new Map<string, string>();
  for (const entry of latestEntries) {
    if (!lastActiveMap.has(entry.userId)) {
      lastActiveMap.set(entry.userId, entry.start.toISOString());
    }
  }

  const members: TeamMember[] = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    lastActiveAt: lastActiveMap.get(user.id) ?? null,
    entryCount: entryCountMap.get(user.id) ?? 0,
  }));

  return {
    active: members.filter((member) => member.isActive),
    inactive: members.filter((member) => !member.isActive),
  };
}
