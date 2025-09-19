import type { ReactNode } from "react";
import { auth } from "@/auth";
import { getDashboardData } from "@/server/queries/dashboard";
import { createTimeEntry, deleteTimeEntry, updateTimeEntry } from "@/server/actions/time-entries";
import { redirect } from "next/navigation";
import {
  ActivityBlock,
  ActivityCategory,
  GroupingPeriod,
  TimeEntry,
  calculateDurationMinutes,
  groupKeyFor,
  minutesToHoursLabel,
} from "@/lib/domain";
import { CalendarDays, Clock, History } from "lucide-react";

type EnrichedEntry = TimeEntry & {
  computedDuration: number;
  blockLabel: string;
  categoryName: string;
  categoryColor?: string | null;
  isBillable: boolean;
};

const TIME_ZONE = "Europe/Berlin";
const dayFormatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  timeZone: TIME_ZONE,
});
const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "full",
  timeZone: TIME_ZONE,
});
const timeFormatter = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

function enrichEntries(
  entries: TimeEntry[],
  blocks: ActivityBlock[],
  categories: ActivityCategory[],
): EnrichedEntry[] {
  const blockMap = new Map<number, ActivityBlock>(blocks.map((block) => [block.id, block]));
  const categoryMap = new Map<number, ActivityCategory>(
    categories.map((category) => [category.id, category]),
  );

  return entries
    .map((entry) => {
      const block = entry.block ?? blockMap.get(entry.blockId) ?? null;
      const category = block
        ? block.category ?? categoryMap.get(block.categoryId) ?? null
        : null;
      const computedDuration =
        entry.durationMinutes ?? calculateDurationMinutes(entry.start, entry.end ?? undefined);

      return {
        ...entry,
        block: block ?? undefined,
        computedDuration,
        blockLabel: block?.label ?? "Baustein unbekannt",
        categoryName: category?.name ?? "Nicht zugewiesen",
        categoryColor: category?.color ?? null,
        isBillable: Boolean(block?.isBillable),
      } satisfies EnrichedEntry;
    })
    .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
}

function groupEntriesBy(entries: EnrichedEntry[], period: GroupingPeriod) {
  const grouped = new Map<string, { minutes: number; entries: EnrichedEntry[] }>();

  for (const entry of entries) {
    const key = groupKeyFor(entry.start, period);
    const current = grouped.get(key) ?? { minutes: 0, entries: [] };
    current.minutes += entry.computedDuration;
    current.entries.push(entry);
    grouped.set(key, current);
  }

  return Array.from(grouped.entries()).map(([groupKey, value]) => ({
    groupKey,
    minutes: value.minutes,
    entries: value.entries.sort(
      (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime(),
    ),
  }));
}

function formatEntryRange(entry: EnrichedEntry) {
  const start = new Date(entry.start);
  const end = entry.end ? new Date(entry.end) : null;
  const startLabel = timeFormatter.format(start);
  const endLabel = end ? timeFormatter.format(end) : "laeuft";
  return `${startLabel} - ${endLabel}`;
}

function toReadableDay(key: string, entries: EnrichedEntry[]) {
  const first = entries.at(0);
  if (!first) {
    return key;
  }
  return dayFormatter.format(new Date(first.start));
}

function computeTotals(entries: EnrichedEntry[]) {
  return entries.reduce(
    (acc, entry) => {
      acc.totalMinutes += entry.computedDuration;
      if (entry.isBillable) {
        acc.billableMinutes += entry.computedDuration;
      } else {
        acc.nonBillableMinutes += entry.computedDuration;
      }
      acc.distinctDays.add(entry.start.slice(0, 10));
      return acc;
    },
    {
      totalMinutes: 0,
      billableMinutes: 0,
      nonBillableMinutes: 0,
      distinctDays: new Set<string>(),
    },
  );
}

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { categories, blocks, entries, favorites } = await getDashboardData(session.user.id);
  const userName = session.user.name;
  const enrichedEntries = enrichEntries(entries, blocks, categories);
  const totals = computeTotals(enrichedEntries);
  const groupedByDay = groupEntriesBy(enrichedEntries, "day").sort((a, b) =>
    a.groupKey < b.groupKey ? 1 : -1,
  );
  const todayLabel = dateFormatter.format(new Date());
  const favoriteBlocks = favorites
    .map((favorite) => favorite.block)
    .filter((block): block is ActivityBlock => Boolean(block));
  const quickSelectBlocks = (favoriteBlocks.length > 0 ? favoriteBlocks : blocks.filter((block) => block.active)).slice(0, 6);

  const categoryTotals = categories.map((category) => {
    const minutes = enrichedEntries
      .filter((entry) => entry.block?.categoryId === category.id)
      .reduce((sum, entry) => sum + entry.computedDuration, 0);

    return {
      id: category.id,
      label: category.name,
      minutes,
      color: category.color,
    };
  });

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-10 lg:px-8">
        <header className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-slate-900/60 p-8 shadow-xl shadow-slate-950/30 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm text-slate-300">{todayLabel}</p>
              <h1 className="text-3xl font-semibold text-white">
                Arbeitszeiten von {userName}
              </h1>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard
              title="Gesamt (7 Tage)"
              icon={<Clock className="h-5 w-5" />}
              value={minutesToHoursLabel(totals.totalMinutes)}
              subline={`${totals.distinctDays.size} Arbeitstage`}
            />
            <SummaryCard
              title="Billable"
              icon={<CalendarDays className="h-5 w-5" />}
              value={minutesToHoursLabel(totals.billableMinutes)}
              subline={`${Math.round((totals.billableMinutes / Math.max(totals.totalMinutes, 1)) * 100)}% Anteil`}
            />
            <SummaryCard
              title="Nicht verrechenbar"
              icon={<History className="h-5 w-5" />}
              value={minutesToHoursLabel(totals.nonBillableMinutes)}
              subline={`${Math.round((totals.nonBillableMinutes / Math.max(totals.totalMinutes, 1)) * 100)}% Anteil`}
            />
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Schnellerfassung</h2>
            </div>
            <form action={createTimeEntry} method="post" className="mt-4 grid gap-4 text-sm text-slate-200 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wide text-slate-400">Baustein</span>
                <select name="blockId" required className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40">
                  {blocks.map((block) => (
                    <option key={block.id} value={block.id}>
                      {block.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wide text-slate-400">Datum</span>
                <input
                  type="date" name="date" required
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wide text-slate-400">Start</span>
                <input
                  type="time" name="start" required
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
                  defaultValue="08:00"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wide text-slate-400">Ende</span>
                <input
                  type="time" name="end" required
                  className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
                  defaultValue="12:00"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-2 block text-xs uppercase tracking-wide text-slate-400">Notiz</span>
                <textarea name="note"
                  rows={3}
                  placeholder="Ticket, Kund:innen oder Kontext ..."
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
                />
              </label>
              <div className="sm:col-span-2 flex flex-wrap gap-3 justify-between">
                <div className="flex flex-wrap gap-2">
                  {quickSelectBlocks.map((block) => (
                    <button
                      key={block.id}
                      type="submit"
                      name="blockIdOverride"
                      value={block.id}
                      className="rounded-full border border-white/10 bg-slate-900/80 px-3 py-1 text-xs text-slate-200 transition hover:border-emerald-400 hover:text-emerald-200"
                    >
                      {block.label}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
          <aside className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
            <h2 className="text-lg font-semibold text-white">Favoriten & letzte Buchungen</h2>
            <div className="mt-4 space-y-4 text-sm text-slate-200">
              {enrichedEntries.slice(0, 4).map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-white/5 bg-slate-950/60 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-white">{entry.blockLabel}</span>
                    <span className="text-xs text-slate-400">{formatEntryRange(entry)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                    <span>{entry.categoryName}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-600" />
                    <span>{minutesToHoursLabel(entry.computedDuration)}</span>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Letzte Buchungen</h2>
              <p className="text-sm text-slate-400">
                {enrichedEntries.length} Eintraege der letzten Woche
              </p>
            </div>
          </div>
          <div className="mt-6 space-y-6">
            {groupedByDay.map((group) => (
              <div key={group.groupKey} className="space-y-4">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span className="font-medium text-white">
                    {toReadableDay(group.groupKey, group.entries)}
                  </span>
                  <span>{minutesToHoursLabel(group.minutes)}</span>
                </div>
                <div className="space-y-4">
                  {group.entries.map((entry) => {
                    const startDate = entry.start.slice(0, 10);
                    const startTime = entry.start.slice(11, 16);
                    const endTime = entry.end ? entry.end.slice(11, 16) : startTime;

                    return (
                      <div
                        key={entry.id}
                        className="space-y-3 rounded-2xl border border-white/5 bg-slate-950/60 p-4 text-sm text-slate-200"
                      >
                        <div className="grid gap-3 sm:grid-cols-[160px_1fr_auto]">
                          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                            <Clock className="h-4 w-4 text-emerald-300" />
                            {formatEntryRange(entry)}
                          </div>
                          <div>
                            <p className="font-medium text-white">{entry.blockLabel}</p>
                            <p className="text-xs text-slate-400">
                              {entry.categoryName}
                              {entry.note ? ` - ${entry.note}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center justify-end gap-3 text-xs text-slate-400">
                            <span
                              className="inline-flex items-center rounded-full px-2 py-1"
                              style={{
                                backgroundColor: `${entry.isBillable ? "rgba(16, 185, 129, 0.12)" : "rgba(148, 163, 184, 0.12)"}` ,
                                color: entry.isBillable ? "#34d399" : "#94a3b8",
                              }}
                            >
                              {entry.isBillable ? "billable" : "internal"}
                            </span>
                            <span className="font-semibold text-white">
                              {minutesToHoursLabel(entry.computedDuration)}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                          <details className="rounded-xl border border-white/5 bg-slate-900/60 p-3 text-xs text-slate-300 sm:flex-1">
                            <summary className="cursor-pointer text-slate-200 outline-none transition hover:text-emerald-300">
                              Bearbeiten
                            </summary>
                            <form action={updateTimeEntry} className="mt-3 grid gap-3 text-xs text-slate-200 sm:grid-cols-2">
                              <input type="hidden" name="entryId" value={entry.id} />
                              <label className="flex flex-col gap-2">
                                <span className="text-[0.65rem] uppercase tracking-wide text-slate-400">Baustein</span>
                                <select
                                  name="blockId"
                                  defaultValue={entry.blockId}
                                  className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
                                >
                                  {blocks.map((block) => (
                                    <option key={block.id} value={block.id}>
                                      {block.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="flex flex-col gap-2">
                                <span className="text-[0.65rem] uppercase tracking-wide text-slate-400">Datum</span>
                                <input
                                  type="date"
                                  name="date"
                                  defaultValue={startDate}
                                  required
                                  className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
                                />
                              </label>
                              <label className="flex flex-col gap-2">
                                <span className="text-[0.65rem] uppercase tracking-wide text-slate-400">Start</span>
                                <input
                                  type="time"
                                  name="start"
                                  defaultValue={startTime}
                                  required
                                  className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
                                />
                              </label>
                              <label className="flex flex-col gap-2">
                                <span className="text-[0.65rem] uppercase tracking-wide text-slate-400">Ende</span>
                                <input
                                  type="time"
                                  name="end"
                                  defaultValue={endTime}
                                  required
                                  className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
                                />
                              </label>
                              <label className="sm:col-span-2 flex flex-col gap-2">
                                <span className="text-[0.65rem] uppercase tracking-wide text-slate-400">Notiz</span>
                                <textarea
                                  name="note"
                                  rows={2}
                                  defaultValue={entry.note ?? ""}
                                  className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40"
                                />
                              </label>
                              <div className="sm:col-span-2 flex justify-end">
                                <button
                                  type="submit"
                                  className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-400"
                                >
                                  Speichern
                                </button>
                              </div>
                            </form>
                          </details>
                          <form action={deleteTimeEntry} method="post" className="flex justify-end">
                            <input type="hidden" name="entryId" value={entry.id} />
                            <button
                              type="submit"
                              className="rounded-full border border-rose-500/40 px-3 py-1 text-xs text-rose-200 transition hover:bg-rose-500/10"
                            >
                              Loeschen
                            </button>
                          </form>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-white">Auslastung nach Kategorie</h2>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Letzte 7 Tage</span>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categoryTotals.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 text-sm text-slate-100"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{item.label}</span>
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor: item.color ?? "#22d3ee",
                    }}
                  />
                </div>
                <p className="mt-3 text-2xl font-semibold text-white">
                  {minutesToHoursLabel(item.minutes)}
                </p>
                <p className="text-xs text-slate-400">
                  {(item.minutes / Math.max(totals.totalMinutes, 1) * 100).toFixed(1)}% Anteil
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

type SummaryCardProps = {
  title: string;
  value: string;
  subline?: string;
  icon: ReactNode;
};

function SummaryCard({ title, value, subline, icon }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-5 text-slate-100">
      <div className="flex items-center gap-3 text-sm text-slate-300">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300">
          {icon}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
          <p className="text-xl font-semibold text-white">{value}</p>
        </div>
      </div>
      {subline ? <p className="mt-3 text-xs text-slate-400">{subline}</p> : null}
    </div>
  );
}





