const STORAGE_KEY = "bda_predictions_v1";

export function loadPredictions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePredictions(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function addPrediction(record) {
  const records = loadPredictions();
  const next = [
    ...records,
    {
      id: record.id || `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      createdAt: record.createdAt || new Date().toISOString(),
      ...record,
    },
  ];
  savePredictions(next);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("predictionHistoryChanged"));
  }
  return next;
}

export function computePredictionStats(records) {
  const total = records.length;
  if (total === 0) {
    return {
      totalPredictions: 0,
      avgRiskScore: 0,
      highRiskPercent: 0,
      avgModelAccuracy: null,
    };
  }

  const riskScores = records
    .map((r) => Number(r?.output?.risk_score))
    .filter((v) => Number.isFinite(v));
  const avgRiskScore =
    riskScores.length > 0
      ? Math.round((riskScores.reduce((a, b) => a + b, 0) / riskScores.length) * 10) / 10
      : 0;

  const highRiskCount = records.filter(
    (r) => String(r?.output?.risk || "").toLowerCase().includes("high")
  ).length;
  const highRiskPercent = Math.round((highRiskCount / total) * 1000) / 10;

  const accuracies = records
    .map((r) => Number(r?.output?.model_accuracy))
    .filter((v) => Number.isFinite(v));
  const avgModelAccuracy =
    accuracies.length > 0
      ? Math.round((accuracies.reduce((a, b) => a + b, 0) / accuracies.length) * 10) / 10
      : null;

  return {
    totalPredictions: total,
    avgRiskScore,
    highRiskPercent,
    avgModelAccuracy,
  };
}

export function toTrendHistory(records, maxPoints = 20) {
  const last = records.slice(-maxPoints);
  return last.map((r, idx) => ({
    run: idx + 1,
    risk_score: Number(r?.output?.risk_score) || 0,
    confidence: Number(r?.output?.prediction_confidence) || 0,
    business_model: r?.output?.business_model || r?.input?.business_model || "Unknown",
    createdAt: r?.createdAt,
  }));
}

