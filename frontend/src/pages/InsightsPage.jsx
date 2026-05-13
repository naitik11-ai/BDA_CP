import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { loadPredictions } from "../utils/predictionStore";

const MODEL_FILTERS = [
  "All",
  "Retail",
  "Marketplace",
  "Dropshipping",
  "B2C",
  "B2B",
];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getBusinessModel(record) {
  return String(
    record?.output?.business_model || record?.input?.business_model || "Unknown"
  )
    .trim()
    .replace(/\s+/g, " ");
}

function getRevenue(record) {
  const value = Number(record?.input?.revenue);
  return Number.isFinite(value) ? value : 0;
}

function getCost(record) {
  const value = Number(record?.input?.cost);
  return Number.isFinite(value) ? value : 0;
}

function getProfit(record) {
  return getRevenue(record) - getCost(record);
}

function getProfitMargin(record) {
  const revenue = getRevenue(record);
  if (revenue === 0) return 0;
  return ((getProfit(record) / revenue) * 100) || 0;
}

function isHighRisk(record) {
  return String(record?.output?.risk || "").toLowerCase().includes("high");
}

function getModelAccuracy(record) {
  const value = Number(record?.output?.model_accuracy);
  return Number.isFinite(value) ? value : null;
}

function formatIndianNumber(value) {
  const number = Number(value) || 0;
  const sign = number < 0 ? "-" : "";
  const absValue = Math.abs(number);

  const formatValue = (valueToFormat) =>
    valueToFormat.toFixed(2).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");

  if (absValue < 10000) {
    return `${sign}${absValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  }
  if (absValue < 100000) {
    return `${sign}${formatValue(absValue / 1000)}K`;
  }
  if (absValue < 10000000) {
    return `${sign}${formatValue(absValue / 100000)} Lakh`;
  }
  return `${sign}${formatValue(absValue / 10000000)} Cr`;
}

function formatCurrency(value) {
  return `Rs ${formatIndianNumber(value)}`;
}

function formatPercent(value) {
  return `${Number(value).toFixed(1)}%`;
}

function getSelectedRecords(records, selectedModel) {
  if (selectedModel === "All") return records;
  return records.filter(
    (record) => getBusinessModel(record).toLowerCase() === selectedModel.toLowerCase()
  );
}

function buildForecast(records) {
  const sorted = [...records].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const revenuePoints = sorted.map((record) => getRevenue(record));
  const lastRevenue = revenuePoints.length ? revenuePoints[revenuePoints.length - 1] : 0;
  const deltas = [];
  for (let i = 1; i < revenuePoints.length; i += 1) {
    deltas.push(revenuePoints[i] - revenuePoints[i - 1]);
  }
  const avgDelta = deltas.length
    ? deltas.reduce((sum, value) => sum + value, 0) / deltas.length
    : 0;

  const today = new Date();
  const forecast = [];
  for (let i = 1; i <= 6; i += 1) {
    const month = MONTH_NAMES[(today.getMonth() + i - 1) % 12];
    const revenue = Math.max(0, lastRevenue + avgDelta * i);
    forecast.push({
      month,
      revenue: Number(revenue.toFixed(1)),
      low: Number((revenue * 0.92).toFixed(1)),
      high: Number((revenue * 1.08).toFixed(1)),
    });
  }
  return forecast;
}

function buildInsightCards(metrics) {
  if (metrics.predictionCount === 0) {
    return [
      {
        icon: "Info",
        title: "Prediction history needed",
        text: "Run predictions to populate insights, alerts, and forecast data for the selected business model.",
      },
      {
        icon: "Await",
        title: "Awaiting saved history",
        text: "KPI cards start at zero and update the moment prediction history becomes available.",
      },
      {
        icon: "Filter",
        title: "Filter awareness",
        text: "Use the Business Model filter to compare saved results for different models or all predictions combined.",
      },
    ];
  }

  return [
    {
      icon: "Trend",
      title: "Risk share",
      text: `${metrics.highRiskPercent}% of saved predictions are high risk for the selected filter.`,
    },
    {
      icon: "Margin",
      title: "Margin health",
      text: `Average profit margin is ${formatPercent(metrics.avgProfitMargin)} across saved history.`,
    },
    {
      icon: "Revenue",
      title: "Revenue performance",
      text: `Filtered history contains ${formatCurrency(metrics.totalRevenue)} in revenue and ${formatCurrency(metrics.totalProfit)} profit.`,
    },
  ];
}

function buildRecommendations(metrics) {
  if (metrics.predictionCount === 0) {
    return [
      { priority: "High", action: "Run predictions to generate model-specific recommendations and insights." },
      { priority: "Medium", action: "Use the business model filter to compare performance across saved history." },
      { priority: "Low", action: "Make sure predictions are saved so dashboards can reflect real history." },
    ];
  }

  const recommendations = [];
  if (metrics.highRiskPercent >= 30) {
    recommendations.push({
      priority: "High",
      action: "Review high-risk prediction drivers and reduce cost exposure on risky models.",
    });
  }
  if (metrics.avgProfitMargin < 15) {
    recommendations.push({
      priority: "Medium",
      action: "Focus on margin improvement by tightening costs or increasing revenue on low-margin predictions.",
    });
  }
  if (metrics.modelAccuracy < 90) {
    recommendations.push({
      priority: "Low",
      action: "Track model accuracy and refresh training data to improve future prediction confidence.",
    });
  }
  if (recommendations.length < 3) {
    recommendations.push({
      priority: "Low",
      action: "Use the selected model filter to identify patterns and compare performance across business models.",
    });
  }

  return recommendations.slice(0, 3);
}

function buildAlerts(metrics) {
  if (metrics.predictionCount === 0) {
    return ["No saved prediction history available to generate risk alerts."];
  }

  const alerts = [];
  if (metrics.highRiskPercent >= 30) {
    alerts.push(
      `High risk volume is elevated at ${formatPercent(metrics.highRiskPercent)} for saved ${metrics.selectedModel} predictions.`
    );
  }
  if (metrics.avgProfitMargin < 10) {
    alerts.push(
      `Average profit margin is below 10%, indicating pressure on profitability.`
    );
  }
  if (metrics.modelAccuracy < 85) {
    alerts.push(
      `Model accuracy is under 85%, so review prediction quality and feedback loops.`
    );
  }
  if (alerts.length === 0) {
    alerts.push("Prediction risk profile is stable relative to saved history for this filter.");
  }
  return alerts;
}

function buildWhy(metrics) {
  if (metrics.predictionCount === 0) {
    return "This insight section is driven by saved prediction history and updates as new model predictions are stored.";
  }
  return `${metrics.selectedModel === "All" ? "Combined prediction history" : metrics.selectedModel} insights are built from saved revenue, profit and risk outcomes to surface filter-specific performance and forecast trends.`;
}

function InsightsPage() {
  const [selectedModel, setSelectedModel] = useState("All");
  const [history, setHistory] = useState(() => loadPredictions());

  useEffect(() => {
    const refresh = () => setHistory(loadPredictions());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("predictionHistoryChanged", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("predictionHistoryChanged", refresh);
    };
  }, []);

  const selectedRecords = useMemo(
    () => getSelectedRecords(history, selectedModel),
    [history, selectedModel]
  );

  const metrics = useMemo(() => {
    const predictionCount = selectedRecords.length;
    const totalRevenue = selectedRecords.reduce((sum, record) => sum + getRevenue(record), 0);
    const totalProfit = selectedRecords.reduce((sum, record) => sum + getProfit(record), 0);
    const avgProfitMargin = predictionCount
      ? Number(
          (
            selectedRecords.reduce((sum, record) => sum + getProfitMargin(record), 0) /
            predictionCount
          ).toFixed(1)
        )
      : 0;
    const highRiskPercent = predictionCount
      ? Number(
          (
            selectedRecords.filter(isHighRisk).length / predictionCount * 100
          ).toFixed(1)
        )
      : 0;
    const validAccuracies = selectedRecords
      .map(getModelAccuracy)
      .filter((value) => value !== null);
    const modelAccuracy = validAccuracies.length
      ? Number(
          (validAccuracies.reduce((sum, value) => sum + value, 0) / validAccuracies.length).toFixed(1)
        )
      : 0;
    return {
      predictionCount,
      totalRevenue,
      totalProfit,
      avgProfitMargin,
      highRiskPercent,
      modelAccuracy,
      selectedModel,
    };
  }, [selectedRecords, selectedModel]);

  const kpis = useMemo(
    () => [
      {
        icon: "Revenue",
        label: "Total Revenue",
        value: formatCurrency(metrics.totalRevenue),
        tone: metrics.totalRevenue >= 0 ? "positive" : "risk",
        growth: "",
      },
      {
        icon: "Profit",
        label: "Total Profit",
        value: formatCurrency(metrics.totalProfit),
        tone: metrics.totalProfit >= 0 ? "positive" : "risk",
        growth: "",
      },
      {
        icon: "Margin",
        label: "Avg Profit Margin",
        value: formatPercent(metrics.avgProfitMargin),
        tone: metrics.avgProfitMargin >= 20 ? "positive" : "neutral",
        growth: "",
      },
      {
        icon: "Model",
        label: "Model Accuracy",
        value: formatPercent(metrics.modelAccuracy),
        tone: metrics.modelAccuracy >= 90 ? "positive" : "neutral",
        growth: "",
      },
    ],
    [metrics]
  );

  const insights = useMemo(() => buildInsightCards(metrics), [metrics]);
  const recommendations = useMemo(() => buildRecommendations(metrics), [metrics]);
  const alerts = useMemo(() => buildAlerts(metrics), [metrics]);
  const forecast = useMemo(() => buildForecast(selectedRecords), [selectedRecords]);
  const why = useMemo(() => buildWhy(metrics), [metrics]);

  return (
    <section className="insights-layout">
      <article className="card insights-topbar">
        <div>
          <h2>Insights Dashboard</h2>
          <p>Actionable intelligence for risk, profitability, and growth planning.</p>
        </div>
        <label>
          Business Model Filter
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            {MODEL_FILTERS.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </label>
      </article>

      <div className="page-grid">
        {kpis.map((item) => (
          <article className={`card insights-kpi insights-kpi-${item.tone}`} key={item.label}>
            <div className="insights-kpi-head">
              <span>{item.icon}</span>
              <small>{item.growth}</small>
            </div>
            <h3>{item.label}</h3>
            <p className="kpi-value">{item.value}</p>
          </article>
        ))}
      </div>

      <article className="card">
        <h2>Key Insights</h2>
        <div className="feature-grid">
          {insights.map((item) => (
            <article className="insight-visual-card" key={item.title}>
              <h3>
                <span>{item.icon}</span> {item.title}
              </h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </article>

      <article className="card">
        <h2>Recommendations</h2>
        <div className="insights-rec-grid">
          {recommendations.map((item) => (
            <article className="insights-rec-item" key={item.action}>
              <span className={`priority-tag priority-${item.priority.toLowerCase()}`}>
                {item.priority}
              </span>
              <p>{item.action}</p>
            </article>
          ))}
        </div>
      </article>

      <article className="card">
        <h2>Revenue Forecast</h2>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={forecast}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={formatIndianNumber} />
              <Tooltip
                formatter={(value) =>
                  value == null ? "-" : `Rs ${formatIndianNumber(value)}`
                }
              />
              <Area
                type="monotone"
                dataKey="high"
                stroke="none"
                fill="#93c5fd"
                fillOpacity={0.25}
                name="Upper Confidence"
              />
              <Area
                type="monotone"
                dataKey="low"
                stroke="none"
                fill="#ffffff"
                fillOpacity={1}
                name="Lower Confidence"
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#1d4ed8"
                strokeWidth={3}
                dot={{ r: 3 }}
                name="Forecast Revenue"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="card alert-card">
        <h2>Risk Alerts</h2>
        <ul>
          {alerts.map((alert) => (
            <li key={alert}>{alert}</li>
          ))}
        </ul>
      </article>

      <article className="card">
        <h2>Why this insight</h2>
        <p>{why}</p>
      </article>
    </section>
  );
}

export default InsightsPage;
