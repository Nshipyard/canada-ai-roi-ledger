import { NextResponse } from "next/server";
import { searchSystems } from "@/lib/ledger";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1), 200);
  const status = searchParams.get("status") ?? undefined;
  const built_by = searchParams.get("built_by") ?? undefined;
  return NextResponse.json({ q, limit, ...searchSystems(q, limit, status, built_by) });
}
