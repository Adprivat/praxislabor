import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { changePassword, logout } from "@/server/actions/account";

const ROLE_LABELS: Record<string, string> = {
  EMPLOYEE: "Mitarbeitende:r",
  MANAGER: "Management",
  ADMIN: "Administration",
};

type SearchParams = Promise<{
  success?: string | string[];
  error?: string | string[];
}>;

function resolveMessage(value?: string | string[]) {
  if (!value) {
    return undefined;
  }
  return Array.isArray(value) ? value[0] : value;
}

function formatRole(role?: string | null) {
  if (!role) {
    return "-";
  }
  return ROLE_LABELS[role] ?? role;
}

export const metadata: Metadata = {
  title: "Profil | Praxislabor Zeiterfassung",
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const params = await searchParams;
  const successMessage = resolveMessage(params?.success);
  const errorMessage = resolveMessage(params?.error);
  const user = session.user;

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-10 lg:px-8">
        <section className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/60 p-8 shadow-xl shadow-slate-950/30 backdrop-blur">
          <header className="space-y-2">
            <h1 className="text-3xl font-semibold text-white">Profil</h1>
            <p className="text-sm text-slate-300">
              Verwalte deine Zugangsdaten oder melde dich ab.
            </p>
          </header>
          <dl className="grid gap-4 text-sm text-slate-200 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Name</dt>
              <dd className="mt-1 text-base text-white">{user.name ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">E-Mail</dt>
              <dd className="mt-1 text-base text-white">{user.email ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Rolle</dt>
              <dd className="mt-1 text-base text-white">{formatRole((user as Record<string, unknown>).role as string | undefined)}</dd>
            </div>
          </dl>
        </section>

        <section className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/60 p-8 shadow-xl shadow-slate-950/30 backdrop-blur">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">Passwort aendern</h2>
            <p className="text-sm text-slate-300">
              Waehle ein neues Passwort mit mindestens 8 Zeichen.
            </p>
          </div>
          {successMessage ? (
            <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {successMessage}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {errorMessage}
            </p>
          ) : null}
          <form action={changePassword} className="grid gap-4 text-sm text-slate-200 sm:grid-cols-2">
            <label className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-xs uppercase tracking-wide text-slate-400">Aktuelles Passwort</span>
              <input
                type="password"
                name="currentPassword"
                required
                autoComplete="current-password"
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wide text-slate-400">Neues Passwort</span>
              <input
                type="password"
                name="newPassword"
                required
                minLength={8}
                autoComplete="new-password"
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wide text-slate-400">Neues Passwort bestaetigen</span>
              <input
                type="password"
                name="confirmPassword"
                required
                minLength={8}
                autoComplete="new-password"
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
              />
            </label>
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
              >
                Passwort speichern
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-8 shadow-xl shadow-slate-950/30 backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">Abmelden</h2>
              <p className="text-sm text-slate-300">
                Beende deine Sitzung und kehre zur Anmeldung zurueck.
              </p>
            </div>
            <form action={logout} className="flex justify-start sm:justify-end">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-500/40 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10"
              >
                Abmelden
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
