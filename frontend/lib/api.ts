const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchEquipment() {
  const response = await fetch(`${API_BASE_URL}/api/equipment`);
  if (!response.ok) throw new Error('Failed to fetch equipment');
  return response.json();
}

export async function fetchAlerts() {
  const response = await fetch(`${API_BASE_URL}/api/alerts`);
  if (!response.ok) throw new Error('Failed to fetch alerts');
  return response.json();
}

export async function sendChatMessage(payload: any) {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to send chat message');
  return response.json();
}

export async function getMachineTelemetry(id: string, mins: number = 60) {
  const response = await fetch(`${API_BASE_URL}/api/telemetry/${id}?minutes=${mins}`);
  if (!response.ok) throw new Error('Failed to fetch telemetry');
  return response.json();
}
