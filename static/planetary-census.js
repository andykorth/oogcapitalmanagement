import { gzipCompressToBase64, gzipDecompressFromBase64, getCacheAge } from "/pricing-and-materials.js";

const CACHE_KEY      = "census_all_planets";
const CACHE_DURATION = 1 * 3600 * 1000; // 1 hour

const statusEl    = document.getElementById("census-status");
const filterInput = document.getElementById("census-filter");
const tableHead   = document.getElementById("census-thead");
const tableBody   = document.getElementById("census-tbody");
const refreshBtn  = document.getElementById("census-refresh-btn");
const cacheAgeEl  = document.getElementById("census-cache-age");
const cacheBar    = document.getElementById("census-cache-bar");
const summaryEl       = document.getElementById("census-summary");
const hideEmptyCheckbox = document.getElementById("census-hide-empty");

const TIERS = ["Pioneer", "Settler", "Technician", "Engineer", "Scientist"];

// ── Fetch / cache ──────────────────────────────────────────────────────────

async function fetchAllPlanets() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const envelope = JSON.parse(cached);
      if (Date.now() - envelope.timestamp < CACHE_DURATION) {
        return JSON.parse(gzipDecompressFromBase64(envelope.data));
      }
    } catch {}
  }

  const res = await fetch("https://api.fnar.net/planet/all_planets?include_population_reports=true");
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  const compressed = gzipCompressToBase64(JSON.stringify(data));
  localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: compressed }));
  return data;
}

// ── Data extraction ────────────────────────────────────────────────────────

function extractRow(planet) {
  const name      = planet.PlanetName      ?? planet.Name      ?? "—";
  const naturalId = planet.PlanetNaturalId ?? planet.NaturalId ?? "";
  const region    = planet.CurrencyCode    ?? "—";

  // Pick the report with the highest SimulationPeriod
  const reports = planet.PopulationReports ?? planet.InfrastructureReports ?? [];
  let report = null;
  for (const r of reports) {
    if (!report || r.SimulationPeriod > report.SimulationPeriod) report = r;
  }

  const pop = {};
  let total = 0;
  for (const tier of TIERS) {
    // Try both casing conventions: PopulationPioneer and NextPopulationPioneer
    const val = report?.["Population" + tier] ?? report?.["NextPopulation" + tier] ?? 0;
    pop[tier] = val;
    total += val;
  }

  return { name, naturalId, region, pop, total };
}

// ── Sort state ─────────────────────────────────────────────────────────────

let allRows     = [];
let filterText  = "";
let sortCol     = "total";   // default sort by total population
let sortDir     = -1;        // -1 = descending, 1 = ascending

const COLUMNS = [
  { key: "planet",     label: "Planet" },
  { key: "region",     label: "Region" },
  ...TIERS.map(t => ({ key: t.toLowerCase(), label: t })),
  { key: "total",      label: "Total" },
];

function getValue(row, key) {
  if (key === "planet")  return row.name.toLowerCase();
  if (key === "region")  return row.region;
  if (key === "total")   return row.total;
  const tier = TIERS.find(t => t.toLowerCase() === key);
  return tier ? (row.pop[tier] ?? 0) : 0;
}

function sortRows(rows) {
  return [...rows].sort((a, b) => {
    const av = getValue(a, sortCol);
    const bv = getValue(b, sortCol);
    if (typeof av === "string") return sortDir * av.localeCompare(bv);
    return sortDir * (av - bv);
  });
}

function filteredRows() {
  const hideEmpty = hideEmptyCheckbox.checked;
  const q = filterText.toLowerCase();
  return allRows.filter(r => {
    if (hideEmpty && r.total === 0) return false;
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      r.naturalId.toLowerCase().includes(q) ||
      r.region.toLowerCase().includes(q)
    );
  });
}

// ── Render ─────────────────────────────────────────────────────────────────

function renderHead() {
  const tr = document.createElement("tr");
  for (const col of COLUMNS) {
    const th = document.createElement("th");
    const isNumeric = col.key !== "planet" && col.key !== "region";
    if (isNumeric) th.className = "text-right";
    th.style.cursor = "pointer";
    th.style.userSelect = "none";
    th.style.whiteSpace = "nowrap";

    const arrow = sortCol === col.key ? (sortDir === -1 ? " ▼" : " ▲") : " ↕";
    th.textContent = col.label + arrow;
    th.dataset.col = col.key;
    th.addEventListener("click", () => {
      if (sortCol === col.key) {
        sortDir *= -1;
      } else {
        sortCol = col.key;
        // Numeric cols default descending; text cols default ascending
        sortDir = isNumeric ? -1 : 1;
      }
      renderHead();
      renderBody();
    });
    tr.appendChild(th);
  }
  tableHead.innerHTML = "";
  tableHead.appendChild(tr);
}

function fmt(n) {
  if (!n) return "—";
  return n.toLocaleString();
}

function renderBody() {
  const rows = sortRows(filteredRows());
  tableBody.innerHTML = "";

  for (const row of rows) {
    const tr = document.createElement("tr");

    // Planet name cell
    const nameCell = document.createElement("td");
    if (row.naturalId && row.naturalId !== row.name) {
      nameCell.innerHTML = `${row.name} <span style="color:var(--text-secondary);font-size:0.85em">(${row.naturalId})</span>`;
    } else {
      nameCell.textContent = row.name;
    }
    tr.appendChild(nameCell);

    // Region
    const regionCell = document.createElement("td");
    regionCell.textContent = row.region;
    tr.appendChild(regionCell);

    // Population tiers
    for (const tier of TIERS) {
      const td = document.createElement("td");
      td.className = "text-right";
      td.textContent = fmt(row.pop[tier]);
      tr.appendChild(td);
    }

    // Total
    const totalCell = document.createElement("td");
    totalCell.className = "text-right font-semibold";
    totalCell.textContent = fmt(row.total);
    tr.appendChild(totalCell);

    tableBody.appendChild(tr);
  }

  if (rows.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = COLUMNS.length;
    td.style.textAlign = "center";
    td.style.color = "var(--text-secondary)";
    td.textContent = "No planets match your filter.";
    tr.appendChild(td);
    tableBody.appendChild(tr);
  }

  // Summary line
  const showing  = rows.length;
  const total    = allRows.length;
  const totalPop = rows.reduce((s, r) => s + r.total, 0);
  const tierTotals = TIERS.map(tier => rows.reduce((s, r) => s + (r.pop[tier] ?? 0), 0));
  const tierSummary = TIERS.map((tier, i) => `${tier}: ${tierTotals[i].toLocaleString()}`).join(" · ");
  summaryEl.innerHTML =
    `Showing ${showing.toLocaleString()} of ${total.toLocaleString()} planets · Total: ${totalPop.toLocaleString()}<br>` +
    `<span style="color:var(--text-secondary)">${tierSummary}</span>`;
}

// ── Bootstrap ──────────────────────────────────────────────────────────────

async function load() {
  statusEl.textContent = "Loading…";
  try {
    const planets = await fetchAllPlanets();
    allRows = planets.map(extractRow);

    statusEl.textContent = "";
    cacheBar.style.display = "";
    cacheAgeEl.textContent = getCacheAge(CACHE_KEY) ?? "just loaded";

    renderHead();
    renderBody();
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Failed to load: " + err.message;
    statusEl.style.color = "#f87171";
  }
}

refreshBtn.addEventListener("click", () => {
  localStorage.removeItem(CACHE_KEY);
  cacheBar.style.display = "none";
  load();
});

filterInput.addEventListener("input", () => {
  filterText = filterInput.value.trim();
  renderBody();
});

hideEmptyCheckbox.addEventListener("change", renderBody);

load();
