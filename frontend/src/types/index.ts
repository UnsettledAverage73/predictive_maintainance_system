export interface Machine {
  id: string;
  name: string;
  productionLine: string;
  protocol: 'OPC-UA' | 'MQTT' | 'Modbus' | 'REST' | 'CSV';
  status: 'online' | 'warning' | 'critical' | 'offline';
  riskScore: number; // 0-100
  lastMaintenanceDate: string;
  nextScheduledDate: string;
  mtbf: number; // hours
  openWorkOrders: number;
  agentId: string;
}

export interface MaintenanceTask {
  id: number;
  machine_id: string;
  machine_name: string;
  task_name: string;
  task_type: 'routine' | 'repair' | 'inspection';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  priority?: 'critical' | 'high' | 'medium' | 'low';
  due_date: string;
  assigned_to: string;
  completed_at?: string;
  notes?: string;
  aiReason?: string;
  created_at: string;
}

export interface TelemetryPoint {
  timestamp: string;
  temperature: number;
  vibration: number;
  pressure: number;
  rpm: number;
}

export interface Alert {
  id: string;
  machineId: string;
  machineName: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  aiAnalysis: string;
  status: 'new' | 'acknowledged' | 'resolved';
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  agentType?: 'Machine Agent' | 'Orchestrator';
}
