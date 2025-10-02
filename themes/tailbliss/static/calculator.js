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
function update() {
  let start = clamp(+startWarehouseLevelInput.value, 0, 20);
  let end = clamp(+endWarehouseLevelInput.value, 0, 20);

  startWarehouseLevelInput.value = start;
  endWarehouseLevelInput.value = end;

  endCapEl.innerText = Math.ceil(end / 2) * 500;

  const totals = {};

  // Warehouse scaling
  const factor = calculateFactor(start, end);
  for (const [name, { baseValue }] of Object.entries(warehouseMaterials)) {
    totals[name] = (totals[name] || 0) + baseValue * factor;
  }

  // Other buildings
  for (const [key, building] of Object.entries(otherBuildings)) {
    if (buildingCheckboxes[key].checked) {
      for (const [mat, amount] of Object.entries(building.materials)) {
        totals[mat] = (totals[mat] || 0) + amount;
      }
    }
  }

  // Update results table
  tableBody.innerHTML = "";
  for (const [mat, amount] of Object.entries(totals)) {
    if (amount > 0) {
      const row = `<tr><td>${mat}</td><td>${amount}</td></tr>`;
      tableBody.insertAdjacentHTML("beforeend", row);
    }
  }

  // Emoji logic, very important for Antares supremacy
  if (originSelect.value === "Antares Station Warehouse") {
    originEmoji.innerText = "😀";
  } else {
    originEmoji.innerText = "😢";
  }

  // Export JSON
  const exportJson = {
    actions: [
      {
        group: "A1",
        exchange: "AI1",
        priceLimits: {},
        buyPartial: false,
        useCXInv: true,
        name: "BuyItems",
        type: "CX Buy",
      },
      {
        type: "MTRA",
        name: "TransferAction",
        group: "A1",
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
        name: "A1",
        materials: totals,
      },
    ],
  };

  jsonOutput.value = JSON.stringify(exportJson);
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

// initial run
update();
