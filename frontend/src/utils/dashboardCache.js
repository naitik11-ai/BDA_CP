import Papa from "papaparse";

const CSV_PATH = "/data/data_final.csv";
const STORAGE_KEY = "bda_dashboard_cache_v1";

const inMemoryCache = {
  dashboardData: null,
  bestBusinessModel: null,
  loaded: false,
  error: null,
  loadPromise: null,
};

function normalizeName(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function pickColumn(columns, candidates) {
  const normalized = columns.map((c) => ({ col: c, n: normalizeName(c) }));
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeName(candidate);
    const exactMatch = normalized.find((item) => item.n === normalizedCandidate);
    if (exactMatch) return exactMatch.col;
    const includesMatch = normalized.find((item) => item.n.includes(normalizedCandidate));
    if (includesMatch) return includesMatch.col;
  }
  return null;
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function monthKey(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function findBestBusinessModel(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return "Unknown";

  const modelCol = Object.keys(rows[0]).find((key) =>
    ["Business_Model", "Business Model", "BusinessModel", "business_model"].includes(key)
  );
  const revenueCol = Object.keys(rows[0]).find((key) =>
    ["Revenue_INR", "Revenue", "RevenueINR"].includes(key)
  );

  if (!modelCol || !revenueCol) return "Unknown";

  const totals = rows.reduce((acc, row) => {
    const model = String(row[modelCol] || "Unknown").trim() || "Unknown";
    const revenue = Number(row[revenueCol]) || 0;
    acc[model] = (acc[model] || 0) + revenue;
    return acc;
  }, {});

  return Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";
}

function buildDashboardFromRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  const columns = Object.keys(rows[0] || {});
  const dateCol = pickColumn(columns, ["Order_Date", "Date"]);
  const revenueCol = pickColumn(columns, ["Revenue_INR", "Revenue"]);
  const costCol = pickColumn(columns, ["Cost_INR", "Cost"]);
  const profitCol = pickColumn(columns, ["Profit_INR", "Profit"]);
  const categoryCol = pickColumn(columns, ["Category"]);
  const platformCol = pickColumn(columns, ["Platform"]);
  const businessModelCol = pickColumn(columns, ["Business_Model"]);
  const paymentModeCol = pickColumn(columns, ["Payment_Mode"]);
  const stateCol = pickColumn(columns, ["State"]);
  const cityCol = pickColumn(columns, ["City"]);
  let riskCol = pickColumn(columns, ["Risk_Level", "Risk Level", "Risk"]);

  const cleaned = [];
  for (const row of rows) {
    const revenue = revenueCol ? toNumber(row[revenueCol]) : null;
    const cost = costCol ? toNumber(row[costCol]) : null;
    let profit = profitCol ? toNumber(row[profitCol]) : null;
    if (profit === null && revenue !== null && cost !== null) {
      profit = revenue - cost;
    }

    if (revenue === null || revenue <= 0 || profit === null) continue;

    const margin = profit / revenue;
    let risk = riskCol ? String(row[riskCol] || "").trim() : "";
    if (!risk) {
      risk = margin < 0.1 ? "High Risk" : margin < 0.3 ? "Medium Risk" : "Low Risk";
    }

    const riskNorm = normalizeName(risk);
    if (riskNorm.includes("high")) risk = "High Risk";
    else if (riskNorm.includes("medium")) risk = "Medium Risk";
    else if (riskNorm.includes("low")) risk = "Low Risk";

    const dateObj = dateCol ? new Date(row[dateCol]) : null;
    const dateValid = dateObj && !Number.isNaN(dateObj.getTime()) ? dateObj : null;

    cleaned.push({
      raw: row,
      revenue,
      cost,
      profit,
      margin,
      risk,
      dateObj: dateValid,
      category: categoryCol ? String(row[categoryCol] || "Unknown") : "Unknown",
      platform: platformCol ? String(row[platformCol] || "Unknown") : "Unknown",
      businessModel: businessModelCol ? String(row[businessModelCol] || "Unknown") : "Unknown",
      paymentMode: paymentModeCol ? String(row[paymentModeCol] || "Unknown") : "Unknown",
      geo: stateCol ? String(row[stateCol] || "Unknown") : cityCol ? String(row[cityCol] || "Unknown") : "Unknown",
      geoKey: stateCol ? "State" : cityCol ? "City" : "",
    });
  }

  if (cleaned.length === 0) return null;

  const riskLevels = ["Low Risk", "Medium Risk", "High Risk"];
  const trendMap = new Map();
  const catMap = new Map();
  const riskDistMap = new Map(riskLevels.map((level) => [level, 0]));
  const platformRiskMap = new Map();
  const modelRiskMap = new Map();
  const paymentRiskMap = new Map();
  const geoMap = new Map();

  for (const record of cleaned) {
    if (record.dateObj) {
      const key = monthKey(record.dateObj);
      const existing = trendMap.get(key) || { Month: key, Revenue_INR: 0, Profit_INR: 0 };
      existing.Revenue_INR += record.revenue;
      existing.Profit_INR += record.profit;
      trendMap.set(key, existing);
    }

    const catEntry = catMap.get(record.category) || { Category: record.category, Revenue_INR: 0, Profit_INR: 0 };
    catEntry.Revenue_INR += record.revenue;
    catEntry.Profit_INR += record.profit;
    catMap.set(record.category, catEntry);

    riskDistMap.set(record.risk, (riskDistMap.get(record.risk) || 0) + 1);

    const addStacked = (map, key, labelKey) => {
      const item = map.get(key) || { [labelKey]: key };
      for (const level of riskLevels) {
        item[level] = item[level] || 0;
      }
      item[record.risk] = (item[record.risk] || 0) + 1;
      map.set(key, item);
    };

    addStacked(platformRiskMap, record.platform, "Platform");
    addStacked(modelRiskMap, record.businessModel, "Business_Model");
    addStacked(paymentRiskMap, record.paymentMode, "Payment_Mode");

    const geoKey = record.geoKey || "Geo";
    const geoEntry = geoMap.get(record.geo) || { [geoKey]: record.geo, Revenue_INR: 0, Profit_INR: 0 };
    geoEntry.Revenue_INR += record.revenue;
    geoEntry.Profit_INR += record.profit;
    geoMap.set(record.geo, geoEntry);
  }

  const trend = Array.from(trendMap.values()).sort((a, b) => a.Month.localeCompare(b.Month));
  const category = Array.from(catMap.values()).sort((a, b) => b.Revenue_INR - a.Revenue_INR);
  const risk_distribution = Array.from(riskDistMap.entries()).map(([Risk_Level, Count]) => ({ Risk_Level, Count }));
  const platform_risk = Array.from(platformRiskMap.values()).sort((a, b) => Object.values(b).reduce((sum, cur) => sum + (Number(cur) || 0), 0) - Object.values(a).reduce((sum, cur) => sum + (Number(cur) || 0), 0));
  const business_model_risk = Array.from(modelRiskMap.values()).sort((a, b) => Object.values(b).reduce((sum, cur) => sum + (Number(cur) || 0), 0) - Object.values(a).reduce((sum, cur) => sum + (Number(cur) || 0), 0));
  const payment_mode_risk = Array.from(paymentRiskMap.values()).sort((a, b) => Object.values(b).reduce((sum, cur) => sum + (Number(cur) || 0), 0) - Object.values(a).reduce((sum, cur) => sum + (Number(cur) || 0), 0));

  const geo_key = cleaned[0]?.geoKey || "";
  const geoLabelKey = geo_key || "Geo";
  const geo_revenue = Array.from(geoMap.values())
    .map((row) => {
      if (geoLabelKey !== "Geo" && row.Geo) {
        row[geoLabelKey] = row.Geo;
        delete row.Geo;
      }
      return row;
    })
    .sort((a, b) => b.Revenue_INR - a.Revenue_INR)
    .slice(0, 15);

  const scatter = cleaned.slice(0, 1500).map((record) => ({ Revenue_INR: record.revenue, Cost_INR: record.cost ?? 0 }));

  return {
    trend,
    category,
    risk_distribution,
    platform_risk,
    business_model_risk,
    payment_mode_risk,
    geo_key: geoLabelKey === "Geo" ? "" : geoLabelKey,
    geo_revenue,
    scatter,
    riskLevels,
  };
}

function loadCacheFromSession() {
  try {
    const payload = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    if (payload && payload.dashboardData && payload.bestBusinessModel) {
      return payload;
    }
  } catch {
    // ignore invalid cache
  }
  return null;
}

function saveCacheToSession(cache) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // fail silently when storage is unavailable
  }
}

async function fetchCsvRows() {
  const response = await fetch(CSV_PATH);
  if (!response.ok) {
    throw new Error(`Dataset not found at ${CSV_PATH} (HTTP ${response.status})`);
  }
  const csvText = await response.text();
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  if (parsed.errors?.length) {
    throw new Error(parsed.errors[0].message || "CSV parse error");
  }
  return parsed.data;
}

export async function ensureDashboardCache() {
  if (inMemoryCache.loaded) {
    return inMemoryCache;
  }
  if (inMemoryCache.loadPromise) {
    return inMemoryCache.loadPromise;
  }

  const sessionCache = loadCacheFromSession();
  if (sessionCache) {
    inMemoryCache.dashboardData = sessionCache.dashboardData;
    inMemoryCache.bestBusinessModel = sessionCache.bestBusinessModel;
    inMemoryCache.loaded = true;
    return inMemoryCache;
  }

  inMemoryCache.loadPromise = (async () => {
    try {
      const rows = await fetchCsvRows();
      const dashboardData = buildDashboardFromRows(rows);
      const bestBusinessModel = findBestBusinessModel(rows);
      if (!dashboardData) {
        throw new Error("No valid rows found in dataset for dashboard charts.");
      }
      inMemoryCache.dashboardData = dashboardData;
      inMemoryCache.bestBusinessModel = bestBusinessModel;
      inMemoryCache.loaded = true;
      inMemoryCache.error = null;
      saveCacheToSession({ dashboardData, bestBusinessModel });
      return inMemoryCache;
    } catch (error) {
      inMemoryCache.error = error;
      inMemoryCache.loaded = true;
      throw error;
    }
  })();

  return inMemoryCache.loadPromise;
}

export function getCachedDashboardData() {
  return inMemoryCache.dashboardData;
}

export function getCachedBestBusinessModel() {
  return inMemoryCache.bestBusinessModel;
}

export function getDashboardCacheError() {
  return inMemoryCache.error;
}

export default {
  ensureDashboardCache,
  getCachedDashboardData,
  getCachedBestBusinessModel,
  getDashboardCacheError,
};
