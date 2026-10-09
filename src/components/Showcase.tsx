"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/i18n";

interface InstitutionRow {
  name: string;
  total: number;
  production: number;
  development: number;
  retired: number;
  unknown: number;
}

interface Summary {
  status_counts: Record<string, number>;
  build_counts: Record<string, number>;
  build_share_pct: Record<string, number>;
  institutions: InstitutionRow[];
  oldest: { id: string; register_id: string; name_en: string; institution: string; status_year: string };
  meta: { total_records: number };
}

interface SpendRow {
  label_en: string;
  amount_cad_millions: number;
  scope_en: string;
  source: string;
  source_date: string;
  caveats: string[];
}

interface OutcomeGap {
  rows: unknown[];
  missing_links: string[];
}

function shortInst(inst: string) {
  return inst.split(" / ")[0].trim();
}

function moneyM(m: number, lang: string) {
  if (lang === "fr") return `${m.toLocaleString("fr-CA", { maximumFractionDigits: 1 })} M$`;
  return `$${m.toLocaleString("en-CA", { maximumFractionDigits: 1 })}M`;
}

function Question({ n, q, children }: { n: string; q: string; children: React.ReactNode }) {
  return (
    <div className="mt-16 first:mt-12 rounded-[28px] border border-line bg-paper-warm p-6 md:p-10">
      <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-canada">Q{n}</p>
      <h3 className="display mt-3 max-w-[800px] text-[28px] leading-tight md:text-[36px]">{q}</h3>
      <div className="mt-6">{children}</div>
    </div>
  );
}

export default function Showcase() {
  const { t, lang } = useLang();
  const [s, setS] = useState<Summary | null>(null);
  const [spend, setSpend] = useState<SpendRow[] | null>(null);
  const [gap, setGap] = useState<OutcomeGap | null>(null);

  useEffect(() => {
    fetch("/api/v1/summary").then((r) => r.json()).then(setS);
    fetch("/api/v1/spend").then((r) => r.json()).then((d) => setSpend(d.rows ?? []));
    fetch("/api/v1/outcome-gap").then((r) => r.json()).then(setGap);
  }, []);

  if (!s || !spend || !gap) return null;
  const sc = t.showcase;
  const top8 = s.institutions.slice(0, 8);
  const maxInst = Math.max(1, ...top8.map((i) => i.total));
  const buildOrder = ["government", "vendor", "open_source", "other", "unknown"];
  const buildLabels = t.explorer.builtByNames;
  const maxSpend = Math.max(1, ...spend.map((r) => r.amount_cad_millions));

  return (
    <section id="showcase" className="bg-paper">
      <div className="mx-auto max-w-[1392px] px-6 py-20 md:py-28">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-canada">{sc.kicker}</p>
        <h2 className="display mt-4 max-w-[720px] text-[40px] md:text-[52px]">{sc.title}</h2>
        <p className="mt-5 max-w-[720px] text-[18px] leading-relaxed text-ink/70">{sc.body}</p>

        <Question n="1" q={sc.q1}>
          <p className="max-w-[760px] text-[15px] leading-relaxed text-ink/70">{sc.a1}</p>
          <div className="mt-8 space-y-4">
            {top8.map((inst, i) => (
              <div key={inst.name}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-[14px] font-medium">
                    <span className="mr-2 font-mono text-[12px] text-ink/40">{i + 1}</span>
                    {shortInst(inst.name)}
                  </p>
                  <p className="shrink-0 font-mono text-[12px] text-ink/55">
                    {inst.total} · {inst.production} prod / {inst.development} dev
                  </p>
                </div>
                <div className="mt-1.5 flex h-3 w-full overflow-hidden rounded-full bg-ink/5">
                  <div className="h-full bg-canada" style={{ width: `${(inst.production / maxInst) * 100}%` }} title="In production" />
                  <div className="h-full bg-ink/35" style={{ width: `${(inst.development / maxInst) * 100}%` }} title="In development" />
                  <div className="h-full bg-ink/15" style={{ width: `${((inst.retired + inst.unknown) / maxInst) * 100}%` }} title="Retired or no status" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-5 text-[13px] text-ink/60">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-canada" />{t.explorer.statusNames.production}</span>
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-ink/35" />{t.explorer.statusNames.development}</span>
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-ink/15" />{t.explorer.statusNames.retired} / {t.explorer.statusNames.unknown}</span>
          </div>
        </Question>

        <Question n="2" q={sc.q2}>
          <p className="max-w-[760px] text-[15px] leading-relaxed text-ink/70">{sc.a2}</p>
          <div className="mt-8 space-y-3">
            {buildOrder.map((b) => (
              <div key={b} className="flex items-center gap-4">
                <p className="w-44 shrink-0 text-[14px] font-medium">{buildLabels[b] ?? b}</p>
                <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-ink/5">
                  <div className="h-full rounded-full bg-canada" style={{ width: `${s.build_share_pct[b] ?? 0}%` }} />
                </div>
                <p className="w-24 shrink-0 text-right font-mono text-[13px] font-semibold text-canada-dark">
                  {(s.build_share_pct[b] ?? 0).toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </Question>

        <Question n="3" q={sc.q3}>
          <p className="max-w-[760px] text-[15px] leading-relaxed text-ink/70">{sc.a3}</p>
          <div className="mt-8 rounded-[20px] border border-line bg-paper p-6">
            <p className="font-mono text-[12px] text-ink/45">{s.oldest.id} · {s.oldest.register_id}</p>
            <p className="display mt-2 text-[26px]">{s.oldest.name_en}</p>
            <p className="mt-1 text-[14px] text-ink/60">{shortInst(s.oldest.institution)}</p>
            <p className="display mt-3 text-[44px] text-canada">{s.oldest.status_year}</p>
          </div>
        </Question>

        <Question n="4" q={sc.q4}>
          <p className="max-w-[760px] text-[15px] leading-relaxed text-ink/70">{sc.a4}</p>
          <div className="mt-8 space-y-3">
            {spend.map((r) => (
              <div key={r.label_en} className="flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-[15px] font-medium">{r.label_en}</p>
                    <p className="shrink-0 font-mono text-[13px] font-semibold text-canada-dark">{moneyM(r.amount_cad_millions, lang)}</p>
                  </div>
                  <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-ink/5">
                    <div className="h-full rounded-full bg-canada" style={{ width: `${(r.amount_cad_millions / maxSpend) * 100}%` }} />
                  </div>
                  <p className="mt-1 text-[13px] text-ink/55">{r.scope_en}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-[20px] bg-ink p-6 text-white">
            <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/60">{sc.caveatsTitle}</p>
            <ul className="mt-3 space-y-2">
              {spend[0]?.caveats.map((c, i) => (
                <li key={i} className="text-[14px] leading-relaxed text-white/80">· {c}</li>
              ))}
            </ul>
          </div>
        </Question>

        <Question n="5" q={sc.q5}>
          <p className="max-w-[760px] text-[15px] leading-relaxed text-ink/70">{sc.a5}</p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="rounded-[24px] bg-canada p-7 text-white">
              <p className="display text-[64px]">{gap.rows.length}</p>
              <p className="mt-1 text-[15px] font-medium text-white/85">{sc.outcomeRows}</p>
            </div>
            <div className="rounded-[24px] border border-line bg-paper p-7">
              <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ink/50">{sc.missingLinksTitle}</p>
              <ol className="mt-3 space-y-3">
                {gap.missing_links.map((m, i) => (
                  <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-ink/75">
                    <span className="display shrink-0 text-[20px] text-canada">{i + 1}</span>
                    <span>{m}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <p className="mt-6 max-w-[760px] text-[13px] text-ink/50">{sc.retrievedNote}</p>
        </Question>
      </div>
    </section>
  );
}
