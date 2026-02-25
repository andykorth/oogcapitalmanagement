import { UPKEEP_BUILDINGS, HAPPINESS_WEIGHTS } from "/infra-data.js";

export { HAPPINESS_WEIGHTS };

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Education advancement base rates (S values) — ENG→SCI is 0 at base level
const EDU_S_BASE = {
  Pioneer_Settler:     0.020,
  Settler_Technician:  0.015,
  Technician_Engineer: 0.010,
};

// Education building bonuses per level (additive to S)
const EDU_BUILDING_BONUS = { PBH: 0.001, LIB: 0.002, UNI: 0.004 };

export function efficiencyColor(value) {
  value = Math.pow(value, 0.5);
  const r = value < 0.5 ? (value * 2) * 255 : 255;
  const g = value < 0.5 ? 255 : (1 - (value - 0.5) * 2) * 255;
  return `rgb(${r}, ${g}, 0, 0.3)`;
}

export function renderProjectedGrowthTable(report, latestProjects, projFulfillment) {
  const TIERS = ['Pioneer', 'Settler', 'Technician', 'Engineer', 'Scientist'];

  const fulfillment = projFulfillment;

  // Population and unemployment per tier
  const pop = {};
  const unemploymentRate = {};
  for (const tier of TIERS) {
    pop[tier]              = report[`NextPopulation${tier}`]   ?? 0;
    unemploymentRate[tier] = report[`UnemploymentRate${tier}`] ?? 0;
  }

  // Two happiness values per tier (no Explorer's Grace):
  //   needHappiness = weighted need fulfillment only (before unemployment)
  //   trueHappiness = after applying unemployment penalty/bonus
  const needHappiness = {};
  const trueHappiness = {};
  for (const tier of TIERS) {
    const weights = HAPPINESS_WEIGHTS[tier];
    const needH = Object.entries(weights).reduce((s, [need, w]) => s + w * (fulfillment[need] ?? 0), 0);
    needHappiness[tier] = needH;
    const u = unemploymentRate[tier];
    let h;
    if (u >= 0) {
      h = needH - u;
    } else {
      h = needH + Math.min(-u, 0.3 * needH);
    }
    trueHappiness[tier] = Math.max(0, Math.min(1, h));
  }

  // Education S values + building bonuses
  let eduBonus = 0;
  for (const [ticker, rate] of Object.entries(EDU_BUILDING_BONUS)) {
    const proj = latestProjects.get(ticker);
    if (proj) eduBonus += (proj.level ?? 0) * rate;
  }
  const S = {
    Pioneer_Settler:     EDU_S_BASE.Pioneer_Settler     + eduBonus,
    Settler_Technician:  EDU_S_BASE.Settler_Technician  + eduBonus,
    Technician_Engineer: EDU_S_BASE.Technician_Engineer + eduBonus,
    Engineer_Scientist:  0                              + eduBonus,
  };

  // Education flows: S × source population × destination tier true happiness
  const edPioToSet  = S.Pioneer_Settler     * pop.Pioneer    * trueHappiness.Settler;
  const edSetToTec  = S.Settler_Technician  * pop.Settler    * trueHappiness.Technician;
  const edTecToEng  = S.Technician_Engineer * pop.Technician * trueHappiness.Engineer;
  const edEngToSci  = S.Engineer_Scientist  * pop.Engineer   * trueHappiness.Scientist;

  // Migration per tier (driven by true happiness)
  // In: PIO, SET, TEC only, when happiness > 70%
  // Out: all tiers, when happiness < 50%
  const CAN_MIGRATE_IN = new Set(['Pioneer', 'Settler', 'Technician']);
  const migIn  = {};
  const migOut = {};
  for (const tier of TIERS) {
    const h = trueHappiness[tier];
    const p = pop[tier];
    migIn[tier]  = CAN_MIGRATE_IN.has(tier) && h > 0.70 ? p * (h - 0.70) : 0;
    migOut[tier] = h < 0.50 ? 0.8 * p * (0.5 - h) : 0;
  }

  // Net migration per tier
  const netMig = {
    Pioneer:    migIn.Pioneer    - migOut.Pioneer,
    Settler:    migIn.Settler    - migOut.Settler,
    Technician: migIn.Technician - migOut.Technician,
    Engineer:  -migOut.Engineer,
    Scientist: -migOut.Scientist,
  };

  // Education flows split into in/out per tier
  const eduIn = {
    Pioneer:    0,
    Settler:    edPioToSet,
    Technician: edSetToTec,
    Engineer:   edTecToEng,
    Scientist:  edEngToSci,
  };
  const eduOut = {
    Pioneer:    edPioToSet,
    Settler:    edSetToTec,
    Technician: edTecToEng,
    Engineer:   edEngToSci,
    Scientist:  0,
  };

  function fmt(v) {
    const sign = v >= 0 ? '+' : '';
    const color = v >  1 ? '#4ade80'
                : v < -1 ? '#f87171'
                :           'var(--text-secondary)';
    return `<span style="color:${color}">${sign}${Math.round(v).toLocaleString()}</span>`;
  }

  function hColor(h) {
    return h >= 0.70 ? '#4ade80' : h >= 0.50 ? '#fbbf24' : '#f87171';
  }

  const table = document.createElement('table');
  table.className = 'table-auto border-collapse text-sm';
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th class="text-left pr-4">Tier</th>
      <th class="text-right pr-4">Base Happy</th>
      <th class="text-right pr-4">Happiness</th>
      <th class="text-right pr-4">Migration</th>
      <th class="text-right pr-4">Edu In</th>
      <th class="text-right pr-4">Edu Out</th>
      <th class="text-right">Δ Total</th>
    </tr>
  `;
  table.appendChild(thead);
  const tbody = document.createElement('tbody');

  for (const tier of TIERS) {
    if (pop[tier] === 0) continue;
    const delta = netMig[tier] + eduIn[tier] - eduOut[tier];
    const needH = needHappiness[tier];
    const trueH = trueHappiness[tier];
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="pr-4 font-semibold">${tier}</td>
      <td class="text-right pr-4" style="color:${hColor(needH)}">${(needH * 100).toFixed(1)}%</td>
      <td class="text-right pr-4" style="color:${hColor(trueH)}">${(trueH * 100).toFixed(1)}%</td>
      <td class="text-right pr-4">${fmt(netMig[tier])}</td>
      <td class="text-right pr-4">${fmt(eduIn[tier])}</td>
      <td class="text-right pr-4">${fmt(-eduOut[tier])}</td>
      <td class="text-right">${fmt(delta)}</td>
    `;
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  return table;
}

export function calculateRequiredNeeds(pop) {
  const needs = { safety: 0, health: 0, comfort: 0, culture: 0, education: 0 };

  for (const [tier, count] of Object.entries(pop)) {
    const weights = HAPPINESS_WEIGHTS[capitalize(tier)]; // pop uses lowercase, constant uses PascalCase
    if (!weights) continue;
    for (const [need, weight] of Object.entries(weights)) {
      if (need === 'lifeSupport') continue; // not an infrastructure need type
      needs[need] += count * weight;
    }
  }

  return needs;
}

// target  — fulfillment fraction (e.g. 0.7 for 70%)
// siteCount — number of player bases (each contributes 50 safety + 50 health)
// prices  — object mapping ticker → price (from priceData)
export function computeCheapestFulfillment(requiredNeeds, latestProjects, target, siteCount, prices) {
  // Each option = one (building, material) pair.
  // Quantities are stored PER LEVEL so phase 2 can freely adjust active levels.
  const allOptions = [];
  for (const building of UPKEEP_BUILDINGS) {
    const project = latestProjects.get(building.ticker);
    if (!project || !project.level) continue;
    const builtLevel = project.level;
    const n = building.materials.length;

    for (const mat of building.materials) {
      const price = prices[mat.ticker];
      if (!price) continue;

      const contribPerLevel = {};
      for (const [need, needAmt] of Object.entries(building.needs)) {
        if (needAmt > 0) contribPerLevel[need] = needAmt / n;
      }
      if (Object.keys(contribPerLevel).length === 0) continue;

      allOptions.push({
        building: building.ticker,
        builtLevel,
        activeLevel: builtLevel,
        ticker: mat.ticker,
        qtyPerDayPerLevel: mat.qtyPerDay,
        costPerLevel: mat.qtyPerDay * price,
        contribPerLevel,
      });
    }
  }

  // ── Phase 1: greedy material selection ──────────────────────────────────
  // Cost-effectiveness = contribPerLevel / costPerLevel (level cancels out),
  // so material ranking is independent of how many levels are active.
  // Each base provides 50 safety and 50 health (fixed, independent of infra buildings)
  const baseContrib = siteCount * 50;

  const selected = new Set();
  const remaining = {};
  for (const [need, req] of Object.entries(requiredNeeds)) {
    remaining[need] = req * target;
  }
  // Subtract base contributions so optimizer only selects what buildings still need to cover
  if (remaining.safety !== undefined) remaining.safety -= baseContrib;
  if (remaining.health !== undefined) remaining.health -= baseContrib;

  for (const need of Object.keys(requiredNeeds)) {
    // Credit already-selected materials at their full built level
    for (const idx of selected) {
      remaining[need] -= (allOptions[idx].contribPerLevel[need] ?? 0) * allOptions[idx].builtLevel;
    }
    if (remaining[need] <= 0) continue;

    const candidates = allOptions
      .map((opt, i) => ({ opt, i }))
      .filter(({ i }) => !selected.has(i))
      .filter(({ opt }) => (opt.contribPerLevel[need] ?? 0) > 0)
      .sort(({ opt: a }, { opt: b }) =>
        b.contribPerLevel[need] / b.costPerLevel - a.contribPerLevel[need] / a.costPerLevel
      );

    for (const { opt, i } of candidates) {
      if (remaining[need] <= 0) break;
      selected.add(i);
      // Apply all contributions so cross-need buildings aren't double-purchased
      for (const [n2, c] of Object.entries(opt.contribPerLevel)) {
        remaining[n2] = (remaining[n2] ?? 0) - c * opt.builtLevel;
      }
    }
  }

  if (selected.size === 0) return [];

  // ── Phase 2: minimize active levels to avoid overshooting ───────────────
  // Compute surplus over target at full built levels (include base contrib).
  const provided = { safety: baseContrib, health: baseContrib };
  for (const idx of selected) {
    for (const [need, c] of Object.entries(allOptions[idx].contribPerLevel)) {
      provided[need] = (provided[need] ?? 0) + c * allOptions[idx].builtLevel;
    }
  }
  const surplus = {};
  for (const [need, req] of Object.entries(requiredNeeds)) {
    surplus[need] = (provided[need] ?? 0) - req * target;
  }

  // Aggregate per-building totals for the reduction pass
  const bldMap = new Map();
  for (const idx of selected) {
    const opt = allOptions[idx];
    if (!bldMap.has(opt.building)) {
      bldMap.set(opt.building, { building: opt.building, builtLevel: opt.builtLevel, costPerLvl: 0, contribPerLvl: {} });
    }
    const e = bldMap.get(opt.building);
    e.costPerLvl += opt.costPerLevel;
    for (const [need, c] of Object.entries(opt.contribPerLevel)) {
      e.contribPerLvl[need] = (e.contribPerLvl[need] ?? 0) + c;
    }
  }

  // Reduce most-expensive buildings first to maximise savings
  const sortedBlds = [...bldMap.values()].sort((a, b) => b.costPerLvl - a.costPerLvl);

  for (const bData of sortedBlds) {
    let maxReduce = bData.builtLevel;
    for (const [need, c] of Object.entries(bData.contribPerLvl)) {
      if (c <= 0) continue;
      maxReduce = Math.min(maxReduce, Math.floor(surplus[need] / c));
    }
    maxReduce = Math.max(0, maxReduce);

    // Update surplus to reflect the reduction before processing next building
    for (const [need, c] of Object.entries(bData.contribPerLvl)) {
      surplus[need] -= maxReduce * c;
    }
    const newActive = bData.builtLevel - maxReduce;
    for (const opt of allOptions) {
      if (opt.building === bData.building) opt.activeLevel = newActive;
    }
  }

  // ── Return final plan ────────────────────────────────────────────────────
  // Returns ALL options (selected and not) each with a `selected` flag.
  return allOptions.map((opt, i) => {
    const isSelected = selected.has(i) && opt.activeLevel > 0;
    return {
      building: opt.building,
      builtLevel: opt.builtLevel,
      activeLevel: opt.activeLevel,
      ticker: opt.ticker,
      qtyPerDay: opt.qtyPerDayPerLevel * opt.activeLevel,
      cost: opt.costPerLevel * opt.activeLevel,
      contributions: Object.fromEntries(
        Object.entries(opt.contribPerLevel).map(([k, v]) => [k, v * opt.activeLevel])
      ),
      selected: isSelected,
    };
  });
}
