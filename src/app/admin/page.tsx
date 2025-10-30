'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const ADMIN_PASSWORD = "Birendra555@";

const AdminDashboard = () => {
    const [isChecking, setIsChecking] = useState(false);
    const [checkResult, setCheckResult] = useState<any>(null);
    const { toast } = useToast();

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

    return (
        <div>
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Admin Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" className="w-full" onClick={handleManualCheck} disabled={isChecking}>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        {isChecking ? 'Checking...' : 'Run Manual Expiry Check'}
                    </Button>
                     <p className="text-xs text-muted-foreground mt-2 text-center">
                        This will trigger the expiry alert check for all customers.
                    </p>
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
    )
}


export default function AdminPage() {
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = () => {
        if (password === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            setError('');
        } else {
            setError('Incorrect password.');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <div className="w-full max-w-md">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl text-center">Admin Panel</CardTitle>
                        <CardDescription className="text-center">Drop Purity System Control</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!isAuthenticated ? (
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                                    />
                                </div>
                                <Button onClick={handleLogin} className="w-full">
                                    Login
                                </Button>
                                {error && <p className="text-sm text-destructive text-center">{error}</p>}
                            </div>
                        ) : (
                            <AdminDashboard />
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
