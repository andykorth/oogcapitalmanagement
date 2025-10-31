
async function fetchCorpMembers(corpCode) {
  const cacheKey = `corp_${corpCode}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { timestamp, data } = JSON.parse(cached);
      // cache expires in 24 hours
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

    for (const m of members) {
      const company = await fetchCompanyData(m.CompanyCode);
      if (!company) continue;

      const tier = company.Tier ?? "";
      const country = company.CountryName ?? "";
      const rating = company.OverallRating ?? "";
      const row = `
        <tr>
          <td>${m.UserName}</td>
          <td>${company.CompanyName || ""}</td>
          <td>${company.CompanyCode || ""}</td>
          <td>${tier}</td>
          <td>${country}</td>
          <td>${rating}</td>
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

window.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const corp = urlParams.get("corp");
  if (corp) {
    document.getElementById("corpCodeInput").value = corp;
    displayCorpInfo(corp);
  }
});