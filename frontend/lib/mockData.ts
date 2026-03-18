export interface Equipment {
  id: string;
  name: string;
  type: string;
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  temperature: number;
  vibration: number;
  pressure: number;
  runtimeHours: number;
  efficiency: number;
  healthScore: number;
  lastMaintenance: string;
  nextMaintenance: string;
  failureRisk: 'low' | 'medium' | 'high';
}

export interface Alert {
  id: string;
  equipmentId: string;
  equipmentName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
}

export const mockEquipment: Equipment[] = [
  {
    id: 'eq-001',
    name: 'Pump Assembly A1',
    type: 'Centrifugal Pump',
    status: 'healthy',
    uptime: 98.5,
    temperature: 62,
    vibration: 2.1,
    pressure: 45.2,
    runtimeHours: 8760,
    efficiency: 96,
    healthScore: 92,
    lastMaintenance: '2024-02-15',
    nextMaintenance: '2024-05-15',
    failureRisk: 'low',
  },
  {
    id: 'eq-002',
    name: 'Motor Assembly B2',
    type: 'Electric Motor',
    status: 'warning',
    uptime: 96.2,
    temperature: 78,
    vibration: 4.5,
    pressure: 52.1,
    runtimeHours: 7520,
    efficiency: 88,
    healthScore: 74,
    lastMaintenance: '2024-01-10',
    nextMaintenance: '2024-04-10',
    failureRisk: 'medium',
  },
  {
    id: 'eq-003',
    name: 'Compressor Unit C3',
    type: 'Rotary Compressor',
    status: 'healthy',
    uptime: 99.1,
    temperature: 55,
    vibration: 1.8,
    pressure: 48.5,
    runtimeHours: 8640,
    efficiency: 94,
    healthScore: 95,
    lastMaintenance: '2024-02-20',
    nextMaintenance: '2024-05-20',
    failureRisk: 'low',
  },
  {
    id: 'eq-004',
    name: 'Turbine Rotor D4',
    type: 'Steam Turbine',
    status: 'critical',
    uptime: 89.3,
    temperature: 92,
    vibration: 7.2,
    pressure: 65.8,
    runtimeHours: 6200,
    efficiency: 72,
    healthScore: 45,
    lastMaintenance: '2023-12-01',
    nextMaintenance: '2024-03-01',
    failureRisk: 'high',
  },
  {
    id: 'eq-005',
    name: 'Heat Exchanger E5',
    type: 'Plate Heat Exchanger',
    status: 'healthy',
    uptime: 97.8,
    temperature: 68,
    vibration: 0.9,
    pressure: 42.3,
    runtimeHours: 8550,
    efficiency: 92,
    healthScore: 88,
    lastMaintenance: '2024-01-20',
    nextMaintenance: '2024-04-20',
    failureRisk: 'low',
  },
  {
    id: 'eq-006',
    name: 'Fan Assembly F6',
    type: 'Axial Fan',
    status: 'warning',
    uptime: 94.5,
    temperature: 75,
    vibration: 5.3,
    pressure: 38.9,
    runtimeHours: 7320,
    efficiency: 85,
    healthScore: 68,
    lastMaintenance: '2024-01-05',
    nextMaintenance: '2024-04-05',
    failureRisk: 'medium',
  },
  {
    id: 'eq-007',
    name: 'Valve System G7',
    type: 'Control Valve',
    status: 'healthy',
    uptime: 99.7,
    temperature: 58,
    vibration: 0.5,
    pressure: 44.2,
    runtimeHours: 8710,
    efficiency: 97,
    healthScore: 96,
    lastMaintenance: '2024-02-10',
    nextMaintenance: '2024-05-10',
    failureRisk: 'low',
  },
  {
    id: 'eq-008',
    name: 'Generator H8',
    type: 'Synchronous Generator',
    status: 'healthy',
    uptime: 98.2,
    temperature: 70,
    vibration: 2.4,
    pressure: 50.1,
    runtimeHours: 8600,
    efficiency: 91,
    healthScore: 90,
    lastMaintenance: '2024-02-05',
    nextMaintenance: '2024-05-05',
    failureRisk: 'low',
  },
];

export const mockAlerts: Alert[] = [
  {
    id: 'alert-001',
    equipmentId: 'eq-004',
    equipmentName: 'Turbine Rotor D4',
    severity: 'critical',
    message: 'Critical vibration levels detected. Immediate inspection required.',
    timestamp: '2024-03-18T14:32:00Z',
  },
  {
    id: 'alert-002',
    equipmentId: 'eq-002',
    equipmentName: 'Motor Assembly B2',
    severity: 'high',
    message: 'Temperature approaching threshold. Schedule maintenance.',
    timestamp: '2024-03-18T13:45:00Z',
  },
  {
    id: 'alert-003',
    equipmentId: 'eq-006',
    equipmentName: 'Fan Assembly F6',
    severity: 'medium',
    message: 'Vibration levels increasing. Monitor closely.',
    timestamp: '2024-03-18T12:15:00Z',
  },
];

export const chartDataTemplate = {
  temperature: [
    { time: '00:00', value: 58 },
    { time: '04:00', value: 61 },
    { time: '08:00', value: 65 },
    { time: '12:00', value: 72 },
    { time: '16:00', value: 68 },
    { time: '20:00', value: 62 },
  ],
  vibration: [
    { time: '00:00', value: 1.2 },
    { time: '04:00', value: 1.5 },
    { time: '08:00', value: 2.1 },
    { time: '12:00', value: 2.8 },
    { time: '16:00', value: 2.3 },
    { time: '20:00', value: 1.8 },
  ],
  pressure: [
    { time: '00:00', value: 40 },
    { time: '04:00', value: 42 },
    { time: '08:00', value: 44 },
    { time: '12:00', value: 48 },
    { time: '16:00', value: 46 },
    { time: '20:00', value: 43 },
  ],
};

// Aliases for convenience
export const equipment = mockEquipment;
export const alerts = mockAlerts;
