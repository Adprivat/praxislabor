"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/server/prisma";

const DEFAULT_WEEKLY_MINUTES = 40 * 60;

const createEmployeeSchema = z
  .object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwoerter muessen uebereinstimmen.",
  });

const deleteEmployeeSchema = z.object({
  userId: z.string().min(1),
});

function assertManagerRole(role?: string | null) {
  if (role !== "MANAGER" && role !== "ADMIN") {
    throw new Error("Keine Berechtigung");
  }
}

function buildTeamRedirect(params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }
  const query = searchParams.toString();
  return `/management/team${query ? `?${query}` : ""}`;
}

export async function createEmployee(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  assertManagerRole(session.user.role);

  const parsed = createEmployeeSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    redirect(
      buildTeamRedirect({
        error: "Bitte alle Felder korrekt ausfuellen (Passwort mind. 8 Zeichen).",
      }),
    );
  }

  const { name, email, password } = parsed.data;

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: name.trim(),
          email: email.toLowerCase(),
          passwordHash,
          role: "EMPLOYEE",
          isActive: true,
        },
      });

      await tx.workSchedule.create({
        data: {
          userId: newUser.id,
          validFrom: startOfToday,
          weeklyMinutes: DEFAULT_WEEKLY_MINUTES,
          createdById: session.user.id,
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect(
        buildTeamRedirect({
          error: "E-Mail ist bereits vergeben.",
        }),
      );
    }

    console.error("createEmployee failed", error);
    redirect(
      buildTeamRedirect({
        error: "Mitarbeiter konnte nicht angelegt werden.",
      }),
    );
  }

  revalidatePath("/management/team");
  revalidatePath("/management/overview");
  redirect(
    buildTeamRedirect({
      success: "Mitarbeitende:r wurde angelegt.",
    }),
  );
}

export async function deactivateEmployee(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  assertManagerRole(session.user.role);

  const parsed = deleteEmployeeSchema.safeParse({
    userId: formData.get("userId"),
  });

  if (!parsed.success) {
    redirect(
      buildTeamRedirect({
        error: "Ungueltige Anfrage.",
      }),
    );
  }

  const { userId } = parsed.data;

  if (userId === session.user.id) {
    redirect(
      buildTeamRedirect({
        error: "Eigenes Profil kann nicht geloescht werden.",
      }),
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    redirect(
      buildTeamRedirect({
        error: "Mitarbeitende:r wurde nicht gefunden.",
      }),
    );
  }
  if (user.role !== "EMPLOYEE") {
    redirect(
      buildTeamRedirect({
        error: "Nur Mitarbeitende koennen geloescht werden.",
      }),
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: false,
      passwordHash: null,
    },
  });

  revalidatePath("/management/team");
  revalidatePath("/management/overview");
  redirect(
    buildTeamRedirect({
      success: "Mitarbeitende:r wurde deaktiviert.",
    }),
  );
}
