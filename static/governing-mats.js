import { fetchMaterials, fetchPricing, materialData, priceData, missingPrices, warningPrices} from './pricing-and-materials.js';

// Static data (example)
const utilityData = [
  {"building":"SST","mat":"DW","cxPrice":114.00,"qtyPerDay":10.00,"Safety":833.3,"Health":0.0,"Comfort":0.0,"Culture":0.0,"Education":0.0},
  {"building":"SST","mat":"OFF","cxPrice":98.90,"qtyPerDay":10.00,"Safety":833.3,"Health":0.0,"Comfort":0.0,"Culture":0.0,"Education":0.0},
  {"building":"SST","mat":"SUN","cxPrice":630.00,"qtyPerDay":2.00,"Safety":833.3,"Health":0.0,"Comfort":0.0,"Culture":0.0,"Education":0.0},
  {"building":"SDP","mat":"POW","cxPrice":15000.00,"qtyPerDay":1.00,"Safety":1250.0,"Health":0.0,"Comfort":0.0,"Culture":0.0,"Education":0.0},
  {"building":"SDP","mat":"RAD","cxPrice":16000.00,"qtyPerDay":0.47,"Safety":1250.0,"Health":0.0,"Comfort":0.0,"Culture":0.0,"Education":0.0},
  {"building":"SDP","mat":"CCD","cxPrice":80200.00,"qtyPerDay":0.07,"Safety":1250.0,"Health":0.0,"Comfort":0.0,"Culture":0.0,"Education":0.0},
  {"building":"SDP","mat":"SUD","cxPrice":83500.00,"qtyPerDay":0.07,"Safety":1250.0,"Health":0.0,"Comfort":0.0,"Culture":0.0,"Education":0.0},
  {"building":"EMC","mat":"PK","cxPrice":475.00,"qtyPerDay":2.00,"Safety":200.0,"Health":200.0,"Comfort":0.0,"Culture":0.0,"Education":0.0},
  {"building":"EMC","mat":"POW","cxPrice":15000.00,"qtyPerDay":0.40,"Safety":200.0,"Health":200.0,"Comfort":0.0,"Culture":0.0,"Education":0.0},
  {"building":"EMC","mat":"BND","cxPrice":225.00,"qtyPerDay":4.00,"Safety":200.0,"Health":200.0,"Comfort":0.0,"Culture":0.0,"Education":0.0},
  {"building":"EMC","mat":"RED","cxPrice":70000.00,"qtyPerDay":0.07,"Safety":200.0,"Health":200.0,"Comfort":0.0,"Culture":0.0,"Education":0.0},
  {"building":"EMC","mat":"BSC","cxPrice":51000.00,"qtyPerDay":0.07,"Safety":200.0,"Health":200.0,"Comfort":0.0,"Culture":0.0,"Education":0.0},
  {"building":"INF","mat":"OFF","cxPrice":98.90,"qtyPerDay":10.00,"Safety":0.0,"Health":833.33,"Comfort":0.0,"Culture":0.0,"Education":0.0},
  {"building":"INF","mat":"TUB","cxPrice":175.00,"qtyPerDay":6.67,"Safety":0.0,"Health":833.33,"Comfort":0.0,"Culture":0.0,"Education":0.0},
  {"building":"INF","mat":"STR","cxPrice":2390.00,"qtyPerDay":0.67,"Safety":0.0,"Health":833.33,"Comfort":0.0,"Culture":0.0,"Education":0.0},
  {"building":"HOS","mat":"PK","cxPrice":475.00,"qtyPerDay":2.00,"Safety":0.0,"Health":833.33,"Comfort":0.0,"Culture":0.0,"Education":0.0},
  {"building":"HOS","mat":"SEQ","cxPrice":19000.00,"qtyPerDay":0.40,"Safety":0.0,"Health":833.33,"Comfort":0.0,"Culture":0.0,"Education":0.0},
  {"building":"HOS","mat":"BND","cxPrice":225.00,"qtyPerDay":4.00,"Safety":0.0,"Health":833.33,"Comfort":0.0,"Culture":0.0,"Education":0.0},
  {"building":"HOS","mat":"SDR","cxPrice":101000.00,"qtyPerDay":0.07,"Safety":0.0,"Health":833.33,"Comfort":0.0,"Culture":0.0,"Education":0.0},
  {"building":"HOS","mat":"RED","cxPrice":70000.00,"qtyPerDay":0.07,"Safety":0.0,"Health":833.33,"Comfort":0.0,"Culture":0.0,"Education":0.0},
  {"building":"HOS","mat":"BSC","cxPrice":51000.00,"qtyPerDay":0.13,"Safety":0.0,"Health":833.33,"Comfort":0.0,"Culture":0.0,"Education":0.0},
  {"building":"WCE","mat":"KOM","cxPrice":890.00,"qtyPerDay":4.00,"Safety":0.0,"Health":166.67,"Comfort":166.7,"Culture":0.0,"Education":0.0},
  {"building":"WCE","mat":"OLF","cxPrice":1800.00,"qtyPerDay":2.00,"Safety":0.0,"Health":166.67,"Comfort":166.7,"Culture":0.0,"Education":0.0},
  {"building":"WCE","mat":"DW","cxPrice":114.00,"qtyPerDay":6.00,"Safety":0.0,"Health":166.67,"Comfort":166.7,"Culture":0.0,"Education":0.0},
  {"building":"WCE","mat":"DEC","cxPrice":28000.00,"qtyPerDay":0.67,"Safety":0.0,"Health":166.67,"Comfort":166.7,"Culture":0.0,"Education":0.0},
  {"building":"WCE","mat":"PFE","cxPrice":1140.00,"qtyPerDay":2.67,"Safety":0.0,"Health":166.67,"Comfort":166.7,"Culture":0.0,"Education":0.0},
  {"building":"WCE","mat":"SOI","cxPrice":719.00,"qtyPerDay":6.67,"Safety":0.0,"Health":166.67,"Comfort":166.7,"Culture":0.0,"Education":0.0},
  {"building":"PAR","mat":"DW","cxPrice":114.00,"qtyPerDay":10.00,"Safety":0.0,"Health":0.0,"Comfort":500.0,"Culture":0.0,"Education":0.0},
  {"building":"PAR","mat":"FOD","cxPrice":440.00,"qtyPerDay":6.00,"Safety":0.0,"Health":0.0,"Comfort":500.0,"Culture":0.0,"Education":0.0},
  {"building":"PAR","mat":"PFE","cxPrice":1140.00,"qtyPerDay":2.00,"Safety":0.0,"Health":0.0,"Comfort":500.0,"Culture":0.0,"Education":0.0},
  {"building":"PAR","mat":"SOI","cxPrice":719.00,"qtyPerDay":3.33,"Safety":0.0,"Health":0.0,"Comfort":500.0,"Culture":0.0,"Education":0.0},
  {"building":"PAR","mat":"DEC","cxPrice":28000.00,"qtyPerDay":0.33,"Safety":0.0,"Health":0.0,"Comfort":500.0,"Culture":0.0,"Education":0.0},
  {"building":"4DA","mat":"POW","cxPrice":15000.00,"qtyPerDay":2.00,"Safety":0.0,"Health":0.0,"Comfort":833.3,"Culture":0.0,"Education":0.0},
  {"building":"4DA","mat":"MHP","cxPrice":4990.00,"qtyPerDay":2.00,"Safety":0.0,"Health":0.0,"Comfort":833.3,"Culture":0.0,"Education":0.0},
  {"building":"4DA","mat":"OLF","cxPrice":1800.00,"qtyPerDay":4.00,"Safety":0.0,"Health":0.0,"Comfort":833.3,"Culture":0.0,"Education":0.0},
  {"building":"4DA","mat":"BID","cxPrice":110000.00,"qtyPerDay":0.20,"Safety":0.0,"Health":0.0,"Comfort":833.3,"Culture":0.0,"Education":0.0},
  {"building":"4DA","mat":"HOG","cxPrice":7700.00,"qtyPerDay":0.20,"Safety":0.0,"Health":0.0,"Comfort":833.3,"Culture":0.0,"Education":0.0},
  {"building":"4DA","mat":"EDC","cxPrice":9000.00,"qtyPerDay":0.20,"Safety":0.0,"Health":0.0,"Comfort":833.3,"Culture":0.0,"Education":0.0},
  {"building":"ACA","mat":"COF","cxPrice":865.00,"qtyPerDay":8.00,"Safety":0.0,"Health":0.0,"Comfort":166.7,"Culture":166.7,"Education":0.0},
  {"building":"ACA","mat":"OLF","cxPrice":1800.00,"qtyPerDay":2.00,"Safety":0.0,"Health":0.0,"Comfort":166.7,"Culture":166.7,"Education":0.0},
  {"building":"ACA","mat":"VIT","cxPrice":575.00,"qtyPerDay":8.00,"Safety":0.0,"Health":0.0,"Comfort":166.7,"Culture":166.7,"Education":0.0},
  {"building":"ACA","mat":"DW","cxPrice":114.00,"qtyPerDay":10.00,"Safety":0.0,"Health":0.0,"Comfort":166.7,"Culture":166.7,"Education":0.0},
  {"building":"ACA","mat":"GL","cxPrice":300.00,"qtyPerDay":6.67,"Safety":0.0,"Health":0.0,"Comfort":166.7,"Culture":166.7,"Education":0.0},
  {"building":"ACA","mat":"DEC","cxPrice":28000.00,"qtyPerDay":0.67,"Safety":0.0,"Health":0.0,"Comfort":166.7,"Culture":166.7,"Education":0.0},
  {"building":"ART","mat":"MHP","cxPrice":4990.00,"qtyPerDay":1.00,"Safety":0.0,"Health":0.0,"Comfort":0.0,"Culture":625.0,"Education":0.0},
  {"building":"ART","mat":"HOG","cxPrice":7700.00,"qtyPerDay":1.00,"Safety":0.0,"Health":0.0,"Comfort":0.0,"Culture":625.0,"Education":0.0},
  {"building":"ART","mat":"UTS","cxPrice":6730.00,"qtyPerDay":0.67,"Safety":0.0,"Health":0.0,"Comfort":0.0,"Culture":625.0,"Education":0.0},
  {"building":"ART","mat":"DEC","cxPrice":28000.00,"qtyPerDay":0.67,"Safety":0.0,"Health":0.0,"Comfort":0.0,"Culture":625.0,"Education":0.0},
  {"building":"VRT","mat":"POW","cxPrice":15000.00,"qtyPerDay":1.40,"Safety":0.0,"Health":0.0,"Comfort":0.0,"Culture":833.3,"Education":0.0},
  {"building":"VRT","mat":"MHP","cxPrice":4990.00,"qtyPerDay":2.00,"Safety":0.0,"Health":0.0,"Comfort":0.0,"Culture":833.3,"Education":0.0},
  {"building":"VRT","mat":"HOG","cxPrice":7700.00,"qtyPerDay":1.40,"Safety":0.0,"Health":0.0,"Comfort":0.0,"Culture":833.3,"Education":0.0},
  {"building":"VRT","mat":"OLF","cxPrice":1800.00,"qtyPerDay":4.00,"Safety":0.0,"Health":0.0,"Comfort":0.0,"Culture":833.3,"Education":0.0},
  {"building":"VRT","mat":"BID","cxPrice":110000.00,"qtyPerDay":0.33,"Safety":0.0,"Health":0.0,"Comfort":0.0,"Culture":833.3,"Education":0.0},
  {"building":"VRT","mat":"DEC","cxPrice":28000.00,"qtyPerDay":0.67,"Safety":0.0,"Health":0.0,"Comfort":0.0,"Culture":833.3,"Education":0.0},
  {"building":"PBH","mat":"OFF","cxPrice":98.90,"qtyPerDay":10.00,"Safety":0.0,"Health":0.0,"Comfort":0.0,"Culture":166.7,"Education":166.7},
  {"building":"PBH","mat":"MHP","cxPrice":4990.00,"qtyPerDay":1.00,"Safety":0.0,"Health":0.0,"Comfort":0.0,"Culture":166.7,"Education":166.7},
  {"building":"PBH","mat":"SP","cxPrice":2700.00,"qtyPerDay":1.33,"Safety":0.0,"Health":0.0,"Comfort":0.0,"Culture":166.7,"Education":166.7},
  {"building":"PBH","mat":"AAR","cxPrice":16400.00,"qtyPerDay":0.67,"Safety":0.0,"Health":0.0,"Comfort":0.0,"Culture":166.7,"Education":166.7},
  {"building":"PBH","mat":"EDC","cxPrice":9000.00,"qtyPerDay":0.27,"Safety":0.0,"Health":0.0,"Comfort":0.0,"Culture":166.7,"Education":166.7},
  {"building":"PBH","mat":"IDC","cxPrice":11000.00,"qtyPerDay":0.13,"Safety":0.0,"Health":0.0,"Comfort":0.0,"Culture":166.7,"Education":166.7},
  {"building":"LIB","mat":"MHP","cxPrice":4990.00,"qtyPerDay":1.00,"Safety":0.0,"Health":0.0,"Comfort":0.0,"Culture":0.0,"Education":500.0},
  {"building":"LIB","mat":"HOG","cxPrice":7700.00,"qtyPerDay":1.00,"Safety":0.0,"Health":0.0,"Comfort":0.0,"Culture":0.0,"Education":500.0},
  {"building":"LIB","mat":"CD","cxPrice":12000.00,"qtyPerDay":0.33,"Safety":0.0,"Health":0.0,"Comfort":0.0,"Culture":0.0,"Education":500.0},
  {"building":"LIB","mat":"DIS","cxPrice":7500.00,"qtyPerDay":0.33,"Safety":0.0,"Health":0.0,"Comfort":0.0,"Culture":0.0,"Education":500.0},
  {"building":"LIB","mat":"BID","cxPrice":110000.00,"qtyPerDay":0.20,"Safety":0.0,"Health":0.0,"Comfort":0.0,"Culture":0.0,"Education":500.0},
  {"building":"UNI","mat":"COF","cxPrice":865.00,"qtyPerDay":10.00,"Safety":0.0,"Health":0.0,"Comfort":0.0,"Culture":0.0,"Education":833.3},
  {"building":"UNI","mat":"REA","cxPrice":749.00,"qtyPerDay":10.00,"Safety":0.0,"Health":0.0,"Comfort":0.0,"Culture":0.0,"Education":833.3},
  {"building":"UNI","mat":"TUB","cxPrice":175.00,"qtyPerDay":10.00,"Safety":0.0,"Health":0.0,"Comfort":0.0,"Culture":0.0,"Education":833.3},
  {"building":"UNI","mat":"BID","cxPrice":110000.00,"qtyPerDay":0.33,"Safety":0.0,"Health":0.0,"Comfort":0.0,"Culture":0.0,"Education":833.3},
  {"building":"UNI","mat":"HD","cxPrice":2700.00,"qtyPerDay":0.67,"Safety":0.0,"Health":0.0,"Comfort":0.0,"Culture":0.0,"Education":833.3},
  {"building":"UNI","mat":"IDC","cxPrice":11000.00,"qtyPerDay":0.20,"Safety":0.0,"Health":0.0,"Comfort":0.0,"Culture":0.0,"Education":833.3}
];

async function initGovEfficiency() {
  await fetchPricing();
  await fetchMaterials();

  const select = document.getElementById("utilityType");
  select.addEventListener("change", () => calculateEfficiency());

  // Automatically calculate once at startup (Safety is default)
  calculateEfficiency();
}

function calculateEfficiency() {
  const utilityType = document.getElementById("utilityType").value;
  const table = document.getElementById("efficiencyTable");
  const tbody = table.querySelector("tbody");
  const noResults = document.getElementById("noResults");
  
  tbody.innerHTML = "";
  table.classList.add("hidden");
  noResults.classList.add("hidden");

  const results = [];

  for (const row of utilityData) {
    const price = priceData[row.mat];
    if (!price || !row[utilityType] || row[utilityType] === 0) continue;

    const totalPrice = price * row.qtyPerDay;
    const efficiency = row[utilityType] / totalPrice;

    results.push({
      ...row,
      price,
      utility: row[utilityType],
      efficiency
    });
  }

  if (results.length === 0) {
    noResults.classList.remove("hidden");
    return;
  }

  // Sort high-to-low efficiency
  results.sort((a, b) => b.efficiency - a.efficiency);

  // Normalize efficiency values for coloring
  const maxEff = results[0].efficiency;
  const minEff = results[results.length - 1].efficiency;
  const range = maxEff - minEff || 1;

  for (const r of results) {
    const norm = (r.efficiency - minEff) / range; // 0 = low, 1 = high
    const color = efficiencyColor(1.0 - norm);

    const rowHtml = `
      <tr style="background-color: ${color}">
        <td class="px-2 py-1">${r.building}</td>
        <td class="px-2 py-1">${r.mat}</td>
        <td class="px-2 py-1">${r.price.toFixed(2)}</td>
        <td class="px-2 py-1">${r.qtyPerDay}</td>
        <td class="px-2 py-1">${r.utility.toFixed(1)}</td>
        <td class="px-2 py-1 font-bold">${r.efficiency.toFixed(4)}</td>
      </tr>`;
    tbody.insertAdjacentHTML("beforeend", rowHtml);
  }

  table.classList.remove("hidden");
}

// Helper to map normalized efficiency to a color gradient
function efficiencyColor(value) {
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
