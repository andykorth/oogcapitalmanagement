const TWO_WEEKS_MS = 14 * 24 * 3600 * 1000;

async function fetchCorpMembers(corpCode) {
  const cacheKey = `corp_${corpCode}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < 24 * 3600 * 1000) {
        console.log("Loaded from cache:", corpCode);
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

async function fetchCompanyData(companyCode) {
  const cacheKey = `company_${companyCode}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < 24 * 3600 * 1000) {
        return data;
      }
    } catch {}
  }

  const url = `https://rest.fnar.net/company/code/${companyCode}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = await response.json();
  localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
  return data;
}

async function displayCorpInfo(corpCode) {
  const status = document.getElementById("corpStatus");
  const table = document.getElementById("corpTable");
  const tbody = table.querySelector("tbody");
  const showInactive = document.getElementById("showInactiveCheckbox").checked;
  tbody.innerHTML = "";
  status.textContent = "Loading corporation data...";
  table.classList.add("hidden");

  try {
    const members = await fetchCorpMembers(corpCode);
    if (!members.length) {
      status.textContent = "No members found for this corporation.";
      return;
    }

    status.textContent = `Found ${members.length} members. Fetching company details...`;
    const rows = [];

    for (const m of members) {
      const company = await fetchCompanyData(m.CompanyCode);
      if (!company) continue;

      const timestampStr = company.Timestamp;
      let isActive = true;

      if (timestampStr) {
        const lastUpdate = new Date(timestampStr).getTime();
        if (Date.now() - lastUpdate > TWO_WEEKS_MS) {
          isActive = false;
        }
      }

      if (!showInactive && !isActive) continue;

      const tier = company.Tier ?? "";
      const rating = company.OverallRating ?? "";
      const planetCount = Array.isArray(company.Planets) ? company.Planets.length : 0;
      const govCount = Array.isArray(company.Offices) ? company.Offices.length : 0;
      const ageDays = company.CreatedEpochMs
        ? Math.floor((Date.now() - company.CreatedEpochMs) / (1000 * 60 * 60 * 24))
        : "";

      rows.push({
        user: m.UserName,
        companyName: company.CompanyName || "",
        companyCode: company.CompanyCode || "",
        tier,
        planetCount,
        govCount,
        rating,
        ageDays,
        createdEpochMs: company.CreatedEpochMs ?? 0,
      });

    }

    rows.sort((a, b) => a.createdEpochMs - b.createdEpochMs);

    for (const r of rows) {
      const row = `
        <tr>
          <td>${r.user}</td>
          <td>${r.companyName}</td>
          <td>${r.companyCode}</td>
          <td>${r.tier}</td>
          <td>${r.planetCount}</td>
          <td>${r.govCount}</td>
          <td>${r.rating}</td>    
          <td>${r.ageDays}</td>
          <td><button onclick="window.location.href='/intelReport?co=${r.companyCode}'">Show</button></td>
        </tr>
      `;
      tbody.insertAdjacentHTML("beforeend", row);
    }

    status.textContent = "";
    table.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    status.textContent = "Error loading corporation data.";
  }
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
  const urlParams = new URLSearchParams(window.location.search);
  const corp = urlParams.get("corp");
  if (corp) {
    document.getElementById("corpCodeInput").value = corp;
    displayCorpInfo(corp);
  }
});
