# Migration: From Flask Backend to Frontend-Only Prediction

## Summary

The project has been refactored to remove the Flask API dependency. All prediction logic has been moved into the frontend as a local JavaScript service. The project now runs entirely in the browser without requiring a separate backend server.

## What Changed

### 1. **Removed Flask Dependency**
   - ✅ Removed Flask routes: `/predict` and `/dashboard-data`
   - ✅ No longer requires running a separate Python backend server
   - ✅ No need for Flask CORS configuration

### 2. **New Local Prediction Service**
   - **File**: `frontend/src/services/predictionService.js`
   - **Purpose**: Provides all risk calculation and prediction logic in JavaScript
   - **Exports**: 
     - `predict(revenue, cost, quantity, businessModel)` - Main prediction function
     - `getModelAccuracy()` - Returns model accuracy

### 3. **Updated PredictionPage Component**
   - **File**: `frontend/src/pages/PredictionPage.jsx`
   - **Changes**:
     - Removed `API_BASE` and Flask API imports
     - Replaced `fetch()` calls with local `predict()` function from prediction service
     - Prediction now runs instantly without network latency
     - All features work offline (except initial data load)

### 4. **Preserved Features**
   - ✅ Risk prediction and scoring
   - ✅ Profit margin calculation
   - ✅ Confidence scoring
   - ✅ Business model filtering
   - ✅ Risk analysis breakdown
   - ✅ Prediction history (stored in localStorage)
   - ✅ Dashboard charts and insights
   - ✅ Trend analysis

## How to Run

### Prerequisites
```bash
cd frontend
npm install
```

### Development
```bash
cd frontend
npm run dev
```

The project runs on `http://localhost:5173` (or your configured Vite port) and **does not require the Flask backend**.

### Production Build
```bash
cd frontend
npm run build
```

## Architecture

```
Frontend Only (No Backend Required)
├── React Components
│   ├── PredictionPage.jsx (uses predictionService)
│   ├── DashboardPage.jsx (loads CSV from /data/)
│   ├── InsightsPage.jsx (reads prediction history)
│   └── HomePage.jsx
├── Services
│   └── predictionService.js (all risk calculations)
├── Utils
│   └── predictionStore.js (localStorage history)
└── Data
    └── /public/data/data_final.csv
```

## Backend (Optional)

The `backend/` folder is no longer required for the application to function. However, you can keep it for:
- Model training and experimentation
- Historical reference
- Future ML model exports

To clean up:
```bash
# Optional: Remove backend files if not needed
rm -rf backend/
```

## Key Functions in predictionService.js

| Function | Purpose |
|----------|---------|
| `predict()` | Main prediction endpoint (replaces Flask `/predict`) |
| `computeRiskScore()` | Calculates overall risk score (0-100) |
| `computeProfitMargin()` | Calculates profit margin percentage |
| `computePredictionConfidence()` | Estimates prediction confidence (70-95%) |
| `computeQuantityRisk()` | Quantity-based risk component |
| `computeMarginRiskComponent()` | Profit margin-based risk component |
| `getRiskLabel()` | Determines risk classification |

## Prediction Logic

The prediction service uses the same risk calculation algorithms that were in the Flask backend:

1. **Profit Margin Calculation**: (Revenue - Cost) / Revenue × 100
2. **Risk Components**:
   - Cost ratio: Proportion of cost to revenue
   - Quantity impact: Risk varies by order quantity
   - Business model: Different models have different baseline risks
   - Profit margin: Primary driver of risk classification

3. **Risk Score Formula**:
   ```
   Score = Cost_Ratio × 50 + Cost_Penalty + Margin_Risk + Quantity_Risk + Business_Model_Risk
   ```

## Data Sources

### CSV Dataset
- **Location**: `frontend/public/data/data_final.csv`
- **Purpose**: Dashboard charts and trend analysis
- **Loaded by**: DashboardPage.jsx

### Prediction History
- **Storage**: Browser localStorage (key: `bda_predictions_v1`)
- **Purpose**: Track prediction history and insights
- **Accessed by**: InsightsPage.jsx, PredictionPage.jsx

## Performance

- **Instant Predictions**: No network latency
- **Offline Capable**: Works without internet after initial load
- **Optimized**: All calculations run in-browser JavaScript (very fast)
- **No Model Loading**: Direct calculation-based approach

## Testing

To verify predictions work correctly:

1. Run the frontend: `npm run dev`
2. Navigate to `/prediction`
3. Enter test values:
   - Revenue: 100000
   - Cost: 50000
   - Quantity: 100
   - Business Model: Retail
4. Verify results appear instantly

## Troubleshooting

### Predictions not working
- Clear browser cache and localStorage
- Ensure JavaScript is enabled
- Check browser console for errors

### Missing CSV data on Dashboard
- Verify file exists at `frontend/public/data/data_final.csv`
- Check browser network tab for 404 errors

### Prediction history not persisting
- Ensure localStorage is enabled in browser
- Check browser DevTools > Application > Storage > localStorage

## Future Improvements

- Export trained model to ONNX or TensorFlow.js for ML-native predictions
- Add service worker for offline capability
- Cache CSV data in IndexedDB for faster loads
- Add PWA support for mobile/desktop apps

## Migration Checklist

- [x] Move prediction logic to JavaScript
- [x] Update PredictionPage to use local service
- [x] Remove Flask API calls
- [x] Test all prediction features
- [x] Verify dashboard still works
- [x] Verify insights page works with history
- [x] Update documentation
- [ ] (Optional) Remove backend folder if not needed
- [ ] (Optional) Update deployment configuration

