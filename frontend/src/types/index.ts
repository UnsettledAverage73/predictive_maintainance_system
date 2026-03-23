export interface Machine {
  id: string;
  name: string;
  productionLine: string;
  plantId?: string;
  sector?: string;
  protocol: 'OPC-UA' | 'MQTT' | 'Modbus' | 'REST' | 'CSV';
  status: 'online' | 'warning' | 'critical' | 'offline';
  riskScore: number; // 0-100
  lastMaintenanceDate: string;
  nextScheduledDate: string;
  mtbf: number; // hours
  openWorkOrders: number;
  agentId: string;
  healthScore?: number;
  minutesToFailure?: number | null;
  failureProbability?: number;
  failureRisk?: 'high' | 'medium' | 'low';
  temperature?: number;
  vibration?: number;
}

export interface MaintenanceTask {
  id: number | string;
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
  machineId?: string;
  machineName?: string;
  title?: string;
  dueDate?: string;
  assignedTo?: string;
  createdAt?: string;
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

export interface MachineCostAnalysis {
  primaryPart: string;
  plannedCostInr: number;
  reactiveCostInr: number;
  downtimeCostInr: number;
  estimatedSavingsInr: number;
  estimatedSavingsPct: number;
  roiLabel: string;
  plannedVsReactiveRatio: number;
  assumptions: string[];
}

export interface MachineThreatDetection {
  threat: string;
  affectedComponent: string;
  confidence: number;
  timeWindowHours: number;
  evidence: string[];
  recommendedAction: string;
  riskLabel: 'critical' | 'high' | 'medium' | 'low';
}

export interface MachineIncidentReport {
  title: string;
  severity: string;
  rootCause: string;
  firstDomino: string;
  fiveW: {
    who: string;
    what: string;
    where: string;
    when: string;
    why: string;
  };
  threatSignature: string;
}

export interface MachineWearModel {
  wearStatus: string;
  wearIndex: number;
  rulHours: number;
  oemRecommendedHours: number;
  currentRuntimeHours: number;
  idleHours: number;
  averageLoadPercent: number;
  overdueHours: number;
  whatIfScenario: string;
  usageTrend: Array<{
    runtimeHours: number;
    loadPercent: number;
    capturedAt: string;
  }>;
}

export interface MachineInsights {
  machineId: string;
  machineName: string;
  generatedAt: string;
  costAnalysis: MachineCostAnalysis;
  threatDetection: MachineThreatDetection;
  incidentReport: MachineIncidentReport;
  wearModel: MachineWearModel;
}
