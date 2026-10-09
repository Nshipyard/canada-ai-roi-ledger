import { NextResponse } from "next/server";
import { getData } from "@/lib/ledger";

export async function GET() {
  const { spend } = getData();
  return NextResponse.json(spend);
}
