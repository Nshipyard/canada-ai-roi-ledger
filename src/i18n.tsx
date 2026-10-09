"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export type Lang = "en" | "fr";

const en = {
  banner: {
    line: "An open-source civic project. Not affiliated with the Government of Canada.",
    badge: "Open source",
  },
  nav: { explorer: "Explorer", showcase: "Showcase", developers: "Developers", data: "Data", back: "All projects" },
  hero: {
    kicker: "Nshipyard Canada · Open data project",
    title: "412 government AI systems. Zero public ROI records.",
    sub: "Canada published its AI Register in November 2025: 412 systems across 42 institutions, retrieved here on 2026-10-08. The register says what exists, not what it cost or whether it worked. Reported AI spending since 2023 exceeds $800M, yet no public source connects one system to its price tag or to a measured outcome. This project normalizes the register, publishes the spending with its caveats, and publishes the gap as data.",
    cta1: "Search the systems",
    cta2: "Read the methodology",
  },
  stats: [
    { value: "412", label: "AI systems in the federal register (MVP snapshot, retrieved 2026-10-08), filed under 43 institution name strings for 42 reporting institutions" },
    { value: "160", label: "systems marked In production; 182 are In development, 28 retired, and 42 carry no status at all" },
    { value: "37.9%", label: "of systems built by vendors (156 of 412); 43.7% were built in-house by the Government of Canada" },
    { value: "$800M+", label: "in reported federal AI spending since 2023 (parliamentary reporting, May 2026); per-system costs are published nowhere" },
  ],
  explorer: {
    kicker: "Explorer",
    title: "Search 412 AI systems.",
    search: "Search by system name or institution…",
    statusFilter: "All statuses",
    builtByFilter: "All build sources",
    showing: "Showing",
    of: "of",
    noResult: "No systems match.",
    empty: "Search above or filter by status and build source. Every record keeps its stable AIRO id, the normalized fields, and the raw source values for audit.",
    back: "Back to results",
    systemId: "System ID",
    registerId: "Register ID",
    institution: "Institution",
    status: "Status",
    builtBy: "Built by",
    vendor: "Vendor",
    statusYear: "Status year",
    purpose: "Purpose category",
    purposeNote: "Heuristic keyword tag, not a source field",
    description: "Description",
    capabilities: "Capabilities",
    personalInfo: "Involves personal information",
    results: "Reported results",
    notReported: "Not reported",
    statusNames: { production: "In production", development: "In development", retired: "Retired", unknown: "No status reported" } as Record<string, string>,
    builtByNames: { government: "Government of Canada", vendor: "Vendor", open_source: "Open source", other: "Other", unknown: "Not reported" } as Record<string, string>,
  },
  showcase: {
    kicker: "Showcase",
    title: "Questions you couldn't ask before.",
    body: "The register answers what exists and where. Nothing public answers what it cost or whether it worked. These cards show what the normalized data can prove, and the last card shows what nobody can prove yet. Every number carries its source and retrieval date.",
    q1: "Which institutions run the most AI, and how much of it is actually deployed?",
    a1: "Rank every reporting institution by systems in production versus still in development. The raw register cannot sort this; the normalized file can. Deployment is concentrated: the top reporters hold a disproportionate share of the systems actually in production.",
    q2: "Who builds the government's AI: vendors or public servants?",
    a2: "Vendors built 156 of 412 systems (37.9%); the Government of Canada built 180 (43.7%) in-house. Open source accounts for 25. For 30 systems the register does not say who built them.",
    q3: "How old is the oldest registered system?",
    a3: "Fuzzy Search (SSAName3), a name-matching tool at the Canada Border Services Agency, dates to 1994: three decades before the register existed. 66 of 412 systems carry no date at all.",
    q4: "Where did the reported $800M go?",
    a4: "Two deals dominate the reporting: a $350M Dayforce HR and pay contract and a $240M Cohere investment. National Defence reported $83.7M, the CRA $29.9M. Every figure below is a reported aggregate with caveats, never a per-system cost.",
    caveatsTitle: "Caveats, printed on the receipt",
    q5: "Did any of this make a public service cheaper or faster?",
    a5: "No public source can answer this. The register has no cost fields and no outcome fields. The outcome-join table on this site is published intentionally empty: 0 rows. Three links are missing, and until they exist every AI productivity claim about government is unverifiable.",
    missingLinksTitle: "The three missing links",
    outcomeRows: "populated outcome rows",
    retrievedNote: "Register snapshot retrieved 2026-10-08 from open.canada.ca. Spend figures: Canadian Press via Global News, 2026-05-13.",
  },
  methodology: {
    kicker: "Methodology",
    title: "How the ledger was built, and where it is weak.",
    items: [
      "Source: the GC AI Register (MVP) CSV from open.canada.ca, retrieved 2026-10-08, 412 rows. A byte-identical snapshot is committed under data/snapshots/2026-10-08/, so every number on this site is reproducible.",
      "Normalization is documented and reversible: status and build source map to canonical slugs (production, development, retired, unknown) with the raw values preserved on every record. The November 2025 launch announcement described stages like research and proof-of-concept; the published CSV actually uses In production, In development, Retired, or nothing at all: 42 rows carry no status.",
      "purpose_category is a keyword heuristic over the capabilities text, not a source field. It is a suggestion for browsing, never a classification.",
      "Institution strings are kept as published (English and French joined by ' / '). The register claims 42 reporting institutions; the CSV contains 43 distinct organization strings. The discrepancy is documented in the data notes, not smoothed over.",
      "Spending appears only as reported aggregates, each row carrying its source, date, and caveats. The $800M+ total comes from May 2026 parliamentary-request reporting with incomplete departmental compliance: the RCMP had no centralized database and CSE/CSIS declined. Per-system costs do not exist in any public source, so this site never allocates the total across systems.",
      "The outcome-join schema is published with zero rows on purpose. It defines the exact table needed to answer whether a system made a service cheaper or faster: system id, go-live date, cost, outcome metric, before and after values. All three links are missing in public sources today.",
      "Tiered honesty: Tier 1 is observed facts from the register. Tier 2 is reported aggregates from journalism and parliamentary records, labeled as such. Tier 3, modeled estimates, does not appear on this site. Nothing here claims what AI caused.",
    ],
  },
  developers: {
    kicker: "For developers",
    title: "Query it from code, or from an agent.",
    body: "Three consumption paths, same normalized data. REST for applications, OpenAPI for integration, MCP tools over streamable HTTP for AI agents.",
    endpoints: "Endpoints",
    tryIt: "Try it",
    openapi: "OpenAPI spec",
    mcpTitle: "MCP server",
    mcpBody: "One streamable-HTTP endpoint. Tools: system_lookup, system_search, ledger_summary, spend_reported, outcome_gap.",
  },
  mcp: {
    kicker: "Connect your agent",
    title: "Put this data to work inside your AI tools.",
    body: "Pick your harness, copy the prompt, send it to your agent. Your agent runs the setup itself.",
    tabs: { chatgpt: "ChatGPT", claude: "Claude", claudecode: "Claude Code", cli: "CLI", other: "Other" },
    cardTitle: "Copy and send this to {tab}",
    copy: "Copy",
    copied: "Copied",
    chatgptNote: "ChatGPT connects through the documented REST API rather than MCP directly.",
    pChatgpt:
      "I want to use the {displayName} through its API.\n- OpenAPI spec: {origin}/api/openapi.json\n- REST base: {origin}/api/v1\nFirst tell me in two sentences what this API offers, then {exampleLower}, and show me the result.",
    pClaude:
      "In Claude (claude.ai), open Settings, then Connectors, and add a custom connector:\n- Name: {displayName}\n- URL: {origin}/mcp\nThen list the available tools, {exampleLower}, and show me the result.",
    pClaudeCode:
      "Set up the {displayName} MCP server so I can query it from here.\n1. Run: claude mcp add --transport http {slug} {origin}/mcp\n2. Run `claude mcp list` to confirm it connected.\n3. {example}, and show me the result.",
    pCli:
      "# MCP endpoint (streamable HTTP)\n{origin}/mcp\n\n# List the available tools\ncurl -s -X POST {origin}/mcp -H 'Content-Type: application/json' \\\n  -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}'",
    otherTitle: "Everything else",
    otherBody: "Any harness that speaks MCP over streamable HTTP, or plain REST.",
    mcpEndpoint: "MCP endpoint",
    openapiSpec: "OpenAPI spec",
    restBase: "REST base",
  },
  downloads: {
    kicker: "Data",
    title: "Take the files.",
    body: "The normalized register, the reported spend table, and the intentionally empty outcome-join schema. MIT licensed, as CSV and JSON.",
    files: [
      { name: "systems.csv", desc: "412 normalized systems with stable AIRO-0001 ids" },
      { name: "systems.json", desc: "Full records with descriptions and raw values preserved" },
      { name: "spend_reported.json", desc: "Reported AI spending aggregates with source and caveats on every row" },
      { name: "outcome_join_schema.json", desc: "The outcome-join schema with zero rows and the three missing links named" },
    ],
    download: "Download",
  },
  footer: {
    line: "An open-source civic project. Not affiliated with the Government of Canada.",
    sources: "Register source: GC AI Register (MVP), Treasury Board of Canada Secretariat, via open.canada.ca (retrieved 2026-10-08). Spend figures: Canadian Press / Global News parliamentary-request reporting, May 2026.",
  },
};

export type Dict = typeof en;

const fr: Dict = {
  banner: {
    line: "Un projet civique à code source ouvert. Sans affiliation avec le gouvernement du Canada.",
    badge: "Code source ouvert",
  },
  nav: { explorer: "Explorateur", showcase: "Vitrine", developers: "Développeurs", data: "Données", back: "Tous les projets" },
  hero: {
    kicker: "Nshipyard Canada · Projet de données ouvertes",
    title: "412 systèmes d'IA gouvernementaux. Zéro dossier public de rendement.",
    sub: "Le Canada a publié son registre de l'IA en novembre 2025 : 412 systèmes dans 42 institutions, récupérés ici le 2026-10-08. Le registre dit ce qui existe, pas ce que cela a coûté ni si cela a fonctionné. Les dépenses d'IA déclarées depuis 2023 dépassent 800 M$, mais aucune source publique ne relie un seul système à son prix ou à un résultat mesuré. Ce projet normalise le registre, publie les dépenses avec leurs réserves, et publie l'écart comme donnée.",
    cta1: "Rechercher les systèmes",
    cta2: "Lire la méthodologie",
  },
  stats: [
    { value: "412", label: "systèmes d'IA au registre fédéral (instantané PMV, récupéré le 2026-10-08), classés sous 43 chaînes de noms d'institutions pour 42 institutions déclarantes" },
    { value: "160", label: "systèmes marqués En production; 182 sont En développement, 28 retirés, et 42 sans statut du tout" },
    { value: "37,9 %", label: "des systèmes construits par des fournisseurs (156 sur 412); 43,7 % ont été construits à l'interne par le gouvernement du Canada" },
    { value: "800 M$+", label: "de dépenses fédérales d'IA déclarées depuis 2023 (données parlementaires, mai 2026); les coûts par système ne sont publiés nulle part" },
  ],
  explorer: {
    kicker: "Explorateur",
    title: "Recherchez parmi 412 systèmes d'IA.",
    search: "Rechercher par nom de système ou institution…",
    statusFilter: "Tous les statuts",
    builtByFilter: "Toutes les sources",
    showing: "Affichage de",
    of: "sur",
    noResult: "Aucun système ne correspond.",
    empty: "Recherchez ci-dessus ou filtrez par statut et source. Chaque dossier conserve son ID AIRO stable, les champs normalisés et les valeurs brutes pour audit.",
    back: "Retour aux résultats",
    systemId: "ID système",
    registerId: "ID registre",
    institution: "Institution",
    status: "Statut",
    builtBy: "Construit par",
    vendor: "Fournisseur",
    statusYear: "Année du statut",
    purpose: "Catégorie d'usage",
    purposeNote: "Étiquette heuristique par mots-clés, pas un champ source",
    description: "Description",
    capabilities: "Capacités",
    personalInfo: "Renseignements personnels en cause",
    results: "Résultats déclarés",
    notReported: "Non déclaré",
    statusNames: { production: "En production", development: "En développement", retired: "Retiré", unknown: "Aucun statut déclaré" } as Record<string, string>,
    builtByNames: { government: "Gouvernement du Canada", vendor: "Fournisseur", open_source: "Code source ouvert", other: "Autre", unknown: "Non déclaré" } as Record<string, string>,
  },
  showcase: {
    kicker: "Vitrine",
    title: "Des questions impossibles à poser avant.",
    body: "Le registre répond à « quoi » et « où ». Aucune source publique ne répond à « combien » ni « est-ce que ça a marché ». Ces cartes montrent ce que les données normalisées peuvent prouver, et la dernière montre ce que personne ne peut encore prouver. Chaque chiffre porte sa source et sa date de récupération.",
    q1: "Quelles institutions utilisent le plus d'IA, et quelle part est vraiment déployée?",
    a1: "Classez chaque institution déclarante selon ses systèmes en production contre ceux encore en développement. Le registre brut ne permet pas ce tri; le fichier normalisé le permet. Le déploiement est concentré : les institutions les plus déclarantes détiennent une part disproportionnée des systèmes réellement en production.",
    q2: "Qui construit l'IA du gouvernement : les fournisseurs ou les fonctionnaires?",
    a2: "Les fournisseurs ont construit 156 systèmes sur 412 (37,9 %); le gouvernement du Canada en a construit 180 (43,7 %) à l'interne. Le code source ouvert en compte 25. Pour 30 systèmes, le registre ne dit pas qui les a construits.",
    q3: "Quel âge a le plus vieux système enregistré?",
    a3: "Fuzzy Search (SSAName3), un outil d'appariement de noms à l'Agence des services frontaliers du Canada, date de 1994 : trois décennies avant l'existence du registre. 66 systèmes sur 412 ne portent aucune date.",
    q4: "Où sont allés les 800 M$ déclarés?",
    a4: "Deux transactions dominent les déclarations : un contrat Dayforce de 350 M$ (RH et paie) et un investissement de 240 M$ dans Cohere. La Défense nationale a déclaré 83,7 M$, l'ARC 29,9 M$. Chaque chiffre ci-dessous est un agrégat déclaré avec réserves, jamais un coût par système.",
    caveatsTitle: "Les réserves, imprimées sur le reçu",
    q5: "Est-ce que tout cela a rendu un service public moins cher ou plus rapide?",
    a5: "Aucune source publique ne peut répondre à cette question. Le registre n'a ni champs de coûts ni champs de résultats. La table de jointure des résultats sur ce site est publiée volontairement vide : 0 ligne. Trois liens manquent, et tant qu'ils manquent, chaque affirmation sur la productivité de l'IA au gouvernement est invérifiable.",
    missingLinksTitle: "Les trois liens manquants",
    outcomeRows: "lignes de résultats renseignées",
    retrievedNote: "Instantané du registre récupéré le 2026-10-08 sur open.canada.ca. Dépenses : La Presse canadienne via Global News, 2026-05-13.",
  },
  methodology: {
    kicker: "Méthodologie",
    title: "Comment le registre a été construit, et où il est faible.",
    items: [
      "Source : le CSV du registre de l'IA du GC (PMV) sur open.canada.ca, récupéré le 2026-10-08, 412 lignes. Un instantané identique à l'octet est versé sous data/snapshots/2026-10-08/ : chaque chiffre de ce site est donc reproductible.",
      "La normalisation est documentée et réversible : le statut et la source sont ramenés à des codes canoniques (production, development, retired, unknown), avec les valeurs brutes conservées sur chaque dossier. L'annonce de lancement de novembre 2025 décrivait des étapes comme la recherche et la preuve de concept; le CSV publié utilise en réalité En production, En développement, Retiré, ou rien du tout : 42 lignes n'ont aucun statut.",
      "purpose_category est une heuristique par mots-clés sur le texte des capacités, pas un champ source. C'est une suggestion de navigation, jamais une classification.",
      "Les chaînes d'institutions sont conservées telles que publiées (anglais et français joints par « / »). Le registre annonce 42 institutions déclarantes; le CSV contient 43 chaînes d'organisations distinctes. L'écart est documenté dans les notes de données, pas gommé.",
      "Les dépenses n'apparaissent qu'en agrégats déclarés, chaque ligne portant sa source, sa date et ses réserves. Le total de 800 M$+ vient de déclarations parlementaires de mai 2026 avec une conformité incomplète des ministères : la GRC n'avait aucune base de données centralisée et le CSTC et le SCRS ont refusé. Les coûts par système n'existent dans aucune source publique : ce site ne répartit donc jamais le total entre les systèmes.",
      "Le schéma de jointure des résultats est publié avec zéro ligne, à dessein. Il définit la table exacte qu'il faudrait pour dire si un système a rendu un service moins cher ou plus rapide : ID système, date de mise en service, coût, indicateur de résultat, valeurs avant et après. Les trois liens manquent aujourd'hui dans les sources publiques.",
      "Honnêteté par paliers : le palier 1, ce sont les faits observés du registre. Le palier 2, ce sont les agrégats déclarés du journalisme et des dossiers parlementaires, étiquetés comme tels. Le palier 3, les estimations modélisées, n'apparaît pas sur ce site. Rien ici n'affirme ce que l'IA a causé.",
    ],
  },
  developers: {
    kicker: "Pour les développeurs",
    title: "Interrogez-le depuis du code, ou depuis un agent.",
    body: "Trois façons de consommer les mêmes données normalisées. REST pour les applications, OpenAPI pour l'intégration, outils MCP en HTTP continu pour les agents IA.",
    endpoints: "Points de terminaison",
    tryIt: "Essayer",
    openapi: "Spécification OpenAPI",
    mcpTitle: "Serveur MCP",
    mcpBody: "Un point de terminaison HTTP continu. Outils : system_lookup, system_search, ledger_summary, spend_reported, outcome_gap.",
  },
  mcp: {
    kicker: "Connectez votre agent",
    title: "Exploitez ces données dans vos outils d'IA.",
    body: "Choisissez votre plateforme, copiez l'invite, envoyez-la à votre agent. Votre agent exécute la configuration lui-même.",
    tabs: { chatgpt: "ChatGPT", claude: "Claude", claudecode: "Claude Code", cli: "CLI", other: "Autre" },
    cardTitle: "Copiez et envoyez ceci à {tab}",
    copy: "Copier",
    copied: "Copié",
    chatgptNote: "ChatGPT se connecte via l'API REST documentée plutôt que directement en MCP.",
    pChatgpt:
      "Je veux utiliser {displayName} via son API.\n- Spécification OpenAPI : {origin}/api/openapi.json\n- Base REST : {origin}/api/v1\nD'abord, dis-moi en deux phrases ce que cette API offre, puis {exampleLower}, et montre-moi le résultat.",
    pClaude:
      "Dans Claude (claude.ai), ouvre les paramètres, puis Connecteurs, et ajoute un connecteur personnalisé :\n- Nom : {displayName}\n- URL : {origin}/mcp\nEnsuite, liste les outils disponibles, {exampleLower}, et montre-moi le résultat.",
    pClaudeCode:
      "Configure le serveur MCP {displayName} pour que je puisse l'interroger d'ici.\n1. Exécute : claude mcp add --transport http {slug} {origin}/mcp\n2. Exécute `claude mcp list` pour confirmer la connexion.\n3. {example}, et montre-moi le résultat.",
    pCli:
      "# Point de terminaison MCP (HTTP continu)\n{origin}/mcp\n\n# Lister les outils disponibles\ncurl -s -X POST {origin}/mcp -H 'Content-Type: application/json' \\\n  -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}'",
    otherTitle: "Tout le reste",
    otherBody: "Toute plateforme qui parle MCP en HTTP continu, ou REST tout court.",
    mcpEndpoint: "Point de terminaison MCP",
    openapiSpec: "Spécification OpenAPI",
    restBase: "Base REST",
  },
  downloads: {
    kicker: "Données",
    title: "Prenez les fichiers.",
    body: "Le registre normalisé, la table des dépenses déclarées et le schéma de jointure volontairement vide. Licence MIT, en CSV et JSON.",
    files: [
      { name: "systems.csv", desc: "412 systèmes normalisés avec ID stables AIRO-0001" },
      { name: "systems.json", desc: "Dossiers complets avec descriptions et valeurs brutes conservées" },
      { name: "spend_reported.json", desc: "Agrégats de dépenses d'IA déclarées, avec source et réserves sur chaque ligne" },
      { name: "outcome_join_schema.json", desc: "Le schéma de jointure des résultats avec zéro ligne et les trois liens manquants nommés" },
    ],
    download: "Télécharger",
  },
  footer: {
    line: "Un projet civique à code source ouvert. Sans affiliation avec le gouvernement du Canada.",
    sources: "Source du registre : registre de l'IA du GC (PMV), Secrétariat du Conseil du Trésor, via open.canada.ca (récupéré le 2026-10-08). Dépenses : reportage de La Presse canadienne / Global News sur demande parlementaire, mai 2026.",
  },
};

const dicts: Record<Lang, Dict> = { en, fr };

const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: Dict }>({
  lang: "en",
  setLang: () => {},
  t: en,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return <LangCtx.Provider value={{ lang, setLang, t: dicts[lang] }}>{children}</LangCtx.Provider>;
}

export function useLang() {
  return useContext(LangCtx);
}
