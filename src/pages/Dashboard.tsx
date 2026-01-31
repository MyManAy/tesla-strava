import { useEffect, useState } from "react";
import { getVehicles, logout, type Vehicle } from "../lib/api";
import VehicleCard from "../components/VehicleCard";
import VehicleDetail from "../components/VehicleDetail";

export default function Dashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getVehicles()
      .then(setVehicles)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading your vehicles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-red-500">Tesla Strava</h1>
          <button
            onClick={logout}
            className="text-slate-400 hover:text-white text-sm transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {selectedVehicle ? (
          <VehicleDetail
            vehicle={selectedVehicle}
            onBack={() => setSelectedVehicle(null)}
          />
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-2">My Vehicles</h2>
              <p className="text-slate-400">
                Select a vehicle to view details and track your journeys
              </p>
            </div>

            {vehicles.length === 0 ? (
              <div className="bg-slate-900 rounded-xl p-8 text-center">
                <p className="text-slate-400">No vehicles found in your account.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {vehicles.map((vehicle) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    onClick={() => setSelectedVehicle(vehicle)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
