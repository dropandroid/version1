"use client";

import type { FC } from 'react';
import { Download, Share, CheckCircle, AlertCircle, Droplets } from 'lucide-react';
import { useRoData } from '@/hooks/use-ro-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UsageChart } from '@/components/charts/usage-chart';
import { useToast } from "@/hooks/use-toast";

type AnalyticsTabProps = ReturnType<typeof useRoData>;

export const AnalyticsTab: FC<AnalyticsTabProps> = ({ roDevice, usageHistory }) => {
  const { toast } = useToast();
  const weeklyAverage = usageHistory.reduce((sum, day) => sum + day.usage, 0) / usageHistory.length;
  const maxDailyUsage = Math.max(...usageHistory.map(d => d.usage));
  const minDailyUsage = Math.min(...usageHistory.map(d => d.usage));

  const exportData = () => {
    const exportContent = {
      device: roDevice,
      history: usageHistory,
      exportDate: new Date().toISOString()
    };
    const dataStr = JSON.stringify(exportContent, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `aquatrack-data-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast({ title: "Data Exported", description: "Your usage data has been downloaded." });
  };
  
  const handleShare = () => {
    const shareText = `My AquaTrack Report: Monthly usage is ${roDevice.monthlyUsage.toFixed(1)}L and weekly average is ${weeklyAverage.toFixed(1)}L/day.`;
    if (navigator.share) {
      navigator.share({
        title: 'My AquaTrack Usage Report',
        text: shareText,
        url: window.location.href
      }).then(() => toast({ title: "Report Shared" }))
        .catch(error => console.error('Error sharing', error));
    } else {
      navigator.clipboard.writeText(shareText);
      toast({ title: "Report Copied", description: "Usage report copied to clipboard." });
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-foreground">Usage Analytics</h2>
        <Button variant="ghost" size="sm" onClick={exportData}>
          <Download className="mr-2 h-4 w-4" /> Export
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-primary/10">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-primary">This Month</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{roDevice.monthlyUsage.toFixed(1)}L</p>
            <p className="text-xs text-primary/80">Total usage</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-600">Weekly Avg</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-700">{weeklyAverage.toFixed(1)}L</p>
            <p className="text-xs text-green-600/80">Per day</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center"><p className="text-xs text-muted-foreground mb-1">Peak Day</p><p className="text-lg font-bold text-accent-foreground">{maxDailyUsage.toFixed(1)}L</p></Card>
          <Card className="p-3 text-center"><p className="text-xs text-muted-foreground mb-1">Low Day</p><p className="text-lg font-bold text-primary">{minDailyUsage.toFixed(1)}L</p></Card>
          <Card className="p-3 text-center"><p className="text-xs text-muted-foreground mb-1">Today</p><p className="text-lg font-bold text-foreground">{roDevice.todayUsage.toFixed(1)}L</p></Card>
      </div>

      <UsageChart usageHistory={usageHistory} maxDailyUsage={maxDailyUsage} weeklyAverage={weeklyAverage} />
      
      <Card>
          <CardHeader><CardTitle className="text-base">Smart Insights</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start p-3 bg-green-500/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-800 dark:text-green-300 font-semibold">Efficient Usage</p>
                <p className="text-green-700 dark:text-green-400">You're consuming {((weeklyAverage / roDevice.dailyLimit) * 100).toFixed(0)}% of your daily limit on average.</p>
              </div>
            </div>
            
            {maxDailyUsage > roDevice.dailyLimit * 0.8 && (
              <div className="flex items-start p-3 bg-accent/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-800 dark:text-amber-300 font-semibold">Peak Usage Alert</p>
                  <p className="text-amber-700 dark:text-amber-400">Your highest usage day was {maxDailyUsage.toFixed(1)}L. Consider spreading usage.</p>
                </div>
              </div>
            )}
            
            <div className="flex items-start p-3 bg-primary/10 rounded-lg">
              <Droplets className="w-5 h-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-primary/90 font-semibold">Water Quality Trend</p>
                <p className="text-primary/80">Filter efficiency is at {Math.round(roDevice.filterLifeRemaining)}%. Plan for replacement soon.</p>
              </div>
            </div>
          </CardContent>
      </Card>
      
      <Button size="lg" className="w-full" onClick={handleShare}>
          <Share className="mr-2 h-4 w-4" /> Share Report
      </Button>
    </div>
  );
};
