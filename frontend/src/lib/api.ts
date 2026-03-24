const normalizeBaseUrl = (value?: string) => value?.replace(/\/+$/, "") || "";

const getBrowserBackendOrigin = () => {
  if (typeof window === "undefined") {
    return "http://127.0.0.1:8000";
  }

  return `${window.location.protocol}//${window.location.hostname}:8000`;
};

const EXTERNAL_API_BASE_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL);
const API_BASE_URL = EXTERNAL_API_BASE_URL || "";

export function buildApiUrl(endpoint: string) {
  return API_BASE_URL ? `${API_BASE_URL}${endpoint}` : endpoint;
}

export function buildWebSocketUrl(path: string) {
  const backendOrigin = EXTERNAL_API_BASE_URL || getBrowserBackendOrigin();
  const wsUrl = new URL(backendOrigin);
  wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
  wsUrl.pathname = path;
  wsUrl.search = "";
  wsUrl.hash = "";
  return wsUrl.toString();
}

export async function fetchApi(endpoint: string, options?: RequestInit) {
  const url = buildApiUrl(endpoint);
  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed";
    throw new Error(`Unable to reach backend at ${API_BASE_URL || "same-origin /api proxy"}: ${message}`);
  }

  if (!response.ok) {
    const error = await response.json().catch(async () => {
      const text = await response.text().catch(() => "");
      return { detail: text || response.statusText || "Unknown error" };
    });
    const message = typeof error.detail === 'string' 
      ? error.detail
      : JSON.stringify(error.detail) || response.statusText;
    throw new Error(message);
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
  getMachineInsights: (id: string) => fetchApi(`/api/machines/${id}/insights`),
  getAlerts: () => fetchApi("/api/alerts"),
  getSchedule: (aiPrioritized: boolean = false) => fetchApi(`/api/schedule?ai_prioritized=${aiPrioritized}`),
  updateTask: (id: number | string, payload: any) => fetchApi(`/api/schedule/${id}`, { method: "POST", body: JSON.stringify(payload) }),
  chat: (payload: any) => fetchApi("/api/chat", { method: "POST", body: JSON.stringify(payload) }),
  chatVoice: async (formData: FormData) => {
    const response = await fetch(buildApiUrl("/api/chat/voice"), {
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
    const response = await fetch(buildApiUrl("/api/chat/vision"), {
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
  submitAlertFeedback: (id: string | number, payload: any) => fetchApi(`/api/alerts/${id}/feedback`, { method: "POST", body: JSON.stringify(payload) }),
  getMachineParameters: (id: string) => fetchApi(`/api/machines/${id}/parameters`),
  addMachineParameter: (id: string, payload: any) => fetchApi(`/api/machines/${id}/parameters`, { method: "POST", body: JSON.stringify(payload) }),
  getTemplates: () => fetchApi("/api/machines/templates"),
  applyTemplate: (id: string, templateName: string) => fetchApi(`/api/machines/${id}/parameters/template/${templateName}`, { method: "POST" }),
  previewCsv: (id: string, formData: FormData) => fetch(buildApiUrl(`/api/machines/${id}/import/preview`), { method: "POST", body: formData }).then(res => res.json()),
  confirmCsv: (id: string, formData: FormData) => fetch(buildApiUrl(`/api/machines/${id}/import/confirm`), { method: "POST", body: formData }).then(res => res.json()),
};
