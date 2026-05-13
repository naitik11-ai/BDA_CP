/**
 * Homepage Data Service
 * Loads and caches CSV data for homepage KPIs and best business model calculation
 */

import { getRawCsvData } from "./dashboardDataService";

function findBestBusinessModel(rows) {
  if (!rows || rows.length === 0) return "Unknown";
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

/**
 * Get best performing business model from cached CSV data
 */
export async function getBestBusinessModel() {
  try {
    const rows = await getRawCsvData();
    return findBestBusinessModel(rows);
  } catch (error) {
    console.warn("Failed to load best business model:", error);
    return "Unknown";
  }
}

/**
 * Subscribe to best business model updates (when CSV data changes)
 */
export function subscribeToBestBusinessModel(callback) {
  return getRawCsvData().then(() => {
    // Data is already cached, call callback immediately
    getBestBusinessModel().then(callback);
    // Return a no-op unsubscribe since data is static
    return () => {};
  });
}
