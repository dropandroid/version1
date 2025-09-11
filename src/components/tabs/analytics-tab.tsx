
"use client";

import type { FC } from 'react';
import { Download, Share, CheckCircle, AlertCircle, Droplets } from 'lucide-react';
import { useRoData } from '@/hooks/use-ro-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UsageChart } from '@/components/charts/usage-chart';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';

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
        <Card className="bg-blue-50">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-blue-800">This Month</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{roDevice.monthlyUsage.toFixed(1)}L</p>
            <p className="text-xs text-blue-600">Total usage</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-800">Weekly Avg</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{weeklyAverage.toFixed(1)}L</p>
            <p className="text-xs text-green-600">Per day</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center"><p className="text-xs text-muted-foreground mb-1">Peak Day</p><p className="text-lg font-bold text-orange-600">{maxDailyUsage.toFixed(1)}L</p></Card>
          <Card className="p-3 text-center"><p className="text-xs text-muted-foreground mb-1">Low Day</p><p className="text-lg font-bold text-green-600">{minDailyUsage.toFixed(1)}L</p></Card>
          <Card className="p-3 text-center"><p className="text-xs text-muted-foreground mb-1">Today</p><p className="text-lg font-bold text-blue-600">{roDevice.todayUsage.toFixed(1)}L</p></Card>
      </div>

      <Card>
        <CardHeader>
            <CardTitle className="text-base">Weekly Usage Pattern</CardTitle>
        </CardHeader>
        <CardContent>
        <div className="space-y-3">
          {usageHistory.map((day, index) => {
            const percentage = maxDailyUsage > 0 ? (day.usage / maxDailyUsage) * 100 : 0;
            const isToday = new Date(day.date).toDateString() === new Date().toDateString();
            const barColor = isToday ? 'bg-blue-500' : day.usage > weeklyAverage ? 'bg-orange-500' : 'bg-green-500';

            return (
              <div key={day.day} className="flex items-center group">
                <span className={cn("w-12 text-sm font-medium", isToday ? "text-blue-600" : "text-gray-700")}>
                  {day.day}
                </span>
                <div className="flex-1 bg-muted rounded-full h-6 ml-3 relative overflow-hidden">
                  <div 
                    className={cn("h-6 rounded-full transition-all duration-1000 flex items-center justify-end pr-2", barColor)}
                    style={{ width: `${percentage}%` }}
                  >
                    <span className="text-xs text-white font-medium drop-shadow-sm">{day.usage.toFixed(1)}L</span>
                  </div>
                </div>
                 <span className="ml-2 text-xs text-gray-500 w-16 text-right">
                    {day.usage > weeklyAverage ? `+${(day.usage - weeklyAverage).toFixed(1)}` : 
                     (day.usage - weeklyAverage).toFixed(1)}
                  </span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 text-xs text-gray-600">
            <p>Average: {weeklyAverage.toFixed(1)}L/day | Peak: {maxDailyUsage.toFixed(1)}L | Low: {minDailyUsage.toFixed(1)}L</p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
          <CardHeader><CardTitle className="text-base">Smart Insights</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-800 font-semibold">Efficient Usage</p>
                <p className="text-green-700 dark:text-green-400">You're consuming {((weeklyAverage / roDevice.dailyLimit) * 100).toFixed(0)}% of your daily limit on average.</p>
              </div>
            </div>
            
            {maxDailyUsage > roDevice.dailyLimit * 0.8 && (
              <div className="flex items-start p-3 bg-orange-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-orange-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-orange-800 font-semibold">Peak Usage Alert</p>
                  <p className="text-orange-700">Your highest usage day was {maxDailyUsage.toFixed(1)}L. Consider spreading usage.</p>
                </div>
              </div>
            )}
            
            <div className="flex items-start p-3 bg-blue-50 rounded-lg">
              <Droplets className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-800 font-semibold">Water Quality Trend</p>
                <p className="text-blue-700">Filter efficiency is at {Math.round(roDevice.filterLifeRemaining)}%. Plan for replacement soon.</p>
              </div>
            </div>
          </CardContent>
      </Card>
      
      <Button size="lg" className="w-full bg-blue-500 hover:bg-blue-600" onClick={handleShare}>
          <Share className="mr-2 h-4 w-4" /> Share Report
      </Button>
    </div>
  );
};
