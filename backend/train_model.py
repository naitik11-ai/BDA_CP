import argparse
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


RENAME_MAP = {
    "New_Table[Revenue_INR]": "Revenue_INR",
    "New_Table[Cost_INR]": "Cost_INR",
    "New_Table[Quantity]": "Quantity",
    "New_Table[Business_Model]": "Business_Model",
}

LABEL_TO_ID = {
    "Low Risk": 0,
    "Medium Risk": 1,
    "High Risk": 2,
}
ID_TO_LABEL = {value: key for key, value in LABEL_TO_ID.items()}
BUSINESS_MODEL_MARGIN_ADJUSTMENT = {
    "Retail": 0.0,
    "B2C": -1.5,
    "Marketplace": -3.0,
    "Dropshipping": -4.0,
    "B2B": 2.0,
}


def load_dataset(dataset_path: Path) -> pd.DataFrame:
    data = pd.read_csv(dataset_path)
    data = data.rename(columns=RENAME_MAP)

    required_columns = ["Revenue_INR", "Cost_INR", "Quantity", "Business_Model"]
    missing = [col for col in required_columns if col not in data.columns]
    if missing:
        raise ValueError(f"Dataset is missing required columns: {missing}")

    data = data.dropna(subset=required_columns).copy()
    data["Business_Model"] = data["Business_Model"].astype(str).str.strip()
    data["Quantity"] = data["Quantity"].replace(0, 1)
    if "Risk_Level" not in data.columns:
        # Generate three-class risk level when source label is unavailable.
        data["Profit_Margin"] = (
            (data["Revenue_INR"] - data["Cost_INR"]) / data["Revenue_INR"]
        ) * 100
        adjustments = data["Business_Model"].map(BUSINESS_MODEL_MARGIN_ADJUSTMENT).fillna(0.0)
        data["Adjusted_Profit_Margin"] = data["Profit_Margin"] + adjustments
        data["Risk_Level"] = data["Adjusted_Profit_Margin"].apply(
            lambda margin: (
                "High Risk" if margin < 10 else "Medium Risk" if margin < 20 else "Low Risk"
            )
        )
        print(
            "Risk_Level column not found. Generated from adjusted Profit_Margin using 10/20 thresholds."
        )

    valid_labels = list(LABEL_TO_ID.keys())
    data = data[data["Risk_Level"].isin(valid_labels)].copy()
    data["Risk_Level_ID"] = data["Risk_Level"].map(LABEL_TO_ID).astype(int)
    return data


def train_and_save(data: pd.DataFrame, model_path: Path) -> None:
    feature_cols = ["Revenue_INR", "Cost_INR", "Quantity", "Business_Model"]
    x = data[feature_cols]
    y = data["Risk_Level_ID"]

    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=0.2, random_state=42, stratify=y
    )

    numeric_features = ["Revenue_INR", "Cost_INR", "Quantity"]
    categorical_features = ["Business_Model"]
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numeric_features),
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features),
        ]
    )

    model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", LogisticRegression(max_iter=1000)),
        ]
    )
    model.fit(x_train, y_train)

    y_pred = model.predict(x_test)
    accuracy = accuracy_score(y_test, y_pred)
    labels_in_data = sorted(y.unique().tolist())
    target_names = [ID_TO_LABEL[label_id] for label_id in labels_in_data]
    cm = confusion_matrix(y_test, y_pred, labels=labels_in_data)
    cls_report = classification_report(
        y_test,
        y_pred,
        labels=labels_in_data,
        target_names=target_names,
        zero_division=0,
    )

    payload = {
        "model": model,
        "features": feature_cols,
        "accuracy": float(accuracy),
        "label_to_id": LABEL_TO_ID,
        "id_to_label": ID_TO_LABEL,
        "confusion_matrix": cm.tolist(),
        "class_order": labels_in_data,
    }
    joblib.dump(payload, model_path)
    print(f"Model saved to: {model_path}")
    print(f"Validation accuracy: {accuracy:.4f}")
    print("Confusion Matrix:")
    print(cm)
    print("Classification Report:")
    print(cls_report)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train risk prediction model.")
    parser.add_argument(
        "--dataset",
        type=str,
        default=str(Path(__file__).resolve().parents[1] / "data" / "dataset.csv"),
        help="Path to input dataset CSV",
    )
    parser.add_argument(
        "--model-out",
        type=str,
        default=str(Path(__file__).resolve().parent / "model.pkl"),
        help="Path to output model file",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    dataset = load_dataset(Path(args.dataset))
    train_and_save(dataset, Path(args.model_out))
