import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Send } from "lucide-react";

export default function Reminders() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reminders</h1>
        <p className="text-muted-foreground">Send and track reminder emails to subcontractors</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compose Reminder</CardTitle>
          <CardDescription>Send reminder for missing or invalid documents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="to">To Email</Label>
            <Input id="to" placeholder="subcontractor@example.com" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" placeholder="Missing Documents Required - [Project Name]" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea 
              id="body" 
              placeholder="Dear [Subcontractor],&#10;&#10;We are missing the following documents for [Project Name]:&#10;- F (Federal Tax Form)&#10;- COI (Certificate of Insurance)&#10;&#10;Please submit these at your earliest convenience.&#10;&#10;Thank you,"
              rows={8}
            />
          </div>
          
          <div className="flex gap-2">
            <Button>
              <Send className="h-4 w-4 mr-2" />
              Send Reminder
            </Button>
            <Button variant="outline">Save as Draft</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reminder History</CardTitle>
          <CardDescription>Previously sent reminders</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  No reminders sent yet
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
