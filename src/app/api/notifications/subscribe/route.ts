import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth/permissions";
import connectDB from "@/lib/db/connection";
import { PushSubscription } from "@/lib/db/models";

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (!body.endpoint || !body.keys) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await connectDB();

  await PushSubscription.findOneAndUpdate(
    { endpoint: body.endpoint },
    {
      organizationId: session.organizationId,
      userId: session.userId,
      endpoint: body.endpoint,
      keys: body.keys,
      userAgent: request.headers.get("user-agent") ?? "unknown",
      isActive: true,
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { endpoint } = await request.json();
  if (!endpoint) return NextResponse.json({ error: "endpoint required" }, { status: 400 });

  await connectDB();
  await PushSubscription.deleteOne({ userId: session.userId, endpoint });

  return NextResponse.json({ success: true });
}
