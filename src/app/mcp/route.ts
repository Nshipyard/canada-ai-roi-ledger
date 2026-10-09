import { NextResponse } from "next/server";
import { getData, searchSystems, lookupSystem } from "@/lib/ledger";

// Minimal MCP server over streamable HTTP (JSON-RPC 2.0 via POST).
// Supports: initialize, tools/list, tools/call. Stateless.

const SERVER = { name: "canada-ai-roi-ledger", version: "1.0.0" };

const TOOLS = [
  {
    name: "system_lookup",
    description:
      "Full record for one registered federal AI system: normalized status, build source (vendor vs in-house), vendor name, purpose category, institution, and the raw source values preserved for audit.",
    inputSchema: {
      type: "object",
      properties: {
        system_id: { type: "string", description: "System id, e.g. AIRO-0001 from the search tool" },
      },
      required: ["system_id"],
    },
  },
  {
    name: "system_search",
    description:
      "Search 412 AI systems from Canada's federal AI Register (MVP, retrieved 2026-10-08) by name or institution, filterable by status (production/development/retired/unknown) and build source.",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Name or institution fragment" },
        status: { type: "string", description: "production, development, retired, or unknown" },
        built_by: { type: "string", description: "government, vendor, open_source, other, or unknown" },
        limit: { type: "integer", description: "Max results, default 50, max 200" },
      },
    },
  },
  {
    name: "ledger_summary",
    description:
      "Register aggregates: status and build-source shares, institutions ranked by system count, oldest registered system, year histogram, and data-quality notes.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "spend_reported",
    description:
      "Reported federal AI spending since 2023 as aggregates only (over $800M), every row with source, date, and caveats. Per-system costs do not exist in any public source.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "outcome_gap",
    description:
      "The outcome-join schema published intentionally empty: the three missing data links that make per-system AI ROI unanswerable today.",
    inputSchema: { type: "object", properties: {} },
  },
];

function ok(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}
function err(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}
function textResult(data: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function handle(msg: any) {
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return err(msg?.id ?? null, -32600, "Invalid Request");
  }
  const id = msg.id ?? null;
  switch (msg.method) {
    case "initialize":
      return ok(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: SERVER,
      });
    case "notifications/initialized":
      return null;
    case "tools/list":
      return ok(id, { tools: TOOLS });
    case "tools/call": {
      const { name, arguments: args } = msg.params ?? {};
      try {
        if (name === "system_lookup") {
          const hit = lookupSystem(String(args.system_id ?? ""));
          if (!hit) return err(id, -32001, `No system ${args.system_id}`);
          return ok(id, textResult(hit));
        }
        if (name === "system_search") {
          const q = String(args.q ?? "");
          const limit = Math.min(Math.max(parseInt(String(args.limit ?? "50"), 10) || 50, 1), 200);
          const status = args.status ? String(args.status) : undefined;
          const built_by = args.built_by ? String(args.built_by) : undefined;
          return ok(id, textResult({ q, limit, ...searchSystems(q, limit, status, built_by) }));
        }
        if (name === "ledger_summary") {
          const { summary } = getData();
          return ok(id, textResult(summary));
        }
        if (name === "spend_reported") {
          const { spend } = getData();
          return ok(id, textResult(spend));
        }
        if (name === "outcome_gap") {
          const { outcome } = getData();
          return ok(id, textResult(outcome));
        }
        return err(id, -32602, `Unknown tool ${name}`);
      } catch (e) {
        return err(id, -32000, `Tool error: ${(e as Error).message}`);
      }
    }
    default:
      return err(id, -32601, `Method not found: ${msg.method}`);
  }
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(err(null, -32700, "Parse error"), { status: 400 });
  }
  if (Array.isArray(body)) {
    const out = body.map(handle).filter((r) => r !== null);
    return NextResponse.json(out);
  }
  const out = handle(body);
  if (out === null) return new NextResponse(null, { status: 202 });
  return NextResponse.json(out);
}

export async function GET() {
  return NextResponse.json(
    { error: "This MCP server accepts JSON-RPC 2.0 via POST only." },
    { status: 405 }
  );
}

export async function DELETE() {
  return new NextResponse(null, { status: 405 });
}
