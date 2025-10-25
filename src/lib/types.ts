
export interface RODevice {
  deviceName: string;
  serialNumber: string;
  startDate: string;
  endDate: string;
  todayUsage: number;
  monthlyUsage: number;
  dailyLimit: number;
  status: "active" | "inactive" | "EXPIRED";
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

export interface CustomerData {
  generatedCustomerId: string;
  customerName: string;
  customerAddress: string;
  customerCity: string;
  customerPhone: string;
  google_email?: string;
  fcmToken?: string;
  
  aadhaarNo?: string;
  altMobileNo?: string;
  city?: string;
  confirmedMapLink?: string;
  country?: string;
  currentPlanId?: string;
  currentPlanName?: string;
  currentPlanTotalLitersLimit?: number;
  currentTotalHours?: number;
  currentTotalLitersUsed?: number;
  driveUrl?: string;
  emailId?: string;
  espCycleMaxHours?: number;
  fatherSpouseName?: string;
  installationDate?: string;
  installationTime?: string;
  landmark?: string;
  modelInstalled?: string;
  paymentType?: string;
  pincode?: string;
  planEndDate?: string;
  planExpiryTimestamp?: number;
  planStartDate?: string;
  planStatus?: "active" | "inactive" | "EXPIRED";
  receiptNumber?: string;
  rechargeCount?: number;
  registeredAt?: string;
  securityAmount?: string;
  selectedDivision?: string;
  selectedZone?: string;
  serialNumber?: string;
  stateName?: string;
  tdsAfter?: string;
  tdsBefore?: string;
  termsAgreed?: boolean;
  updatedAt?: string;
}
