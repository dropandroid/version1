export interface RODevice {
  deviceName: string;
  serialNumber: string;
  startDate: string;
  endDate: string;
  todayUsage: number;
  monthlyUsage: number;
  dailyLimit: number;
  status: "active" | "inactive";
  purityLevel: number;
  tdsLevel: number;
  lastServiceDate: string;
  nextServiceDate: string;
  totalLiters: number;
  filterLifeRemaining: number;
  lastUsageTime: string;
}

export interface UsageData {
  day: string;
  usage: number;
  date: string;
}

export interface AppSettings {
  usageAlerts: boolean;
  serviceReminders: boolean;
  lowPurityAlerts: boolean;
  dailyReports: boolean;
  autoRefresh: boolean;
}

export interface Alert {
  type: "error" | "warning" | "info";
  message: string;
  action: string;
}
