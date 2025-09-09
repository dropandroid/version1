"use client";

import { useState, useEffect, useCallback } from 'react';
import type { RODevice, UsageData, AppSettings, Alert } from '@/lib/types';
import { INITIAL_RO_DEVICE, INITIAL_USAGE_HISTORY, INITIAL_SETTINGS } from '@/lib/data';
import { calculateDaysRemaining } from '@/lib/helpers';

export const useRoData = () => {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [roDevice, setRoDevice] = useState<RODevice>(INITIAL_RO_DEVICE);
  const [usageHistory, setUsageHistory] = useState<UsageData[]>(INITIAL_USAGE_HISTORY);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [notifications, setNotifications] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const addWaterUsage = useCallback((liters: number) => {
    setRoDevice(prev => {
      const newUsage = prev.todayUsage + liters;
      const newTotal = prev.totalLiters + liters;
      const newPurity = Math.max(95, prev.purityLevel - (liters * 0.01));
      const newTDS = Math.min(60, prev.tdsLevel + (liters * 0.02));
      
      return {
        ...prev,
        todayUsage: Math.round(newUsage * 10) / 10,
        totalLiters: Math.round(newTotal * 10) / 10,
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
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [settings.autoRefresh, addWaterUsage]);

  useEffect(() => {
    const alerts: Alert[] = [];
    const daysRemaining = calculateDaysRemaining(roDevice.endDate);
    
    if (daysRemaining <= 30 && settings.serviceReminders) {
      alerts.push({
        type: 'warning',
        message: `Rental expires in ${daysRemaining} days`,
        action: 'Renew Plan'
      });
    }
    
    if (roDevice.filterLifeRemaining <= 20) {
      alerts.push({
        type: 'error',
        message: 'Filter replacement required soon',
        action: 'Order Filter'
      });
    }
    
    if (roDevice.todayUsage > roDevice.dailyLimit * 0.9 && settings.usageAlerts) {
      alerts.push({
        type: 'warning',
        message: 'Daily usage limit almost reached',
        action: 'View Usage'
      });
    }
    
    if (roDevice.tdsLevel > 50 && settings.lowPurityAlerts) {
      alerts.push({
        type: 'error',
        message: 'Water quality declining - TDS high',
        action: 'Check Filter'
      });
    }
    
    if (roDevice.purityLevel < 97 && settings.lowPurityAlerts) {
      alerts.push({
        type: 'warning',
        message: 'Water purity below optimal level',
        action: 'Service Now'
      });
    }
    
    const nextService = new Date(roDevice.nextServiceDate);
    const today = new Date();
    const serviceDays = Math.ceil((nextService.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (serviceDays > 0 && serviceDays <= 7 && settings.serviceReminders) {
      alerts.push({
        type: 'info',
        message: `Service due in ${serviceDays} days`,
        action: 'Schedule'
      });
    }
    
    setNotifications(alerts);
  }, [roDevice, settings]);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

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
