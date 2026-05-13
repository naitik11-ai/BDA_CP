# Backend Directory - No Longer Required

## Status: Archived (Optional)

The Flask backend has been **deprecated and removed from the active project**. All prediction logic has been migrated to the frontend as a JavaScript service.

## Why This Happened

The project was refactored to:
- ✅ Remove external dependencies (Flask, CORS, model serving)
- ✅ Enable offline-first architecture
- ✅ Simplify deployment (single frontend bundle only)
- ✅ Improve performance (no network latency for predictions)
- ✅ Reduce server costs (no backend infrastructure needed)

## What's Here

This directory contains the original Python backend code for historical reference:

- `app.py` - Flask API server with `/predict` and `/dashboard-data` endpoints
- `train_model.py` - Scikit-learn model training script
- `model.pkl` - Trained logistic regression model (if present)
- `requirements.txt` - Python dependencies

## These Files Are Not Used

The application **no longer depends on any of these files** for runtime functionality.

## If You Need the Backend

### To restore the backend server (not recommended):

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Train the model (optional):
   ```bash
   python train_model.py --dataset ../data/dataset.csv --model-out model.pkl
   ```

3. Start the Flask server:
   ```bash
   python app.py
   ```

4. Update frontend Vite config to enable the proxy (see `frontend/vite.config.js`)

### To use the backend for model training/experimentation:

```bash
# Data preparation
python train_model.py --dataset ../data/dataset.csv --model-out model.pkl

# This trains a scikit-learn LogisticRegression model for risk prediction
# The model is saved to model.pkl for reference
```

## Migration Reference

See `MIGRATION_TO_FRONTEND_ONLY.md` in the project root for:
- Architecture changes
- How the frontend-only app works
- Testing instructions
- Troubleshooting guide

## Cleanup

To remove this directory if not needed:

```bash
# Option 1: Keep for reference
# (Already ignored in production build)

# Option 2: Remove entirely (if you want)
# rm -rf backend/
```

## Questions?

Refer to the main README.md or MIGRATION_TO_FRONTEND_ONLY.md for complete setup instructions.

