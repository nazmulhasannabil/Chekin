import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateApiKey } from "@/lib/api/auth";
import connectDB from "@/lib/db/connection";
import { AttendanceDay, Employee } from "@/lib/db/models";

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key") ??
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (!apiKey) {
    return NextResponse.json({ error: "API key required" }, { status: 401 });
  }

  const auth = await authenticateApiKey(apiKey);
  if (!auth || !auth.permissions.includes("attendance.read")) {
    return NextResponse.json({ error: "Invalid or unauthorized API key" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const dateKey = searchParams.get("date") ?? new Date().toISOString().split("T")[0];
  const employeeId = searchParams.get("employeeId");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);

  await connectDB();

  const query: Record<string, unknown> = {
    organizationId: auth.organizationId,
    dateKey,
  };
  if (employeeId) query.employeeId = employeeId;

  const [records, total] = await Promise.all([
    AttendanceDay.find(query)
      .populate("employeeId", "displayName employeeCode")
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AttendanceDay.countDocuments(query),
  ]);

  return NextResponse.json({
    data: records.map((r) => {
      const emp = r.employeeId as unknown as Record<string, unknown>;
      return {
        id: r._id.toString(),
        employeeId: emp?._id?.toString() ?? "",
        employeeCode: emp?.employeeCode as string ?? "",
        employeeName: emp?.displayName as string ?? "",
        date: r.dateKey,
        status: r.status,
        checkInAt: r.checkInAt?.toISOString() ?? null,
        checkOutAt: r.checkOutAt?.toISOString() ?? null,
        workedMinutes: r.workedMinutes,
        lateMinutes: r.lateMinutes,
      };
    }),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}
