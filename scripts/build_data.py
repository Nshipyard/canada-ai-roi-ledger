#!/usr/bin/env python3
"""Build derived data for the Canada AI ROI Ledger from the Government of
Canada AI Register (MVP).

Input (NOT committed, snapshot copy IS committed under data/snapshots/):
  /tmp/airoi/ai-register.csv        GC AI Register (MVP), 412 rows
  Source: https://open.canada.ca/data/en/dataset/fcbc0200-79ba-4fa4-94a6-00e32facea6b
  Dataset CSV dated 2026-04-28; downloaded/retrieved 2026-10-08.

Outputs (committed):
  data/systems.json                full normalized records (AIRO-0001..0412)
  data/systems_index.json          trimmed search index
  data/summary.json                aggregates, meta, methodology notes
  data/spend.json                  reported federal AI spend aggregates ONLY
  data/outcome_join.json           intentionally empty join schema
  data/snapshots/2026-10-08/       raw CSV copy + snapshot_meta.json
  data/DATA_NOTES.md               source/retrieval/normalization/defects
  public/data/systems.csv          flat download of the 412 systems
  public/data/systems.json         copy of data/systems.json
  public/data/spend_reported.json  copy of data/spend.json
  public/data/outcome_join_schema.json  copy of data/outcome_join.json

NORMALIZATION RULES
-------------------
status: ai_system_status_en is trimmed and lowercased, then:
  "in production"  -> "production"
  "in development" -> "development"
  "retired"        -> "retired"
  ""               -> "unknown"
  Raw variants actually present in the CSV (2026-10-08): "In production"
  (153), "In production " with trailing space (5), "in production"
  lowercase (2), "In development" (171), "In development " with trailing
  space (11), "Retired" (28), blank (42). All collapse to four slugs.
  NOTE: the November 2025 launch announcement described stages
  research / proof-of-concept / development / deployed, but the published
  CSV actually uses "In production" / "In development" / "Retired" /
  blank. That discrepancy is recorded in summary.status_note.
  Raw values are kept alongside as status_raw.

built_by: developed_by_en is trimmed, then:
  "Government of Canada" -> "government"
  "Vendor"               -> "vendor"
  "Open source"          -> "open_source"
  "Other" (and "Other " with trailing space, 1 row) -> "other"
  ""                     -> "unknown"
  Raw values kept alongside as built_by_raw.

institution: trimmed government_organization string kept exactly as
  published (it joins the EN and FR names with " / ").

purpose_category: HEURISTIC slug, not a source field, derived by first-match
  keyword rules over (name_ai_system_en + " " + ai_system_capabilities_en),
  lowercased. Rules, in priority order:
    language_translation : translat, deepl
    chatbot_assistant    : chatbot, chat bot, virtual assistant,
                           conversational ai, copilot, ai assistant,
                           assistant, chat (word-boundary)
    vision_imagery       : computer vision, image recognition, imagery,
                           object detection, object recognition,
                           face verification, face recognition, facial,
                           remote sensing, satellite, lidar,
                           image classification, image analysis, image
    document_processing  : document, ocr, pdf, summariz, extraction,
                           transcrib, text extraction, content generation,
                           text generation
    data_matching        : fuzzy, entity resolution, record linkage,
                           matching, deduplicat, name matching
    automation_workflow  : automation, workflow, rpa, robotic process
    analytics_prediction : machine learning, predictive, predict,
                           forecast, classification, regression, anomaly,
                           risk scor, deep learning, neural net,
                           text analysis, speech analysis, sentiment,
                           natural language processing
    research_model       : foundation model, benchmark, research
    other                : non-blank text matching nothing above
    unspecified          : blank name and capabilities
  A row can match only one category (first rule wins), so overlap is
  resolved by priority. This is a labelling convenience for browsing;
  it is not in the source data.

IDs: AIRO-0001 through AIRO-0412, assigned in sorted ai_register_id order
  (plain string sort). These are the stable public IDs.

Honesty constraints baked into the outputs:
  - spend.json carries ONLY reported aggregates from media reporting
    (Canadian Press via Global News, 2026-05-13). The Register itself
    contains no cost data, and no public source joins costs to systems.
  - outcome_join.json is intentionally empty: it defines the join that
    would be needed to say whether a government AI system made a service
    cheaper or faster, and states that no public source provides all
    three links for any system.
"""

import csv
import hashlib
import json
import os
import re
import shutil

RETRIEVED = "2026-10-08"
SOURCE_URL = ("https://open.canada.ca/data/en/dataset/"
              "fcbc0200-79ba-4fa4-94a6-00e32facea6b")
CSV_FILENAME = "gc-ai-register-mvp-registre-de-lia-du-gc-pmv-04-26.csv"
INPUT_CSV = "/tmp/airoi/ai-register.csv"

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(HERE, "data")
SNAP = os.path.join(DATA, "snapshots", RETRIEVED)
PUB = os.path.join(HERE, "public", "data")

STATUS_MAP = {
    "in production": "production",
    "in development": "development",
    "retired": "retired",
    "": "unknown",
}

BUILT_BY_MAP = {
    "government of canada": "government",
    "vendor": "vendor",
    "open source": "open_source",
    "other": "other",
    "": "unknown",
}

# (category, [keyword substrings]) in priority order; first match wins.
PURPOSE_RULES = [
    ("language_translation", ["translat", "deepl"]),
    ("chatbot_assistant", [
        "chatbot", "chat bot", "virtual assistant", "conversational ai",
        "copilot", "ai assistant", "assistant",
    ]),
    ("vision_imagery", [
        "computer vision", "image recognition", "imagery",
        "object detection", "object recognition", "face verification",
        "face recognition", "facial", "remote sensing",
        "satellite", "lidar", "image classification", "image analysis",
        "image",
    ]),
    ("document_processing", [
        "document", "ocr", "pdf", "summariz", "extraction", "transcrib",
        "text extraction", "content generation", "text generation",
    ]),
    ("data_matching", [
        "fuzzy", "entity resolution", "record linkage", "matching",
        "deduplicat", "name matching",
    ]),
    ("automation_workflow", ["automation", "workflow", "rpa",
                              "robotic process"]),
    ("analytics_prediction", [
        "machine learning", "predictive", "predict", "forecast",
        "classification", "regression", "anomaly", "risk scor",
        "deep learning", "neural net", "text analysis", "speech analysis",
        "sentiment", "natural language processing",
    ]),
    ("research_model", ["foundation model", "benchmark", "research"]),
]


def purpose_category(name_en, caps_en):
    text = f"{name_en or ''} {caps_en or ''}".lower()
    if not text.strip():
        return "unspecified"
    for cat, kws in PURPOSE_RULES:
        if any(k in text for k in kws):
            return cat
    return "other"


def norm_status(raw):
    return STATUS_MAP[(raw or "").strip().lower()]


def norm_built_by(raw):
    return BUILT_BY_MAP[(raw or "").strip().lower()]


def main():
    with open(INPUT_CSV, encoding="utf-8-sig", newline="") as fh:
        raw_rows = list(csv.DictReader(fh))
    assert len(raw_rows) == 412, f"expected 412 rows, got {len(raw_rows)}"

    raw_rows.sort(key=lambda r: r["ai_register_id"] or "")

    systems = []
    for i, r in enumerate(raw_rows, 1):
        status_raw = (r.get("ai_system_status_en") or "")
        built_raw = (r.get("developed_by_en") or "")
        systems.append({
            "id": f"AIRO-{i:04d}",
            "register_id": (r.get("ai_register_id") or "").strip(),
            "name_en": (r.get("name_ai_system_en") or "").strip(),
            "name_fr": (r.get("name_ai_system_fr") or "").strip(),
            "institution": (r.get("government_organization") or "").strip(),
            "description_en": (r.get("description_ai_system_en")
                               or "").strip(),
            "description_fr": (r.get("description_ai_system_fr")
                               or "").strip(),
            "primary_users_en": (r.get("ai_system_primary_users_en")
                                 or "").strip(),
            "built_by": norm_built_by(built_raw),
            "built_by_raw": built_raw,
            "vendor": (r.get("vendor_information") or "").strip(),
            "status": norm_status(status_raw),
            "status_raw": status_raw,
            "status_year": (r.get("status_date") or "").strip(),
            "capabilities_en": (r.get("ai_system_capabilities_en")
                                or "").strip(),
            "purpose_category": purpose_category(
                r.get("name_ai_system_en"),
                r.get("ai_system_capabilities_en")),
            "involves_personal_info": (r.get("involves_personal_information")
                                       or "").strip(),
            "ai_results_en": (r.get("ai_system_results_en") or "").strip(),
            "source_url": SOURCE_URL,
            "retrieved": RETRIEVED,
        })

    ids = [s["id"] for s in systems]
    assert len(set(ids)) == len(ids) == 412, "AIRO ids not unique"

    # ---------- systems.json / systems_index.json ----------
    os.makedirs(DATA, exist_ok=True)
    with open(os.path.join(DATA, "systems.json"), "w") as fh:
        json.dump(systems, fh, indent=1, ensure_ascii=False)

    index = [{
        "id": s["id"], "n": s["name_en"], "inst": s["institution"],
        "st": s["status"], "bb": s["built_by"], "yr": s["status_year"],
    } for s in systems]
    with open(os.path.join(DATA, "systems_index.json"), "w") as fh:
        json.dump(index, fh, ensure_ascii=False)

    # ---------- summary.json ----------
    status_counts = {}
    for s in systems:
        status_counts[s["status"]] = status_counts.get(s["status"], 0) + 1

    build_counts = {}
    for s in systems:
        build_counts[s["built_by"]] = build_counts.get(s["built_by"], 0) + 1
    build_share_pct = {k: round(v / 412 * 100, 1)
                       for k, v in build_counts.items()}

    inst_rows = {}
    for s in systems:
        d = inst_rows.setdefault(s["institution"],
                                {"total": 0, "production": 0,
                                 "development": 0, "retired": 0,
                                 "unknown": 0})
        d["total"] += 1
        d[s["status"]] += 1
    institutions = [
        {"name": name, **counts}
        for name, counts in sorted(inst_rows.items(),
                                  key=lambda kv: (-kv[1]["total"], kv[0]))
    ]

    # org discrepancy: any org strings that look like duplicates/variants?
    orgs = sorted(inst_rows)
    variant_notes = []
    seen_en = {}
    for o in orgs:
        en = o.split(" / ")[0].strip()
        key = en.lower()
        seen_en.setdefault(key, []).append(o)
    for key, v in seen_en.items():
        if len(v) > 1:
            variant_notes.append(f"EN-part duplicate: {v}")
    seen_fr = {}
    for o in orgs:
        fr = o.split(" / ")[-1].strip()
        key = fr.lower()
        seen_fr.setdefault(key, []).append(o)
    for key, v in seen_fr.items():
        if len(v) > 1:
            variant_notes.append(f"FR-part duplicate: {v}")
    odd_names = [o for o in orgs
                 if "National Film Board / Office national du film" == o
                 or "Patented Medicine Prices Review Board Canada" in o]
    org_discrepancy_note = (
        "The Register holds 43 distinct government_organization strings; "
        "TBS's launch communications claimed 42 participating institutions. "
        "No two strings share the same EN part or the same FR part, so "
        "there is no exact duplicate row pair in the CSV. Name variants "
        "that could explain a counting difference on TBS's side: "
        + ("; ".join([
            "'National Film Board / Office national du film' (officially "
            "'National Film Board of Canada')",
            "'Patented Medicine Prices Review Board Canada / Conseil "
            "d'examen du prix des médicaments brevetés Canada' "
            "(odd trailing 'Canada' in both parts)",
        ]))
        + ". Neither collides with another row. The gap is not resolvable "
        "from the CSV alone; likely TBS counted a different snapshot or "
        "excluded one entity (no source given for the 42 figure)."
    )

    oldest_rows = [s for s in systems if s["status_year"] == "1994"]
    assert len(oldest_rows) == 1, f"expected 1 1994 row, got {len(oldest_rows)}"
    o = oldest_rows[0]
    oldest = {"id": o["id"], "register_id": o["register_id"],
              "name_en": o["name_en"], "institution": o["institution"],
              "status_year": o["status_year"]}

    year_hist = {}
    for s in systems:
        year_hist[s["status_year"]] = year_hist.get(s["status_year"], 0) + 1
    year_histogram = (
        [{"year": y, "count": year_hist[y]}
         for y in sorted(year_hist) if y] +
        [{"year": "unreported", "count": year_hist.get("", 0)}]
    )

    vendor_named_count = sum(1 for s in systems if s["vendor"])
    blank_status_year = sum(1 for s in systems if not s["status_year"])
    blank_status = sum(1 for s in systems if s["status"] == "unknown")
    blank_built_by = sum(1 for s in systems if s["built_by"] == "unknown")

    personal_info_counts = {}
    for s in systems:
        v = s["involves_personal_info"] or "blank"
        personal_info_counts[v] = personal_info_counts.get(v, 0) + 1

    cat_counts = {}
    for s in systems:
        c = s["purpose_category"]
        cat_counts[c] = cat_counts.get(c, 0) + 1
    purpose_categories = [{"category": c, "count": n}
                          for c, n in sorted(cat_counts.items(),
                                             key=lambda kv: -kv[1])]

    top5 = institutions[:5]
    showcase = {
        "top5_institutions": [
            {"name": t["name"], "total": t["total"],
             "production": t["production"], "development": t["development"],
             "retired": t["retired"], "unknown": t["unknown"]}
            for t in top5
        ],
        "build_shares": [
            {"built_by": k, "count": build_counts[k],
             "pct": build_share_pct[k]}
            for k in sorted(build_counts, key=lambda k: -build_counts[k])
        ],
        "oldest_system": {"name_en": oldest["name_en"],
                          "institution": oldest["institution"],
                          "status_year": oldest["status_year"],
                          "id": oldest["id"]},
        "spend_card": "Reported aggregate figures only; see spend.json. "
                      "No per-system costs exist.",
        "vendor_named_count": vendor_named_count,
        "blank_status_year_count": blank_status_year,
        "blank_status_count": blank_status,
        "blank_built_by_count": blank_built_by,
    }

    summary = {
        "meta": {
            "retrieved": RETRIEVED,
            "source_name": "GC AI Register (MVP)",
            "source_url": SOURCE_URL,
            "csv_filename": CSV_FILENAME,
            "csv_dataset_date": "2026-04-28",
            "total_records": len(systems),
            "row_count_verified": True,
        },
        "status_counts": status_counts,
        "status_note": (
            "The November 2025 launch announcement described register "
            "stages as research / proof-of-concept / development / "
            "deployed, but the published CSV (2026-04-28) actually uses "
            "'In production', 'In development', 'Retired', and blank. "
            "Normalized to production / development / retired / unknown. "
            "Raw status variants present: 'In production' (153), "
            "'In production ' with trailing space (5), 'in production' "
            "lowercase (2), 'In development' (171), 'In development ' "
            "with trailing space (11), 'Retired' (28), blank (42)."
        ),
        "build_counts": build_counts,
        "build_share_pct": build_share_pct,
        "institutions": institutions,
        "institution_name_strings": len(orgs),
        "institutions_claimed_by_tbs": 42,
        "org_discrepancy_note": org_discrepancy_note,
        "oldest": oldest,
        "year_histogram": year_histogram,
        "vendor_named_count": vendor_named_count,
        "personal_info_counts": personal_info_counts,
        "purpose_categories": purpose_categories,
        "showcase": showcase,
    }
    with open(os.path.join(DATA, "summary.json"), "w") as fh:
        json.dump(summary, fh, indent=1, ensure_ascii=False)

    # ---------- spend.json (reported aggregates ONLY) ----------
    cp_caveats = [
        "Supplied by departments in response to MP Jagsharan Singh "
        "Mahal's request; not all departments complied",
        "RCMP reported no centralized database",
        "CSE and CSIS declined to provide information",
        "Range spans a few hundred dollars (chatbot subscriptions) to "
        "multimillion-dollar contracts",
        "Reported total, not an audited figure",
    ]
    spend = {
        "meta": {
            "retrieved": RETRIEVED,
            "warning": "Aggregate reporting only. No per-system costs "
                       "exist in any public source. Never divide or "
                       "allocate these totals across systems.",
        },
        "rows": [
            {
                "label_en": "Reported federal AI spend since 2023",
                "amount_cad_millions": 800,
                "scope_en": "Total reported by federal departments in "
                            "response to MP Jagsharan Singh Mahal's request",
                "source": "Canadian Press via Global News",
                "source_date": "2026-05-13",
                "caveats": cp_caveats,
            },
            {
                "label_en": "Dayforce",
                "amount_cad_millions": 350,
                "scope_en": "Public-service HR/pay system contract "
                            "(Phoenix replacement), PSPC",
                "source": "Canadian Press via Global News",
                "source_date": "2026-05-13",
                "caveats": [],
            },
            {
                "label_en": "Cohere",
                "amount_cad_millions": 240,
                "scope_en": "Investment in Cohere Inc., ISED",
                "source": "Canadian Press via Global News",
                "source_date": "2026-05-13",
                "caveats": [],
            },
            {
                "label_en": "National Defence",
                "amount_cad_millions": 83.7,
                "scope_en": "AI spend reported by the Department of "
                            "National Defence",
                "source": "Canadian Press via Global News",
                "source_date": "2026-05-13",
                "caveats": [],
            },
            {
                "label_en": "Canada Revenue Agency",
                "amount_cad_millions": 29.9,
                "scope_en": "AI spend reported by the Canada Revenue Agency",
                "source": "Canadian Press via Global News",
                "source_date": "2026-05-13",
                "caveats": [],
            },
        ],
    }
    with open(os.path.join(DATA, "spend.json"), "w") as fh:
        json.dump(spend, fh, indent=1, ensure_ascii=False)

    # ---------- outcome_join.json (intentionally empty) ----------
    outcome_join = {
        "schema": {
            "fields": [
                {"name": "system_id", "type": "string",
                 "description": "Stable public ID (AIRO-NNNN)",
                 "availability": "populated"},
                {"name": "system_name", "type": "string",
                 "description": "English name of the AI system",
                 "availability": "populated"},
                {"name": "institution", "type": "string",
                 "description": "Federal institution reporting the system",
                 "availability": "populated"},
                {"name": "per_system_cost_cad", "type": "number",
                 "description": "Total cost attributable to this system",
                 "availability": "missing"},
                {"name": "deployment_date", "type": "date",
                 "description": "Date the system went live in production",
                 "availability": "missing"},
                {"name": "outcome_metric", "type": "string",
                 "description": "Measured outcome: cost saved, time "
                                "reduced, accuracy improved",
                 "availability": "missing"},
                {"name": "baseline", "type": "string",
                 "description": "Pre-AI baseline the outcome is measured "
                                "against",
                 "availability": "missing"},
            ]
        },
        "rows": [],
        "missing_links": [
            "no per-system cost data in the Register or any public source",
            "no go-live/deployment dates joined to systems (status_year "
            "is a year in most rows, blank in 66 of 412)",
            "no outcome metrics joined to named systems anywhere public",
        ],
        "statement_en": "This table is intentionally empty. It defines "
                        "the join that would be needed to answer whether "
                        "a government AI system made a service cheaper or "
                        "faster. No public source currently provides all "
                        "three links for any system.",
    }
    with open(os.path.join(DATA, "outcome_join.json"), "w") as fh:
        json.dump(outcome_join, fh, indent=1, ensure_ascii=False)

    # ---------- snapshot ----------
    os.makedirs(SNAP, exist_ok=True)
    snap_csv = os.path.join(SNAP, "ai-register-mvp.csv")
    shutil.copyfile(INPUT_CSV, snap_csv)
    sha = hashlib.sha256()
    with open(snap_csv, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            sha.update(chunk)
    with open(os.path.join(SNAP, "snapshot_meta.json"), "w") as fh:
        json.dump({
            "retrieved": RETRIEVED,
            "source_url": SOURCE_URL,
            "original_filename": CSV_FILENAME,
            "dataset_date": "2026-04-28",
            "sha256": sha.hexdigest(),
            "rows": len(systems),
        }, fh, indent=1)

    # ---------- public copies ----------
    os.makedirs(PUB, exist_ok=True)
    for name in ["systems.json", "spend.json", "outcome_join.json"]:
        shutil.copyfile(os.path.join(DATA, name),
                        os.path.join(PUB, {
                            "spend.json": "spend_reported.json",
                            "outcome_join.json": "outcome_join_schema.json",
                        }.get(name, name)))

    with open(os.path.join(PUB, "systems.csv"), "w",
              newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["id", "register_id", "name_en", "institution", "status",
                    "built_by", "vendor", "status_year",
                    "purpose_category"])
        for s in systems:
            w.writerow([s["id"], s["register_id"], s["name_en"],
                        s["institution"], s["status"], s["built_by"],
                        s["vendor"], s["status_year"],
                        s["purpose_category"]])

    # ---------- DATA_NOTES.md ----------
    notes = """# DATA_NOTES.md — Canada AI ROI Ledger

## Source
- **Dataset:** Government of Canada AI Register (MVP), open.canada.ca
  dataset `fcbc0200-79ba-4fa4-94a6-00e32facea6b`.
- **Source URL:** https://open.canada.ca/data/en/dataset/fcbc0200-79ba-4fa4-94a6-00e32facea6b
- **Dataset CSV date:** 2026-04-28 (filename
  `gc-ai-register-mvp-registre-de-lia-du-gc-pmv-04-26.csv`).
- **Retrieved:** 2026-10-08. Raw snapshot committed at
  `data/snapshots/2026-10-08/ai-register-mvp.csv` (+ `snapshot_meta.json`
  with SHA-256). Row count verified: 412.

## Normalization decisions
- **status** (`ai_system_status_en`, trimmed + lowercased):
  `in production` -> `production`; `in development` -> `development`;
  `retired` -> `retired`; blank -> `unknown`. Raw kept as `status_raw`.
- **built_by** (`developed_by_en`, trimmed + lowercased):
  `government of canada` -> `government`; `vendor` -> `vendor`;
  `open source` -> `open_source`; `other` -> `other`; blank -> `unknown`.
  Raw kept as `built_by_raw`.
- **institution**: `government_organization` trimmed, kept verbatim as
  published (EN and FR names joined by " / ").
- **purpose_category**: heuristic first-match keyword rules over
  `name_ai_system_en` + `ai_system_capabilities_en` (see script docstring
  for the full rule table). This is a browsing convenience, NOT a source
  field. One category per row; blank text -> `unspecified`.
- **IDs**: `AIRO-0001`..`AIRO-0412` assigned in sorted `ai_register_id`
  order. These are the stable public IDs.
- **Spend**: `data/spend.json` carries ONLY reported media aggregates
  (Canadian Press via Global News, 2026-05-13). The Register contains no
  cost data; no public source joins costs to systems.
- **outcome_join.json** is intentionally empty: it defines the join
  needed to answer "did this system make a service cheaper or faster"
  and states that no public source provides all three links.

## Known defects (in the source CSV)
- Raw status variants: "In production " (trailing space, 5 rows),
  "in production" (lowercase, 2 rows), "In development " (trailing
  space, 11 rows) alongside the clean forms; all normalized as above.
- 42 blank statuses -> `unknown`.
- 66 blank `status_year` values (status_date column). All non-blank
  values are 4-digit years.
- 30 blank `developed_by` values -> `unknown`; 1 row is "Other " with a
  trailing space -> `other`.
- 43 distinct `government_organization` strings vs the 42 institutions
  TBS claimed at launch. No two strings share the same EN or FR part, so
  there is no exact duplicate pair in the CSV; the gap is not resolvable
  from the file alone (see `org_discrepancy_note` in summary.json).
- `purpose_category` is heuristic; rows whose capability text is generic
  (e.g. "Machine Learning") land in `analytics_prediction`, which may
  overstate that category.

## Rebuild
`python3 scripts/build_data.py` — reads `/tmp/airoi/ai-register.csv`,
rewrites all outputs deterministically.
"""
    with open(os.path.join(DATA, "DATA_NOTES.md"), "w") as fh:
        fh.write(notes)

    print("status:", status_counts)
    print("built_by:", build_counts, build_share_pct)
    print("orgs:", len(orgs), "| vendor named:", vendor_named_count,
          "| blank years:", blank_status_year)
    print("purpose:", dict(sorted(cat_counts.items(),
                                  key=lambda kv: -kv[1])))
    print("oldest:", oldest["name_en"], oldest["institution"],
          oldest["status_year"], oldest["id"])
    print("top5 institutions:")
    for t in top5:
        print(f"  {t['total']:3d}  {t['name'][:60]}  "
              f"prod={t['production']} dev={t['development']} "
              f"ret={t['retired']} unk={t['unknown']}")


if __name__ == "__main__":
    main()
