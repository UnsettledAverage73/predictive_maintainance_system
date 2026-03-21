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
  testConnection: (payload: any) => fetchApi("/api/test-connection", { method: "POST", body: JSON.stringify(payload) }),
  getFactoryStats: () => fetchApi("/api/factory/stats"),
  getFactoryUsage: () => fetchApi("/api/factory/usage"),
  getMachineTelemetry: (id: string, minutes: number = 60) => fetchApi(`/api/telemetry/${id}?minutes=${minutes}`),
  getMachineHistory: (id: string) => fetchApi(`/api/history/${id}`),
  getAlerts: () => fetchApi("/api/alerts"),
  getSchedule: () => fetchApi("/api/schedule"),
  chat: (payload: any) => fetchApi("/api/chat", { method: "POST", body: JSON.stringify(payload) }),
  chatVoice: async (formData: FormData) => {
    const response = await fetch(`${API_BASE_URL}/api/chat/voice`, {
      method: "POST",
      body: formData
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(error.detail || response.statusText);
    }
    return response.json();
  },
  chatVision: async (formData: FormData) => {
    const response = await fetch(`${API_BASE_URL}/api/chat/vision`, {
      method: "POST",
      body: formData
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(error.detail || response.statusText);
    }
    return response.json();
  },
  logRepair: (payload: any) => fetchApi("/api/logs", { method: "POST", body: JSON.stringify(payload) }),
  mitigateRisk: (id: string) => fetchApi(`/api/equipment/${id}/mitigate`, { method: "POST" }),
  getWhatsAppNumber: () => fetchApi("/api/settings/whatsapp"),
  updateWhatsAppNumber: (number: string) => fetchApi("/api/settings/whatsapp", { method: "POST", body: JSON.stringify({ number }) }),
  getMachineParameters: (id: string) => fetchApi(`/api/machines/${id}/parameters`),
  addMachineParameter: (id: string, payload: any) => fetchApi(`/api/machines/${id}/parameters`, { method: "POST", body: JSON.stringify(payload) }),
  getTemplates: () => fetchApi("/api/machines/templates"),
  applyTemplate: (id: string, templateName: string) => fetchApi(`/api/machines/${id}/parameters/template/${templateName}`, { method: "POST" }),
  previewCsv: (id: string, formData: FormData) => fetch(`${API_BASE_URL}/api/machines/${id}/import/preview`, { method: "POST", body: formData }).then(res => res.json()),
  confirmCsv: (id: string, formData: FormData) => fetch(`${API_BASE_URL}/api/machines/${id}/import/confirm`, { method: "POST", body: formData }).then(res => res.json()),
};
