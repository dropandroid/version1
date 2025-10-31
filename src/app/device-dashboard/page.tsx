
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useDeviceControl } from "@/hooks/useDeviceControl"; // Import the hook
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wifi, WifiOff, Zap, ZapOff, Loader2 } from 'lucide-react';

// This is the main dashboard component
export default function DeviceDashboard() {
  const { customerData, loading: authLoading } = useAuth();
  
  // Use our new hook to get live data and controls
  const { deviceData, connectionStatus, sendRelayCommand } = useDeviceControl();

  if (authLoading) {
    return <div className="p-4 flex justify-center items-center h-screen"><Loader2 className="animate-spin h-8 w-8" /></div>;
  }

  if (!customerData) {
    return <div className="p-4">Please log in to see your dashboard.</div>;
  }
  
  // Helper function to get a status message
  const getStatusMessage = () => {
    if (!customerData.lastKnownIp) {
      return (
        <span className="flex items-center text-muted-foreground">
          <WifiOff className="mr-2 h-4 w-4" />
          Device IP not found. Ensure device is online or run setup.
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
            Disconnected. Ensure you are on the same WiFi as your device.
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold">Device Dashboard</h1>
      
      {/* Device Configuration Section */}
      <Card>
        <CardHeader>
          <CardTitle>Device Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-muted-foreground mb-4">
              <p><strong>Step 1:</strong> Go to your phone's WiFi settings and manually connect to the hotspot named <strong>droppurity</strong>.</p>
              <p><strong>Step 2:</strong> After you are connected, return to this app.</p>
              <p><strong>Step 3:</strong> Tap the button below to configure your device.</p>
          </div>
          <Button
            onClick={() => {
              if (window.AndroidBridge && window.AndroidBridge.startDeviceSetup) {
                window.AndroidBridge.startDeviceSetup();
              } else {
                // Fallback for testing in a normal browser
                alert("Device setup can only be started from the native Android app.");
              }
            }}
          >
            Open Device Setup Page
          </Button>
        </CardContent>
      </Card>

      {/* Live Monitoring Section */}
      <Card>
        <CardHeader>
          <CardTitle>Live Device Control</CardTitle>
          <p className="pt-2 text-sm">{getStatusMessage()}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {connectionStatus !== 'connected' || !deviceData ? (
            <p className="text-muted-foreground">Waiting for live data...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Relay Control Card */}
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
                    Trigger pin is {deviceData.trigger_is_active ? "ACTIVE" : "INACTIVE"}
                  </p>
                   {!deviceData.trigger_is_active && <p className="text-xs text-amber-600 mt-1">System cannot be turned on while trigger is inactive.</p>}
                </CardContent>
              </Card>
            
              {/* Usage Stats Card */}
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
}
