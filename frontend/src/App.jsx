import { Route, Routes } from "react-router-dom";
import { Suspense, lazy } from "react";
import Navbar from "./components/Navbar";

const HomePage = lazy(() => import("./pages/HomePage"));
const PredictionPage = lazy(() => import("./pages/PredictionPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const InsightsPage = lazy(() => import("./pages/InsightsPage"));

function App() {
  return (
    <div className="app-shell">
      <Navbar />

      <main className="main-content">
        <Suspense fallback={<div className="route-loading card">Loading page...</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/prediction" element={<PredictionPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/insights" element={<InsightsPage />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default App;
