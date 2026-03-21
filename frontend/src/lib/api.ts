const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchApi(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || response.statusText);
  }

  return response.json();
}

export const api = {
  getEquipment: () => fetchApi("/api/equipment"),
  onboardMachine: (payload: any) => fetchApi("/api/equipment", { method: "POST", body: JSON.stringify(payload) }),
  getFactoryStats: () => fetchApi("/api/factory/stats"),
  getMachineTelemetry: (id: string, minutes: number = 60) => fetchApi(`/api/telemetry/${id}?minutes=${minutes}`),
  getMachineHistory: (id: string) => fetchApi(`/api/history/${id}`),
  getAlerts: () => fetchApi("/api/alerts"),
  getSchedule: () => fetchApi("/api/schedule"),
  chat: (payload: any) => fetchApi("/api/chat", { method: "POST", body: JSON.stringify(payload) }),
  logRepair: (payload: any) => fetchApi("/api/logs", { method: "POST", body: JSON.stringify(payload) }),
  getMachineTelemetry: (id: string) => fetchApi(`/api/telemetry/${id}`),
  getMachineHistory: (id: string) => fetchApi(`/api/history/${id}`),
  mitigateRisk: (id: string) => fetchApi(`/api/equipment/${id}/mitigate`, { method: "POST" }),
};

