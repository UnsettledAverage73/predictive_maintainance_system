const normalizeBaseUrl = (value?: string) => value?.replace(/\/+$/, "") || "";

const getBrowserBackendOrigin = () => {
  if (typeof window === "undefined") {
    return "http://127.0.0.1:8000";
  }

  return `${window.location.protocol}//${window.location.hostname}:8000`;
};

const EXTERNAL_API_BASE_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL);
const API_BASE_URL = EXTERNAL_API_BASE_URL || "";

const getBrowserApiOrigin = () => {
  if (typeof window === "undefined") {
    return "http://127.0.0.1:8000";
  }

  return `http://${window.location.hostname}:8000`;
};

export function buildApiUrl(endpoint: string) {
  if (typeof window !== "undefined") {
    // If EXTERNAL_API_BASE_URL is not set or contains the stale IP, use browser origin at port 8000
    if (!API_BASE_URL || API_BASE_URL.includes("192.168.182.181")) {
      return `http://${window.location.hostname}:8000${endpoint}`;
    }
  }

  if (API_BASE_URL && !API_BASE_URL.includes("192.168.182.181")) {
    return `${API_BASE_URL}${endpoint}`;
  }

  return `${getBrowserApiOrigin()}${endpoint}`;
}

export function buildWebSocketUrl(path: string) {
  let backendOrigin = EXTERNAL_API_BASE_URL || getBrowserBackendOrigin();
  if (backendOrigin.includes("192.168.182.181")) {
    backendOrigin = getBrowserBackendOrigin();
  }
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
    // Self-healing fallback: if the primary URL fails, attempt direct host:8000 or same-origin
    try {
      const fallbackUrl = typeof window !== "undefined"
        ? `http://${window.location.hostname}:8000${endpoint}`
        : `http://127.0.0.1:8000${endpoint}`;

      if (fallbackUrl !== url) {
        response = await fetch(fallbackUrl, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options?.headers,
          },
        });
      } else {
        throw error;
      }
    } catch {
      const message = error instanceof Error ? error.message : "Network request failed";
      throw new Error(`Unable to reach backend at ${url}: ${message}`);
    }
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
  getNetworkEndpoint: () => fetchApi("/api/network/endpoint"),
  detectDevices: () => fetchApi("/api/iot/detect-devices"),
  getConnectedSensors: (minutes: number = 5) => fetchApi(`/api/iot/connected-sensors?minutes=${minutes}`),
  pairEsp32: (equipmentId: string, macAddress: string, sensorKind?: string) => fetchApi(`/api/equipment/${equipmentId}/pair-esp32`, {
    method: "POST",
    body: JSON.stringify({
      mac_address: macAddress,
      ...(sensorKind ? { sensor_kind: sensorKind } : {}),
    }),
  }),
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
  triggerAnomaly: (id: string, payload?: { parameter?: string, value?: number }) => fetchApi(`/api/equipment/${id}/trigger_anomaly`, { method: "POST", body: JSON.stringify(payload || {}) }),
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
