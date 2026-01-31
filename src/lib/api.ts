export interface Vehicle {
  id: number;
  vehicle_id: number;
  vin: string;
  display_name: string;
  state: string;
}

export interface VehicleData {
  response: {
    id: number;
    display_name: string;
    vin: string;
    state: string;
    charge_state?: {
      battery_level: number;
      battery_range: number;
      charging_state: string;
      charge_limit_soc: number;
      charge_rate: number;
      time_to_full_charge: number;
    };
    drive_state?: {
      latitude: number;
      longitude: number;
      heading: number;
      speed: number | null;
      power: number;
      timestamp: number;
    };
    vehicle_state?: {
      odometer: number;
      car_version: string;
      locked: boolean;
    };
    climate_state?: {
      inside_temp: number;
      outside_temp: number;
      is_climate_on: boolean;
    };
  };
}

export async function checkAuth(): Promise<boolean> {
  const res = await fetch("/auth/session");
  const data = await res.json();
  return data.authenticated;
}

export async function logout(): Promise<void> {
  await fetch("/auth/logout", { method: "POST" });
  window.location.reload();
}

export async function getVehicles(): Promise<Vehicle[]> {
  const res = await fetch("/api/vehicles");
  if (!res.ok) throw new Error("Failed to fetch vehicles");
  const data = await res.json();
  return data.response || [];
}

export async function getVehicleData(id: number): Promise<VehicleData> {
  const res = await fetch(`/api/vehicles/${id}`);
  if (!res.ok) throw new Error("Failed to fetch vehicle data");
  return res.json();
}

export async function getVehicleLocation(id: number): Promise<VehicleData> {
  const res = await fetch(`/api/vehicles/${id}/location`);
  if (!res.ok) throw new Error("Failed to fetch location");
  return res.json();
}

export async function getVehicleCharge(id: number): Promise<VehicleData> {
  const res = await fetch(`/api/vehicles/${id}/charge`);
  if (!res.ok) throw new Error("Failed to fetch charge state");
  return res.json();
}
