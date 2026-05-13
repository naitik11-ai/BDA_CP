import { NavLink } from "react-router-dom";

function Navbar() {
  return (
    <header className="top-nav">
      <div className="top-nav-brand">
        <p className="brand-subtitle">Business Intelligence Platform</p>
        <h1>Business Profitability and Risk Prediction System</h1>
      </div>
      <nav className="top-nav-links">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/prediction">Prediction</NavLink>
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/insights">Insights</NavLink>
      </nav>
    </header>
  );
}

export default Navbar;
