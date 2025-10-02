const baseFactor = [
  1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10,
];
const materials = {
  BBH: { baseValue: 24 },
  BDE: { baseValue: 24 },
  BSE: { baseValue: 12 },
  MCG: { baseValue: 300 },
  TRU: { baseValue: 20 },
};

const startWarehouseLevelInput = document.getElementById("startWarehouseLevel");
const endWarehouseLevelInput = document.getElementById("endWarehouseLevel");
const endCapEl = document.getElementById("endCap");
const tableBody = document.querySelector("#results tbody");

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
  let end = clamp(+endWarehouseLevelInput.value, 1, 20);
  if (start >= end) end = start + 1;

  startWarehouseLevelInput.value = start;
  endWarehouseLevelInput.value = end;

  endCapEl.innerText = Math.ceil(end / 2) * 500;

  const factor = calculateFactor(start, end);

  tableBody.innerHTML = "";
  for (const [name, { baseValue }] of Object.entries(materials)) {
    const cost = baseValue * factor;
    const row = `<tr><td>${name}</td><td>${cost}</td></tr>`;
    tableBody.insertAdjacentHTML("beforeend", row);
  }
}

[startWarehouseLevelInput, endWarehouseLevelInput].forEach((el) =>
  el.addEventListener("input", update)
);

// initial run
update();
