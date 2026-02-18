// Shared infrastructure data for governor tooling.
// Imported by governor-helper and governing-mats.

export const UPKEEP_NEED_TYPES = [
  "safety",
  "health",
  "comfort",
  "culture",
  "education",
];

// Happiness weight per workforce tier for each need type.
// Source: https://pct.fnar.net/population-infrastructure/
export const WEIGHTS = {
  pioneer:    { safety: 0.25, health: 0.15, comfort: 0.03, culture: 0.02, education: 0.01 },
  settler:    { safety: 0.30, health: 0.20, comfort: 0.03, culture: 0.03, education: 0.03 },
  technician: { safety: 0.20, health: 0.30, comfort: 0.20, culture: 0.10, education: 0.05 },
  engineer:   { safety: 0.10, health: 0.15, comfort: 0.35, culture: 0.20, education: 0.10 },
  scientist:  { safety: 0.10, health: 0.10, comfort: 0.20, culture: 0.25, education: 0.30 },
};

// Each building entry describes one infrastructure building type.
// materials[].qtyPerDay is the per-day consumption for ONE level of the building.
// needs values are the total need units provided when ALL materials are supplied
// to ONE level; each material independently provides 1/n of that total.
export const UPKEEP_BUILDINGS = [
  {
    ticker: "SST",
    name: "Safety Station",
    materials: [
      { ticker: "DW",  qtyPerDay: 10 },
      { ticker: "OFF", qtyPerDay: 10 },
      { ticker: "SUN", qtyPerDay: 2  },
    ],
    needs: { safety: 2500.0, health: 0, comfort: 0, culture: 0, education: 0 },
  },
  {
    ticker: "SDP",
    name: "Security Drone Post",
    materials: [
      { ticker: "POW", qtyPerDay: 1    },
      { ticker: "RAD", qtyPerDay: 0.47 },
      { ticker: "CCD", qtyPerDay: 0.07 },
      { ticker: "SUD", qtyPerDay: 0.07 },
    ],
    needs: { safety: 5000.0, health: 0, comfort: 0, culture: 0, education: 0 },
  },
  {
    ticker: "EMC",
    name: "Emergency Center",
    materials: [
      { ticker: "PK",  qtyPerDay: 2    },
      { ticker: "POW", qtyPerDay: 0.4  },
      { ticker: "BND", qtyPerDay: 4    },
      { ticker: "RED", qtyPerDay: 0.07 },
      { ticker: "BSC", qtyPerDay: 0.07 },
    ],
    needs: { safety: 1000.0, health: 1000.0, comfort: 0, culture: 0, education: 0 },
  },
  {
    ticker: "INF",
    name: "Infirmary",
    materials: [
      { ticker: "OFF", qtyPerDay: 10   },
      { ticker: "TUB", qtyPerDay: 6.67 },
      { ticker: "STR", qtyPerDay: 0.67 },
    ],
    needs: { safety: 0, health: 2500.0, comfort: 0, culture: 0, education: 0 },
  },
  {
    ticker: "HOS",
    name: "Hospital",
    materials: [
      { ticker: "PK",  qtyPerDay: 2    },
      { ticker: "SEQ", qtyPerDay: 0.4  },
      { ticker: "BND", qtyPerDay: 4    },
      { ticker: "SDR", qtyPerDay: 0.07 },
      { ticker: "RED", qtyPerDay: 0.07 },
      { ticker: "BSC", qtyPerDay: 0.13 },
    ],
    needs: { safety: 0, health: 5000.0, comfort: 0, culture: 0, education: 0 },
  },
  {
    ticker: "WCE",
    name: "Wellness Center",
    materials: [
      { ticker: "KOM", qtyPerDay: 4    },
      { ticker: "OLF", qtyPerDay: 2    },
      { ticker: "DW",  qtyPerDay: 6    },
      { ticker: "DEC", qtyPerDay: 0.67 },
      { ticker: "PFE", qtyPerDay: 2.67 },
      { ticker: "SOI", qtyPerDay: 6.67 },
    ],
    needs: { safety: 0, health: 1000.0, comfort: 1000.0, culture: 0, education: 0 },
  },
  {
    ticker: "PAR",
    name: "Park",
    materials: [
      { ticker: "DW",  qtyPerDay: 10   },
      { ticker: "FOD", qtyPerDay: 6    },
      { ticker: "PFE", qtyPerDay: 2    },
      { ticker: "SOI", qtyPerDay: 3.33 },
      { ticker: "DEC", qtyPerDay: 0.33 },
    ],
    needs: { safety: 0, health: 0, comfort: 2500.0, culture: 0, education: 0 },
  },
  {
    ticker: "4DA",
    name: "4D Arcades",
    materials: [
      { ticker: "POW", qtyPerDay: 2   },
      { ticker: "MHP", qtyPerDay: 2   },
      { ticker: "OLF", qtyPerDay: 4   },
      { ticker: "BID", qtyPerDay: 0.2 },
      { ticker: "HOG", qtyPerDay: 0.2 },
      { ticker: "EDC", qtyPerDay: 0.2 },
    ],
    needs: { safety: 0, health: 0, comfort: 5000.0, culture: 0, education: 0 },
  },
  {
    ticker: "ACA",
    name: "Art Cafe",
    materials: [
      { ticker: "COF", qtyPerDay: 8    },
      { ticker: "OLF", qtyPerDay: 2    },
      { ticker: "VIT", qtyPerDay: 8    },
      { ticker: "DW",  qtyPerDay: 10   },
      { ticker: "GL",  qtyPerDay: 6.67 },
      { ticker: "DEC", qtyPerDay: 0.67 },
    ],
    needs: { safety: 0, health: 0, comfort: 1000.0, culture: 1000.0, education: 0 },
  },
  {
    ticker: "ART",
    name: "Art Gallery",
    materials: [
      { ticker: "MHP", qtyPerDay: 1    },
      { ticker: "HOG", qtyPerDay: 1    },
      { ticker: "UTS", qtyPerDay: 0.67 },
      { ticker: "DEC", qtyPerDay: 0.67 },
    ],
    needs: { safety: 0, health: 0, comfort: 0, culture: 2500.0, education: 0 },
  },
  {
    ticker: "VRT",
    name: "VR Theater",
    materials: [
      { ticker: "POW", qtyPerDay: 1.4  },
      { ticker: "MHP", qtyPerDay: 2    },
      { ticker: "HOG", qtyPerDay: 1.4  },
      { ticker: "OLF", qtyPerDay: 4    },
      { ticker: "BID", qtyPerDay: 0.33 },
      { ticker: "DEC", qtyPerDay: 0.67 },
    ],
    needs: { safety: 0, health: 0, comfort: 0, culture: 5000.0, education: 0 },
  },
  {
    ticker: "PBH",
    name: "Planetary Broadcasting Hub",
    materials: [
      { ticker: "OFF", qtyPerDay: 10   },
      { ticker: "MHP", qtyPerDay: 1    },
      { ticker: "SP",  qtyPerDay: 1.33 },
      { ticker: "AAR", qtyPerDay: 0.67 },
      { ticker: "EDC", qtyPerDay: 0.27 },
      { ticker: "IDC", qtyPerDay: 0.13 },
    ],
    needs: { safety: 0, health: 0, comfort: 0, culture: 1000.0, education: 1000.0 },
  },
  {
    ticker: "LIB",
    name: "Library",
    materials: [
      { ticker: "MHP", qtyPerDay: 1   },
      { ticker: "HOG", qtyPerDay: 1   },
      { ticker: "CD",  qtyPerDay: 0.33 },
      { ticker: "DIS", qtyPerDay: 0.33 },
      { ticker: "BID", qtyPerDay: 0.2  },
    ],
    needs: { safety: 0, health: 0, comfort: 0, culture: 0, education: 2500.0 },
  },
  {
    ticker: "UNI",
    name: "University",
    materials: [
      { ticker: "COF", qtyPerDay: 10   },
      { ticker: "REA", qtyPerDay: 10   },
      { ticker: "TUB", qtyPerDay: 10   },
      { ticker: "BID", qtyPerDay: 0.33 },
      { ticker: "HD",  qtyPerDay: 0.67 },
      { ticker: "IDC", qtyPerDay: 0.2  },
    ],
    needs: { safety: 0, health: 0, comfort: 0, culture: 0, education: 5000.0 },
  },
];
