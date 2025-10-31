import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Link as LinkIcon, Mail } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const handleConnectProcore = () => {
    toast.info("Procore OAuth integration pending");
  };

  const handleRunSync = () => {
    toast.info("Sync feature will be activated after Procore connection");
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
              <p className="text-sm text-muted-foreground">Not Connected</p>
            </div>
            <Button onClick={handleConnectProcore}>
              <LinkIcon className="h-4 w-4 mr-2" />
              Connect to Procore
            </Button>
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

            <Button onClick={handleRunSync} variant="outline" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Run Procore Sync Now
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
