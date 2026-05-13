import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { computePredictionStats, loadPredictions } from "../utils/predictionStore";
import { getBestBusinessModel, subscribeToBestBusinessModel } from "../services/homepageDataService";

const features = [
  "Real-time Risk Prediction",
  "Trend Analysis",
  "Data-driven Insights",
  "Business Model Comparison",
];
const productPreviews = [
  {
    image: "/images/preview-business-model.png",
    caption: "Business model revenue comparison view",
  },
  {
    image: "/images/preview-trend-analysis.png",
    caption: "Revenue trend analysis with model fit lines",
  },
  {
    image: "/images/preview-payment-mode.png",
    caption: "Payment mode distribution and risk context",
  },
];

function HomePage() {
  const [stats, setStats] = useState(() =>
    computePredictionStats(loadPredictions())
  );
  const [bestBusinessModel, setBestBusinessModel] = useState("Loading...");

  useEffect(() => {
    const refresh = () => setStats(computePredictionStats(loadPredictions()));
    refresh();

    const loadBestBusinessModel = async () => {
      try {
        const bestModel = await getBestBusinessModel();
        setBestBusinessModel(bestModel);
      } catch (error) {
        setBestBusinessModel("Unknown");
      }
    };

    loadBestBusinessModel();

    // Subscribe to data updates
    const unsubscribe = subscribeToBestBusinessModel((bestModel) => {
      setBestBusinessModel(bestModel);
    });

    const onStorage = (event) => {
      if (event.key === "bda_predictions_v1") {
        refresh();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      unsubscribe();
    };
  }, []);

  const kpiCards = useMemo(
    () => [
      {
        icon: "📊",
        label: "Total Predictions",
        value: String(stats.totalPredictions),
      },
      {
        icon: "⚠️",
        label: "Avg Risk Score",
        value: `${stats.avgRiskScore} / 100`,
      },
      {
        icon: "🌟",
        label: "Best Performing Business Model",
        value: String(bestBusinessModel),
      },
      {
        icon: "🤖",
        label: "Model Accuracy",
        value:
          stats.avgModelAccuracy === null ? "—" : `${stats.avgModelAccuracy}%`,
      },
    ],
    [stats, bestBusinessModel]
  );

  return (
    <section className="landing-page">
      <article className="landing-hero card">
        <p className="hero-badge">Big Data Analytics Platform</p>
        <h2>Predict Business Risk in Seconds</h2>
        <p>
          Use ML-powered risk analysis to evaluate profitability, detect risk signals,
          and make confident decisions across your business models.
        </p>
        <div className="hero-actions">
          <Link className="btn-primary" to="/prediction">
            Start Prediction
          </Link>
          <Link className="btn-secondary" to="/dashboard">
            View Dashboard
          </Link>
        </div>
      </article>

      <section className="page-grid landing-kpis">
        {kpiCards.map((item) => (
          <article className="card kpi-card" key={item.label}>
            <span className="kpi-icon" aria-hidden="true">
              {item.icon}
            </span>
            <p className="kpi-label">{item.label}</p>
            <p className="kpi-value">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="card">
        <h2>Feature Highlights</h2>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-item" key={feature}>
              <h3>{feature}</h3>
              <p>
                Built to help teams monitor risk, interpret outcomes, and make faster
                data-backed actions.
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="card preview-card">
        <h2>Product Preview</h2>
        <p>
          A unified interface for prediction, dashboarding, and strategic insights in one
          place.
        </p>
        <div className="preview-gallery">
          {productPreviews.map((item) => (
            <figure className="preview-shot" key={item.caption}>
              <img src={item.image} alt={item.caption} loading="lazy" />
              <figcaption>{item.caption}</figcaption>
            </figure>
          ))}
          </div>
      </section>

      <section className="card cta-card">
        <h2>Start analyzing your business risk now</h2>
        <p>Turn raw business numbers into actionable risk intelligence instantly.</p>
        <Link className="btn-primary" to="/prediction">
          Start Prediction
        </Link>
      </section>
    </section>
  );
}

export default HomePage;
