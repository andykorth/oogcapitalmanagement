function formatTimestamp(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  let relative = "";
  if (diffDay > 0) relative = `${diffDay}d ago`;
  else if (diffHr > 0) relative = `${diffHr}h ago`;
  else if (diffMin > 0) relative = `${diffMin}m ago`;
  else relative = `${diffSec}s ago`;

  return `${d.toLocaleString()} (${relative})`;
}

function formatSize(bytes) {
  return bytes > 1000
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${bytes.toLocaleString()} bytes`;
}

function estimateSize(value) {
  return new Blob([value]).size;
}

// ── Group definitions ─────────────────────────────────────────────────────
// Groups are tested in order; the first match wins. "other" is the catch-all.

const GROUPS = [
  {
    key: "company",
    label: "Company / Intel Cache",
    description: "Per-company and apex-user data from intel lookups (24 h TTL)",
    match: key => key.startsWith("company_") || key.startsWith("apexuser_"),
    showEntries: false, // typically 100+ entries
  },
  {
    key: "corp",
    label: "Corporation Cache",
    description: "Corporation member lists (24 h TTL)",
    match: key => key.startsWith("corp_"),
    showEntries: true,
  },
  {
    key: "govhelper",
    label: "Governor Helper",
    description: "Planet infrastructure, population reports, and site counts (1 h TTL)",
    match: key =>
      ["infra_", "infra2_", "infra3_", "popreports_", "sitecount_", "planet_", "gov_helper_"].some(p =>
        key.startsWith(p)
      ),
    showEntries: true,
  },
  {
    key: "ship",
    label: "Ship Builder",
    description: "Ship part inventory per builder (30 min TTL)",
    match: key => key.startsWith("ship_inventory_cache"),
    showEntries: true,
  },
  {
    key: "prices",
    label: "Price & Market Data",
    description: "Exchange order book, pricing averages, material data, gateway data (1 h TTL)",
    match: key =>
      ["exchangeData", "pricingData", "materialData", "modeledPrices"].includes(key) ||
      key.startsWith("gateway_data_") ||
      key.startsWith("price-tool-"),
    showEntries: true,
  },
  {
    key: "other",
    label: "Other",
    description: "Settings and uncategorized data",
    match: () => true,
    showEntries: true,
  },
];

// ── Classify a single key into its group ─────────────────────────────────
// Returns the group key (string) for a given localStorage key.
// Uses the same first-match-wins order as the GROUPS array.

function getKeyGroup(key) {
  for (const g of GROUPS.slice(0, -1)) {
    if (g.match(key)) return g.key;
  }
  return "other";
}

// ── Parse localStorage into groups ────────────────────────────────────────

function parseLocalStorage() {
  const groupMap = {};
  for (const g of GROUPS) groupMap[g.key] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    if (!value) continue;

    const size = estimateSize(value);
    let timestamp = null;

    try {
      const parsed = JSON.parse(value);
      if (parsed.timestamp) timestamp = parsed.timestamp;
    } catch {
      // Not JSON — no timestamp
    }

    groupMap[getKeyGroup(key)].push({ key, size, timestamp });
  }

  return groupMap;
}

// ── Render ────────────────────────────────────────────────────────────────

function renderGroup(group, items) {
  const totalSize = items.reduce((sum, i) => sum + i.size, 0);

  const entryRows = items
    .map(
      (i) => `
      <tr>
        <td>${i.key}</td>
        <td>${formatTimestamp(i.timestamp)}</td>
        <td>${formatSize(i.size)}</td>
        <td><button data-key="${i.key}" class="delete-entry">Delete</button></td>
      </tr>`
    )
    .join("");

  const entriesTable = group.showEntries
    ? `<table>
        <thead>
          <tr><th>Key</th><th>Timestamp</th><th>Size</th><th></th></tr>
        </thead>
        <tbody>${entryRows}</tbody>
      </table>`
    : `<p style="font-size:0.82rem;color:var(--text-secondary);margin:0.25rem 0 0.5rem">
        (${items.length} entries — expand in browser DevTools if needed)
       </p>`;

  return `
    <div class="storage-group" data-group-key="${group.key}">
      <div class="storage-group-header">
        <div>
          <h2 class="storage-group-title">${group.label}</h2>
          <p class="storage-group-desc">${group.description}</p>
        </div>
        <div class="storage-group-meta">
          <span>${items.length} entr${items.length === 1 ? "y" : "ies"} &middot; ${formatSize(totalSize)}</span>
          <button class="delete-group" data-group-key="${group.key}">Delete All</button>
        </div>
      </div>
      ${entriesTable}
    </div>`;
}

function renderStorage() {
  const groupMap = parseLocalStorage();
  const content = document.getElementById("storageContent");
  content.innerHTML = "";

  for (const group of GROUPS) {
    const items = groupMap[group.key];
    if (items.length === 0) continue;
    content.insertAdjacentHTML("beforeend", renderGroup(group, items));
  }

  content.querySelectorAll(".delete-entry").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      localStorage.removeItem(e.target.dataset.key);
      renderStorage();
    })
  );

  content.querySelectorAll(".delete-group").forEach((btn) =>
    btn.addEventListener("click", () => {
      const groupKey = btn.dataset.groupKey;
      const group = GROUPS.find(g => g.key === groupKey);
      if (!group) return;
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && getKeyGroup(key) === group.key) localStorage.removeItem(key);
      }
      renderStorage();
    })
  );
}

renderStorage();
