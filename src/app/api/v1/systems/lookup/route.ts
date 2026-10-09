import { NextResponse } from "next/server";
import { lookupSystem } from "@/lib/ledger";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("system_id") ?? "";
  const hit = lookupSystem(id);
  if (!hit) return NextResponse.json({ error: `No system ${id}` }, { status: 404 });
  return NextResponse.json(hit);
}
