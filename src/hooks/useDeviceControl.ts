"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';

// This is the shape of the data your ESP8266 will send over WebSocket
export interface DeviceData {
  type?: string;
  customerId?: string;
  relay_is_on?: boolean;
  trigger_is_active?: boolean;
  total_hours?: number;
  max_hours?: number;
  total_liters?: number;
  max_liters?: number;
  plan_end_date?: string;
  is_plan_expired?: boolean;
  in_error_state?: boolean;
}

// This is what the hook provides to your page
interface UseDeviceControlReturn {
  deviceData: DeviceData | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error' | 'no-ip';
  sendRelayCommand: (state: 'on' | 'off') => Promise<void>;
}

/**
 * A custom React hook to manage a direct local network connection
 * to a DropPurity ESP8266 device.
 */
export function useDeviceControl(): UseDeviceControlReturn {
  const { customerData } = useAuth(); // Get customer data (contains the IP)
  const [deviceData, setDeviceData] = useState<DeviceData | null>(null);
  const [connectionStatus, setConnectionStatus] = 
    useState<UseDeviceControlReturn['connectionStatus']>('disconnected');
  const [socket, setSocket] = useState<WebSocket | null>(null);

  const deviceIp = customerData?.lastKnownIp;

  // This effect runs when the deviceIp is known
  useEffect(() => {
    if (!deviceIp) {
      setConnectionStatus('no-ip');
      return;
    }

    // Only attempt to connect if not already connected
    if (socket && socket.readyState === WebSocket.OPEN) {
      setConnectionStatus('connected');
      return;
    }
    
    if (socket && socket.readyState === WebSocket.CONNECTING) {
      setConnectionStatus('connecting');
      return;
    }

    // Start the connection
    const wsUrl = `ws://${deviceIp}:81`;
    console.log(`[useDeviceControl] Attempting to connect to WebSocket: ${wsUrl}`);
    setConnectionStatus('connecting');

    const newSocket = new WebSocket(wsUrl);

    newSocket.onopen = () => {
      console.log('[useDeviceControl] WebSocket Connected');
      setConnectionStatus('connected');
    };

    newSocket.onmessage = (event) => {
      try {
        const data: DeviceData = JSON.parse(event.data);
        console.log('[useDeviceControl] Received data:', data);
        setDeviceData(data); // Update the live data
      } catch (error) {
        console.error('[useDeviceControl] Failed to parse WebSocket message:', error);
      }
    };

    newSocket.onclose = () => {
      console.log('[useDeviceControl] WebSocket Disconnected');
      setConnectionStatus('disconnected');
      setSocket(null); // Clear the socket
    };

    newSocket.onerror = (error) => {
      console.error('[useDeviceControl] WebSocket Error:', error);
      setConnectionStatus('error');
      setSocket(null); // Clear the socket
    };

    setSocket(newSocket); // Save the socket in state

    // Cleanup function: this runs when the component unmounts
    return () => {
      if (newSocket.readyState === WebSocket.OPEN) {
        newSocket.close();
      }
    };
  }, [deviceIp, socket]); // Re-run if the IP changes or socket state changes

  // Function to send commands to the device's HTTP API
  const sendRelayCommand = useCallback(async (state: 'on' | 'off') => {
    if (!deviceIp) {
      console.error('[useDeviceControl] Cannot send command: No Device IP.');
      return;
    }

    const apiUrl = `http://${deviceIp}/api/relay?state=${state}`;
    console.log(`[useDeviceControl] Sending command: ${apiUrl}`);

    try {
      // We use 'fetch' to send the command
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send command: ${response.status} ${errorText}`);
      }
      
      const responseText = await response.text();
      console.log(`[useDeviceControl] Command success: ${responseText}`);
      
      // After a successful command, the ESP will automatically
      // broadcast the new state via WebSocket, so we don't need to
      // manually update the state here. We just wait for the next message.

    } catch (error) {
      console.error('[useDeviceControl] Failed to send relay command:', error);
      // You could show a user-facing error toast here
    }
  }, [deviceIp]); // Re-create this function if the deviceIp changes

  // Return the live data and the control function
  return { deviceData, connectionStatus, sendRelayCommand };
}
