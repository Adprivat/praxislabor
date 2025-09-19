import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import { auth } from "@/auth";
import { minutesToHoursLabel } from "@/lib/domain";
import {
  determineRange,
  getManagementOverview,
  type EntryDetail,
  type UserSummary,
} from "@/server/queries/management";

const detailDateFormatter = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
});
const detailTimeFormatter = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
});

interface SearchParams {
  period?: string;
  from?: string;
  to?: string;
  userId?: string;
}

export default async function ManagementOverviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams> | SearchParams;
}) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
    redirect("/");
  }

  const params = await searchParams;
  const { period = "week", from, to, userId } = params ?? {};
  const { rangeStart, rangeEnd } = determineRange(period, from, to);

  const data = await getManagementOverview({
    rangeStart,
    rangeEnd,
    userId: userId && userId.length > 0 ? userId : undefined,
  });

  const baseSearchParams = new URLSearchParams();
  baseSearchParams.set("period", period ?? "week");
  if (from) {
    baseSearchParams.set("from", from);
  }
  if (to) {
    baseSearchParams.set("to", to);
  }

  const activeUser = userId ? data.perUser.find((entry) => entry.userId === userId) : undefined;
  const userEntries = userId ? data.entries.filter((entry) => entry.userId === userId) : [];
  const rangeLabel = `${new Date(data.rangeStart).toLocaleDateString("de-DE")} - ${new Date(data.rangeEnd).toLocaleDateString("de-DE")}`;

  const clearUserHref = (() => {
    if (!userId) {
      return `/management/overview${baseSearchParams.toString() ? `?${baseSearchParams.toString()}` : ""}`;
    }
    const paramsWithoutUser = new URLSearchParams(baseSearchParams);
    return `/management/overview${paramsWithoutUser.toString() ? `?${paramsWithoutUser.toString()}` : ""}`;
  })();

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 text-slate-200">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Auswertungen</h1>
        <p className="text-sm text-slate-400">Zeitraum {rangeLabel}</p>
        <Filters users={data.users} currentPeriod={period} currentUserId={userId} from={from} to={to} />
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Gesamtstunden"
          value={minutesToHoursLabel(data.totals.totalMinutes)}
          subline={`${minutesToHoursLabel(data.totals.billableMinutes)} verrechenbar`}
        />
        <SummaryCard
          title="Billable Anteil"
          value={`${Math.round((data.totals.billableMinutes / Math.max(data.totals.totalMinutes, 1)) * 100)}%`}
          subline={`${minutesToHoursLabel(data.totals.nonBillableMinutes)} intern`}
        />
        <SummaryCard
          title="aktive Mitarbeitende"
          value={`${data.perUser.length}`}
          subline="mit Buchungen im Zeitraum"
        />
      </section>

      <section className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
        <header className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Pro Mitarbeitende</h2>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Arbeitszeit</th>
                <th className="py-2 pr-4">Verrechenbar</th>
                <th className="py-2 pr-4">Erwartet</th>
                <th className="py-2 pr-4">Differenz</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {data.perUser.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-xs text-slate-500">
                    Keine Buchungen im gewaehlten Zeitraum
                  </td>
                </tr>
              ) : (
                data.perUser.map((user) => {
                  const diff = user.overtimeMinutes;
                  const diffLabel = minutesToHoursLabel(diff);
                  const paramsForUser = new URLSearchParams(baseSearchParams);
                  paramsForUser.set("userId", user.userId);
                  const detailHref = `/management/overview?${paramsForUser.toString()}`;
                  const isActive = userId === user.userId;

                  return (
                    <tr
                      key={user.userId}
                      className={`transition hover:bg-slate-900/40 ${isActive ? "bg-slate-900/60" : ""}`}
                    >
                      <td className="py-2 pr-4">
                        <div className="flex flex-col">
                          <Link
                            href={detailHref}
                            className="inline-flex items-center gap-1 font-medium text-white transition hover:text-emerald-300"
                          >
                            {user.name}
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                          <span className="text-xs text-slate-400">{user.email}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-4">{minutesToHoursLabel(user.totalMinutes)}</td>
                      <td className="py-2 pr-4">{minutesToHoursLabel(user.billableMinutes)}</td>
                      <td className="py-2 pr-4">{minutesToHoursLabel(user.expectedMinutes)}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            diff >= 0
                              ? "bg-emerald-500/10 text-emerald-300"
                              : "bg-rose-500/10 text-rose-300"
                          }`}
                        >
                          {diffLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {userId && activeUser ? (
        <UserDetailsSection
          user={activeUser}
          entries={userEntries}
          rangeLabel={rangeLabel}
          clearHref={clearUserHref}
        />
      ) : null}

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
          <h2 className="text-lg font-semibold text-white">Kategorie-Anteile</h2>
          <div className="grid gap-3">
            {data.perCategory.length === 0 ? (
              <p className="text-xs text-slate-500">Keine Daten vorhanden.</p>
            ) : null}
            {data.perCategory.map((category) => (
              <div
                key={category.categoryId}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-white">{category.name}</p>
                  <p className="text-xs text-slate-400">{minutesToHoursLabel(category.billableMinutes)} verrechenbar</p>
                </div>
                <div className="text-right text-sm text-slate-200">
                  <p>{minutesToHoursLabel(category.minutes)}</p>
                  <p className="text-xs text-slate-400">
                    {(category.minutes / Math.max(data.totals.totalMinutes, 1) * 100).toFixed(1)}% Anteil
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
          <h2 className="text-lg font-semibold text-white">Top-Bausteine</h2>
          <div className="space-y-3">
            {data.perBlock.map((block) => (
              <div key={block.blockId} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-white">{block.label}</p>
                  <p className="text-xs text-slate-400">{block.categoryName}</p>
                </div>
                <div className="text-right text-sm text-slate-200">
                  <p>{minutesToHoursLabel(block.minutes)}</p>
                  <p className="text-xs text-slate-400">
                    {minutesToHoursLabel(block.billableMinutes)} verrechenbar
                  </p>
                </div>
              </div>
            ))}
            {data.perBlock.length === 0 ? (
              <p className="text-xs text-slate-500">Keine Daten vorhanden.</p>
            ) : null}
          </div>
        </div>
      </section>
      </main>
    </div>
  );
}

function SummaryCard({ title, value, subline }: { title: string; value: string; subline?: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-5 text-slate-100">
      <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
      <p className="text-2xl font-semibold text-white">{value}</p>
      {subline ? <p className="mt-2 text-xs text-slate-400">{subline}</p> : null}
    </div>
  );
}

function UserDetailsSection({
  user,
  entries,
  rangeLabel,
  clearHref,
}: {
  user: UserSummary;
  entries: EntryDetail[];
  rangeLabel: string;
  clearHref: string;
}) {
  return (
    <section className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Details {user.name}</h2>
          <p className="text-xs uppercase tracking-wide text-slate-400">Zeitraum {rangeLabel}</p>
        </div>
        <Link
          href={clearHref}
          className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-emerald-400 hover:text-emerald-200"
        >
          Alle Mitarbeitenden anzeigen
        </Link>
      </header>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-400">Keine Einzelbuchungen im ausgewaehlten Zeitraum.</p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const start = new Date(entry.start);
            const end = entry.end ? new Date(entry.end) : null;
            const dateLabel = detailDateFormatter.format(start);
            const timeLabel = `${detailTimeFormatter.format(start)} - ${end ? detailTimeFormatter.format(end) : "laeuft"}`;

            return (
              <div
                key={entry.id}
                className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:grid-cols-[minmax(12rem,1fr)_minmax(14rem,1fr)_auto]"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{dateLabel}</p>
                  <p className="text-xs text-slate-400">{timeLabel}</p>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-white">{entry.blockLabel}</p>
                  <p className="text-xs text-slate-400">{entry.categoryName}</p>
                  <p
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      entry.isBillable
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-slate-500/15 text-slate-300"
                    }`}
                  >
                    {entry.isBillable ? "verrechenbar" : "intern"}
                  </p>
                  {entry.note ? (
                    <p className="text-xs text-slate-300">Notiz: {entry.note}</p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end justify-between text-right text-sm text-slate-200">
                  <p className="text-base font-semibold text-white">
                    {minutesToHoursLabel(entry.durationMinutes)}
                  </p>
                  <p className="text-xs text-slate-400">ID: {entry.id}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Filters({
  users,
  currentPeriod,
  currentUserId,
  from,
  to,
}: {
  users: Array<{ id: string; name: string; email: string }>;
  currentPeriod?: string;
  currentUserId?: string;
  from?: string;
  to?: string;
}) {
  const params = new URLSearchParams();
  if (currentPeriod) {
    params.set("period", currentPeriod);
  }
  if (from) {
    params.set("from", from);
  }
  if (to) {
    params.set("to", to);
  }
  if (currentUserId) {
    params.set("userId", currentUserId);
  }
  const exportHref = `/api/management/export?${params.toString()}`;

  return (
    <form
      method="get"
      className="flex flex-wrap items-end gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm"
    >
      <label className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wide text-slate-400">Zeitraum</span>
        <select
          name="period"
          defaultValue={currentPeriod ?? "week"}
          className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
        >
          <option value="week">Letzte 7 Tage</option>
          <option value="month">Letzte 30 Tage</option>
          <option value="year">Letzte 365 Tage</option>
          <option value="custom">Individuell</option>
        </select>
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wide text-slate-400">Von (custom)</span>
        <input
          type="date"
          name="from"
          defaultValue={from}
          className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wide text-slate-400">Bis (custom)</span>
        <input
          type="date"
          name="to"
          defaultValue={to}
          className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-wide text-slate-400">Mitarbeitende</span>
        <select
          name="userId"
          defaultValue={currentUserId ?? ""}
          className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
        >
          <option value="">Alle</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-400"
        >
          Anwenden
        </button>
        <a
          href={exportHref}
          className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-emerald-400 hover:text-emerald-200"
        >
          Export CSV
        </a>
      </div>
    </form>
  );
}
