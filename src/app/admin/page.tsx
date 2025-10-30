
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Loader2, RefreshCw, Bot, User } from 'lucide-react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const ADMIN_PASSWORD = "Birendra555@";

interface NotificationLog {
    logId: string;
    customerId: string;
    sentAt: string;
    message: string;
    triggerType: 'auto' | 'manual';
}


const AdminDashboard = () => {
    const [isChecking, setIsChecking] = useState(false);
    const [checkResult, setCheckResult] = useState<any>(null);
    const { toast } = useToast();
    const [logs, setLogs] = useState<NotificationLog[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(true);

    const fetchLogs = async () => {
        setIsLoadingLogs(true);
        try {
            const response = await fetch('/api/get-notification-logs');
            if (!response.ok) throw new Error('Failed to fetch logs');
            const data = await response.json();
            setLogs(data);
        } catch (error) {
            console.error('Failed to fetch logs', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not load notification logs.',
            });
        } finally {
            setIsLoadingLogs(false);
        }
    };
    
    useEffect(() => {
        fetchLogs();
    }, []);

    const handleManualCheck = async () => {
        setIsChecking(true);
        try {
            const response = await fetch('/api/manual-notification-trigger');
            const data = await response.json();
            setCheckResult(data);
            fetchLogs(); // Refresh logs after manual trigger
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
        <div className="space-y-6">
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

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-base">Recent Notification Logs (Last 7 Days)</CardTitle>
                        <Button variant="ghost" size="icon" onClick={fetchLogs} disabled={isLoadingLogs}>
                           <RefreshCw className={`h-4 w-4 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoadingLogs ? (
                         <div className="flex justify-center items-center h-24">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : logs.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground">No notifications sent in the last 7 days.</p>
                    ) : (
                        <div className="max-h-96 overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Customer ID</TableHead>
                                        <TableHead>Message</TableHead>
                                        <TableHead>Trigger</TableHead>
                                        <TableHead className="text-right">Sent At</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map(log => (
                                        <TableRow key={log.logId}>
                                            <TableCell className="font-mono text-xs">{log.customerId}</TableCell>
                                            <TableCell className="text-xs">{log.message}</TableCell>
                                            <TableCell>
                                                <Badge variant={log.triggerType === 'auto' ? 'secondary' : 'default'} className="text-xs">
                                                     {log.triggerType === 'auto' ? <Bot className="mr-1 h-3 w-3"/> : <User className="mr-1 h-3 w-3"/>}
                                                    {log.triggerType}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right text-xs">{format(new Date(log.sentAt), "MMM d, h:mm a")}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
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
            <div className="w-full max-w-2xl">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl text-center">Admin Panel</CardTitle>
                        <CardDescription className="text-center">Drop Purity System Control</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!isAuthenticated ? (
                            <div className="space-y-4 max-w-md mx-auto">
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
