"use client";

import type { FC } from 'react';
import { User } from 'lucide-react';
import { useRoData } from '@/hooks/use-ro-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getDaysElapsed } from '@/lib/helpers';
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type ProfileTabProps = ReturnType<typeof useRoData>;

export const ProfileTab: FC<ProfileTabProps> = ({ roDevice, setRoDevice }) => {
  const { toast } = useToast();
  const daysElapsed = getDaysElapsed(roDevice.startDate);
  const dailyAverage = daysElapsed > 0 ? roDevice.totalLiters / daysElapsed : 0;

  const handleExtendRental = () => {
    const extendedDate = new Date(roDevice.endDate);
    extendedDate.setFullYear(extendedDate.getFullYear() + 1);
    setRoDevice(prev => ({
      ...prev,
      endDate: extendedDate.toISOString().split('T')[0]
    }));
    toast({ title: "Rental Extended", description: "Your plan has been extended by 1 year!" });
  };
  
  const handleEndRental = () => {
    toast({ title: "Request Submitted", description: "Rental termination request submitted. We will contact you soon." });
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">My Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-6">
            <div className="bg-primary rounded-full w-16 h-16 flex items-center justify-center">
              <User className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-lg text-foreground">John Doe</h3>
              <p className="text-sm text-muted-foreground">Customer ID: DP-2024-001</p>
              <p className="text-sm text-green-600 font-medium">Premium Member</p>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Email</span><span className="font-medium">john.doe@email.com</span></div>
            <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Phone</span><span className="font-medium">+91 9876543210</span></div>
            <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Address</span><span className="font-medium text-right">123 Main St, City, State 12345</span></div>
            <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Member Since</span><span className="font-medium">{new Date(roDevice.startDate).toLocaleDateString()}</span></div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle className="text-base">Account Statistics</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-primary/10 rounded-lg">
            <p className="text-2xl font-bold text-primary">{Math.round(roDevice.totalLiters)}</p>
            <p className="text-xs text-primary/80">Total Liters</p>
          </div>
          <div className="text-center p-3 bg-green-500/10 rounded-lg">
            <p className="text-2xl font-bold text-green-700">{dailyAverage.toFixed(1)}</p>
            <p className="text-xs text-green-600/80">Daily Average (L)</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Button className="w-full" onClick={() => toast({ description: "Profile editing coming soon!" })}>Edit Profile</Button>
        <Button variant="outline" className="w-full" onClick={handleExtendRental}>Extend Rental</Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">End Rental</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. Ending your rental will schedule a device pickup and deactivate your account at the end of the current billing cycle.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleEndRental}>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};
