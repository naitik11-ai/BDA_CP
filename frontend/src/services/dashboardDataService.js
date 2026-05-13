/**
 * Dashboard Data Service
 * Loads and caches dashboard CSV data for instant loading
 */

import Papa from "papaparse";
import dataCache from "./dataCache";

const CSV_PATH = "/data/data_final.csv";
const CACHE_KEY = "dashboard_csv";

function normalizeName(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function pickColumn(columns, candidates) {
  const normalized = columns.map((c) => ({ col: c, n: normalizeName(c) }));
  for (const cand of candidates) {
    const nc = normalizeName(cand);
    const match = normalized.find((item) => item.n === nc) || normalized.find((item) => item.n.includes(nc));
    if (match) return match.col;
  }
  return null;
}

function toNumber(val) {
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

function monthKey(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatIndianAmount(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return String(value ?? "");
  }

  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  if (abs < 10000) {
    return `${sign}${Math.round(num) === num ? num : num}`;
  }
  if (abs < 100000) {
    return `${sign}${Math.round(num / 1000)}K`;
  }
  if (abs < 10000000) {
    return `${sign}${Math.round((num / 100000) * 10) / 10}L`;
  }
  return `${sign}${Math.round((num / 10000000) * 10) / 10}Cr`;
}

function buildDashboardFromRows(rows) {
  if (!rows || rows.length === 0) {
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
  for (const r of rows) {
    const revenue = revenueCol ? toNumber(r[revenueCol]) : null;
    const cost = costCol ? toNumber(r[costCol]) : null;
    let profit = profitCol ? toNumber(r[profitCol]) : null;
    if (profit === null && revenue !== null && cost !== null) {
      profit = revenue - cost;
    }

    if (revenue === null || revenue <= 0 || profit === null) continue;

    const margin = profit / revenue;
    let risk = riskCol ? String(r[riskCol] || "").trim() : "";
    if (!risk) {
      risk = margin < 0.1 ? "High Risk" : margin < 0.3 ? "Medium Risk" : "Low Risk";
    }

    cleaned.push({
      revenue: revenue,
      cost: cost,
      profit: profit,
      margin: margin,
      risk: risk,
      category: categoryCol ? String(r[categoryCol] || "") : "",
      platform: platformCol ? String(r[platformCol] || "") : "",
      business_model: businessModelCol ? String(r[businessModelCol] || "") : "",
      payment_mode: paymentModeCol ? String(r[paymentModeCol] || "") : "",
      state: stateCol ? String(r[stateCol] || "") : "",
      city: cityCol ? String(r[cityCol] || "") : "",
      date: dateCol ? String(r[dateCol] || "") : "",
    });
  }

  if (cleaned.length === 0) {
    return null;
  }

  const payload = {};

  // Trend data
  if (dateCol) {
    const trend = cleaned
      .filter((r) => r.date)
      .map((r) => {
        try {
          const date = new Date(r.date);
          if (isNaN(date.getTime())) return null;
          return {
            ...r,
            month: monthKey(date),
            month_date: date,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.month_date - b.month_date);

    const groupedTrend = trend.reduce((acc, r) => {
      if (!acc[r.month]) {
        acc[r.month] = { month: r.month, revenue: 0, profit: 0, count: 0 };
      }
      acc[r.month].revenue += r.revenue;
      acc[r.month].profit += r.profit;
      acc[r.month].count += 1;
      return acc;
    }, {});

    payload.trend = Object.values(groupedTrend).sort((a, b) => a.month.localeCompare(b.month));
  } else {
    payload.trend = [];
  }

  // Aggregations
  payload.category = cleaned.reduce((acc, r) => {
    if (!r.category) return acc;
    if (!acc[r.category]) {
      acc[r.category] = { Category: r.category, Revenue_INR: 0, Profit_INR: 0 };
    }
    acc[r.category].Revenue_INR += r.revenue;
    acc[r.category].Profit_INR += r.profit;
    return acc;
  }, {});

  payload.category = Object.values(payload.category).sort((a, b) => b.Revenue_INR - a.Revenue_INR);

  payload.risk_distribution = cleaned.reduce((acc, r) => {
    acc[r.risk] = (acc[r.risk] || 0) + 1;
    return acc;
  }, {});

  payload.risk_distribution = Object.entries(payload.risk_distribution).map(([Risk_Level, Count]) => ({
    Risk_Level,
    Count,
  }));

  payload.platform_risk = cleaned.reduce((acc, r) => {
    if (!r.platform) return acc;
    if (!acc[r.platform]) {
      acc[r.platform] = { Platform: r.platform, "Low Risk": 0, "Medium Risk": 0, "High Risk": 0 };
    }
    acc[r.platform][r.risk] += 1;
    return acc;
  }, {});

  payload.platform_risk = Object.values(payload.platform_risk);

  payload.business_model_risk = cleaned.reduce((acc, r) => {
    if (!r.business_model) return acc;
    if (!acc[r.business_model]) {
      acc[r.business_model] = { Business_Model: r.business_model, "Low Risk": 0, "Medium Risk": 0, "High Risk": 0 };
    }
    acc[r.business_model][r.risk] += 1;
    return acc;
  }, {});

  payload.business_model_risk = Object.values(payload.business_model_risk);

  payload.payment_mode_risk = cleaned.reduce((acc, r) => {
    if (!r.payment_mode) return acc;
    if (!acc[r.payment_mode]) {
      acc[r.payment_mode] = { Payment_Mode: r.payment_mode, "Low Risk": 0, "Medium Risk": 0, "High Risk": 0 };
    }
    acc[r.payment_mode][r.risk] += 1;
    return acc;
  }, {});

  payload.payment_mode_risk = Object.values(payload.payment_mode_risk);

  const geoCol = stateCol || cityCol;
  payload.geo_key = geoCol ? (stateCol ? "State" : "City") : "";
  payload.geo_revenue = geoCol ? Object.values(cleaned.reduce((acc, r) => {
    const key = r[geoCol.toLowerCase()];
    if (!key) return acc;
    if (!acc[key]) {
      acc[key] = { [geoCol]: key, Revenue_INR: 0, Profit_INR: 0 };
    }
    acc[key].Revenue_INR += r.revenue;
    acc[key].Profit_INR += r.profit;
    return acc;
  }, {})).sort((a, b) => b.Revenue_INR - a.Revenue_INR).slice(0, 15) : [];

  payload.scatter = cleaned.map(r => ({
    Revenue_INR: r.revenue,
    Cost_INR: r.cost,
  })).sort(() => Math.random() - 0.5).slice(0, 1500);

  return payload;
}

/**
 * Fetch dashboard CSV data
 */
async function fetchDashboardData() {
  const response = await fetch(CSV_PATH);
  if (!response.ok) {
    throw new Error(`Dataset not found at ${CSV_PATH} (HTTP ${response.status}). Make sure the file exists in frontend/public/data/`);
  }

  const text = await response.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

  if (parsed.errors?.length) {
    throw parsed.errors[0];
  }

  const dashboardData = buildDashboardFromRows(parsed.data);
  if (!dashboardData) {
    throw new Error("No valid data found in CSV");
  }

  return dashboardData;
}

/**
 * Get dashboard data (cached)
 */
export function getDashboardData() {
  return dataCache.getData(CACHE_KEY, fetchDashboardData);
}

/**
 * Subscribe to dashboard data updates
 */
export function subscribeToDashboardData(callback) {
  return dataCache.subscribe(CACHE_KEY, callback);
}

/**
 * Get raw CSV rows for homepage analysis
 */
export function getRawCsvData() {
  return dataCache.getData(`${CACHE_KEY}_raw`, async () => {
    const response = await fetch(CSV_PATH);
    if (!response.ok) {
      throw new Error(`Dataset not found at ${CSV_PATH}`);
    }

    const text = await response.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

    if (parsed.errors?.length) {
      throw parsed.errors[0];
    }

    return parsed.data;
  });
}

export { formatIndianAmount };
