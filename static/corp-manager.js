const TWO_WEEKS_MS = 14 * 24 * 3600 * 1000;

function formatRelativeTime(epochMs) {
  if (!epochMs) return "—";
  const diff = Math.abs(Date.now() - epochMs);
  const sec  = Math.floor(diff / 1000);
  const min  = Math.floor(sec / 60);
  const hr   = Math.floor(min / 60);
  const day  = Math.floor(hr / 24);
  if (day > 0)  return `${day}d ${hr % 24}h ago`;
  if (hr > 0)   return `${hr}h ${min % 60}m ago`;
  if (min > 0)  return `${min}m ago`;
  return `${sec}s ago`;
}

async function fetchCorpMembers(corpCode) {
  const cacheKey = `corp_${corpCode}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < 24 * 3600 * 1000) {
        return data;
      }
    } catch {}
  }
  const url = `https://rest.fnar.net/user/corporation/${corpCode}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Corporation not found");
  const data = await response.json();
  localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
  return data;
}

function loadCorpReport(graphType, height, corpCode) {
  const reportContainer = document.getElementById("reportContainer");

  if (corpCode == null || corpCode === "") {
    console.warn("No corpCode");
    return;
  }

  const userName = encodeURIComponent(corpCode);
  const iframe = document.createElement("iframe");
  iframe.src = `https://pmmg-products.github.io/reports/?${graphType}&companyName=${userName}&hideOptions`;
  iframe.width = "100%";
  iframe.height = height;
  iframe.style.border = "none";
  iframe.loading = "lazy";
  reportContainer.appendChild(iframe);
}

async function fetchCompanyData(companyCode) {
  const cacheKey = `company_v2_${companyCode}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < 24 * 3600 * 1000) {
        return data;
      }
    } catch {}
  }
  const url = `https://api.fnar.net/company/lookup?company=${encodeURIComponent(companyCode)}&include_planets=true`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const arr = await response.json();
  const data = Array.isArray(arr) && arr.length ? arr[0] : null;
  if (data) {
    localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
  }
  return data;
}

async function fetchApexUserData(companyCode) {
  const cacheKey = `apexuser_v1_${companyCode}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < 24 * 3600 * 1000) {
        return data;
      }
    } catch {}
  }
  const url = `https://api.fnar.net/apexuser?user=${encodeURIComponent(companyCode)}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const arr = await response.json();
  const data = Array.isArray(arr) && arr.length ? arr[0] : null;
  if (data) {
    localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
  }
  return data;
}

async function displayCorpInfo(corpCode) {
  const status = document.getElementById("corpStatus");
  const table  = document.getElementById("corpTable");
  const tbody  = table.querySelector("tbody");

  const showInactive = document.getElementById("showInactiveCheckbox").checked;
  const showChurn    = document.getElementById("showChurnCheckbox").checked;

  document.getElementById("reportContainer").innerHTML = "";
  document.getElementById("churnContainer").innerHTML  = "";

  loadCorpReport("type=corpBreakdown&chartType=treemap&metric=volume", 400, corpCode);
  loadCorpReport("type=compTotals&chartType=treemap&metric=volume&group=corp", 400, corpCode);
  loadCorpReport("type=compHistory&metric=bases&group=corp", 300, corpCode);
  loadCorpReport("type=compHistory&metric=volume&group=corp", 300, corpCode);

  tbody.innerHTML = "";
  status.textContent = "Loading corporation data...";
  document.getElementById("memberSection").style.display = "none";

  try {
    const members = await fetchCorpMembers(corpCode);
    if (!members.length) {
      status.textContent = "No members found for this corporation.";
      return;
    }

    members.sort((a, b) => a.CompanyCode.localeCompare(b.CompanyCode));

    status.textContent = `Found ${members.length} members. Fetching company details...`;
    let fetchedCount  = 0;
    let activeCount   = 0;
    let totalCount    = 0;
    const rows = [];
    const activeMemberNames = [];

    for (const m of members) {
      fetchedCount++;
      status.textContent = `Fetching ${fetchedCount} / ${members.length}…`;

      // Fetch company and apexuser data in parallel for each member
      const [company, apexUser] = await Promise.all([
        fetchCompanyData(m.CompanyCode),
        fetchApexUserData(m.UserName),
      ]);

      if (!company) continue;
      totalCount += 1;

      // Use LastOnlineTimestamp from apexuser as the primary activity signal
      const lastOnlineMs = apexUser?.LastOnlineTimestamp ?? null;
      const isActive = lastOnlineMs
        ? Date.now() - lastOnlineMs <= TWO_WEEKS_MS
        : false;

      if (isActive) activeMemberNames.push(m.UserName);
      if (!showInactive && !isActive) continue;
      activeCount += 1;

      const foundedMs    = company.Founded ? new Date(company.Founded).getTime() : null;
      const ageDays      = foundedMs ? Math.floor((Date.now() - foundedMs) / (1000 * 60 * 60 * 24)) : "";
      const planetCount  = Array.isArray(company.Planets) ? company.Planets.length : 0;
      const rating       = company.OverallRating ?? "";
      const ratingCount  = company.RatingContractCount ?? null;
      const tier         = apexUser?.HighestTier ?? "";
      const license      = apexUser?.SubscriptionLevel ?? "";
      const activeDays   = apexUser?.ActiveDaysPerWeek ?? "";

      rows.push({
        user:          m.UserName,
        companyName:   company.Name  || "",
        companyCode:   company.Code  || "",
        planetCount,
        rating,
        ratingCount,
        tier,
        license,
        activeDays,
        lastOnlineMs,
        ageDays,
        liquidated:  apexUser?.Liquidated ?? false,
        createdMs: foundedMs ?? 0,
      });

      // Re-render table after each member so results stream in
      tbody.innerHTML = "";
      document.getElementById("memberSection").style.display = "";

      rows.sort((a, b) => a.createdEpochMs - b.createdEpochMs);

      for (const r of rows) {
        const isRowActive = activeMemberNames.includes(r.user);

        // Rating: color-coded grade + muted contract count
        const RATING_COLOR = { A: "#4ade80", B: "#a3e635", C: "#fbbf24", D: "#fb923c", F: "#f87171" };
        const ratingColor = RATING_COLOR[r.rating] ?? "var(--text-secondary)";
        const ratingCell = r.rating
          ? `<span style="color:${ratingColor};font-weight:700">${r.rating}</span>${r.ratingCount != null ? `<span style="opacity:0.55;font-size:0.82em"> (${r.ratingCount})</span>` : ""}`
          : `<span style="color:var(--text-secondary)">—</span>`;

        // Last online: color by recency
        const ageMs = r.lastOnlineMs ? Date.now() - r.lastOnlineMs : Infinity;
        const onlineColor = ageMs < 86400000 ? "#4ade80"
          : ageMs < 3 * 86400000  ? "#a3e635"
          : ageMs < 7 * 86400000  ? "#fbbf24"
          : ageMs < 14 * 86400000 ? "#fb923c"
          : "var(--text-secondary)";
        const lastOnlineCell = r.lastOnlineMs
          ? `<span style="color:${onlineColor}">${formatRelativeTime(r.lastOnlineMs)}</span>`
          : `<span style="color:var(--text-secondary)">—</span>`;

        // Tier badge
        const TIER_STYLE = {
          GALAXY:  "background:rgba(139,92,246,0.2);color:#a78bfa",
          UNIVERSE:   "background:rgba(245,158,11,0.2);color:#fbbf24",
          COMET: "background:rgba(16,185,129,0.2);color:#34d399",
        };
        const tierCell = r.tier
          ? `<span class="corp-badge" style="${TIER_STYLE[r.tier] ?? "background:rgba(107,114,128,0.15);color:#9ca3af"}">${r.tier}</span>`
          : "";

        // License badge
        const licenseCell = r.license
          ? `<span class="corp-badge" style="${r.license === "PRO" ? "background:rgba(16,185,129,0.2);color:#34d399" : "background:rgba(107,114,128,0.15);color:#9ca3af"}">${r.license}</span>`
          : "";

        // Liquidated badge next to user name
        const liqBadge = r.liquidated ? `<span class="liq-badge">LIQUIDATED</span>` : "";

        const rowClass = r.liquidated ? "liquidated" : !isRowActive ? "inactive" : "";

        tbody.insertAdjacentHTML("beforeend", `
          <tr class="${rowClass}">
            <td>${r.user}${liqBadge}</td>
            <td>${r.companyName}</td>
            <td style="color:var(--text-secondary)">${r.companyCode}</td>
            <td class="num">${r.planetCount}</td>
            <td>${ratingCell}</td>
            <td>${tierCell}</td>
            <td>${licenseCell}</td>
            <td class="num">${r.activeDays}</td>
            <td>${lastOnlineCell}</td>
            <td class="num" style="color:var(--text-secondary)">${r.ageDays}</td>
            <td><a href="/intel?co=${r.companyCode}" target="_blank" class="intel-pill">Intel ↗</a></td>
          </tr>
        `);
      }
    }

    if (showChurn) {
      for (const userName of activeMemberNames) {
        loadChurnReport("type=compHistory&metric=volume", 190, userName);
      }
    }

    status.textContent = `All ${corpCode} companies loaded — ${activeCount} active of ${totalCount} in FIO.`;

  } catch (err) {
    console.error(err);
    status.textContent = "Error loading corporation data.";
  }
}

function loadChurnReport(graphType, height, user) {
  const reportContainer = document.getElementById("churnContainer");
  if (!user) return;
  const iframe = document.createElement("iframe");
  iframe.src = `https://pmmg-products.github.io/reports/?${graphType}&companyName=${encodeURIComponent(user)}&hideOptions`;
  iframe.width = "100%";
  iframe.height = height;
  iframe.style.border = "none";
  iframe.loading = "lazy";
  reportContainer.appendChild(iframe);
}

function updateURLParam(key, value) {
  const url = new URL(window.location);
  if (value) url.searchParams.set(key, value);
  else url.searchParams.delete(key);
  window.history.replaceState({}, "", url);
}

document.getElementById("fetchCorpButton").addEventListener("click", () => {
  const corpCode = document.getElementById("corpCodeInput").value.trim().toUpperCase();
  if (!corpCode) return;
  updateURLParam("corp", corpCode);
  displayCorpInfo(corpCode);
});

document.getElementById("showInactiveCheckbox").addEventListener("change", () => {
  const corpCode = document.getElementById("corpCodeInput").value.trim().toUpperCase();
  if (corpCode) displayCorpInfo(corpCode);
});

window.addEventListener("DOMContentLoaded", () => {
  const corp = new URLSearchParams(window.location.search).get("corp");
  if (corp) {
    document.getElementById("corpCodeInput").value = corp;
    displayCorpInfo(corp);
  }
});
