"use client";

import type { FC } from 'react';
import { RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface WaterUsageSimulatorProps {
  addWaterUsage: (liters: number) => void;
  lastUpdated: Date;
  handleRefresh: () => void;
  isLoading: boolean;
}

export const WaterUsageSimulator: FC<WaterUsageSimulatorProps> = ({ addWaterUsage, lastUpdated, handleRefresh, isLoading }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add Water Usage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2">
          {[0.5, 1, 2, 5].map(amount => (
            <Button
              key={amount}
              onClick={() => addWaterUsage(amount)}
              variant="outline"
            >
              +{amount}L
            </Button>
          ))}
        </div>
        <div className="mt-3 flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="ghost"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
