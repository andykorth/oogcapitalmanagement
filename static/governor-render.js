import { UPKEEP_BUILDINGS } from "/infra-data.js";

function formatRelativeTime(epochMs) {
  if (!epochMs) return "";
  const now = Date.now();
  let diff = epochMs - now;
  const future = diff > 0;
  diff = Math.abs(diff);
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr  = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  let primary = "", secondary = "";
  if (day > 0)      { primary = `${day}d`;  secondary = `${hr % 24}h`; }
  else if (hr > 0)  { primary = `${hr}h`;   secondary = `${min % 60}m`; }
  else if (min > 0) { primary = `${min}m`;  secondary = `${sec % 60}s`; }
  else              { primary = `${sec}s`; }
  const timeStr = secondary && !secondary.startsWith("0") ? `${primary} ${secondary}` : primary;
  return future ? `in ${timeStr}` : `${timeStr} ago`;
}

export function renderPlanetHeader(planetData, maxPeriod, startEpochMs, siteCount) {
  const name = planetData.PlanetName || "";
  const id   = planetData.PlanetNaturalId || "";
  const startDate = startEpochMs
    ? new Date(startEpochMs).toLocaleString(undefined, {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";
  const endEpochMs = startEpochMs ? startEpochMs + 7 * 24 * 3600 * 1000 : null;
  const endsIn = endEpochMs ? formatRelativeTime(endEpochMs) : "—";
  const basesStr = siteCount != null ? ` · ${siteCount} base${siteCount !== 1 ? 's' : ''}` : '';
  document.getElementById("planet-header").innerHTML = `
    <div class="planet-name">${name}<span class="planet-id">${id}</span></div>
    <div class="planet-meta">Population Report #${maxPeriod ?? "—"} · Started ${startDate} · Ends ${endsIn}${basesStr}</div>
  `;
}

export function renderInfrastructureTable(projectMap) {
  if (!projectMap.size) return null;

  const table = document.createElement("table");
  table.className = "table-auto border-collapse text-sm";

  table.innerHTML = `
    <thead>
      <tr>
        <th class="text-left pr-4">Building</th>
        <th class="text-right pr-4">Built</th>
        <th class="text-right">Current</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement("tbody");

  const upkeepOrder = UPKEEP_BUILDINGS.map(b => b.ticker);
  const sortedTickers = [...projectMap.keys()].sort((a, b) => {
    const ai = upkeepOrder.indexOf(a);
    const bi = upkeepOrder.indexOf(b);
    // Known buildings first (in UPKEEP_BUILDINGS order), unknown alphabetically after
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  for (const ticker of sortedTickers) {
    const { level, currentLevel } = projectMap.get(ticker);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="pr-4">${ticker}</td>
      <td class="text-right pr-4">${level}</td>
      <td class="text-right">${currentLevel}</td>
    `;
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  return table;
}

export function renderWorkforceTable(report) {
  const tiers = ["Pioneer", "Settler", "Technician", "Engineer", "Scientist"];

  const table = document.createElement("table");
  table.className = "table-auto border-collapse text-sm mb-6";

  table.innerHTML = `
    <thead>
      <tr>
        <th class="text-left pr-4">Metric</th>
        ${tiers.map(t => `<th class="text-right pr-4">${t}</th>`).join("")}
      </tr>
    </thead>
  `;

  const tbody = document.createElement("tbody");

  const rows = [
    { label: "Population",   key: "NextPopulation" },
    { label: "Change",       key: "PopulationDifference" },
    { label: "Happiness",    key: "AverageHappiness",  format: v => (v * 100).toFixed(1) + "%" },
    { label: "Unemployment", key: "UnemploymentRate",  format: v => (v * 100).toFixed(1) + "%" },
    { label: "Open Jobs",    key: "OpenJobs" },
  ];

  for (const row of rows) {
    const cells = tiers.map(tier => {
      const value = report[row.key + tier];
      return row.format
        ? `<td class="text-right pr-4">${row.format(value)}</td>`
        : `<td class="text-right pr-4">${value.toLocaleString()}</td>`;
    });
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="pr-4 font-semibold">${row.label}</td>
      ${cells.join("")}
    `;
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  return table;
}

export function renderNeedsTable(report) {
  const needs = [
    { key: "LifeSupport", label: "Life Support" },
    { key: "Safety",      label: "Safety" },
    { key: "Health",      label: "Health" },
    { key: "Comfort",     label: "Comfort" },
    { key: "Culture",     label: "Culture" },
    { key: "Education",   label: "Education" },
  ];

  const table = document.createElement("table");
  table.className = "table-auto border-collapse text-sm";

  const tbody = document.createElement("tbody");
  for (const { key, label } of needs) {
    const value = report["NeedFulfillment" + key] ?? 0;
    const pct = (value * 100).toFixed(1) + "%";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="pr-4 font-semibold">${label}</td>
      <td class="text-right pr-3">${pct}</td>
    `;
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  return table;
}
