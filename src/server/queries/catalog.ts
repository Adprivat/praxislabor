import type { ActivityBlock, ActivityCategory, ActivityTag } from "@/lib/domain";
import { prisma } from "@/server/prisma";

import { buildTagMap, mapBlocks, mapCategories } from "./dashboard";

export interface CatalogAdminData {
  categories: ActivityCategory[];
  blocks: ActivityBlock[];
  tags: ActivityTag[];
}

export async function getCatalogAdminData(): Promise<CatalogAdminData> {
  const [categoryRows, blockRows] = await Promise.all([
    prisma.activityCategory.findMany({
      include: {
        tags: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.activityBlock.findMany({
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
  ]);

  const categories = mapCategories(categoryRows);
  const tagMap = buildTagMap(categories);
  const blocks = mapBlocks(blockRows, categories, tagMap);
  const tags = Array.from(tagMap.values());

  return {
    categories,
    blocks,
    tags,
  };
}
