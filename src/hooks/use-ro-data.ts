
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

  // This function would be used to fetch data from the device
  const fetchDeviceData = useCallback(async () => {
    // In a real app, you would make a network request to your ESP8266 here
    // For now, we just stop the loading state.
    setIsLoading(false);
    setLastUpdated(new Date());
  }, []);

  // This function would be used to send data to the device
  const addWaterUsage = useCallback((liters: number) => {
    // In a real app, this would be a POST request to your device
    // The device would then update its state, and the next fetch would retrieve it.
    // For now, we can add a placeholder to show the concept.
    console.log(`Simulating adding ${liters}L of water.`);
    // To see an immediate effect for testing, we can manually update state.
    // In a real scenario, you'd refetch data instead.
    setRoDevice(prev => ({
      ...prev,
      todayUsage: prev.todayUsage + liters,
      totalLiters: prev.totalLiters + liters,
    }));
    setLastUpdated(new Date());
  }, []);


  useEffect(() => {
    const alerts: Alert[] = [];
    if (roDevice.serialNumber === '') { // Don't generate alerts if no device is connected
        setNotifications([]);
        return;
    }

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
    setNotifications(alerts);
  }, [roDevice, settings]);
  
  useEffect(() => {
    // When the component mounts, we check for data.
    // In a real app, you might fetch data from a server or local storage here.
    fetchDeviceData();
    const timer = setTimeout(() => setIsInitialLoading(false), 500); // Simulate initial load time
    return () => clearTimeout(timer);
  }, [fetchDeviceData]);

  const handleRefresh = () => {
    setIsLoading(true);
    fetchDeviceData();
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
