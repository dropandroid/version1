"use client";

import React from 'react';
import { useAuth } from "@/hooks/use-auth";
import { useDeviceControl } from "@/hooks/useDeviceControl";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wifi, WifiOff, Zap, ZapOff, Loader2 } from 'lucide-react';

export const LiveDeviceTab: React.FC = () => {
  const { customerData } = useAuth();
  const { deviceData, connectionStatus, sendRelayCommand } = useDeviceControl();

  const handleStartSetup = () => {
    // Navigate the WebView to the device's setup page.
    window.location.href = 'http://192.168.4.1/scanwifi';
  };

  const getStatusMessage = () => {
    if (!customerData?.lastKnownIp) {
      return (
        <span className="flex items-center text-muted-foreground">
          <WifiOff className="mr-2 h-4 w-4" />
          Device IP not found. Start setup to connect your device.
        </span>
      );
    }
    switch (connectionStatus) {
      case 'connecting':
        return (
          <span className="flex items-center text-yellow-500">
            <Wifi className="mr-2 h-4 w-4 animate-pulse" />
            Connecting to {customerData.lastKnownIp}...
          </span>
        );
      case 'connected':
        return (
          <span className="flex items-center text-green-500">
            <Wifi className="mr-2 h-4 w-4" />
            Live connection established!
          </span>
        );
      case 'error':
      case 'disconnected':
      default:
        return (
          <span className="flex items-center text-red-500">
            <WifiOff className="mr-2 h-4 w-4" />
            Disconnected. Ensure you're on the same Wi-Fi as your device.
          </span>
        );
    }
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>New Device Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-muted-foreground mb-4">
            <p><strong>Step 1:</strong> Power on your new Droppurity device.</p>
            <p><strong>Step 2:</strong> Go to your phone's Wi-Fi settings and connect to the hotspot named <strong>droppurity</strong>.</p>
            <p><strong>Step 3:</strong> Once connected, return to this app and tap the button below.</p>
          </div>
          <Button onClick={handleStartSetup}>
            Open Device Setup Page
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live Device Control</CardTitle>
          <p className="pt-2 text-sm">{getStatusMessage()}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {connectionStatus !== 'connected' || !deviceData ? (
             <div className="flex flex-col items-center justify-center text-muted-foreground p-6">
                <Loader2 className="h-6 w-6 animate-spin mb-4" />
                <p>Waiting for live data...</p>
                <p className="text-xs text-center mt-2">Ensure your device is powered on and connected to your Wi-Fi.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">RO System Control</CardTitle>
                </CardHeader>
                <CardContent>
                  {deviceData.relay_is_on ? (
                    <div className="flex items-center text-green-500 mb-4">
                      <Zap className="mr-2 h-5 w-5" />
                      <span className="font-bold text-xl">System is ON</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-red-500 mb-4">
                      <ZapOff className="mr-2 h-5 w-5" />
                      <span className="font-bold text-xl">System is OFF</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => sendRelayCommand('on')} 
                      disabled={deviceData.relay_is_on || !deviceData.trigger_is_active}
                    >
                      Turn ON
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => sendRelayCommand('off')}
                      disabled={!deviceData.relay_is_on}
                    >
                      Turn OFF
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Float switch is {deviceData.trigger_is_active ? "ACTIVE" : "INACTIVE"}
                  </p>
                   {!deviceData.trigger_is_active && <p className="text-xs text-amber-600 mt-1">System cannot be turned on while float switch is inactive.</p>}
                </CardContent>
              </Card>
            
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Live Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <h3 className="text-lg font-semibold">
                    {deviceData.total_liters?.toFixed(2)} L
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    / {deviceData.max_liters?.toFixed(2)} L
                  </p>

                  <h3 className="text-lg font-semibold mt-4">
                    {deviceData.total_hours?.toFixed(2)} hrs
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    / {deviceData.max_hours?.toFixed(2)} hrs
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};