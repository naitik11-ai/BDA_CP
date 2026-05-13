# Business Profitability and Risk Prediction System

Complete full-stack web application with:
- Flask backend API for risk prediction
- Logistic Regression ML model for risk classification
- React frontend with Prediction, Dashboard, and Insights pages
- Deployment-ready setup for AWS EC2

## Folder Structure

```text
project/
├── backend/
│   ├── app.py
│   ├── train_model.py
│   ├── model.pkl
│   └── requirements.txt
├── frontend/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── styles.css
│       └── pages/
│           ├── HomePage.jsx
│           ├── PredictionPage.jsx
│           ├── DashboardPage.jsx
│           └── InsightsPage.jsx
└── data/
    └── dataset.csv
```

## Backend Setup

```bash
cd project/backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python train_model.py
python app.py
```

Backend runs at `http://127.0.0.1:5000`.

## Frontend Setup

```bash
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
