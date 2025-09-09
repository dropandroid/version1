
import type { RODevice, UsageData, AppSettings } from './types';

// Data is now initialized to an empty/disconnected state.
// The app will fetch real data from the device after setup.

export const INITIAL_RO_DEVICE: RODevice = {
  deviceName: "Not Connected",
  serialNumber: "",
  startDate: "",
  endDate: "",
  todayUsage: 0,
  monthlyUsage: 0,
  dailyLimit: 0,
  status: "inactive",
  purityLevel: 0,
  tdsLevel: 0,
  lastServiceDate: "",
  nextServiceDate: "",
  totalLiters: 0,
  filterLifeRemaining: 0,
  lastUsageTime: ""
};

export const INITIAL_USAGE_HISTORY: UsageData[] = [];

export const INITIAL_SETTINGS: AppSettings = {
  usageAlerts: false,
  serviceReminders: false,
  lowPurityAlerts: false,
  dailyReports: false,
  autoRefresh: false
};
