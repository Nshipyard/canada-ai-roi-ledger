"use client";

import { useLang } from "@/i18n";
import McpConnect from "./McpConnect";

const endpoints = [
  {
    method: "GET",
    path: "/api/v1/systems/search?q=translation&limit=3",
    desc: "Search registered AI systems by name or institution, filterable by status and build source",
    response: `{
  "q": "translation",
  "limit": 3,
  "total": 12,
  "hits": [
    {
      "id": "AIRO-0031",
      "n": "GC Translation AI pilot",
      "inst": "Translation Bureau",
      "st": "development",
      "bb": "vendor",
      "yr": "2025"
    }
  ]
}`,
  },
  {
    method: "GET",
    path: "/api/v1/systems/lookup?system_id=AIRO-0001",
    desc: "Full system record: normalized status, build source, vendor, purpose category, raw values preserved",
    response: `{
  "id": "AIRO-0001",
  "register_id": "2526-CBSA-ASFC-002",
  "name_en": "Fuzzy Search (SSAName3)",
  "status": "production",
  "status_raw": "In production",
  "built_by": "vendor",
  "vendor": "…",
  "status_year": "1994"
}`,
  },
  {
    method: "GET",
    path: "/api/v1/outcome-gap",
    desc: "The outcome-join schema, published intentionally empty, with the three missing data links named",
    response: `{
  "schema": { "fields": [ … ] },
  "rows": [],
  "missing_links": [
    "No per-system cost data …",
    "No go-live dates joined to systems …",
    "No outcome metrics joined to systems …"
  ]
}`,
  },
];

export default function Developers() {
  const { t } = useLang();
  return (
    <section id="developers" className="bg-ink text-white">
      <div className="mx-auto max-w-[1392px] px-6 py-20 md:py-28">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/60">{t.developers.kicker}</p>
        <h2 className="display mt-4 max-w-[720px] text-[40px] md:text-[52px]">{t.developers.title}</h2>
        <p className="mt-5 max-w-[720px] text-[18px] leading-relaxed text-white/70">{t.developers.body}</p>

        <h3 className="mt-14 text-[13px] font-semibold uppercase tracking-[0.12em] text-white/60">{t.developers.endpoints}</h3>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          {endpoints.map((e) => (
            <article key={e.path} className="flex min-w-0 flex-col rounded-[24px] border border-white/15 bg-white/5 p-6">
              <p className="font-mono text-[12px] font-semibold text-white/60">{e.method}</p>
              <code className="mt-1 break-all font-mono text-[13px] text-white">{e.path}</code>
              <p className="mt-2 text-[14px] text-white/65">{e.desc}</p>
              <pre className="mt-4 flex-1 overflow-x-auto rounded-[16px] bg-black/40 p-4 font-mono text-[12px] leading-relaxed text-white/80">
                {e.response}
              </pre>
              <a
                href={e.path}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block self-start rounded-full border border-white/25 px-5 py-2 text-[14px] font-semibold hover:border-white"
              >
                {t.developers.tryIt} →
              </a>
            </article>
          ))}
        </div>

        <div className="mt-8">
          <a href="/api/openapi.json" target="_blank" rel="noreferrer" className="block rounded-[24px] bg-white/[0.06] p-6 hover:bg-white/[0.09]">
            <h4 className="text-[19px] font-semibold">{t.developers.openapi}</h4>
            <code className="mt-2 block font-mono text-[13px] text-white/60">GET /api/openapi.json</code>
          </a>
        </div>

        <McpConnect
          config={{
            slug: "ai-roi-ledger",
            displayName: "AI ROI Ledger",
            exampleEn: 'Search for systems about "translation" and show me the top result',
            exampleFr: 'Recherche les systèmes contenant "translation" et montre-moi le premier résultat',
          }}
        />
      </div>
    </section>
  );
}
