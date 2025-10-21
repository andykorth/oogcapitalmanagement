import { fetchMaterials, fetchPricing, materialData, priceData, missingPrices, warningPrices} from './pricing-and-materials.js';

async function initMaterialMatcher() {
  await fetchMaterials(); // reuses your existing function
  const button = document.getElementById("calcButton");
  button.addEventListener("click", findMatchingMaterials);
}

function findMatchingMaterials() {
  const totalWeight = parseFloat(document.getElementById("inputWeight").value);
  const totalVolume = parseFloat(document.getElementById("inputVolume").value);
  const table = document.querySelector("#resultTable");
  const tbody = table.querySelector("tbody");
  const noResults = document.getElementById("noResults");

  tbody.innerHTML = "";
  table.style.display = "none";
  noResults.style.display = "none";

  if (isNaN(totalWeight) || isNaN(totalVolume) || totalWeight <= 0 || totalVolume <= 0) {
    alert("Please enter valid positive numbers for both weight and volume.");
    return;
  }

  const results = [];

  for (const [ticker, mat] of Object.entries(materialData)) {
    if (!mat.weight || !mat.volume) continue;

    const qtyByWeight = totalWeight / mat.weight;
    const qtyByVolume = totalVolume / mat.volume;

    // Both must be whole numbers (within tolerance)
    const tolerance = 1e-6;
    const isIntWeight = Math.abs(qtyByWeight - Math.round(qtyByWeight)) < tolerance;
    const isIntVolume = Math.abs(qtyByVolume - Math.round(qtyByVolume)) < tolerance;

    if (isIntWeight && isIntVolume && Math.round(qtyByWeight) === Math.round(qtyByVolume)) {
      results.push({
        ticker,
        name: mat.name,
        category: mat.category,
        weightEach: mat.weight,
        volumeEach: mat.volume,
        quantity: Math.round(qtyByWeight)
      });
    }
  }

  if (results.length === 0) {
    noResults.style.display = "block";
  } else {
    for (const r of results) {
      const row = `
        <tr>
          <td>${r.ticker}</td>
          <td>${r.name}</td>
          <td>${r.category}</td>
          <td>${r.weightEach.toFixed(4)}</td>
          <td>${r.volumeEach.toFixed(4)}</td>
          <td>${r.quantity}</td>
        </tr>`;
      tbody.insertAdjacentHTML("beforeend", row);
    }
    table.style.display = "table";
  }
}

// ---- initial run ----
(async () => {
  initMaterialMatcher();
  await fetchPricing();
  await fetchMaterials();
})();
