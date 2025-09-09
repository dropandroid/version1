import type { RODevice, UsageData, AppSettings } from './types';

export const INITIAL_RO_DEVICE: RODevice = {
  deviceName: "My RO Water Purifier",
  serialNumber: "DP-RO-2024-001",
  startDate: "2024-01-15",
  endDate: "2024-12-15",
  todayUsage: 0,
  monthlyUsage: 485.2,
  dailyLimit: 50,
  status: "active",
  purityLevel: 98.2,
  tdsLevel: 45,
  lastServiceDate: "2024-07-15",
  nextServiceDate: "2024-10-15",
  totalLiters: 2847.5,
  filterLifeRemaining: 85,
  lastUsageTime: new Date().toISOString()
};

export const INITIAL_USAGE_HISTORY: UsageData[] = [
  { day: 'Mon', usage: 32.5, date: '2024-09-02' },
  { day: 'Tue', usage: 28.0, date: '2024-09-03' },
  { day: 'Wed', usage: 35.2, date: '2024-09-04' },
  { day: 'Thu', usage: 29.8, date: '2024-09-05' },
  { day: 'Fri', usage: 42.1, date: '2024-09-06' },
  { day: 'Sat', usage: 38.7, date: '2024-09-07' },
  { day: 'Sun', usage: 28.5, date: '2024-09-08' }
];

export const INITIAL_SETTINGS: AppSettings = {
  usageAlerts: true,
  serviceReminders: true,
  lowPurityAlerts: true,
  dailyReports: false,
  autoRefresh: true
};
