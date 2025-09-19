import { BASE_ACTIVITY_BLOCKS, BASE_ACTIVITY_CATEGORIES, BASE_ACTIVITY_TAGS } from "@/data/catalog";
import {
  ActivityBlock,
  ActivityCategory,
  ActivityTag,
  EntrySource,
  TimeEntry,
  User,
  calculateDurationMinutes,
} from "./domain";

const activityTags: ActivityTag[] = BASE_ACTIVITY_TAGS.map((tag) => ({
  id: tag.id,
  name: tag.name,
  description: undefined,
  categoryId: tag.categoryId,
  sortOrder: tag.sortOrder,
  active: tag.active,
}));

const activityCategories: ActivityCategory[] = BASE_ACTIVITY_CATEGORIES.map((category) => ({
  id: category.id,
  name: category.name,
  description: category.description,
  color: category.color,
  sortOrder: category.sortOrder,
  active: category.active,
  tags: [],
}));

activityTags.forEach((tag) => {
  if (tag.categoryId) {
    const category = activityCategories.find((candidate) => candidate.id === tag.categoryId);
    if (category) {
      category.tags.push(tag);
    }
  }
});

const activityBlocks: ActivityBlock[] = BASE_ACTIVITY_BLOCKS.map((block) => ({
  id: block.id,
  label: block.label,
  categoryId: block.categoryId,
  tagId: block.tagId ?? null,
  description: block.description,
  isBillable: block.isBillable,
  active: block.active,
  sortOrder: block.sortOrder,
}));

function assignRelations() {
  const categoryMap = new Map(activityCategories.map((category) => [category.id, category]));
  const tagMap = new Map(activityTags.map((tag) => [tag.id, tag]));

  return activityBlocks.map((block) => ({
    ...block,
    category: categoryMap.get(block.categoryId),
    tag: block.tagId ? tagMap.get(block.tagId) ?? null : null,
  }));
}

const hydratedBlocks = assignRelations();

const now = new Date();
const DATE_LOCALE_OFFSET = now.getTimezoneOffset() * 60000;

function isoFor(dayOffset: number, startHour: number, durationMinutes: number): {
  start: string;
  end: string;
} {
  const startDate = new Date(now.getTime() - dayOffset * 86400000);
  startDate.setHours(startHour, 0, 0, 0);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

  return {
    start: new Date(startDate.getTime() - DATE_LOCALE_OFFSET).toISOString(),
    end: new Date(endDate.getTime() - DATE_LOCALE_OFFSET).toISOString(),
  };
}

const SAMPLE_USER: User = {
  id: "user-1",
  email: "p.muster@firma.de",
  name: "Patricia Muster",
  role: "EMPLOYEE",
  isActive: true,
  createdAt: new Date(now.getTime() - 90 * 86400000).toISOString(),
  updatedAt: now.toISOString(),
};

const sampleEntries: TimeEntry[] = [
  (() => {
    const { start, end } = isoFor(1, 8, 240);
    return {
      id: "entry-1",
      userId: SAMPLE_USER.id,
      blockId: 101,
      start,
      end,
      durationMinutes: calculateDurationMinutes(start, end),
      note: "Ticket #4512",
      source: "MANUAL" satisfies EntrySource,
      block: hydratedBlocks.find((block) => block.id === 101),
    };
  })(),
  (() => {
    const { start, end } = isoFor(1, 13, 120);
    return {
      id: "entry-2",
      userId: SAMPLE_USER.id,
      blockId: 201,
      start,
      end,
      durationMinutes: calculateDurationMinutes(start, end),
      source: "QUICK_SELECT" satisfies EntrySource,
      block: hydratedBlocks.find((block) => block.id === 201),
    };
  })(),
  (() => {
    const { start, end } = isoFor(2, 9, 180);
    return {
      id: "entry-3",
      userId: SAMPLE_USER.id,
      blockId: 102,
      start,
      end,
      durationMinutes: calculateDurationMinutes(start, end),
      note: "CR fuer API-Rolle",
      source: "MANUAL" satisfies EntrySource,
      block: hydratedBlocks.find((block) => block.id === 102),
    };
  })(),
  (() => {
    const { start, end } = isoFor(2, 13, 60);
    return {
      id: "entry-4",
      userId: SAMPLE_USER.id,
      blockId: 205,
      start,
      end,
      durationMinutes: calculateDurationMinutes(start, end),
      note: "Statuscall Kunde ACME",
      source: "MANUAL" satisfies EntrySource,
      block: hydratedBlocks.find((block) => block.id === 205),
    };
  })(),
  (() => {
    const { start, end } = isoFor(5, 8, 420);
    return {
      id: "entry-5",
      userId: SAMPLE_USER.id,
      blockId: 401,
      start,
      end,
      durationMinutes: calculateDurationMinutes(start, end),
      note: "Kurzurlaub",
      source: "ADMIN_ADJUSTMENT" satisfies EntrySource,
      block: hydratedBlocks.find((block) => block.id === 401),
    };
  })(),
];

export const SAMPLE_DATA = {
  user: SAMPLE_USER,
  categories: activityCategories,
  tags: activityTags,
  blocks: hydratedBlocks,
  entries: sampleEntries,
};

export type SampleData = typeof SAMPLE_DATA;
