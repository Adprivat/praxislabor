export const USER_ROLES = ["EMPLOYEE", "MANAGER", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const TEAM_ROLES = ["MEMBER", "LEAD"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const ENTRY_SOURCES = [
  "MANUAL",
  "QUICK_SELECT",
  "IMPORT",
  "ADMIN_ADJUSTMENT",
] as const;
export type EntrySource = (typeof ENTRY_SOURCES)[number];

export const HISTORY_ACTIONS = [
  "CREATED",
  "UPDATED",
  "DELETED",
  "RESTORED",
] as const;
export type HistoryAction = (typeof HISTORY_ACTIONS)[number];

export interface ActivityTag {
  id: number;
  name: string;
  passwordHash?: string;
  description?: string;
  categoryId?: number | null;
  sortOrder: number;
  active: boolean;
}

export interface ActivityCategory {
  id: number;
  name: string;
  passwordHash?: string;
  description?: string;
  color?: string | null;
  sortOrder: number;
  active: boolean;
  tags: ActivityTag[];
}

export interface ActivityBlock {
  id: number;
  label: string;
  categoryId: number;
  tagId?: number | null;
  description?: string;
  isBillable: boolean;
  active: boolean;
  sortOrder: number;
  category?: ActivityCategory;
  tag?: ActivityTag | null;
}

export interface FavoriteBlock {
  id: number;
  userId: string;
  blockId: number;
  lastUsedAt?: string | null;
  block?: ActivityBlock;
}

export interface WorkSchedule {
  id: number;
  userId: string;
  validFrom: string; // ISO date
  weeklyMinutes: number;
  createdById?: string | null;
  createdAt: string;
}

export interface Absence {
  id: string;
  userId: string;
  categoryBlockId: number;
  startDate: string; // ISO date
  endDate: string; // ISO date
  note?: string;
  createdAt: string;
  createdById?: string | null;
}

export interface TimeEntryHistory {
  id: number;
  entryId: string;
  action: HistoryAction;
  snapshot: Record<string, unknown>;
  changedAt: string;
  changedById?: string | null;
}

export interface TimeEntryTag {
  id: number;
  entryId: string;
  tagId: number;
  tag?: ActivityTag;
}

export interface TimeEntry {
  id: string;
  userId: string;
  blockId: number;
  start: string;
  end?: string | null;
  durationMinutes?: number | null;
  note?: string;
  source: EntrySource;
  editedById?: string | null;
  tags?: TimeEntryTag[];
  history?: TimeEntryHistory[];
  deletedAt?: string | null;
  block?: ActivityBlock;
}

export interface TeamMembership {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  passwordHash?: string;
  archivedAt?: string | null;
  createdAt: string;
  members: TeamMembership[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TimeSummary {
  totalMinutes: number;
  billableMinutes: number;
  nonBillableMinutes: number;
  workingDays: number;
}

export type GroupingPeriod = "day" | "week" | "month" | "year";

export interface AggregatedEntry {
  groupKey: string;
  period: GroupingPeriod;
  minutes: number;
  overtimeMinutes?: number;
  deficitMinutes?: number;
}

export function calculateDurationMinutes(start: string, end?: string | null): number {
  const startDate = new Date(start);
  if (!end) {
    return 0;
  }
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.max(Math.round(diffMs / 60000), 0);
}

export function minutesToHoursLabel(minutes: number): string {
  const absoluteMinutes = Math.abs(minutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const restMinutes = absoluteMinutes % 60;
  const sign = minutes < 0 ? "-" : "";
  return `${sign}${hours.toString().padStart(2, "0")}:${restMinutes
    .toString()
    .padStart(2, "0")}`;
}

export function groupKeyFor(dateIso: string, period: GroupingPeriod): string {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return "invalid";
  }

  switch (period) {
    case "day":
      return date.toISOString().slice(0, 10);
    case "week": {
      const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
      const dayNum = tmp.getUTCDay() || 7;
      tmp.setUTCDate(tmp.getUTCDate() + (4 - dayNum));
      const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      return `${tmp.getUTCFullYear()}-KW${weekNo.toString().padStart(2, "0")}`;
    }
    case "month":
      return `${date.getUTCFullYear()}-${(date.getUTCMonth() + 1).toString().padStart(2, "0")}`;
    case "year":
      return `${date.getUTCFullYear()}`;
    default:
      return "unknown";
  }
}
