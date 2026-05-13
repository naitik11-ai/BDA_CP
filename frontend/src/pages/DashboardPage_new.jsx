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
import { getDashboardData, subscribeToDashboardData, formatIndianAmount } from "../services/dashboardDataService";

const RISK_COLORS = ["#16a34a", "#f59e0b", "#dc2626"];

function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getDashboardData();
        setDashboardData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Subscribe to data updates (though data is static, this handles cache refreshes)
    const unsubscribe = subscribeToDashboardData((data) => {
      setDashboardData(data);
    });

    return unsubscribe;
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

  const riskLevels = ["Low Risk", "Medium Risk", "High Risk"];

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
                  <XAxis dataKey="month" {...sharedAxisProps} />
                  <YAxis {...sharedAxisProps} tickFormatter={formatIndianAmount} width={72} />
                  <Tooltip formatter={(value) => formatIndianAmount(value)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#1d4ed8"
                    strokeWidth={3}
                    name="Revenue"
                    isAnimationActive
                    animationDuration={700}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#16a34a"
                    strokeWidth={2}
                    name="Profit"
                    isAnimationActive
                    animationDuration={700}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="card dashboard-chart-card">
            <h3>Risk Distribution</h3>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart margin={chartMargin}>
                  <Pie
                    data={pieRisk}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieRisk.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={RISK_COLORS[index % RISK_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
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
                  <Bar dataKey="Revenue_INR" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="card dashboard-chart-card">
            <h3>Business Model Risk</h3>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dashboardData.business_model_risk} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="Business_Model" {...sharedAxisProps} />
                  <YAxis {...sharedAxisProps} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Low Risk" stackId="a" fill="#16a34a" />
                  <Bar dataKey="Medium Risk" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="High Risk" stackId="a" fill="#dc2626" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="card dashboard-chart-card">
            <h3>Platform Risk Analysis</h3>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dashboardData.platform_risk} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="Platform" {...sharedAxisProps} />
                  <YAxis {...sharedAxisProps} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Low Risk" stackId="a" fill="#16a34a" />
                  <Bar dataKey="Medium Risk" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="High Risk" stackId="a" fill="#dc2626" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="card dashboard-chart-card">
            <h3>Payment Mode Risk</h3>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dashboardData.payment_mode_risk} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="Payment_Mode" {...sharedAxisProps} />
                  <YAxis {...sharedAxisProps} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Low Risk" stackId="a" fill="#16a34a" />
                  <Bar dataKey="Medium Risk" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="High Risk" stackId="a" fill="#dc2626" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          {dashboardData.geo_revenue?.length > 0 && (
            <article className="card dashboard-chart-card">
              <h3>Revenue by {dashboardData.geo_key || "Location"}</h3>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dashboardData.geo_revenue} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey={dashboardData.geo_key || "Geo"} {...sharedAxisProps} />
                    <YAxis {...sharedAxisProps} tickFormatter={formatIndianAmount} width={72} />
                    <Tooltip formatter={(value) => formatIndianAmount(value)} />
                    <Bar dataKey="Revenue_INR" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          )}

          <article className="card dashboard-chart-card">
            <h3>Cost vs Revenue Scatter</h3>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart data={dashboardData.scatter} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    dataKey="Cost_INR"
                    name="Cost"
                    {...sharedAxisProps}
                    tickFormatter={formatIndianAmount}
                  />
                  <YAxis
                    type="number"
                    dataKey="Revenue_INR"
                    name="Revenue"
                    {...sharedAxisProps}
                    tickFormatter={formatIndianAmount}
                    width={72}
                  />
                  <Tooltip
                    formatter={(value, name) => [formatIndianAmount(value), name]}
                    labelFormatter={() => ""}
                  />
                  <Scatter dataKey="Revenue_INR" fill="#1d4ed8" />
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