import { useEffect, useState } from "react";
import { getVehicleData, type Vehicle, type VehicleData } from "../lib/api";

interface VehicleDetailProps {
  vehicle: Vehicle;
  onBack: () => void;
}

export default function VehicleDetail({ vehicle, onBack }: VehicleDetailProps) {
  const [data, setData] = useState<VehicleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getVehicleData(vehicle.id)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [vehicle.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <button
          onClick={onBack}
          className="text-slate-400 hover:text-white mb-6 flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to vehicles
        </button>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
          <p className="text-slate-400 text-sm mt-2">
            The vehicle may be asleep. Try waking it up from your Tesla app.
          </p>
        </div>
      </div>
    );
  }

  const response = data?.response;
  const chargeState = response?.charge_state;
  const driveState = response?.drive_state;
  const vehicleState = response?.vehicle_state;
  const climateState = response?.climate_state;

  return (
    <div>
      <button
        onClick={onBack}
        className="text-slate-400 hover:text-white mb-6 flex items-center"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to vehicles
      </button>

      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">{response?.display_name || "My Tesla"}</h2>
        <p className="text-slate-400 font-mono">{response?.vin}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Battery Card */}
        {chargeState && (
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold">Battery</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Level</span>
                  <span className="font-medium">{chargeState.battery_level}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${chargeState.battery_level}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Range</span>
                <span>{Math.round(chargeState.battery_range)} miles</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Status</span>
                <span className="capitalize">{chargeState.charging_state}</span>
              </div>
              {chargeState.charging_state === "Charging" && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Time to full</span>
                  <span>{chargeState.time_to_full_charge.toFixed(1)} hrs</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Location Card */}
        {driveState && (
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="font-semibold">Location</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Latitude</span>
                <span className="font-mono">{driveState.latitude?.toFixed(6)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Longitude</span>
                <span className="font-mono">{driveState.longitude?.toFixed(6)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Heading</span>
                <span>{driveState.heading}°</span>
              </div>
              {driveState.speed !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Speed</span>
                  <span>{driveState.speed} mph</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Vehicle State Card */}
        {vehicleState && (
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-semibold">Vehicle</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Odometer</span>
                <span>{Math.round(vehicleState.odometer).toLocaleString()} miles</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Locked</span>
                <span>{vehicleState.locked ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Software</span>
                <span className="font-mono text-xs">{vehicleState.car_version?.split(" ")[0]}</span>
              </div>
            </div>
          </div>
        )}

        {/* Climate Card */}
        {climateState && (
          <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                </svg>
              </div>
              <h3 className="font-semibold">Climate</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Inside</span>
                <span>{Math.round(climateState.inside_temp * 9/5 + 32)}°F</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Outside</span>
                <span>{Math.round(climateState.outside_temp * 9/5 + 32)}°F</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Climate On</span>
                <span>{climateState.is_climate_on ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Raw Data (collapsible) */}
      <details className="mt-8">
        <summary className="text-slate-400 cursor-pointer hover:text-white">
          View raw data
        </summary>
        <pre className="mt-4 bg-slate-900 rounded-xl p-4 overflow-auto text-xs text-slate-300 border border-slate-800">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}
