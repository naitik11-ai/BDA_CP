import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { addPrediction, loadPredictions, toTrendHistory } from "../utils/predictionStore";
import { predict as localPredict } from "../services/predictionService";

const modelFilterOptions = ["Retail", "Marketplace", "Dropshipping", "B2C", "B2B"];
const defaultForm = {
  revenue: "",
  cost: "",
  quantity: "",
  business_model: "Retail",
};

function PredictionPage() {
  const [formData, setFormData] = useState(defaultForm);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [selectedTrendModel, setSelectedTrendModel] = useState("Retail");

  useEffect(() => {
    const existing = loadPredictions();
    setHistory(toTrendHistory(existing, 20));
  }, []);

  const revenueNum = Number(formData.revenue);
  const costNum = Number(formData.cost);
  const quantityNum = Number(formData.quantity);

  const liveProfitMargin = useMemo(() => {
    if (!Number.isFinite(revenueNum) || revenueNum <= 0 || !Number.isFinite(costNum)) {
      return null;
    }
    const margin = ((revenueNum - costNum) / revenueNum) * 100;
    return Number(margin.toFixed(2));
  }, [revenueNum, costNum]);

  const marginLevel = useMemo(() => {
    if (liveProfitMargin === null) {
      return "Waiting for inputs";
    }
    if (liveProfitMargin < 10) {
      return "Critical";
    }
    if (liveProfitMargin < 20) {
      return "Moderate";
    }
    return "Healthy";
  }, [liveProfitMargin]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const selectBusinessModel = (model) => {
    setFormData((prev) => ({ ...prev, business_model: model }));
  };

  const getRiskClass = (score) => {
    if (score >= 70) return "high";
    if (score >= 40) return "medium";
    return "low";
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const payload = {
        revenue: Number(formData.revenue),
        cost: Number(formData.cost),
        quantity: Number(formData.quantity),
        business_model: formData.business_model,
      };

      if (!Number.isFinite(payload.revenue) || !Number.isFinite(payload.cost) || !Number.isFinite(payload.quantity)) {
        throw new Error("All values must be numeric.");
      }
      if (payload.revenue <= 0 || payload.cost < 0 || payload.quantity <= 0) {
        throw new Error("Revenue and quantity must be positive; cost cannot be negative.");
      }

      // Call local prediction service instead of Flask API
      const data = localPredict(payload.revenue, payload.cost, payload.quantity, payload.business_model);

      setResult(data);
      const saved = addPrediction({
        input: {
          revenue: payload.revenue,
          cost: payload.cost,
          quantity: payload.quantity,
          business_model: payload.business_model,
        },
        output: data,
      });
      setHistory(toTrendHistory(saved, 20));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter((item) => item.business_model === selectedTrendModel);
  const riskClass = result ? getRiskClass(result.risk_score) : "";
  const recentHistory = useMemo(() => history.slice(-10), [history]);

  const explanationText = useMemo(() => {
    if (!result?.risk_analysis) return "";
    const costRatio = result.risk_analysis.cost_ratio ?? 0;
    const qImpact = result.risk_analysis.quantity_component ?? 0;
    const bmImpact = result.risk_analysis.business_model_component ?? 0;
    const label = riskClass === "high" ? "high" : riskClass === "medium" ? "moderate" : "low";
    return `This prediction is driven by a cost ratio of ${costRatio}, quantity impact (+${qImpact}), and business model impact (+${bmImpact}). Overall risk is ${label}.`;
  }, [result, riskClass]);

  return (
    <section className="prediction-layout-modern prediction-saas-bg">
      <div className="prediction-3col">
        <article className="card prediction-input-card">
        <h2>Risk Prediction</h2>
        <p className="subtle">Provide business inputs to generate AI-assisted risk intelligence.</p>

        <form className="form-grid" onSubmit={onSubmit}>
          <label>
              <span className="label-with-icon">Revenue</span>
              <div className="input-with-icon">
                <span className="input-icon" aria-hidden="true">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="revenue"
                  value={formData.revenue}
                  onChange={onChange}
                  placeholder="Enter total revenue in INR"
                  required
                />
              </div>
              <small className="helper-text">Higher revenue can lower relative risk impact.</small>
          </label>

          <label>
              <span className="label-with-icon">Cost</span>
              <div className="input-with-icon">
                <span className="input-icon" aria-hidden="true">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  name="cost"
                  value={formData.cost}
                  onChange={onChange}
                  placeholder="Enter total cost in INR"
                  required
                />
              </div>
              <small className="helper-text">Higher cost increases risk score. Cost may exceed revenue.</small>
          </label>

          <label>
              <span className="label-with-icon">Quantity</span>
              <div className="input-with-icon">
                <span className="input-icon" aria-hidden="true">📦</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  name="quantity"
                  value={formData.quantity}
                  onChange={onChange}
                  placeholder="Enter quantity sold"
                  required
                />
              </div>
              <small className="helper-text">Low quantity can increase demand uncertainty risk.</small>
          </label>

          <div className="live-margin-box">
            <strong>
              Profit Margin: {liveProfitMargin === null ? "--" : `${liveProfitMargin}%`} ({marginLevel})
            </strong>
          </div>

          <div>
            <span className="label-with-icon">Business Model</span>
              <div className="model-selector-grid model-selector-pills">
              {modelFilterOptions.map((model) => (
                <button
                  key={model}
                  type="button"
                    className={`model-option-btn pill ${formData.business_model === model ? "active" : ""}`}
                  onClick={() => selectBusinessModel(model)}
                >
                  {model}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading} className="submit-btn-modern">
            {loading ? (
              <span className="btn-loading-wrap"><span className="spinner" />Analyzing Risk...</span>
            ) : (
              "Submit Prediction"
            )}
          </button>
        </form>

        {error && <div className="error">{error}</div>}
        </article>

        <article className="card prediction-output-card">
        <h2>Prediction Output</h2>
        {!result && (
          <div className="placeholder-output">
              <p>🚀 Enter values to start AI risk analysis</p>
          </div>
        )}

        {result && (
          <>
            <div className="result-grid">
              <div className={`metric metric-risk-${riskClass}`}>
                <span>Risk Level</span>
                  <strong className={`risk-level-big risk-text-${riskClass}`}>{result.risk}</strong>
              </div>
              <div className="metric">
                <span>Profit Margin</span>
                <strong>{result.profit_margin}%</strong>
              </div>
              <div className="metric">
                <span>Prediction Confidence</span>
                  <strong>{result.prediction_confidence}%</strong>
                  <div className="confidence-meter" aria-hidden="true">
                    <div
                      className="confidence-fill"
                      style={{ width: `${Math.max(70, Math.min(95, Number(result.prediction_confidence) || 0))}%` }}
                    />
                  </div>
              </div>
              <div className="metric">
                <span>Risk Score</span>
                <strong>{result.risk_score}/100</strong>
              </div>
            </div>

            <div className="risk-progress-wrap">
              <div className="risk-progress-head">
                <span>Risk Score Meter</span>
                <strong>{result.risk_score}%</strong>
              </div>
              <div className="risk-progress-track">
                <div
                  className={`risk-progress-fill risk-progress-fill-${riskClass}`}
                  style={{ width: `${result.risk_score}%` }}
                />
              </div>
            </div>

            <div className="insight-box">
              <h3>Risk Analysis Explanation</h3>
              <ul>
                <li>Cost ratio: {result.risk_analysis?.cost_ratio ?? 0}</li>
                <li>Cost impact: +{result.risk_analysis?.cost_ratio_component ?? 0}</li>
                <li>Quantity impact: +{result.risk_analysis?.quantity_component ?? 0}</li>
                <li>Business model impact: +{result.risk_analysis?.business_model_component ?? 0}</li>
              </ul>
              <p className="explanation-text">{explanationText}</p>
            </div>
          </>
        )}
        </article>

        <aside className="card prediction-right-card">
          <h2>Insights & Analytics</h2>
          {!result && (
            <div className="placeholder-output">
              <p>Run a prediction to see insights here</p>
            </div>
          )}

          {result && (
            <>
              <div className="mini-metrics">
                <div className="mini-metric mini-metric-risk">
                  <span>⚠ Risk Insight</span>
                  <strong>{result.risk_score}/100</strong>
                  <small className="helper-text">Higher cost ratio increases risk.</small>
                </div>
                <div className="mini-metric mini-metric-profit">
                  <span>📊 Profit Insight</span>
                  <strong>{result.profit_margin}%</strong>
                  <small className="helper-text">Margin drives risk tier.</small>
                </div>
                <div className="mini-metric mini-metric-trend">
                  <span>💡 Confidence</span>
                  <strong>{result.prediction_confidence}%</strong>
                  <small className="helper-text">Certainty range: 70–95%.</small>
                </div>
              </div>

              <div className="risk-progress-wrap compact">
                <div className="risk-progress-track">
                  <div
                    className={`risk-progress-fill risk-progress-fill-${riskClass}`}
                    style={{ width: `${result.risk_score}%` }}
                  />
                </div>
              </div>

              <div className="insight-box">
                <h3>AI Explanation</h3>
                <p className="explanation-text">{explanationText}</p>
              </div>
            </>
          )}

          <div className="insight-box">
            <h3>Recent Trend</h3>
            {recentHistory.length === 0 ? (
              <p className="subtle">No prediction history yet.</p>
            ) : (
              <div className="chart-wrap small">
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={recentHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="run" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="risk_score"
                      stroke="#dc2626"
                      strokeWidth={3}
                      name="Risk Score"
                      isAnimationActive
                      animationDuration={700}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </aside>
      </div>

      <article className="card prediction-full trend-modern-card">
        <h2>Trend / History</h2>
        <div className="trend-tabs">
          {modelFilterOptions.map((model) => (
            <button
              key={model}
              type="button"
              className={`trend-tab ${selectedTrendModel === model ? "active" : ""}`}
              onClick={() => setSelectedTrendModel(model)}
            >
              {model}
            </button>
          ))}
        </div>

        {history.length === 0 && <p>Run predictions to generate trend insights.</p>}
        {history.length > 0 && filteredHistory.length === 0 && (
          <p>No trend points for {selectedTrendModel} yet. Run predictions with this model.</p>
        )}

        {filteredHistory.length > 0 && (
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={filteredHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="run" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="risk_score"
                  stroke="#dc2626"
                  strokeWidth={3}
                  name="Risk Score"
                  isAnimationActive
                  animationDuration={700}
                />
                <Line
                  type="monotone"
                  dataKey="confidence"
                  stroke="#2563eb"
                  strokeWidth={2}
                  name="Confidence"
                  isAnimationActive
                  animationDuration={700}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </article>
    </section>
  );
}

export default PredictionPage;
