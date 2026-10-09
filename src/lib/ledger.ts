import fs from "node:fs";
import path from "node:path";

const DATA = path.join(process.cwd(), "data");

export type SystemStatus = "production" | "development" | "retired" | "unknown";
export type BuiltBy = "government" | "vendor" | "open_source" | "other" | "unknown";

export interface SystemRecord {
  id: string;
  register_id: string;
  name_en: string;
  name_fr: string;
  institution: string;
  description_en: string;
  description_fr: string;
  primary_users_en: string;
  built_by: BuiltBy;
  built_by_raw: string;
  vendor: string;
  status: SystemStatus;
  status_raw: string;
  status_year: string;
  capabilities_en: string;
  purpose_category: string;
  involves_personal_info: string;
  ai_results_en: string;
  source_url: string;
  retrieved: string;
}

export interface SystemIndexRow {
  id: string;
  n: string;
  inst: string;
  st: SystemStatus;
  bb: BuiltBy;
  yr: string;
}

export interface InstitutionRow {
  name: string;
  total: number;
  production: number;
  development: number;
  retired: number;
  unknown: number;
}

export interface OldestSystem {
  id: string;
  register_id: string;
  name_en: string;
  institution: string;
  status_year: string;
}

export interface SummaryMeta {
  retrieved: string;
  source_name: string;
  source_url: string;
  csv_filename: string;
  total_records: number;
  row_count_verified: boolean;
  note: string;
}

export interface Summary {
  meta: SummaryMeta;
  status_counts: Record<SystemStatus, number>;
  status_note: string;
  build_counts: Record<BuiltBy, number>;
  build_share_pct: Record<BuiltBy, number>;
  institutions: InstitutionRow[];
  institution_name_strings: number;
  institutions_claimed_by_tbs: number;
  org_discrepancy_note: string;
  oldest: OldestSystem;
  year_histogram: { year: string; count: number }[];
  vendor_named_count: number;
  personal_info_counts: Record<string, number>;
  purpose_categories: { category: string; count: number }[];
}

export interface SpendRow {
  label_en: string;
  amount_cad_millions: number;
  scope_en: string;
  source: string;
  source_date: string;
  caveats: string[];
}

export interface SpendFile {
  meta: { retrieved: string; warning: string };
  rows: SpendRow[];
}

export interface OutcomeJoinField {
  name: string;
  type: string;
  description: string;
  availability: "populated" | "missing";
}

export interface OutcomeJoin {
  schema: { fields: OutcomeJoinField[] };
  rows: Record<string, string>[];
  missing_links: string[];
  statement_en: string;
}

interface Cache {
  systems: SystemRecord[];
  index: SystemIndexRow[];
  summary: Summary;
  spend: SpendFile;
  outcome: OutcomeJoin;
}

let cache: Cache | null = null;

function readJson<T>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA, name), "utf8")) as T;
}

export function getData(): Cache {
  if (!cache) {
    cache = {
      systems: readJson<SystemRecord[]>("systems.json"),
      index: readJson<SystemIndexRow[]>("systems_index.json"),
      summary: readJson<Summary>("summary.json"),
      spend: readJson<SpendFile>("spend.json"),
      outcome: readJson<OutcomeJoin>("outcome_join.json"),
    };
  }
  return cache;
}

export function searchSystems(
  q: string,
  limit: number,
  status?: string,
  builtBy?: string
): { total: number; hits: SystemIndexRow[] } {
  const { index } = getData();
  const needle = q.trim().toLowerCase();
  const hits = index.filter((r) => {
    if (status && r.st !== status) return false;
    if (builtBy && r.bb !== builtBy) return false;
    if (!needle) return true;
    return (
      r.n.toLowerCase().includes(needle) ||
      r.inst.toLowerCase().includes(needle) ||
      r.id.toLowerCase() === needle
    );
  });
  return { total: hits.length, hits: hits.slice(0, limit) };
}

export function lookupSystem(id: string): SystemRecord | null {
  const { systems } = getData();
  const needle = id.trim().toUpperCase();
  return systems.find((s) => s.id.toUpperCase() === needle) ?? null;
}
