import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { createEmployee, deactivateEmployee } from "@/server/actions/users";
import { getTeamOverview } from "@/server/queries/team";

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
});
const timeFormatter = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
});

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

function formatLastActive(value: string | null) {
  if (!value) {
    return "Keine Aktivitaeten";
  }
  const date = new Date(value);
  return `${dateFormatter.format(date)} um ${timeFormatter.format(date)}`;
}

export const metadata: Metadata = {
  title: "Teamverwaltung | Praxislabor Zeiterfassung",
};

export default async function TeamManagementPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();

  if (!session?.user || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
    redirect("/");
  }

  const params = await searchParams;
  const messages = {
    success: resolveMessage(params?.success),
    error: resolveMessage(params?.error),
  };

  const overview = await getTeamOverview();

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-10 text-slate-200">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Teamverwaltung</h1>
        <p className="text-sm text-slate-400">
          Lege neue Mitarbeitende an oder deaktiviere bestehende Accounts. Passwoerter koennen spaeter im Profil geaendert werden.
        </p>
      </header>

      <section className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-white">Neue Mitarbeitende anlegen</h2>
          <p className="text-sm text-slate-400">
            Vergib ein initiales Passwort (mindestens 8 Zeichen). Teile die Zugangsdaten sicher mit der Person.
          </p>
        </div>
        {messages.success ? (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {messages.success}
          </p>
        ) : null}
        {messages.error ? (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {messages.error}
          </p>
        ) : null}
        <form action={createEmployee} className="grid gap-4 text-sm text-slate-200 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">Name</span>
            <input
              type="text"
              name="name"
              required
              minLength={2}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">E-Mail</span>
            <input
              type="email"
              name="email"
              required
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">Passwort</span>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-slate-400">Passwort bestaetigen</span>
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
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
            >
              Mitarbeitende anlegen
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Aktive Accounts</h2>
            <p className="text-xs uppercase tracking-wide text-slate-400">{overview.active.length} aktive Personen</p>
          </div>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">E-Mail</th>
                <th className="py-2 pr-4">Letzte Aktivitaet</th>
                <th className="py-2 pr-4">Buchungen</th>
                <th className="py-2 pr-4 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {overview.active.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-xs text-slate-500">
                    Keine aktiven Mitarbeitenden.
                  </td>
                </tr>
              ) : (
                overview.active.map((member) => (
                  <tr key={member.id} className="transition hover:bg-slate-900/40">
                    <td className="py-2 pr-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-white">{member.name}</span>
                        <span className="text-xs text-slate-400">Seit {dateFormatter.format(new Date(member.createdAt))}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-4">{member.email}</td>
                    <td className="py-2 pr-4">{formatLastActive(member.lastActiveAt)}</td>
                    <td className="py-2 pr-4">{member.entryCount}</td>
                    <td className="py-2 pl-4">
                      <form action={deactivateEmployee} className="flex justify-end">
                        <input type="hidden" name="userId" value={member.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 px-4 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/10"
                        >
                          Account deaktivieren
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/40 p-6 shadow-inner shadow-slate-950/30">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Inaktive Accounts</h2>
            <p className="text-xs uppercase tracking-wide text-slate-400">{overview.inactive.length} deaktiviert</p>
          </div>
        </header>
        {overview.inactive.length === 0 ? (
          <p className="text-xs text-slate-500">Derzeit sind keine Accounts deaktiviert.</p>
        ) : (
          <ul className="space-y-3 text-sm text-slate-200">
            {overview.inactive.map((member) => (
              <li
                key={member.id}
                className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-white">{member.name}</p>
                  <p className="text-xs text-slate-400">{member.email}</p>
                </div>
                <div className="text-xs text-slate-400 sm:text-right">
                  <p>Zuletzt aktiv: {formatLastActive(member.lastActiveAt)}</p>
                  <p>Buchungen {member.entryCount}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      </main>
    </div>
  );
}
