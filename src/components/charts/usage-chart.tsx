
"use client";

import type { FC } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { UsageData } from '@/lib/types';
import { cn } from '@/lib/utils';

interface UsageChartProps {
  usageHistory: UsageData[];
  maxDailyUsage: number;
  weeklyAverage: number;
}

export const UsageChart: FC<UsageChartProps> = ({ usageHistory, maxDailyUsage, weeklyAverage }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Weekly Usage Pattern</CardTitle>
        <CardDescription>Average: {weeklyAverage.toFixed(1)}L/day | Peak: {maxDailyUsage.toFixed(1)}L</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {usageHistory.map((day, index) => {
            const percentage = maxDailyUsage > 0 ? (day.usage / maxDailyUsage) * 100 : 0;
            const isToday = new Date(day.date).getDay() === (new Date().getDay() + 6) % 7;
            const barColor = isToday ? 'bg-primary' : day.usage > weeklyAverage ? 'bg-accent' : 'bg-green-500';

            return (
              <div key={day.day} className="flex items-center group">
                <span className={cn("w-10 text-sm font-medium text-muted-foreground", isToday && "text-primary font-bold")}>
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
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
