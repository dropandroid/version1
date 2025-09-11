
"use client";

import type { FC } from 'react';
import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { useRoData } from '@/hooks/use-ro-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";

type SettingsTabProps = ReturnType<typeof useRoData>;

export const SettingsTab: FC<SettingsTabProps> = ({ roDevice, setRoDevice, settings, toggleSetting }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempLimit, setTempLimit] = useState(roDevice.dailyLimit);
  const { toast } = useToast();

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
              <span className="font-medium">DP-Premium-2024</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Installation:</span>
              <span className="font-medium">{new Date(roDevice.startDate).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Warranty:</span>
              <span className="font-medium text-green-600">2 Years</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Filtered:</span>
              <span className="font-medium">{roDevice.totalLiters.toFixed(1)}L</span>
            </div>
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
    </div>
  );
};
