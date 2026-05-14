from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
MODEL_PATH = BASE_DIR / "model.pkl"
DEFAULT_DATASET_PATHS = [
    PROJECT_ROOT / "data" / "dataset.csv",
    PROJECT_ROOT / "frontend" / "public" / "data" / "data_final.csv",
    PROJECT_ROOT / "data_final.csv",
]
DATASET_PATH = next((path for path in DEFAULT_DATASET_PATHS if path.exists()), DEFAULT_DATASET_PATHS[0])
DASHBOARD_DATA_CACHE = None
DASHBOARD_PAYLOAD_CACHE = None

app = Flask(__name__)
CORS(app)


def load_model_payload() -> dict:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            "model.pkl not found. Train the model first using train_model.py"
        )
    return joblib.load(MODEL_PATH)


MODEL_PAYLOAD = load_model_payload()
MODEL = MODEL_PAYLOAD["model"]
MODEL_ACCURACY = MODEL_PAYLOAD.get("accuracy", 0.0)
ID_TO_LABEL = {
    int(key): value for key, value in MODEL_PAYLOAD.get("id_to_label", {}).items()
}

BUSINESS_MODEL_RISK = {
    "Retail": 5,
    "B2B": 10,
    "Dropshipping": 15,
}


def compute_profit_margin(revenue: float, cost: float) -> float:
    if revenue <= 0:
        return 0.0
    return round(((revenue - cost) / revenue) * 100, 2)


def clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(value, max_value))


def compute_quantity_risk(quantity: float) -> int:
    if quantity <= 50:
        return 5
    if quantity <= 500:
        return 3
    return 1


def compute_margin_risk_component(profit_margin: float) -> int:
    if profit_margin < 5:
        return 30
    if profit_margin < 10:
        return 18
    if profit_margin < 20:
        return 8
    if profit_margin < 30:
        return 0
    return -8


def compute_cost_ratio_penalty(cost_ratio: float) -> float:
    if cost_ratio <= 0.9:
        return 0.0
    return round((cost_ratio - 0.9) * 250, 2)


def compute_risk_score(revenue: float, cost: float, quantity: float, business_model: str) -> int:
    if revenue <= 0:
        return 100
    cost_ratio = cost / revenue
    if cost > revenue:
        overrun_ratio = cost_ratio - 1
        return min(100, max(90, round(90 + overrun_ratio * 50)))

    profit_margin = compute_profit_margin(revenue, cost)
    quantity_risk = compute_quantity_risk(quantity)
    business_model_risk = BUSINESS_MODEL_RISK.get(business_model, 8)
    margin_risk = compute_margin_risk_component(profit_margin)
    cost_penalty = compute_cost_ratio_penalty(cost_ratio)

    score = cost_ratio * 50 + cost_penalty + margin_risk + quantity_risk + business_model_risk
    if profit_margin < 5:
        score = max(score, 90)
    return int(max(0, min(round(score), 100)))


def compute_prediction_confidence(revenue: float, cost: float) -> float:
    if revenue <= 0:
        return 70.0
    cost_ratio = cost / revenue
    confidence = 70 + (abs(0.5 - cost_ratio) * 60)
    return clamp(confidence, 70, 95)


def load_dashboard_dataset() -> pd.DataFrame:
    global DASHBOARD_DATA_CACHE
    if DASHBOARD_DATA_CACHE is not None:
        return DASHBOARD_DATA_CACHE

    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Dashboard dataset not found: {DATASET_PATH}")

    data = pd.read_csv(DATASET_PATH)

    # Normalize common column name variants.
    if "Risk Level" in data.columns and "Risk_Level" not in data.columns:
        data = data.rename(columns={"Risk Level": "Risk_Level"})
    if "Order_Date" in data.columns:
        data["Order_Date"] = pd.to_datetime(data["Order_Date"], errors="coerce")

    numeric_cols = ["Revenue_INR", "Cost_INR", "Profit_INR", "Quantity"]
    for col in numeric_cols:
        if col in data.columns:
            data[col] = pd.to_numeric(data[col], errors="coerce")

    data = data.dropna(subset=[c for c in ["Revenue_INR", "Cost_INR"] if c in data.columns]).copy()
    if "Profit_INR" not in data.columns and {"Revenue_INR", "Cost_INR"}.issubset(data.columns):
        data["Profit_INR"] = data["Revenue_INR"] - data["Cost_INR"]

    if "Risk_Level" not in data.columns and {"Revenue_INR", "Profit_INR"}.issubset(data.columns):
        margins = (data["Profit_INR"] / data["Revenue_INR"]).replace([np.inf, -np.inf], np.nan)
        data["Risk_Level"] = np.select(
            [margins < 0.10, margins < 0.30],
            ["High Risk", "Medium Risk"],
            default="Low Risk",
        )

    DASHBOARD_DATA_CACHE = data
    return data


def grouped_sum_records(data: pd.DataFrame, group_col: str) -> list[dict]:
    if group_col not in data.columns:
        return []
    grouped = (
        data.groupby(group_col, as_index=False)
        .agg(Revenue_INR=("Revenue_INR", "sum"), Profit_INR=("Profit_INR", "sum"))
        .sort_values("Revenue_INR", ascending=False)
    )
    return grouped.to_dict(orient="records")


def grouped_risk_records(data: pd.DataFrame, group_col: str) -> list[dict]:
    if group_col not in data.columns or "Risk_Level" not in data.columns:
        return []
    crosstab = pd.crosstab(data[group_col], data["Risk_Level"]).reset_index()
    return crosstab.to_dict(orient="records")


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/predict", methods=["POST"])
def predict():
    payload = request.get_json(silent=True) or {}
    try:
        revenue = float(payload.get("revenue", 0))
        cost = float(payload.get("cost", 0))
        quantity = float(payload.get("quantity", 0))
        business_model = str(payload.get("business_model", "Retail")).strip()
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid numeric input"}), 400

    if revenue <= 0 or cost < 0 or quantity <= 0:
        return (
            jsonify(
                {
                    "error": "Revenue and quantity must be greater than 0, and cost must be non-negative."
                }
            ),
            400,
        )

    business_model_alias = {
        "wholesale": "B2B",
        "e-commerce": "B2C",
        "ecommerce": "B2C",
    }
    normalized_model = business_model_alias.get(business_model.lower(), business_model)
    model_input = pd.DataFrame(
        [[revenue, cost, quantity, normalized_model]],
        columns=["Revenue_INR", "Cost_INR", "Quantity", "Business_Model"],
    )
    prediction = MODEL.predict(model_input)[0]
    probabilities = MODEL.predict_proba(model_input)[0]

    profit_margin = compute_profit_margin(revenue, cost)
    risk_score = int(
        round(compute_risk_score(revenue, cost, quantity, normalized_model))
    )
    confidence = round(float(compute_prediction_confidence(revenue, cost)), 2)
    prediction_label = ID_TO_LABEL.get(int(prediction), str(prediction))
    if cost > revenue or profit_margin < 5:
        prediction_label = "Critical Risk"

    cost_ratio = round(cost / revenue, 4)
    quantity_risk = compute_quantity_risk(quantity)
    business_model_risk = BUSINESS_MODEL_RISK.get(normalized_model, 8)
    profit_margin_component = compute_margin_risk_component(profit_margin)
    cost_ratio_penalty = compute_cost_ratio_penalty(cost_ratio)
    cost_ratio_base = cost_ratio * 50
    cost_ratio_total = round(cost_ratio_base + cost_ratio_penalty, 2)
    risk_analysis = {
        "cost_ratio": cost_ratio,
        "cost_ratio_base": round(cost_ratio_base, 2),
        "cost_ratio_penalty": cost_ratio_penalty,
        "cost_ratio_component": cost_ratio_total,
        "quantity_component": quantity_risk,
        "profit_margin_component": profit_margin_component,
        "business_model_component": business_model_risk,
        "profit_margin": profit_margin,
        "manual_risk_label": prediction_label if cost > revenue or profit_margin < 5 else None,
    }

    return jsonify(
        {
            "risk": prediction_label,
            "risk_id": int(prediction),
            "profit_margin": profit_margin,
            "prediction_confidence": confidence,
            "risk_score": risk_score,
            "business_model": normalized_model,
            "model_accuracy": round(MODEL_ACCURACY * 100, 2),
            "risk_analysis": risk_analysis,
        }
    )


@app.route("/dashboard-data", methods=["GET"])
def dashboard_data():
    global DASHBOARD_PAYLOAD_CACHE
    if DASHBOARD_PAYLOAD_CACHE is not None:
        return jsonify(DASHBOARD_PAYLOAD_CACHE)

    try:
        data = load_dashboard_dataset()
    except FileNotFoundError as error:
        return jsonify({"error": str(error)}), 404

    payload = {}

    if "Order_Date" in data.columns:
        trend = (
            data.dropna(subset=["Order_Date"])
            .assign(Month=lambda d: d["Order_Date"].dt.to_period("M").dt.to_timestamp())
            .groupby("Month", as_index=False)
            .agg(Revenue_INR=("Revenue_INR", "sum"), Profit_INR=("Profit_INR", "sum"))
            .sort_values("Month")
        )
        trend["Month"] = trend["Month"].dt.strftime("%Y-%m")
        payload["trend"] = trend.to_dict(orient="records")
    else:
        payload["trend"] = []

    payload["category"] = grouped_sum_records(data, "Category")
    payload["risk_distribution"] = (
        data["Risk_Level"].value_counts().rename_axis("Risk_Level").reset_index(name="Count").to_dict(orient="records")
        if "Risk_Level" in data.columns
        else []
    )
    payload["platform_risk"] = grouped_risk_records(data, "Platform")
    payload["business_model_risk"] = grouped_risk_records(data, "Business_Model")
    payload["payment_mode_risk"] = grouped_risk_records(data, "Payment_Mode")

    geo_col = "State" if "State" in data.columns else "City" if "City" in data.columns else None
    payload["geo_key"] = geo_col or ""
    payload["geo_revenue"] = grouped_sum_records(data, geo_col)[:15] if geo_col else []

    scatter = data.dropna(subset=["Revenue_INR", "Cost_INR"])[["Revenue_INR", "Cost_INR"]].copy()
    payload["scatter"] = scatter.sample(min(len(scatter), 1500), random_state=42).to_dict(orient="records")

    DASHBOARD_PAYLOAD_CACHE = payload
    return jsonify(payload)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
