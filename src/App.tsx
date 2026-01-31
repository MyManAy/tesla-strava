import { useEffect, useState } from "react";
import { checkAuth } from "./lib/api";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth().then(setAuthenticated);
  }, []);

  if (authenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return authenticated ? <Dashboard /> : <Login />;
}
