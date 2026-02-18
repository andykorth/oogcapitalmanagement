import { fetchMaterials, fetchPricing, materialData, priceData, missingPrices, warningPrices} from './pricing-and-materials.js';
import { UPKEEP_BUILDINGS, UPKEEP_NEED_TYPES } from './infra-data.js';

async function initGovEfficiency() {
  await fetchPricing();
  await fetchMaterials();

  const select = document.getElementById("utilityType");
  const validUtilities = ["Safety", "Health", "Comfort", "Culture", "Education"];

  // --- Read from URL ---
  const params = new URLSearchParams(window.location.search);
  let selected = params.get("t");
  if (!validUtilities.includes(selected)) selected = "Safety";

  // Set dropdown to match
  select.value = selected;

  // --- Run initial calculation ---
  calculateEfficiency();

  // --- Update URL & recalc when user changes selection ---
  select.addEventListener("change", (e) => {
    const newUtility = e.target.value;

    // Use a pretty, shareable URL (no page reload)
    const newUrl = `${window.location.origin}${window.location.pathname}?t=${encodeURIComponent(newUtility)}`;
    window.history.replaceState({}, "", newUrl);

    calculateEfficiency();
  });
}

function calculateEfficiency() {
  const utilityType = document.getElementById("utilityType").value;
  const table = document.getElementById("efficiencyTable");
  const tbody = table.querySelector("tbody");
  const noResults = document.getElementById("noResults");

  tbody.innerHTML = "";
  table.classList.add("hidden");
  noResults.classList.add("hidden");

  const needKey = utilityType.toLowerCase(); // e.g. "Safety" → "safety"
  const results = [];

  for (const building of UPKEEP_BUILDINGS) {
    const utilityValue = building.needs[needKey] || 0;
    if (!utilityValue) continue;

    for (const material of building.materials) {
      const price = priceData[material.ticker];
      if (!price) continue;

      const totalPrice = price * material.qtyPerDay;

      // Check if this building provides any other need types
      const otherUtilities = UPKEEP_NEED_TYPES
        .filter(n => n !== needKey && (building.needs[n] || 0) > 0)
        .map(n => n.charAt(0).toUpperCase() + n.slice(1));

      let dollarsPerUtility = totalPrice / utilityValue;
      let utilityDisplay = utilityValue.toFixed(1);

      if (otherUtilities.length > 0) {
        utilityDisplay += " *";
        dollarsPerUtility /= 2;
      }

      results.push({
        mat: material.ticker,
        building: building.ticker,
        price,
        qtyPerDay: material.qtyPerDay,
        utility: utilityDisplay,
        efficiency: dollarsPerUtility,
        otherUtilities,
      });
    }
  }


  if (results.length === 0) {
    noResults.classList.remove("hidden");
    return;
  }

  // Sort high-to-low efficiency
  results.sort((a, b) => a.efficiency - b.efficiency);

  // Normalize efficiency values for coloring
  const maxEff = results[0].efficiency;
  const minEff = results[results.length - 1].efficiency;
  const range = maxEff - minEff || 1;

  for (const r of results) {
    const norm = (r.efficiency - minEff) / range; // 0 = low, 1 = high
    const color = efficiencyColor(1.0 - norm);

    const rowHtml = `
      <tr style="background-color: ${color}">
        <td>${r.mat}</td>
        <td>${r.building}</td>
        <td>${"$" + parseFloat(r.price.toFixed(2)).toLocaleString()}</td>
        <td>${r.qtyPerDay}</td>
        <td>${r.utility}</td>
        <td class="px-2 py-1 font-bold">${r.efficiency.toFixed(4)}</td>
      </tr>`;
    tbody.insertAdjacentHTML("beforeend", rowHtml);
  }

  table.classList.remove("hidden");
}

// Helper to map normalized efficiency to a color gradient
function efficiencyColor(value) {
  // better colors
  value = Math.pow(value, 0.5);
  // value = 0..1, green → yellow → red
  const r = value < 0.5 ? (value * 2) * 255 : 255;
  const g = value < 0.5 ? 255 : (1 - (value - 0.5) * 2) * 255;
  const b = 0;
  return `rgb(${r}, ${g}, ${b}, 0.3)`;
}
 
// ---- initialize ----
(async () => {
  initGovEfficiency();
})();
