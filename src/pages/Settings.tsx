import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Link as LinkIcon, Mail, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export default function Settings() {
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    checkProcoreConnection();
    
    // Check for OAuth callback status
    const params = new URLSearchParams(window.location.search);
    if (params.get('procore') === 'connected') {
      toast.success("Successfully connected to Procore!");
      setIsConnected(true);
      window.history.replaceState({}, '', '/settings');
    } else if (params.get('procore') === 'error') {
      toast.error("Failed to connect to Procore");
      window.history.replaceState({}, '', '/settings');
    }
  }, []);

  const checkProcoreConnection = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('procore_access_token')
        .single();
      
      setIsConnected(!!profile?.procore_access_token);
    } catch (error) {
      console.error('Error checking Procore connection:', error);
    }
  };

  const handleConnectProcore = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('procore-auth');
      
      if (error) throw error;
      
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error: any) {
      console.error('Error initiating Procore OAuth:', error);
      toast.error(error.message || "Failed to connect to Procore");
    }
  };

  const handleRunSync = async () => {
    if (!isConnected) {
      toast.error("Please connect to Procore first");
      return;
    }

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('procore-sync');
      
      if (error) throw error;
      
      toast.success(`Sync completed! ${data.projectsCount} projects and ${data.commitmentsCount} commitments synced`);
    } catch (error: any) {
      console.error('Error syncing from Procore:', error);
      toast.error(error.message || "Failed to sync from Procore");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure Procore integration and system preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Procore Integration</CardTitle>
          <CardDescription>Connect to Procore to sync projects and commitments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <p className="font-medium">Connection Status</p>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <p className="text-sm text-muted-foreground">Connected</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Not Connected</p>
                )}
              </div>
            </div>
            {!isConnected && (
              <Button onClick={handleConnectProcore}>
                <LinkIcon className="h-4 w-4 mr-2" />
                Connect to Procore
              </Button>
            )}
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <Label htmlFor="company-id">Procore Company ID</Label>
              <Input id="company-id" placeholder="Enter your Procore company ID" />
              <p className="text-xs text-muted-foreground mt-1">
                Found in your Procore account settings
              </p>
            </div>

            <Button 
              onClick={handleRunSync} 
              variant="outline" 
              className="w-full"
              disabled={!isConnected || isSyncing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Run Procore Sync Now'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Configuration</CardTitle>
          <CardDescription>Configure SMTP settings for sending reminders</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="smtp-host">SMTP Host</Label>
            <Input id="smtp-host" placeholder="smtp.gmail.com" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp-port">SMTP Port</Label>
              <Input id="smtp-port" placeholder="587" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-user">SMTP Username</Label>
              <Input id="smtp-user" placeholder="your-email@example.com" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="from-email">From Email</Label>
            <Input id="from-email" placeholder="contracts@yourdomain.com" />
          </div>

          <Button variant="outline" className="w-full">
            <Mail className="h-4 w-4 mr-2" />
            Save Email Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Auto-Reminder Settings</CardTitle>
          <CardDescription>Configure automated reminder cadence</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cadence">Reminder Cadence (days)</Label>
            <Input id="cadence" type="number" placeholder="3" defaultValue="3" />
            <p className="text-xs text-muted-foreground">
              Send reminders every N days for incomplete items
            </p>
          </div>

          <Button variant="outline" className="w-full">
            Save Auto-Reminder Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
