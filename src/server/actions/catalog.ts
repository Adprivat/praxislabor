"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/server/prisma";

function assertAdmin() {
  return auth().then((session) => {
    if (!session?.user || session.user.role !== "ADMIN") {
      throw new Error("Nicht autorisiert");
    }
    return session;
  });
}

const createCategorySchema = z.object({
  name: z.string().min(2),
  color: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

export async function createCategory(formData: FormData) {
  await assertAdmin();
  const parsed = createCategorySchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color") || undefined,
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    throw new Error("Ungueltige Eingaben");
  }

  const { name, color, description } = parsed.data;
  const sortOrderBase = await prisma.activityCategory.count();

  await prisma.activityCategory.create({
    data: {
      name,
      color: color && color.length > 0 ? color : null,
      description: description && description.length > 0 ? description : null,
      sortOrder: sortOrderBase + 1,
    },
  });

  revalidatePath("/admin/catalog");
  revalidatePath("/");
}

const toggleCategorySchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  active: z.union([z.literal("true"), z.literal("false")]).transform((value) => value === "true"),
});

export async function toggleCategory(formData: FormData) {
  await assertAdmin();
  const parsed = toggleCategorySchema.safeParse({
    categoryId: formData.get("categoryId"),
    active: formData.get("active"),
  });

  if (!parsed.success) {
    throw new Error("Ungueltige Eingaben");
  }

  const { categoryId, active } = parsed.data;

  await prisma.activityCategory.update({
    where: { id: categoryId },
    data: { active },
  });

  revalidatePath("/admin/catalog");
  revalidatePath("/");
}

const createTagSchema = z.object({
  name: z.string().min(2),
  categoryId: z.coerce.number().int().positive(),
  description: z.string().trim().optional(),
});

export async function createTag(formData: FormData) {
  await assertAdmin();
  const parsed = createTagSchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    throw new Error("Ungueltige Eingaben");
  }

  const { name, categoryId, description } = parsed.data;
  const sortOrderBase = await prisma.activityTag.count({ where: { categoryId } });

  await prisma.activityTag.create({
    data: {
      name,
      categoryId,
      description: description && description.length > 0 ? description : null,
      sortOrder: sortOrderBase + 1,
    },
  });

  revalidatePath("/admin/catalog");
  revalidatePath("/");
}

const toggleTagSchema = z.object({
  tagId: z.coerce.number().int().positive(),
  active: z.union([z.literal("true"), z.literal("false")]).transform((value) => value === "true"),
});

export async function toggleTag(formData: FormData) {
  await assertAdmin();
  const parsed = toggleTagSchema.safeParse({
    tagId: formData.get("tagId"),
    active: formData.get("active"),
  });

  if (!parsed.success) {
    throw new Error("Ungueltige Eingaben");
  }

  const { tagId, active } = parsed.data;

  await prisma.activityTag.update({
    where: { id: tagId },
    data: { active },
  });

  revalidatePath("/admin/catalog");
  revalidatePath("/");
}

const createBlockSchema = z.object({
  label: z.string().min(2),
  categoryId: z.coerce.number().int().positive(),
  tagId: z.union([z.coerce.number().int().positive(), z.literal("")]).optional(),
  description: z.string().trim().optional(),
  isBillable: z.string().optional(),
});

export async function createActivityBlock(formData: FormData) {
  await assertAdmin();
  const parsed = createBlockSchema.safeParse({
    label: formData.get("label"),
    categoryId: formData.get("categoryId"),
    tagId: formData.get("tagId") || undefined,
    description: formData.get("description") || undefined,
    isBillable: formData.get("isBillable") || undefined,
  });

  if (!parsed.success) {
    throw new Error("Ungueltige Eingaben");
  }

  const { label, categoryId, tagId, description, isBillable } = parsed.data;
  const sortOrderBase = await prisma.activityBlock.count({ where: { categoryId } });

  await prisma.activityBlock.create({
    data: {
      label,
      categoryId,
      tagId: tagId && `${tagId}`.length > 0 ? Number(tagId) : null,
      description: description && description.length > 0 ? description : null,
      isBillable: Boolean(isBillable),
      sortOrder: sortOrderBase + 1,
    },
  });

  revalidatePath("/admin/catalog");
  revalidatePath("/");
}

const toggleBlockSchema = z.object({
  blockId: z.coerce.number().int().positive(),
  active: z.union([z.literal("true"), z.literal("false")]).transform((value) => value === "true"),
});

export async function toggleActivityBlock(formData: FormData) {
  await assertAdmin();
  const parsed = toggleBlockSchema.safeParse({
    blockId: formData.get("blockId"),
    active: formData.get("active"),
  });

  if (!parsed.success) {
    throw new Error("Ungueltige Eingaben");
  }

  const { blockId, active } = parsed.data;

  await prisma.activityBlock.update({
    where: { id: blockId },
    data: { active },
  });

  revalidatePath("/admin/catalog");
  revalidatePath("/");
}
