import type { Vehicle } from "../lib/api";

interface VehicleCardProps {
  vehicle: Vehicle;
  onClick: () => void;
}

export default function VehicleCard({ vehicle, onClick }: VehicleCardProps) {
  const stateColor =
    vehicle.state === "online"
      ? "text-green-400"
      : vehicle.state === "asleep"
      ? "text-yellow-400"
      : "text-slate-400";

  return (
    <button
      onClick={onClick}
      className="bg-slate-900 rounded-xl p-6 text-left hover:bg-slate-800 transition-colors border border-slate-800 hover:border-slate-700 w-full"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold mb-1">
            {vehicle.display_name || "My Tesla"}
          </h3>
          <p className="text-slate-400 text-sm font-mono">{vehicle.vin}</p>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stateColor} bg-slate-800`}
        >
          {vehicle.state}
        </span>
      </div>

      <div className="flex items-center text-slate-400 text-sm">
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
        View details
      </div>
    </button>
  );
}
