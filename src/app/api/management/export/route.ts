import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { determineRange, getManagementOverview } from "@/server/queries/management";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "MANAGER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const userId = searchParams.get("userId") ?? undefined;

  const { rangeStart, rangeEnd } = determineRange(period, from, to);
  const overview = await getManagementOverview({
    rangeStart,
    rangeEnd,
    userId: userId && userId.length > 0 ? userId : undefined,
  });

  const header = ["Name", "Email", "Total-Min", "Billable-Min", "Expected-Min", "Overtime-Min"];
  const rows = overview.perUser.map((user) => [
    escapeCsv(user.name),
    escapeCsv(user.email),
    user.totalMinutes.toString(),
    user.billableMinutes.toString(),
    user.expectedMinutes.toString(),
    user.overtimeMinutes.toString(),
  ]);

  const csv = [header, ...rows].map((row) => row.join(",")).join("\n");
  const filename = `management-export-${overview.rangeStart.slice(0, 10)}-${overview.rangeEnd.slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes("\"")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
