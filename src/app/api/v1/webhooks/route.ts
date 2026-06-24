import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateApiKey } from "@/lib/api/auth";
import connectDB from "@/lib/db/connection";
import Webhook from "@/lib/db/models/webhook.model";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key") ??
    request.headers.get("authorization")?.replace("Bearer ", "");
  if (!apiKey) return NextResponse.json({ error: "API key required" }, { status: 401 });

  const auth = await authenticateApiKey(apiKey);
  if (!auth) return NextResponse.json({ error: "Invalid API key" }, { status: 403 });

  await connectDB();
  const webhooks = await Webhook.find({
    organizationId: auth.organizationId,
    isActive: true,
  })
    .select("-secret")
    .lean();

  return NextResponse.json({ data: webhooks.map((w) => ({ ...w, id: w._id.toString() })) });
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key") ??
    request.headers.get("authorization")?.replace("Bearer ", "");
  if (!apiKey) return NextResponse.json({ error: "API key required" }, { status: 401 });

  const auth = await authenticateApiKey(apiKey);
  if (!auth) return NextResponse.json({ error: "Invalid API key" }, { status: 403 });

  const body = await request.json();
  const { name, url, events } = body;

  if (!name || !url || !events?.length) {
    return NextResponse.json({ error: "name, url, and events required" }, { status: 400 });
  }

  await connectDB();

  const secret = crypto.randomBytes(32).toString("hex");
  const webhook = await Webhook.create({
    organizationId: auth.organizationId,
    name,
    url,
    events,
    secret,
    createdBy: auth.organizationId,
    isActive: true,
  });

  return NextResponse.json({
    id: webhook._id.toString(),
    name: webhook.name,
    url: webhook.url,
    events: webhook.events,
    secret,
    message: "Store this secret securely — it will not be shown again.",
  }, { status: 201 });
}
