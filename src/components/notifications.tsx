
"use client";

import { useState } from 'react';
import type { FC } from 'react';
import { summarizeAlerts, type SummarizeAlertsInput } from '@/ai/flows/summarize-alerts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Alert as AlertType } from '@/lib/types';
import { AlertCircle, Info, Sparkles, XCircle, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';

interface NotificationsProps {
  notifications: AlertType[];
}

const alertConfig = {
  error: {
    icon: XCircle,
    className: "bg-red-50 border-red-400 text-red-800",
    buttonClass: "bg-red-600 hover:bg-red-700 text-white",
  },
  warning: {
    icon: TriangleAlert,
    className: "bg-orange-50 border-orange-400 text-orange-800",
    buttonClass: "bg-orange-600 hover:bg-orange-700 text-white",
  },
  info: {
    icon: Info,
    className: "bg-blue-50 border-blue-400 text-blue-800",
    buttonClass: "bg-blue-600 hover:bg-blue-700 text-white",
  },
};

export function Notifications({ notifications }: NotificationsProps) {
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSummarize = async () => {
    if (notifications.length === 0) return;
    setIsLoading(true);
    setError('');
    setSummary('');
    try {
      const result = await summarizeAlerts(notifications as SummarizeAlertsInput);
      setSummary(result.summary);
    } catch (e) {
      setError('Failed to generate summary.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
        {summary && (
          <div className="mt-2 p-3 bg-primary/10 rounded-lg">
            <h4 className="font-semibold text-primary flex items-center mb-1">
                <Sparkles className="h-4 w-4 mr-2" />
                AI Summary
            </h4>
            <p className="text-sm text-foreground/80">{summary}</p>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        
        {notifications.map((notification, index) => {
          const config = alertConfig[notification.type];
          const Icon = config.icon;
          return (
            <div key={index} className={cn("border-l-4 p-3 rounded-r-lg", config.className)}>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Icon className="w-5 h-5 mr-3 shrink-0" />
                  <span className="text-sm font-medium">{notification.message}</span>
                </div>
                <Button size="sm" className={cn("text-xs h-7", config.buttonClass)}>
                  {notification.action}
                </Button>
              </div>
            </div>
          );
        })}
        {notifications.length > 1 && (
            <Button size="sm" onClick={handleSummarize} disabled={isLoading} className="w-full">
              <Sparkles className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
              {isLoading ? 'Summarizing...' : 'Summarize Alerts with AI'}
            </Button>
          )}
    </div>
  );
}
