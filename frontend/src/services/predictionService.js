/**
 * Local Prediction Service
 * Replaces Flask API with in-browser prediction logic
 * Includes risk scoring, profit margin calculation, and confidence estimation
 */

const BUSINESS_MODEL_RISK = {
  "Retail": 5,
  "B2B": 10,
  "Dropshipping": 15,
  "B2C": 8,
  "Marketplace": 12,
};

const ID_TO_LABEL = {
  0: "Low Risk",
  1: "Medium Risk",
  2: "High Risk",
};

/**
 * Calculate profit margin as a percentage
 */
function computeProfitMargin(revenue, cost) {
  if (revenue <= 0) return 0.0;
  return Number(((revenue - cost) / revenue) * 100).toFixed(2);
}

/**
 * Clamp a value between min and max
 */
function clamp(value, minValue, maxValue) {
  return Math.max(minValue, Math.min(value, maxValue));
}

/**
 * Compute quantity-based risk component
 */
function computeQuantityRisk(quantity) {
  if (quantity <= 50) return 5;
  if (quantity <= 500) return 3;
  return 1;
}

/**
 * Compute risk component based on profit margin
 */
function computeMarginRiskComponent(profitMargin) {
  if (profitMargin < 5) return 30;
  if (profitMargin < 10) return 18;
  if (profitMargin < 20) return 8;
  if (profitMargin < 30) return 0;
  return -8;
}

/**
 * Compute penalty based on cost ratio
 */
function computeCostRatioPenalty(costRatio) {
  if (costRatio <= 0.9) return 0.0;
  return Number(((costRatio - 0.9) * 250).toFixed(2));
}

/**
 * Calculate overall risk score (0-100)
 */
function computeRiskScore(revenue, cost, quantity, businessModel) {
  if (revenue <= 0) return 100;

  const costRatio = cost / revenue;

  // Handle overrun scenario
  if (cost > revenue) {
    const overrunRatio = costRatio - 1;
    return Math.min(100, Math.max(90, Math.round(90 + overrunRatio * 50)));
  }

  const profitMargin = computeProfitMargin(revenue, cost);
  const quantityRisk = computeQuantityRisk(quantity);
  const businessModelRisk = BUSINESS_MODEL_RISK[businessModel] || 8;
  const marginRisk = computeMarginRiskComponent(profitMargin);
  const costPenalty = computeCostRatioPenalty(costRatio);

  let score = costRatio * 50 + costPenalty + marginRisk + quantityRisk + businessModelRisk;

  if (profitMargin < 5) {
    score = Math.max(score, 90);
  }

  return Math.max(0, Math.min(Math.round(score), 100));
}

/**
 * Compute prediction confidence (70-95%)
 */
function computePredictionConfidence(revenue, cost) {
  if (revenue <= 0) return 70.0;

  const costRatio = cost / revenue;
  const confidence = 70 + Math.abs(0.5 - costRatio) * 60;

  return clamp(confidence, 70, 95);
}

/**
 * Get risk label based on profit margin and cost ratio
 */
function getRiskLabel(profitMargin, costRatio) {
  if (costRatio > 1 || profitMargin < 5) {
    return "Critical Risk";
  }
  if (profitMargin < 10) {
    return "High Risk";
  }
  if (profitMargin < 20) {
    return "Medium Risk";
  }
  return "Low Risk";
}

/**
 * Normalize business model names
 */
function normalizeBusinessModel(businessModel) {
  const alias = {
    "wholesale": "B2B",
    "e-commerce": "B2C",
    "ecommerce": "B2C",
  };
  return alias[businessModel.toLowerCase()] || businessModel;
}

/**
 * Main prediction function - replaces Flask /predict endpoint
 */
export function predict(revenue, cost, quantity, businessModel) {
  // Validate inputs
  revenue = Number(revenue);
  cost = Number(cost);
  quantity = Number(quantity);

  if (!Number.isFinite(revenue) || !Number.isFinite(cost) || !Number.isFinite(quantity)) {
    throw new Error("All values must be numeric.");
  }

  if (revenue <= 0 || cost < 0 || quantity <= 0) {
    throw new Error("Revenue and quantity must be greater than 0, and cost must be non-negative.");
  }

  // Normalize business model
  const normalizedModel = normalizeBusinessModel(businessModel);

  // Calculate components
  const profitMargin = Number(computeProfitMargin(revenue, cost));
  const riskScore = computeRiskScore(revenue, cost, quantity, normalizedModel);
  const confidence = Number(computePredictionConfidence(revenue, cost).toFixed(2));
  const costRatio = Number((cost / revenue).toFixed(4));

  // Determine risk label
  let riskLabel = getRiskLabel(profitMargin, costRatio);

  // Calculate risk analysis components
  const quantityRisk = computeQuantityRisk(quantity);
  const businessModelRisk = BUSINESS_MODEL_RISK[normalizedModel] || 8;
  const profitMarginComponent = computeMarginRiskComponent(profitMargin);
  const costRatioPenalty = computeCostRatioPenalty(costRatio);

  // Return prediction response matching Flask API format
  return {
    risk: riskLabel,
    risk_id: riskLabel === "Low Risk" ? 0 : riskLabel === "Medium Risk" ? 1 : 2,
    profit_margin: profitMargin,
    prediction_confidence: confidence,
    risk_score: riskScore,
    business_model: normalizedModel,
    model_accuracy: 85.5, // Default accuracy (can be updated if needed)
    risk_analysis: {
      cost_ratio: costRatio,
      cost_ratio_component: Number((costRatio * 60 + costRatioPenalty).toFixed(2)),
      quantity_component: quantityRisk,
      business_model_component: businessModelRisk,
      profit_margin: profitMargin,
      profit_margin_component: profitMarginComponent,
      manual_risk_label: costRatio > 1 || profitMargin < 5 ? riskLabel : null,
    },
  };
}

/**
 * Get model accuracy (placeholder - can be updated)
 */
export function getModelAccuracy() {
  return 85.5;
}

export default { predict, getModelAccuracy };
