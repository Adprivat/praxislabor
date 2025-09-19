"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth, signOut } from "@/auth";
import { prisma } from "@/server/prisma";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwoerter muessen uebereinstimmen.",
  });

function buildRedirectUrl(params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }
  const query = searchParams.toString();
  return `/profile${query ? `?${query}` : ""}`;
}

export async function changePassword(formData: FormData) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    redirect(
      buildRedirectUrl({
        error: "Bitte alle Felder korrekt ausfuellen.",
      }),
    );
  }

  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  if (!user || !user.passwordHash) {
    redirect(
      buildRedirectUrl({
        error: "Passwort-Aenderung nicht moeglich. Bitte Management kontaktieren.",
      }),
    );
  }

  const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isCurrentValid) {
    redirect(
      buildRedirectUrl({
        error: "Aktuelles Passwort ist falsch.",
      }),
    );
  }

  if (currentPassword === newPassword) {
    redirect(
      buildRedirectUrl({
        error: "Neues Passwort muss sich unterscheiden.",
      }),
    );
  }

  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
  } catch (error) {
    console.error("changePassword failed", error);
    redirect(
      buildRedirectUrl({
        error: "Unbekannter Fehler. Bitte spaeter erneut versuchen.",
      }),
    );
  }

  redirect(
    buildRedirectUrl({
      success: "Passwort aktualisiert.",
    }),
  );
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
