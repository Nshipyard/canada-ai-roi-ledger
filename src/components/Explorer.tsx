"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/i18n";

interface Hit {
  id: string;
  n: string;
  inst: string;
  st: string;
  bb: string;
  yr: string;
}

interface Detail {
  id: string;
  register_id: string;
  name_en: string;
  institution: string;
  description_en: string;
  built_by: string;
  built_by_raw: string;
  vendor: string;
  status: string;
  status_raw: string;
  status_year: string;
  capabilities_en: string;
  purpose_category: string;
  involves_personal_info: string;
  ai_results_en: string;
}

function fmt(n: number, lang: string) {
  return n.toLocaleString(lang === "fr" ? "fr-CA" : "en-CA");
}

function shortInst(inst: string) {
  return inst.split(" / ")[0].trim();
}

export default function Explorer() {
  const { t, lang } = useLang();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [builtBy, setBuiltBy] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function run(query: string, st: string, bb: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: query, limit: "50" });
      if (st) params.set("status", st);
      if (bb) params.set("built_by", bb);
      const res = await fetch(`/api/v1/systems/search?${params}`);
      const data = await res.json();
      setHits(data.hits ?? []);
      setTotal(data.total ?? 0);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  async function openSystem(id: string) {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/v1/systems/lookup?system_id=${encodeURIComponent(id)}`);
      const data = await res.json();
      setDetail(data.id ? data : null);
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    const id = setTimeout(() => run(q, status, builtBy), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, builtBy]);

  const e = t.explorer;

  function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink/45">{label}</p>
        <p className={`mt-1 text-[15px] text-ink/85 ${mono ? "font-mono text-[13px]" : ""}`}>{value || e.notReported}</p>
      </div>
    );
  }

  if (detail || detailLoading) {
    return (
      <div>
        <button
          onClick={() => setDetail(null)}
          className="mb-6 rounded-full border border-line px-5 py-2.5 text-[15px] font-semibold hover:border-ink"
        >
          ← {e.back}
        </button>
        {detailLoading && <p className="text-[15px] text-ink/55">…</p>}
        {detail && (
          <article className="rounded-[24px] border border-line bg-paper p-6 md:p-8">
            <p className="font-mono text-[12px] uppercase tracking-wide text-ink/45">
              {e.systemId} · {detail.id}
            </p>
            <h3 className="display mt-2 max-w-[720px] text-[30px] md:text-[38px]">{detail.name_en || e.notReported}</h3>
            <p className="mt-2 max-w-[720px] text-[15px] text-ink/60">{shortInst(detail.institution)}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {[e.statusNames[detail.status] ?? detail.status, e.builtByNames[detail.built_by] ?? detail.built_by]
                .filter(Boolean)
                .map((tag) => (
                  <span key={tag} className="rounded-full bg-ink/5 px-3.5 py-1.5 text-[13px] font-medium">
                    {tag}
                  </span>
                ))}
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Field label={e.registerId} value={detail.register_id} mono />
              <Field label={e.vendor} value={detail.vendor} />
              <Field label={e.statusYear} value={detail.status_year} mono />
              <Field label={e.purpose} value={detail.purpose_category.replace(/_/g, " ")} />
              <Field label={e.personalInfo} value={detail.involves_personal_info} mono />
              <Field label={e.status} value={`${detail.status_raw || e.notReported}`} />
            </div>
            {detail.description_en && (
              <div className="mt-8">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink/45">{e.description}</p>
                <p className="mt-2 max-w-[800px] text-[15px] leading-relaxed text-ink/75">{detail.description_en}</p>
              </div>
            )}
            {detail.capabilities_en && (
              <div className="mt-6">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink/45">{e.capabilities}</p>
                <p className="mt-2 max-w-[800px] text-[15px] leading-relaxed text-ink/75">{detail.capabilities_en}</p>
              </div>
            )}
            {detail.ai_results_en && (
              <div className="mt-6">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink/45">{e.results}</p>
                <p className="mt-2 max-w-[800px] text-[15px] leading-relaxed text-ink/75">{detail.ai_results_en}</p>
              </div>
            )}
            <p className="mt-8 max-w-[800px] text-[13px] text-ink/45">
              {e.purpose}: {e.purposeNote}. {e.builtBy}: {detail.built_by_raw || e.notReported}.
            </p>
          </article>
        )}
      </div>
    );
  }

  return (
    <div>
      <input
        value={q}
        onChange={(ev) => setQ(ev.target.value)}
        placeholder={e.search}
        className="w-full rounded-full border border-line bg-paper px-6 py-3.5 text-[16px] outline-none placeholder:text-ink/35 focus:border-canada"
        aria-label={e.search}
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(ev) => setStatus(ev.target.value)}
          className="rounded-full border border-line bg-paper px-5 py-2.5 text-[15px] font-medium outline-none focus:border-canada"
          aria-label={e.status}
        >
          <option value="">{e.statusFilter}</option>
          {["production", "development", "retired", "unknown"].map((s) => (
            <option key={s} value={s}>{e.statusNames[s]}</option>
          ))}
        </select>
        <select
          value={builtBy}
          onChange={(ev) => setBuiltBy(ev.target.value)}
          className="rounded-full border border-line bg-paper px-5 py-2.5 text-[15px] font-medium outline-none focus:border-canada"
          aria-label={e.builtBy}
        >
          <option value="">{e.builtByFilter}</option>
          {["government", "vendor", "open_source", "other", "unknown"].map((b) => (
            <option key={b} value={b}>{e.builtByNames[b]}</option>
          ))}
        </select>
      </div>
      <div className="mt-8">
        {!searched && !loading && <p className="max-w-[640px] text-[15px] leading-relaxed text-ink/55">{e.empty}</p>}
        {loading && <p className="text-[15px] text-ink/55">…</p>}
        {searched && !loading && hits.length === 0 && <p className="text-[15px] text-ink/55">{e.noResult}</p>}
        {hits.length > 0 && (
          <>
            <p className="mb-4 text-[14px] text-ink/55">
              {e.showing} {hits.length} {e.of} {fmt(total, lang)}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {hits.map((h) => (
                <button
                  key={h.id}
                  onClick={() => openSystem(h.id)}
                  className="rounded-[24px] border border-line bg-paper p-6 text-left transition-colors hover:border-canada"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[16px] font-semibold leading-snug">{h.n || e.notReported}</p>
                    <p className="shrink-0 font-mono text-[11px] text-ink/40">{h.id}</p>
                  </div>
                  <p className="mt-1 text-[13px] text-ink/55">{shortInst(h.inst)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-ink/5 px-3 py-1 text-[12px] font-medium">{e.statusNames[h.st] ?? h.st}</span>
                    <span className="rounded-full bg-ink/5 px-3 py-1 text-[12px] font-medium">{e.builtByNames[h.bb] ?? h.bb}</span>
                    {h.yr && <span className="rounded-full bg-ink/5 px-3 py-1 font-mono text-[12px] text-ink/60">{h.yr}</span>}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
