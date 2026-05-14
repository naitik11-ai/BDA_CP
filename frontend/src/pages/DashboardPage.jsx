import { useEffect, useMemo, useState } from "react";
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
import { ensureDashboardCache } from "../utils/dashboardCache";

const RISK_COLORS = ["#16a34a", "#f59e0b", "#dc2626"];

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

function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const loadDashboard = async () => {
      setLoading(true);
      setError("");
      try {
        const cache = await ensureDashboardCache();
        if (!active) return;
        if (!cache.dashboardData) {
          throw new Error("Unable to load dashboard charts.");
        }
        setDashboardData(cache.dashboardData);
      } catch (err) {
        if (!active) return;
        setError(err?.message || "Unable to load dashboard data.");
      } finally {
        if (!active) return;
        setLoading(false);
      }
    };
    loadDashboard();
    return () => {
      active = false;
    };
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
