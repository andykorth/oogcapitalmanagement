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
  const showChurn = document.getElementById("showChurnCheckbox").checked;

  const reportContainer = document.getElementById("reportContainer");
  reportContainer.innerHTML = ""; // Clear any existing iframe

  const churnContainer = document.getElementById("churnContainer");
  churnContainer.innerHTML = ""; // Clear any existing iframe

  loadCorpReport("type=corpBreakdown&chartType=treemap&metric=volume", 400, corpCode);
  loadCorpReport("type=compTotals&chartType=treemap&metric=volume&group=corp", 400, corpCode);
  loadCorpReport("type=compHistory&metric=bases&group=corp", 300, corpCode);
  loadCorpReport("type=compHistory&metric=volume&group=corp", 300, corpCode);

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
    let fetchedCount = 0;
    let activeCount = 0;
    let totalCount = 0;

    const rows = [];

    // Sort members alphabetically by company code for consistent order
    members.sort((a, b) => a.CompanyCode.localeCompare(b.CompanyCode));

    const activeMemberNames = [];

    for (const m of members) {
      fetchedCount++;
      status.textContent = `Fetching ${fetchedCount} / ${members.length}...`;
      
      const company = await fetchCompanyData(m.CompanyCode);
      if (!company) continue;

      const timestampStr = company.Timestamp;
      let isActive = true;
      totalCount += 1;

      if (timestampStr) {
        const lastUpdate = new Date(timestampStr).getTime();
        if (Date.now() - lastUpdate > TWO_WEEKS_MS) {
          isActive = false;
        }else{
          activeMemberNames.push(m.UserName);
        }
      }

      if (!showInactive && !isActive) continue;
      activeCount += 1;

      const planetCount = Array.isArray(company.Planets) ? company.Planets.length : 0;
      const govCount = Array.isArray(company.Offices) ? company.Offices.length : 0;
      const tier = company.Tier ?? "";
      const rating = company.OverallRating ?? "";
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

      // clear current table content.
      tbody.innerHTML = "";

      if(rows.length > 0){
        table.classList.remove("hidden");
      }

      // every time a row is added, re-sort our saved row list, and re-add all rows.
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
            <td><a href="/intel?co=${r.companyCode}" target="_blank" class="button-link">Intel</a>
          </tr>
        `;
        tbody.insertAdjacentHTML("beforeend", row);
      }
    }
    if(showChurn){
      for (const userName of activeMemberNames) {
        console.log("Processing churn for member:", userName);
        loadChurnReport("type=compHistory&metric=volume", 190, userName);
      }
    }

    status.textContent = `All ${corpCode} companies loaded,  ${activeCount} active accounts of ${totalCount} in FIO.`;

  } catch (err) {
    console.error(err);
    status.textContent = "Error loading corporation data.";
  }
}


function loadChurnReport(graphType, height, user) {
  const reportContainer = document.getElementById("churnContainer");
  console.log("Loading company report for user:", user);

  if (!user) {
    console.warn("No user found ");
    return;
  }

  const userName = encodeURIComponent(user);

  const iframe = document.createElement("iframe");
  
  iframe.src = `https://pmmg-products.github.io/reports/?${graphType}&companyName=${userName}&hideOptions`;
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
  const urlParams = new URLSearchParams(window.location.search);
  const corp = urlParams.get("corp");
  if (corp) {
    document.getElementById("corpCodeInput").value = corp;
    displayCorpInfo(corp);
  }
});
