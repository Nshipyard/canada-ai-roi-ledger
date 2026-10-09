import { NextResponse } from "next/server";
import { getData } from "@/lib/ledger";

export async function GET() {
  const { outcome } = getData();
  return NextResponse.json(outcome);
}
