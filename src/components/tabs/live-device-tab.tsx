'use client';

import React, { useState, useEffect } from 'react';
import { getFirestore, collection, onSnapshot, DocumentData } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wifi, Router, Info, Loader2, ExternalLink, Smartphone, Network } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { app } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

const db = app ? getFirestore(app) : null;

// --- Monitoring Mode Components ---

const DeviceCard = ({ deviceId, localIp, totalHours }: { deviceId: string, localIp: string, totalHours: number }) => {
  const litersUsed = (totalHours || 0) * 15;

  return (
    <a href={`http://${localIp}`} target="_blank" rel="noopener noreferrer" className="block hover:shadow-lg transition-shadow rounded-lg">
      <Card className="flex flex-col justify-between h-full">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base truncate">{deviceId}</CardTitle>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </div>
          <CardDescription>IP: {localIp}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-right">
            <p className="text-muted-foreground text-sm">Total Liters Used</p>
            <p className="text-3xl font-bold text-primary">{litersUsed.toFixed(1)}L</p>
            <p className="text-xs text-muted-foreground">{totalHours ? totalHours.toFixed(2) : '0.00'} hours</p>
          </div>
        </CardContent>
      </Card>
    </a>
  );
};

const MonitoringMode = () => {
  const [devices, setDevices] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const { customerData } = useAuth();
  const { toast } = useToast();

  const saveIpToDb = async (deviceId: string, ipAddress: string) => {
    if (!customerData?.generatedCustomerId) {
        console.warn("[Live Tab] Cannot save IP, customer ID is not available.");
        return;
    }
     try {
        const response = await fetch('/api/save-ip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerId: customerData.generatedCustomerId,
                ipAddress: ipAddress,
                deviceId: deviceId,
            })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `API call failed with status: ${response.status}`);
        }
        console.log(`[Live Tab] Successfully called /api/save-ip for device ${deviceId}`);
    } catch (error) {
        console.error("[Live Tab] Error calling /api/save-ip:", error);
        toast({
            variant: "destructive",
            title: "Could Not Save IP",
            description: "Failed to update the device's IP address in the database.",
        });
    }
  };

  useEffect(() => {
    if (!db) {
        setLoading(false);
        return;
    };
    const devicesColRef = collection(db, 'devices');
    
    const unsubscribe = onSnapshot(devicesColRef, (snapshot) => {
      const deviceList = snapshot.docs.map(doc => {
          const data = doc.data();
          return { id: doc.id, ...data };
      });
      setDevices(deviceList);
      
      deviceList.forEach(device => {
          if (device.localIp && device.deviceId && customerData?.generatedCustomerId) {
              saveIpToDb(device.deviceId, device.localIp);
          }
      });

      setLoading(false);
    }, (error) => {
      console.error("Error fetching devices:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerData]); 

  if (loading) {
    return (
        <div className="flex justify-center items-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );
  }
  
  if (!db) {
    return <p className="text-center text-destructive">Firebase is not initialized.</p>
  }

  return (
    <div>
      {devices.length === 0 ? (
         <Card className="text-center p-6">
            <Info className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold">No Online Devices Found</h3>
            <p className="text-sm text-muted-foreground mt-1">Use the "New Device Setup" tab to configure a new device. Once connected, it will appear here.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {devices.map(device => (
            <DeviceCard 
                key={device.id} 
                deviceId={device.deviceId} 
                localIp={device.localIp}
                totalHours={device.totalHoursRun}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// --- Configuration Mode Component ---

const ConfigurationMode = () => {
    
    const handleOpenDevicePage = () => {
        window.open('http://192.168.4.1', '_blank');
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Hotspot Mode Setup</CardTitle>
                <CardDescription>Provision a new device by connecting it to your Wi-Fi network.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="bg-primary/10 p-4 rounded-lg space-y-3 mb-6">
                    <h3 className="font-semibold text-primary">Instructions</h3>
                    <ol className="text-sm text-primary/90 list-decimal list-inside space-y-2">
                        <li>Power on your new AquaTrack device. It will create a Wi-Fi hotspot.</li>
                        <li>Go to your phone's Wi-Fi settings and connect to the network named <span className="font-bold">`droppurity`</span>.</li>
                        <li>Once connected, return to this app and tap the button below.</li>
                        <li>A new page will open. Follow the steps there to connect the device to your home Wi-Fi.</li>
                    </ol>
                </div>
                <Button onClick={handleOpenDevicePage} className="w-full" size="lg">
                    <Network className="mr-2" />
                    Open Wi-Fi Settings Page (192.168.4.1)
                </Button>
            </CardContent>
        </Card>
    )
}


export const LiveDeviceTab: React.FC = () => {
  return (
    <div className="p-4 space-y-4">
        <h2 className="text-xl font-bold text-foreground">Live Device Management</h2>
        <Tabs defaultValue="wifi-mode" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="wifi-mode"><Wifi className="mr-2"/> Online Devices</TabsTrigger>
                <TabsTrigger value="hotspot-mode"><Router className="mr-2"/> New Device Setup</TabsTrigger>
            </TabsList>
            <TabsContent value="wifi-mode">
                <MonitoringMode />
            </TabsContent>
            <TabsContent value="hotspot-mode">
                <ConfigurationMode />
            </TabsContent>
        </Tabs>
    </div>
  );
};
