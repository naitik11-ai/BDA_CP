import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const RISK_COLORS = ["#16a34a", "#f59e0b", "#dc2626"];
const CSV_PATH = "/data/data_final.csv";

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
    // Normalize common variants
    const riskNorm = normalizeName(risk);
    if (riskNorm.includes("high")) risk = "High Risk";
    else if (riskNorm.includes("medium")) risk = "Medium Risk";
    else if (riskNorm.includes("low")) risk = "Low Risk";

    const dateObj = dateCol ? new Date(r[dateCol]) : null;
    const dateValid = dateObj && !Number.isNaN(dateObj.getTime()) ? dateObj : null;

    cleaned.push({
      raw: r,
      revenue,
      cost,
      profit,
      margin,
      risk,
      dateObj: dateValid,
      category: categoryCol ? String(r[categoryCol] || "Unknown") : "Unknown",
      platform: platformCol ? String(r[platformCol] || "Unknown") : "Unknown",
      businessModel: businessModelCol ? String(r[businessModelCol] || "Unknown") : "Unknown",
      paymentMode: paymentModeCol ? String(r[paymentModeCol] || "Unknown") : "Unknown",
      geo: stateCol ? String(r[stateCol] || "Unknown") : cityCol ? String(r[cityCol] || "Unknown") : "Unknown",
      geoKey: stateCol ? "State" : cityCol ? "City" : "",
    });
  }

  const riskLevels = ["Low Risk", "Medium Risk", "High Risk"];

  // Trend (monthly)
  const trendMap = new Map();
  for (const r of cleaned) {
    if (!r.dateObj) continue;
    const key = monthKey(r.dateObj);
    const cur = trendMap.get(key) || { Month: key, Revenue_INR: 0, Profit_INR: 0 };
    cur.Revenue_INR += r.revenue;
    cur.Profit_INR += r.profit;
    trendMap.set(key, cur);
  }
  const trend = Array.from(trendMap.values()).sort((a, b) => a.Month.localeCompare(b.Month));

  // Revenue by category
  const catMap = new Map();
  for (const r of cleaned) {
    const cur = catMap.get(r.category) || { Category: r.category, Revenue_INR: 0, Profit_INR: 0 };
    cur.Revenue_INR += r.revenue;
    cur.Profit_INR += r.profit;
    catMap.set(r.category, cur);
  }
  const category = Array.from(catMap.values()).sort((a, b) => b.Revenue_INR - a.Revenue_INR);

  // Risk distribution
  const riskDistMap = new Map(riskLevels.map((k) => [k, 0]));
  for (const r of cleaned) {
    riskDistMap.set(r.risk, (riskDistMap.get(r.risk) || 0) + 1);
  }
  const risk_distribution = Array.from(riskDistMap.entries()).map(([Risk_Level, Count]) => ({
    Risk_Level,
    Count,
  }));

  // Helper for stacked risk
  function stackedRisk(keyFn, keyName) {
    const m = new Map();
    for (const r of cleaned) {
      const key = keyFn(r);
      const cur = m.get(key) || { [keyName]: key };
      for (const lvl of riskLevels) cur[lvl] = cur[lvl] || 0;
      cur[r.risk] = (cur[r.risk] || 0) + 1;
      m.set(key, cur);
    }
    return Array.from(m.values()).sort((a, b) => {
      const aTot = riskLevels.reduce((s, k) => s + (a[k] || 0), 0);
      const bTot = riskLevels.reduce((s, k) => s + (b[k] || 0), 0);
      return bTot - aTot;
    });
  }

  const platform_risk = stackedRisk((r) => r.platform, "Platform");
  const business_model_risk = stackedRisk((r) => r.businessModel, "Business_Model");
  const payment_mode_risk = stackedRisk((r) => r.paymentMode, "Payment_Mode");

  // Geo revenue
  const geoMap = new Map();
  for (const r of cleaned) {
    const cur = geoMap.get(r.geo) || { [cleaned[0]?.geoKey || "Geo"]: r.geo, Revenue_INR: 0, Profit_INR: 0 };
    cur.Revenue_INR += r.revenue;
    cur.Profit_INR += r.profit;
    geoMap.set(r.geo, cur);
  }
  const geo_key = cleaned[0]?.geoKey || "";
  const geoLabelKey = geo_key || "Geo";
  const geo_revenue = Array.from(geoMap.values())
    .map((row) => {
      // ensure correct axis key
      if (geoLabelKey !== "Geo" && row.Geo) {
        row[geoLabelKey] = row.Geo;
        delete row.Geo;
      }
      return row;
    })
    .sort((a, b) => b.Revenue_INR - a.Revenue_INR)
    .slice(0, 15);

  // Scatter sample
  const scatter = cleaned.slice(0, 1500).map((r) => ({ Revenue_INR: r.revenue, Cost_INR: r.cost ?? 0 }));

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

function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(CSV_PATH);
        if (!response.ok) {
          throw new Error(
            `Dataset not found at ${CSV_PATH} (HTTP ${response.status}). Make sure the file exists in frontend/public/data/`
          );
        }
        const csvText = await response.text();
        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        if (parsed.errors?.length) {
          throw new Error(`CSV parse error: ${parsed.errors[0].message}`);
        }
        const built = buildDashboardFromRows(parsed.data);
        if (!built) {
          throw new Error("No valid rows found in dataset for dashboard charts.");
        }
        setDashboardData(built);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const pieRisk = useMemo(() => {
    if (!dashboardData?.risk_distribution) {
      return [];
    }
    return dashboardData.risk_distribution.map((row) => ({
      name: row.Risk_Level,
      value: row.Count,
    }));
  }, [dashboardData]);

  const riskLevels = dashboardData?.riskLevels || ["Low Risk", "Medium Risk", "High Risk"];

  const sharedAxisProps = {
    tickLine: false,
    axisLine: false,
    tickMargin: 10,
    tick: { fill: "#334155", fontSize: 12 },
  };

  const chartMargin = { left: 28, right: 18, top: 12, bottom: 12 };

  return (
    <section className="dashboard-page">
      <article className="card">
        <h2>Business Analytics Dashboard</h2>
        <p className="subtle">
          Dynamic analytics generated directly from your dataset without Power BI.
        </p>
      </article>

      {loading && <article className="card">Loading dashboard charts...</article>}
      {error && <article className="card error">{error}</article>}

      {!loading && !error && dashboardData && (
        <div className="dashboard-grid">
          <article className="card dashboard-chart-card">
            <h3>Revenue & Profit Trend</h3>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={dashboardData.trend} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="Month" {...sharedAxisProps} />
                  <YAxis {...sharedAxisProps} tickFormatter={formatIndianAmount} width={72} />
                  <Tooltip formatter={(value) => formatIndianAmount(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="Revenue_INR" stroke="#1d4ed8" strokeWidth={2} />
                  <Line type="monotone" dataKey="Profit_INR" stroke="#16a34a" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="card dashboard-chart-card">
            <h3>Revenue by Category</h3>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dashboardData.category} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="Category" {...sharedAxisProps} />
                  <YAxis {...sharedAxisProps} tickFormatter={formatIndianAmount} width={72} />
                  <Tooltip formatter={(value) => formatIndianAmount(value)} />
                  <Bar dataKey="Revenue_INR" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="card dashboard-chart-card">
            <h3>Risk Distribution</h3>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieRisk} dataKey="value" nameKey="name" outerRadius={90} label />
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="card dashboard-chart-card">
            <h3>Platform vs Risk</h3>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dashboardData.platform_risk}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="Platform" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {riskLevels.map((lvl, idx) => (
                    <Bar key={lvl} dataKey={lvl} stackId="risk" fill={RISK_COLORS[idx] || "#64748b"} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="card dashboard-chart-card">
            <h3>Business Model vs Risk</h3>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dashboardData.business_model_risk}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="Business_Model" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {riskLevels.map((lvl, idx) => (
                    <Bar key={lvl} dataKey={lvl} stackId="risk" fill={RISK_COLORS[idx] || "#64748b"} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="card dashboard-chart-card">
            <h3>Payment Mode vs Risk</h3>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dashboardData.payment_mode_risk}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="Payment_Mode" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {riskLevels.map((lvl, idx) => (
                    <Bar key={lvl} dataKey={lvl} stackId="risk" fill={RISK_COLORS[idx] || "#64748b"} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="card dashboard-chart-card">
            <h3>Revenue by Region</h3>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dashboardData.geo_revenue} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey={dashboardData.geo_key || "State"} {...sharedAxisProps} />
                  <YAxis {...sharedAxisProps} tickFormatter={formatIndianAmount} width={72} />
                  <Tooltip formatter={(value) => formatIndianAmount(value)} />
                  <Bar dataKey="Revenue_INR" fill="#0ea5e9" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="card dashboard-chart-card">
            <h3>Revenue vs Cost Scatter</h3>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="Revenue_INR" type="number" tickFormatter={formatIndianAmount} {...sharedAxisProps} width={72} />
                  <YAxis dataKey="Cost_INR" type="number" tickFormatter={formatIndianAmount} {...sharedAxisProps} width={72} />
                  <Tooltip formatter={(value) => formatIndianAmount(value)} />
                  <Scatter data={dashboardData.scatter} fill="#9333ea" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}

export default DashboardPage;
