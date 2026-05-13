# Business Profitability and Risk Prediction System

Complete web application for risk prediction and business analytics with:
- ✅ React frontend with Prediction, Dashboard, and Insights pages
- ✅ Local in-browser risk prediction (no backend server required)
- ✅ Real-time business model filtering and trend analysis
- ✅ Responsive UI with Indian currency formatting
- ✅ Offline-capable (prediction history stored in browser)

## ⚡ Quick Start

### Requirements
- Node.js 16+
- npm or yarn

### Setup & Run

```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm run dev
```

Open `http://localhost:5173` in your browser.

**That's it! No backend server needed.**

## Folder Structure

```text
project/
├── frontend/                    # React + Vite web app
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── styles.css
│       ├── services/
│       │   └── predictionService.js  # Risk calculation logic
│       ├── utils/
│       │   └── predictionStore.js    # localStorage history
│       ├── components/
│       │   └── Navbar.jsx
│       └── pages/
│           ├── HomePage.jsx
│           ├── PredictionPage.jsx    # Make predictions
│           ├── DashboardPage.jsx     # View analytics
│           └── InsightsPage.jsx      # Filter & analyze
├── backend/                     # (Deprecated - kept for reference)
│   ├── app.py                   # Old Flask API (not used)
│   ├── train_model.py           # Old model training
│   └── README_DEPRECATED.md
├── data/
│   └── dataset.csv              # Historical data for dashboard
└── public/
    └── data/
        └── data_final.csv       # Dashboard chart data
```

## Features

### 🎯 Prediction Page
- Enter revenue, cost, quantity, and business model
- Get instant risk prediction and scoring
- View detailed risk breakdown analysis
- See confidence metrics
- Track prediction history and trends

### 📊 Dashboard
- Revenue and profit trends
- Risk distribution charts
- Business model comparison
- Payment mode analysis
- Geographic data visualization
- Cost vs. revenue scatter plots

### 💡 Insights Dashboard
- Dynamic KPI cards from prediction history
- Filter by business model
- Key insights and recommendations
- Risk alerts
- Revenue forecasting
- Explanation of trends

### 🏠 Home Page
- Business intelligence overview
- Key metrics and KPIs
- Best performing business model
- Feature highlights
- Quick navigation to all pages

## Technology Stack

- **Frontend**: React 18 + Vite
- **Charts**: Recharts for data visualization
- **Data**: CSV parsing with PapaParse
- **Styling**: Modern CSS with responsive design
- **Storage**: Browser localStorage for prediction history
- **No Backend**: All calculations run in-browser (JavaScript)

## How Predictions Work

The prediction logic is implemented in `frontend/src/services/predictionService.js`:

1. **Input**: Revenue, Cost, Quantity, Business Model
2. **Calculations**:
   - Profit margin: `(Revenue - Cost) / Revenue × 100`
   - Risk score: Weighted combination of cost ratio, margin, quantity, business model
   - Confidence: 70-95% based on cost ratio
3. **Output**: Risk label, score, confidence, profit margin, analysis breakdown

**No network calls needed** — all calculations happen instantly in your browser.

## Build for Production

```bash
cd frontend
npm run build
```

Output: `frontend/dist/` — Deploy this folder to any static hosting service.

### Deployment Options

- **Vercel**: `vercel` command
- **Netlify**: Drag & drop `dist/` folder
- **GitHub Pages**: Push to gh-pages branch
- **AWS S3 + CloudFront**: Upload `dist/` to S3
- **Docker**: Create Dockerfile from example below

### Docker Deployment (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY frontend/ .
RUN npm install && npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Using Prediction History

Predictions are automatically saved to browser storage:
- Max 100 predictions stored
- Survives page refreshes and browser restarts
- Can be filtered by business model in Insights
- Used for trend analysis and forecasting

To clear history: Open DevTools → Storage → localStorage → Remove `bda_predictions_v1`

## Data Files

### Dashboard Data
- Location: `frontend/public/data/data_final.csv`
- Used by: Dashboard and Insights pages
- Update this to refresh dashboard charts

### Training Data (Optional)
- Location: `data/dataset.csv`
- Only needed if retraining the model (not required for app)

## Troubleshooting

### Predictions not working
```
✓ Check browser console (F12) for errors
✓ Ensure JavaScript is enabled
✓ Clear browser cache and localStorage
✓ Reload page
```

### Dashboard shows no data
```
✓ Verify file exists: frontend/public/data/data_final.csv
✓ Check browser Network tab for 404
✓ File must be in CSV format with headers
```

### Insight filters not updating
```
✓ Run at least one prediction first
✓ Ensure localStorage is enabled
✓ Try different business model filter
```

## Migration from Flask Backend

This project previously used a Flask API backend. The backend has been **removed** and all logic moved to the frontend for:
- ✅ Better performance (no network latency)
- ✅ Offline capability
- ✅ Simpler deployment
- ✅ Reduced server costs

See `MIGRATION_TO_FRONTEND_ONLY.md` for technical details.

## Future Enhancements

- [ ] Export predictions to PDF/Excel
- [ ] Model accuracy tracking
- [ ] Advanced filtering and search
- [ ] Data import wizard
- [ ] Multi-user workspace
- [ ] API predictions (optional re-add Flask)
- [ ] PWA support for mobile apps
- [ ] Dark mode theme

## Support & Contribution

For issues, feature requests, or improvements:
1. Check existing documentation
2. Review code comments in `predictionService.js`
3. Test in browser DevTools

## License

Project for academic/business use.

---

**Need Backend API?** See `backend/README_DEPRECATED.md` for optional Flask setup.

cd project/frontend
npm install
npm run dev
```

Frontend runs at `http://127.0.0.1:5173`.

## API

### `POST /predict`

Request:
```json
{
  "revenue": 25000,
  "cost": 20000,
  "quantity": 20,
  "business_model": "Retail"
}
```

Response:
```json
{
  "risk": "Low Risk",
  "profit_margin": 20.0,
  "prediction_confidence": 97.35,
  "risk_score": 3,
  "business_model": "Retail",
  "model_accuracy": 99.8
}
```

## Power BI Embed

Update the `powerBiEmbedUrl` in `frontend/src/pages/DashboardPage.jsx` with your publish-to-web Power BI URL.

## AWS EC2 Deployment Steps

1. Launch Ubuntu EC2 instance and allow inbound ports `22`, `5000`, and `5173` (or `80` if using Nginx reverse proxy).
2. SSH into EC2 and install packages:
   ```bash
   sudo apt update
   sudo apt install -y python3-pip python3-venv nodejs npm git
   ```
3. Copy project to EC2 and run backend:
   ```bash
   cd project/backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   python train_model.py
   python app.py
   ```
4. Run frontend:
   ```bash
   cd project/frontend
   npm install
   npm run build
   npm run preview -- --host 0.0.0.0 --port 5173
   ```
5. Optional production setup:
   - Serve frontend build with Nginx.
   - Run Flask via Gunicorn:
     ```bash
     pip install gunicorn
     gunicorn -w 2 -b 0.0.0.0:5000 app:app
     ```

## Notes

- Ensure model is trained before running Flask API.
- For production security, configure CORS domain restrictions and use HTTPS.
