const baseFactor = [
  1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10,
];
const warehouseMaterials = {
  BBH: { baseValue: 24 },
  BDE: { baseValue: 24 },
  BSE: { baseValue: 12 },
  MCG: { baseValue: 300 },
  TRU: { baseValue: 20 },
};

// Additional buildings (fixed material lists)
const otherBuildings = {
  planetaryAdmin: {
    label: "Planetary Administration Center",
    materials: {
      LBH: 16,
      LDE: 32,
      LSE: 25,
      BMF: 2,
      MCG: 750,
      RTA: 5,
      BWS: 10,
    },
  },
  cogc: {
    label: "Chamber of Global Commerce",
    materials: {
      LBH: 32,
      LDE: 16,
      LSE: 24,
      BMF: 1,
      LTA: 32,
      SP: 32,
      BWS: 16,
    },
  },
  shipyard: {
    label: "Shipyard",
    materials: {
      ABH: 32,
      ADE: 24,
      ASE: 24,
      ATA: 8,
      TRU: 24,
    },
  },
  localMarket: {
    label: "Local Market",
    materials: {
      BDE: 8,
      BSE: 12,
      BTA: 8,
      LBH: 8,
      TRU: 10,
    },
  },
};

const scalableBuildings  = {
  SST: {
    label: "SST",
    baseMaterials: {
      BBH: 24,
      BDE: 24,
      BSE: 12,
      BTA: 6,
      MCG: 300,
      TRU: 10,
    },
  },
  SDP: {
    label: "SDP",
    baseMaterials: {
      RBH: 16,
      RDE: 16,
      RSE: 10,
      RTA: 8,
      MCG: 300,
      TRU: 8,
      ADS: 1,
      DOU: 1,
      BMF: 1,
    },
  },
  EMC: {
    label: "EMC",
    baseMaterials: {
      BTA: 16,
      LBH: 32,
      LDE: 32,
      LSE: 24,
      MCG: 300,
      DOU: 1,
      TCU: 1,
    },
  },
  INF: {
    label: "INF",
    baseMaterials: {
      BBH: 24,
      BDE: 24,
      BSE: 16,
      BTA: 12,
      MCG: 300,
      TRU: 10,
    },
  },
  HOS: {
    label: "HOS",
    baseMaterials: {
      RBH: 24,
      RDE: 20,
      RSE: 20,
      RTA: 16,
      MCG: 400,
      TRU: 16,
      SU: 1,
      DOU: 1,
      TCU: 1,
    },
  },
  WCE: {
    label: "WCE",
    baseMaterials: {
      LBH: 36,
      LDE: 36,
      LSE: 32,
      LTA: 24,
      MCG: 500,
      TRU: 16,
      DEC: 40,
      FLO: 12,
    },
  },
  PAR: {
    label: "PAR",
    baseMaterials: {
      BBH: 16,
      BDE: 16,
      BSE: 20,
      BTA: 10,
      MCG: 300,
      HAB: 5,
      SOI: 100,
    },
  },
  "4DA": {
    label: "4DA",
    baseMaterials: {
      LBH: 42,
      LDE: 42,
      LSE: 42,
      LTA: 24,
      MCG: 600,
      TRU: 40,
      ADS: 1,
      BMF: 2,
      FUN: 10,
      LIT: 2,
    },
  },
  ACA: {
    label: "ACA",
    baseMaterials: {
      RBH: 16,
      RDE: 24,
      RSE: 24,
      RTA: 12,
      MCG: 300,
      TRU: 20,
      DEC: 32,
    },
  },
  ART: {
    label: "ART",
    baseMaterials: {
      LBH: 24,
      LDE: 32,
      LSE: 32,
      LTA: 16,
      MCG: 300,
      TRU: 20,
      DEC: 10,
      WOR: 2,
    },
  },
  VRT: {
    label: "VRT",
    baseMaterials: {
      RBH: 24,
      RDE: 32,
      RSE: 32,
      RTA: 12,
      MCG: 500,
      TRU: 30,
      ADS: 1,
      DEC: 20,
    },
  },
  PBH: {
    label: "PBH",
    baseMaterials: {
      RBH: 16,
      RDE: 24,
      RSE: 24,
      RTA: 12,
      MCG: 300,
      TRU: 30,
      ADS: 1,
      COM: 1,
    },
  },
  LIB: {
    label: "LIB",
    baseMaterials: {
      ABH: 8,
      ADE: 12,
      ASE: 12,
      ATA: 6,
      MCG: 250,
      TRU: 20,
      COM: 1,
      LOG: 1,
    },
  },
  UNI: {
    label: "UNI",
    baseMaterials: {
      ABH: 12,
      ADE: 16,
      ASE: 16,
      ATA: 12,
      MCG: 400,
      TRU: 30,
      BMF: 2,
      LU: 4,
      LOG: 1,
    },
  },
};


const startWarehouseLevelInput = document.getElementById("startWarehouseLevel");
const endWarehouseLevelInput = document.getElementById("endWarehouseLevel");
const endCapEl = document.getElementById("endCap");
const tableBody = document.querySelector("#results tbody");
const originSelect = document.getElementById("originSelect");
const originEmoji = document.getElementById("originEmoji");

// checkboxes
const buildingCheckboxes = {
  planetaryAdmin: document.getElementById("togglePlanetaryAdmin"),
  cogc: document.getElementById("toggleCOGC"),
  shipyard: document.getElementById("toggleShipyard"),
  localMarket: document.getElementById("toggleLocalMarket"),
};


const jsonOutput = document.getElementById("jsonOutput");
const copyBtn = document.getElementById("copyBtn");

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function calculateFactor(start, end) {
  let factor = 0;
  for (let i = start; i < end; i++) {
    factor += baseFactor[i] ?? 0;
  }
  return factor;
}

function fillUI(){
  const scalableContainer = document.getElementById("scalableBuildings");
  for (const [key, building] of Object.entries(scalableBuildings)) {
    scalableContainer.insertAdjacentHTML("beforeend", `
      <label>
        <span class="tableLabel"> ${building.label}:</span>
        <input type="number" id="start_${key}" min="0" max="10" value="0"> →
        <input type="number" id="end_${key}" min="0" max="10" value="0">
      </label>
    `);

    // add listeners for start and end inputs
    const startInput = document.getElementById(`start_${key}`);
    const endInput   = document.getElementById(`end_${key}`);
    [startInput, endInput].forEach(el => el.addEventListener("input", update));
  }
}

function calculateLevelCost(base, start, end) {
  let total = 0;
  for (let level = start + 1; level <= end; level++) {
    total += Math.round(base * Math.pow(1.15, level - 1));
  }
  // console.log(`base ${base} totals ${total}`)
  return total;
}

function update() {
  let start = clamp(+startWarehouseLevelInput.value, 0, 20);
  let end = clamp(+endWarehouseLevelInput.value, 0, 20);

  startWarehouseLevelInput.value = start;
  endWarehouseLevelInput.value = end;

  endCapEl.innerText = Math.ceil(end / 2) * 500;

  const totals = {};

  // warehouse scaling
  const factor = calculateFactor(start, end);
  for (const [name, { baseValue }] of Object.entries(warehouseMaterials)) {
    totals[name] = (totals[name] || 0) + baseValue * factor;
  }

  // other buildings
  for (const [key, building] of Object.entries(otherBuildings)) {
    if (buildingCheckboxes[key].checked) {
      for (const [mat, amount] of Object.entries(building.materials)) {
        totals[mat] = (totals[mat] || 0) + amount;
      }
    }
  }

  // scalable buildings
  for (const [key, building] of Object.entries(scalableBuildings)) {
    const start = clamp(+document.getElementById(`start_${key}`).value, 0, 10);
    const end   = clamp(+document.getElementById(`end_${key}`).value, 0, 10);
   
    if(start != end){
      // console.log(`key ${key} start ${start} to ${end}`)

      for (const [mat, base] of Object.entries(building.baseMaterials)) {
        // console.log(`base ${base} mat ${mat}`)
        totals[mat] = (totals[mat] || 0) + calculateLevelCost(base, start, end);
      }
    }
  }
  // remove zeros so they don't end up in the json
for (const [key, value] of Object.entries(totals)) {
  if (value === 0) {
    delete totals[key];
  }
}
  // ---- update table with pricing ----
  tableBody.innerHTML = "";
  let grandTotal = 0;
  for (const [mat, amount] of Object.entries(totals)) {
    if (amount > 0) {
      const price = priceData[mat] || 0;
      const subtotal = price * amount;
      grandTotal += subtotal;
      const priceFormatted = parseFloat(price.toFixed(2)).toLocaleString('en-US'); //sorry not sorry
      const subtotalFormatted = parseFloat(subtotal.toFixed(2)).toLocaleString('en-US');
        
      const isMissing = !price || missingPrices.includes(mat);
      const isWarning = warningPrices.includes(mat);
      
      const rowClass = isMissing ? 'missing-price' : (isWarning ? 'warning-price' : '');

      const row = `
        <tr class="${rowClass}">
          <td>${mat}</td>
          <td>${amount}</td>
          <td>${priceFormatted}</td> 
          <td>${subtotalFormatted}</td>
        </tr>`;
      tableBody.insertAdjacentHTML("beforeend", row);
    }
  }
  document.getElementById("grandTotal").innerText = parseFloat(grandTotal.toFixed(2)).toLocaleString();


  var cxID = "NC1"
  // Emoji logic, very important for Antares supremacy
  if (originSelect.value === "Antares Station Warehouse") {
    originEmoji.innerText = "😀";
  } else {
    originEmoji.innerText = "😢";
  }
  
  if (originSelect.value === "Antares Station Warehouse") {
    cxID = "AI1"
  } else 
  if (originSelect.value === "Moria Station Warehouse") {
    cxID = "NC1"
  } else 
  if (originSelect.value === "Arclight Station Warehouse") {
    cxID = "CI2"
  } else 
  if (originSelect.value === "Benten Station Warehouse") {
    cxID = "CI1"
  } else 
  if (originSelect.value === "Hortus Station Warehouse") {
    cxID = "IC1"
  } else 
  if (originSelect.value === "Hubur Station Warehouse") {
    cxID = "NC2"
  }
  
  // Export JSON
  const exportJson = {
    actions: [
      {
        group: "Items",
        exchange: cxID,
        priceLimits: {},
        buyPartial: false,
        useCXInv: true,
        name: "BuyItems",
        type: "CX Buy",
      },
      {
        type: "MTRA",
        name: "TransferAction",
        group: "Items",
        origin: originSelect.value,
        dest: "Configure on Execution",
      },
    ],
    global: {
      name: "OOG Infrastructure Planner",
    },
    groups: [
      {
        type: "Manual",
        name: "Items",
        materials: totals,
      },
    ],
  };

  jsonOutput.value = JSON.stringify(exportJson);
}


// ---- pricing storage ----
let priceData = {};
let missingPrices = [];
let warningPrices = [];

async function fetchPricing() {
  const cacheKey = "pricingData";
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    const { timestamp, data } = JSON.parse(cached);
    const age = Date.now() - timestamp;
    if (age < 3600 * 1000) { // 1 hour
      priceData = data;
      return;
    }
  }

  // Fetch fresh data from JSON endpoint
  const url = "https://api.prunplanner.org/data/exchanges";
  const res = await fetch(url);
  const json = await res.json();


  const freshData = {};
  missingPrices = [];
  warningPrices = [];

  // Group rows by material for easy lookup
  const grouped = {};
  for (const row of json) {
    if (!grouped[row.MaterialTicker]) grouped[row.MaterialTicker] = {};
    grouped[row.MaterialTicker][row.ExchangeCode] = row.PriceAverage;
  }

  for (const [ticker, exchanges] of Object.entries(grouped)) {
    const candidates = [
      exchanges.PP7D_UNIVERSE,
      exchanges.PP30D_UNIVERSE,
      exchanges.PP7D_AI1,
      exchanges.AI1
    ];

    const candidateKeys = [
      "PP7D_UNIVERSE",
      "PP30D_UNIVERSE",
      "PP7D_AI1",
      "AI1"
    ];

    let validPrice = null;
    let chosenKey = null;

    for (let i = 0; i < candidates.length; i++) {
      if (candidates[i] && candidates[i] > 0) {
        validPrice = candidates[i];
        chosenKey = candidateKeys[i];
        break;
      }
    }

    if (validPrice) {
      freshData[ticker] = validPrice;

      // Add to warning list if it is a less reliable data source
      if (chosenKey === "PP7D_AI1" || chosenKey === "AI1") {
        warningPrices.push(ticker);
      }
    } else {
      missingPrices.push(ticker);
    }
  }

  priceData = freshData;

  localStorage.setItem(cacheKey, JSON.stringify({
    timestamp: Date.now(),
    data: freshData
  }));
}



// event listeners
[
  startWarehouseLevelInput,
  endWarehouseLevelInput,
  buildingCheckboxes.planetaryAdmin,
  buildingCheckboxes.cogc,
  buildingCheckboxes.shipyard,
  buildingCheckboxes.localMarket,
  originSelect
].forEach((el) => el.addEventListener("input", update));

copyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(jsonOutput.value).then(() => {
    copyBtn.innerText = "Copied!";
    setTimeout(() => (copyBtn.innerText = "Copy JSON"), 1500);
  });
});

// ---- initial run ----
(async () => {
  fillUI();
  await fetchPricing();
  update();
})();
