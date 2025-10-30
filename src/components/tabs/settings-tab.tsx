
"use client";

import type { FC } from 'react';
import { useState } from 'react';
import { Save, X, Bell, ChevronsRight, ShieldCheck } from 'lucide-react';
import { useRoData } from '@/hooks/use-ro-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/use-auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type SettingsTabProps = ReturnType<typeof useRoData>;

export const SettingsTab: FC<SettingsTabProps> = ({ roDevice, setRoDevice, settings, toggleSetting }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempLimit, setTempLimit] = useState(roDevice.dailyLimit);
  const { toast } = useToast();
  const { customerData, requestNotificationPermission } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);


  const handleSaveLimit = () => {
    if (tempLimit >= 10 && tempLimit <= 200) {
      setRoDevice(prev => ({ ...prev, dailyLimit: tempLimit }));
      setIsEditing(false);
      toast({ title: "Success", description: "Daily limit updated successfully!" });
    } else {
      toast({ variant: "destructive", title: "Invalid Value", description: "Limit must be between 10 and 200." });
    }
  };
  
  const handleScheduleService = () => {
    const newServiceDate = new Date();
    newServiceDate.setDate(newServiceDate.getDate() + 90);
    setRoDevice(prev => ({
      ...prev,
      lastServiceDate: new Date().toISOString().split('T')[0],
      nextServiceDate: newServiceDate.toISOString().split('T')[0],
      filterLifeRemaining: 100,
      purityLevel: 98.5,
      tdsLevel: 35
    }));
    toast({ title: "Service Scheduled", description: "Your next service is booked." });
  };

  const handleEnableNotifications = async () => {
    const permission = await requestNotificationPermission();
    if (permission === 'granted') {
      toast({ title: "Notifications Enabled", description: "You will now receive alerts for important events." });
    } else if (permission === 'denied') {
      toast({ variant: 'destructive', title: "Notifications Blocked", description: "Please enable notifications in your browser or app settings." });
    } else {
       toast({ title: "Notifications Dismissed", description: "You can enable notifications later from settings." });
    }
  };

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/manual-notification-trigger');
      const data = await response.json();
      setCheckResult(data);
    } catch (error) {
      console.error('Failed to run manual check', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to trigger manual check.',
      });
    } finally {
      setIsChecking(false);
    }
  };


  const settingsOptions = [
    { key: 'usageAlerts', label: 'Usage Alerts' },
    { key: 'serviceReminders', label: 'Service Reminders' },
    { key: 'lowPurityAlerts', label: 'Water Quality Alerts' },
    { key: 'dailyReports', label: 'Daily Reports' },
    { key: 'autoRefresh', label: 'Auto Refresh' }
  ] as const;

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-foreground">Settings & Service</h2>

      <Card>
        <CardHeader><CardTitle className="text-base">Notifications</CardTitle></CardHeader>
        <CardContent>
           <Button className="w-full" onClick={handleEnableNotifications}>
            <Bell className="mr-2 h-4 w-4" />
            Enable Push Notifications
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Receive alerts for plan expiry, service reminders, and water quality issues.
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle className="text-base">Device Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center py-2">
            <Label htmlFor="daily-limit-toggle" className="text-foreground">Daily Usage Limit</Label>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input type="number" value={tempLimit} onChange={(e) => setTempLimit(parseInt(e.target.value, 10))} className="w-20 text-center h-8" min="10" max="200" />
                <Button size="icon" className="h-8 w-8 bg-green-500" onClick={handleSaveLimit}><Save className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setIsEditing(false); setTempLimit(roDevice.dailyLimit); }}><X className="h-4 w-4" /></Button>
              </div>
            ) : (
              <div className="flex items-center">
                <span className="font-medium mr-2">{roDevice.dailyLimit}L</span>
                <Button variant="link" className="p-0 h-auto" onClick={() => setIsEditing(true)}>Edit</Button>
              </div>
            )}
          </div>
          {settingsOptions.map(({ key, label }) => (
            <div key={key} className="flex justify-between items-center py-2">
              <Label htmlFor={key} className="text-foreground">{label}</Label>
              <Switch id={key} checked={settings[key]} onCheckedChange={() => toggleSetting(key)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Service Schedule</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Last Service:</span><span className="font-medium">{new Date(roDevice.lastServiceDate).toLocaleDateString()}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Next Service:</span><span className="font-medium text-amber-600">{new Date(roDevice.nextServiceDate).toLocaleDateString()}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Filter Life:</span><span className={`font-medium ${roDevice.filterLifeRemaining > 20 ? 'text-green-600' : 'text-red-600'}`}>{Math.round(roDevice.filterLifeRemaining)}% remaining</span></div>
          <Button className="w-full mt-3 bg-green-500 hover:bg-green-600" onClick={handleScheduleService}>Schedule Immediate Service</Button>
        </CardContent>
      </Card>

      <Card>
          <CardHeader><CardTitle className="text-base">Device Information</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Model:</span>
              <span className="font-medium">{roDevice.deviceName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Serial Number:</span>
              <span className="font-medium">{roDevice.serialNumber}</span>
            </div>
             <div className="flex justify-between">
              <span className="text-muted-foreground">Installation:</span>
              <span className="font-medium">{roDevice.startDate ? new Date(roDevice.startDate).toLocaleDateString() : '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">TDS Reading:</span>
              <div className="font-medium flex items-center">
                <span>{customerData?.tdsBefore || 'N/A'} ppm</span>
                <ChevronsRight className="w-4 h-4 mx-1 text-muted-foreground"/>
                <span className="text-green-600">{customerData?.tdsAfter || 'N/A'} ppm</span>
              </div>
            </div>
          </CardContent>
        </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Admin Actions</CardTitle></CardHeader>
        <CardContent>
            <Button variant="outline" className="w-full" onClick={handleManualCheck} disabled={isChecking}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                {isChecking ? 'Checking...' : 'Run Manual Expiry Check'}
            </Button>
        </CardContent>
      </Card>


      <Card>
        <CardHeader><CardTitle className="text-base">Support</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full" onClick={() => toast({title: "Contacting Support", description: "Email us at support@droppurity.com"})}>Contact Support</Button>
          <Button variant="outline" className="w-full" onClick={() => toast({title: "Opening Manual"})}>User Manual</Button>
          <Button variant="outline" className="w-full" onClick={() => toast({title: "Issue Reported", description: "We will contact you shortly."})}>Report Issue</Button>
        </CardContent>
      </Card>

       {checkResult && (
        <AlertDialog open={!!checkResult} onOpenChange={() => setCheckResult(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Manual Check Complete</AlertDialogTitle>
              <AlertDialogDescription>
                <div className="mt-4 text-left space-y-2 text-sm">
                  <p><strong>Message:</strong> {checkResult.message}</p>
                  <p><strong>Total Customers Processed:</strong> {checkResult.processedCount}</p>
                  <p><strong>Notifications Sent:</strong> {checkResult.sent}</p>
                  <p><strong>Notifications Failed:</strong> {checkResult.failed}</p>
                   {checkResult.details && checkResult.details.length > 0 && (
                      <div className="pt-2">
                        <h4 className="font-semibold mb-1">Details:</h4>
                        <pre className="bg-muted p-2 rounded-md text-xs max-h-48 overflow-auto">
                          {JSON.stringify(checkResult.details, null, 2)}
                        </pre>
                      </div>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setCheckResult(null)}>Close</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
  );
};
