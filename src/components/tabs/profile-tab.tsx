
"use client";

import type { FC } from 'react';
import { LogOut, User as UserIcon } from 'lucide-react';
import { useRoData } from '@/hooks/use-ro-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getDaysElapsed } from '@/lib/helpers';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  const { user, signOut, customerData } = useAuth();
  const daysElapsed = roDevice.startDate ? getDaysElapsed(roDevice.startDate) : 0;
  const dailyAverage = daysElapsed > 0 ? roDevice.totalLiters / daysElapsed : 0;

  const handleExtendRental = () => {
    if (!roDevice.endDate) return;
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
  
  const handleEditProfile = () => {
      toast({ title: "Coming Soon!", description: "Profile editing feature will be available soon."})
  }

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">My Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-6">
            <Avatar className="w-16 h-16 bg-primary text-white flex items-center justify-center">
              <AvatarImage src={user?.photoURL ?? undefined} alt={user?.displayName ?? "User"} />
              <AvatarFallback>
                <UserIcon className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>
            <div className="ml-4">
              <h3 className="font-semibold text-lg text-foreground">{customerData?.customerName || user?.displayName}</h3>
              <p className="text-sm text-muted-foreground">ID: {customerData?.generatedCustomerId}</p>
              <p className="text-sm text-green-600">{customerData?.currentPlanName || 'Premium Member'}</p>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Email</span><span className="font-medium">{user?.email}</span></div>
            <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Phone</span><span className="font-medium">{customerData?.customerPhone}</span></div>
            <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Address</span><span className="font-medium">{customerData?.customerAddress}</span></div>
            <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Plan Status</span><span className="font-medium uppercase">{customerData?.planStatus}</span></div>
            <div className="flex justify-between py-2 border-b"><span className="text-muted-foreground">Member Since</span><span className="font-medium">{customerData?.registeredAt ? new Date(customerData.registeredAt).toLocaleDateString() : '-'}</span></div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle className="text-base">Account Statistics</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50/50 rounded-lg">
            <p className="text-2xl font-bold text-primary">{Math.round(roDevice.totalLiters)}L</p>
            <p className="text-xs text-primary/80">Total Usage</p>
          </div>
          <div className="text-center p-3 bg-green-50/50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{dailyAverage.toFixed(1)}L</p>
            <p className="text-xs text-green-700/80">Daily Average</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Button className="w-full" onClick={handleEditProfile}>Edit Profile</Button>
        <Button variant="outline" className="w-full border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700" onClick={handleExtendRental}>Extend Plan</Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full border border-red-300 bg-transparent text-red-600 hover:bg-red-50">End Plan</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. Ending your plan will schedule a device pickup and deactivate your account at the end of the current billing cycle.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleEndRental}>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button variant="ghost" className="w-full" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Button>
      </div>
    </div>
  );
};
