import { NextResponse } from "next/server";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "AI ROI Ledger API",
    version: "1.0.0",
    description:
      "Canada's federal AI Register (412 systems, 42 institutions, MVP snapshot retrieved 2026-10-08) normalized with stable AIRO-0001 IDs, reported federal AI spending since 2023 (aggregate reporting only, with caveats), and the outcome-join schema published intentionally empty: no public source joins a system to its cost or to a measured outcome. Source: GC AI Register via open.canada.ca. MIT licensed.",
  },
  servers: [{ url: "https://airoi.canada.nshipyard.com/api/v1" }],
  paths: {
    "/systems/search": {
      get: {
        summary: "Search registered AI systems by name or institution, filterable by status and build source",
        parameters: [
          { name: "q", in: "query", required: false, schema: { type: "string" }, example: "translation" },
          { name: "status", in: "query", required: false, schema: { type: "string", enum: ["production", "development", "retired", "unknown"] } },
          { name: "built_by", in: "query", required: false, schema: { type: "string", enum: ["government", "vendor", "open_source", "other", "unknown"] } },
          { name: "limit", in: "query", required: false, schema: { type: "integer", default: 50, maximum: 200 } },
        ],
        responses: { "200": { description: "Total plus matching system records" } },
      },
    },
    "/systems/lookup": {
      get: {
        summary: "Full record for one system: normalized status, build source, vendor, purpose category, raw values preserved",
        parameters: [{ name: "system_id", in: "query", required: true, schema: { type: "string" }, example: "AIRO-0001" }],
        responses: { "200": { description: "System record" }, "404": { description: "No system with that id" } },
      },
    },
    "/summary": {
      get: {
        summary: "Register aggregates: status and build-source shares, institutions ranked, oldest system, year histogram, methodology notes",
        responses: { "200": { description: "Full aggregate summary with data-quality notes" } },
      },
    },
    "/spend": {
      get: {
        summary: "Reported federal AI spending since 2023 as aggregates only, every row carrying source, date, and caveats",
        responses: { "200": { description: "Spend rows with provenance; per-system costs do not exist publicly" } },
      },
    },
    "/outcome-gap": {
      get: {
        summary: "The outcome-join schema, published intentionally empty, with the three missing data links named",
        responses: { "200": { description: "Schema, zero rows, and the statement of what is missing" } },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec);
}
