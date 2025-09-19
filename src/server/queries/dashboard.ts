import { startOfDay, subDays } from "date-fns";

import type {
  ActivityBlock,
  ActivityCategory,
  ActivityTag,
  EntrySource,
  FavoriteBlock,
  TimeEntry,
} from "@/lib/domain";
import { prisma } from "@/server/prisma";

const DASHBOARD_DAYS = 7;

type CategoryWithTags = Awaited<ReturnType<typeof prisma.activityCategory.findMany>>[number];
type BlockWithRelations = Awaited<ReturnType<typeof prisma.activityBlock.findMany>>[number];
type EntryWithRelations = Awaited<ReturnType<typeof prisma.timeEntry.findMany>>[number];
type FavoriteWithRelations = Awaited<ReturnType<typeof prisma.favoriteBlock.findMany>>[number];

export interface DashboardData {
  categories: ActivityCategory[];
  blocks: ActivityBlock[];
  entries: TimeEntry[];
  favorites: FavoriteBlock[];
  rangeStart: string;
  rangeEnd: string;
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const rangeEnd = new Date();
  const rangeStartDate = subDays(startOfDay(rangeEnd), DASHBOARD_DAYS - 1);

  const [categoryRows, blockRows, entryRows, favoriteRows] = await Promise.all([
    prisma.activityCategory.findMany({
      where: { active: true },
      include: {
        tags: {
          where: { active: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.activityBlock.findMany({
      where: { active: true },
      include: {
        category: {
          include: {
            tags: true,
          },
        },
        tag: true,
      },
      orderBy: [
        { category: { sortOrder: "asc" } },
        { sortOrder: "asc" },
      ],
    }),
    prisma.timeEntry.findMany({
      where: {
        userId,
        deletedAt: null,
        start: {
          gte: rangeStartDate,
        },
      },
      include: {
        block: {
          include: {
            category: {
              include: {
                tags: true,
              },
            },
            tag: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: { start: "desc" },
    }),
    prisma.favoriteBlock.findMany({
      where: { userId },
      include: {
        block: {
          include: {
            category: true,
            tag: true,
          },
        },
      },
      orderBy: { lastUsedAt: "desc" },
    }),
  ]);

  const categories = mapCategories(categoryRows);
  const tagMap = buildTagMap(categories);
  const blocks = mapBlocks(blockRows, categories, tagMap);
  const blockMap = new Map(blocks.map((block) => [block.id, block]));
  const entries = mapEntries(entryRows, blockMap, tagMap);
  const favorites = mapFavorites(favoriteRows, blockMap);

  return {
    categories,
    blocks,
    entries,
    favorites,
    rangeStart: rangeStartDate.toISOString(),
    rangeEnd: rangeEnd.toISOString(),
  };
}

export function mapCategories(rows: CategoryWithTags[]): ActivityCategory[] {
  return rows.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description ?? undefined,
    color: category.color ?? null,
    sortOrder: category.sortOrder,
    active: category.active,
    tags: category.tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      description: tag.description ?? undefined,
      categoryId: tag.categoryId ?? undefined,
      sortOrder: tag.sortOrder,
      active: tag.active,
    })),
  }));
}

export function buildTagMap(categories: ActivityCategory[]): Map<number, ActivityTag> {
  const map = new Map<number, ActivityTag>();
  for (const category of categories) {
    for (const tag of category.tags) {
      map.set(tag.id, tag);
    }
  }
  return map;
}

export function mapBlocks(
  rows: BlockWithRelations[],
  categories: ActivityCategory[],
  tagMap: Map<number, ActivityTag>,
): ActivityBlock[] {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  return rows.map((block) => ({
    id: block.id,
    label: block.label,
    categoryId: block.categoryId,
    tagId: block.tagId ?? null,
    description: block.description ?? undefined,
    isBillable: block.isBillable,
    active: block.active,
    sortOrder: block.sortOrder,
    category: categoryMap.get(block.categoryId),
    tag: block.tagId ? tagMap.get(block.tagId) ?? null : null,
  }));
}

export function mapEntries(
  rows: EntryWithRelations[],
  blockMap: Map<number, ActivityBlock>,
  tagMap: Map<number, ActivityTag>,
): TimeEntry[] {
  return rows.map((entry) => ({
    id: entry.id,
    userId: entry.userId,
    blockId: entry.blockId,
    start: entry.start.toISOString(),
    end: entry.end ? entry.end.toISOString() : null,
    durationMinutes: entry.durationMinutes ?? undefined,
    note: entry.note ?? undefined,
    source: entry.source as EntrySource,
    editedById: entry.editedById ?? undefined,
    tags: entry.tags?.map((tag) => ({
      id: tag.id,
      entryId: tag.entryId,
      tagId: tag.tagId,
      tag: tagMap.get(tag.tagId),
    })),
    history: undefined,
    deletedAt: entry.deletedAt ? entry.deletedAt.toISOString() : null,
    block: blockMap.get(entry.blockId),
  }));
}

export function mapFavorites(rows: FavoriteWithRelations[], blockMap: Map<number, ActivityBlock>): FavoriteBlock[] {
  return rows.map((favorite) => ({
    id: favorite.id,
    userId: favorite.userId,
    blockId: favorite.blockId,
    lastUsedAt: favorite.lastUsedAt ? favorite.lastUsedAt.toISOString() : null,
    block: blockMap.get(favorite.blockId),
  }));
}
