
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { RODevice, UsageData, AppSettings, Alert, CustomerData } from '@/lib/types';
import { calculateDaysRemaining } from '@/lib/helpers';
import { useAuth } from './use-auth';

const INITIAL_USAGE_HISTORY: UsageData[] = [
  { day: 'Mon', usage: 32.5, date: '2024-09-02' },
  { day: 'Tue', usage: 28.0, date: '2024-09-03' },
  { day: 'Wed', usage: 35.2, date: '2024-09-04' },
  { day: 'Thu', usage: 29.8, date: '2024-09-05' },
  { day: 'Fri', usage: 42.1, date: '2024-09-06' },
  { day: 'Sat', usage: 38.7, date: '2024-09-07' },
  { day: 'Sun', usage: 28.5, date: '2024-09-08' }
];

const INITIAL_SETTINGS: AppSettings = {
  usageAlerts: true,
  serviceReminders: true,
  lowPurityAlerts: true,
  dailyReports: false,
  autoRefresh: true
};

const createInitialDeviceState = (customerData: CustomerData | null): RODevice => {
    if (!customerData) {
        return {
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
            lastUsageTime: "",
            totalHours: 0,
        };
    }
    
    // Calculate total liters from total hours if available, at a rate of 15L/hour
    const totalLitersFromHours = (customerData.currentTotalHours || 0) * 15;
    // Use totalLitersFromHours if it's greater than currentTotalLitersUsed, otherwise fallback
    const totalLiters = Math.max(totalLitersFromHours, customerData.currentTotalLitersUsed || 0);

    return {
      deviceName: customerData.modelInstalled || "My RO Water Purifier",
      serialNumber: customerData.serialNumber || "N/A",
      startDate: customerData.planStartDate || new Date().toISOString(),
      endDate: customerData.planEndDate || new Date().toISOString(),
      todayUsage: 0, // This would be fetched from device in a real scenario
      monthlyUsage: totalLiters, // Reflecting total as monthly
      dailyLimit: (customerData.currentPlanTotalLitersLimit && customerData.currentPlanTotalLitersLimit > 0) ? Math.round(customerData.currentPlanTotalLitersLimit / 30) : 50,
      status: customerData.planStatus || 'inactive',
      purityLevel: 98.2, // Placeholder
      tdsLevel: parseInt(customerData.tdsAfter || '45', 10),
      lastServiceDate: customerData.installationDate || "2024-07-15", 
      nextServiceDate: new Date(new Date(customerData.installationDate || Date.now()).setMonth(new Date(customerData.installationDate || Date.now()).getMonth() + 3)).toISOString(),
      totalLiters: totalLiters,
      totalHours: customerData.currentTotalHours || 0,
      filterLifeRemaining: 85, // Placeholder
      lastUsageTime: customerData.updatedAt || new Date().toISOString()
    };
}


export const useRoData = () => {
  const { customerData } = useAuth();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [roDevice, setRoDevice] = useState<RODevice>(createInitialDeviceState(customerData));
  const [usageHistory, setUsageHistory] = useState<UsageData[]>(INITIAL_USAGE_HISTORY);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [notifications, setNotifications] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    setRoDevice(createInitialDeviceState(customerData));
  }, [customerData]);


  const addWaterUsage = useCallback((liters: number) => {
    setRoDevice(prev => {
      const hoursToAdd = liters / 15; // Convert liters to hours
      const newTotalHours = (prev.totalHours || 0) + hoursToAdd;
      const newTotalLiters = newTotalHours * 15;

      const newUsage = prev.todayUsage + liters;
      const newPurity = Math.max(95, prev.purityLevel - (liters * 0.01));
      const newTDS = Math.min(60, prev.tdsLevel + (liters * 0.02));
      
      return {
        ...prev,
        todayUsage: Math.round(newUsage * 10) / 10,
        totalLiters: newTotalLiters,
        totalHours: newTotalHours,
        purityLevel: Math.round(newPurity * 10) / 10,
        tdsLevel: Math.round(newTDS * 10) / 10,
        lastUsageTime: new Date().toISOString(),
        filterLifeRemaining: Math.max(0, prev.filterLifeRemaining - (liters * 0.1))
      };
    });
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    if (settings.autoRefresh) {
      const interval = setInterval(() => {
        if (Math.random() > 0.7) {
          const randomUsage = Math.random() * 2 + 0.5;
          addWaterUsage(randomUsage);
        }
      }, 30000); // Every 30 seconds

      return () => clearInterval(interval);
    }
  }, [settings.autoRefresh, addWaterUsage]);

  useEffect(() => {
    if (!roDevice.endDate) return;
    const alerts: Alert[] = [];
    const daysRemaining = calculateDaysRemaining(roDevice.endDate);
    
    if (daysRemaining <= 30 && settings.serviceReminders) {
      alerts.push({
        type: 'warning',
        message: `Plan expires in ${daysRemaining} days`,
        action: 'Renew'
      });
    }

    if (roDevice.status?.toLowerCase() === 'expired') {
       alerts.push({
        type: 'error',
        message: 'Your plan has expired.',
        action: 'Recharge'
      });
    }
    
    if (roDevice.filterLifeRemaining <= 20) {
      alerts.push({
        type: 'error',
        message: 'Filter replacement required soon',
        action: 'Order'
      });
    }
    
    if (roDevice.todayUsage > roDevice.dailyLimit * 0.9 && settings.usageAlerts) {
      alerts.push({
        type: 'warning',
        message: 'Daily usage limit almost reached',
        action: 'View'
      });
    }
    
    if (roDevice.tdsLevel > 50 && settings.lowPurityAlerts) {
      alerts.push({
        type: 'error',
        message: 'Water quality declining - TDS high',
        action: 'Check'
      });
    }
    
    if (roDevice.purityLevel < 97 && settings.lowPurityAlerts) {
      alerts.push({
        type: 'warning',
        message: 'Water purity below optimal level',
        action: 'Service'
      });
    }
    
    const nextService = new Date(roDevice.nextServiceDate);
    const today = new Date();
    const serviceDays = Math.ceil((nextService.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (serviceDays <= 7 && settings.serviceReminders) {
      alerts.push({
        type: 'info',
        message: `Service due in ${serviceDays} days`,
        action: 'Schedule'
      });
    }
    
    setNotifications(alerts);
  }, [roDevice, settings]);
  
  useEffect(() => {
    if (customerData) {
        setIsInitialLoading(false);
    }
  }, [customerData]);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      setRoDevice(prev => ({
        ...prev,
        purityLevel: Math.max(95, Math.min(99, prev.purityLevel + (Math.random() - 0.5) * 2)),
        tdsLevel: Math.max(30, Math.min(60, prev.tdsLevel + (Math.random() - 0.5) * 5))
      }));
      setIsLoading(false);
    }, 1000);
  };

  const toggleSetting = (setting: keyof AppSettings) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  return {
    roDevice,
    setRoDevice,
    usageHistory,
    settings,
    toggleSetting,
    notifications,
    isLoading,
    isInitialLoading,
    lastUpdated,
    handleRefresh,
    addWaterUsage,
  };
};
