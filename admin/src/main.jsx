import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { Dashboard } from "./components/Dashboard";
import { Login } from "./components/Login";
import { getToken } from "./api";
import "./index.css";

function App() {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const token = getToken();
    setAuthenticated(!!token);
  }, []);

  return authenticated ? (
    <Dashboard onSignOut={() => setAuthenticated(false)} />
  ) : (
    <Login onAuthenticated={() => setAuthenticated(true)} />
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
