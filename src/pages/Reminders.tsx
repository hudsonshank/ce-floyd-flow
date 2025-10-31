import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StatusBadge } from "@/components/StatusBadge";
import { z } from "zod";

export default function Reminders() {
  const [fromEmail, setFromEmail] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserProfile();
    loadReminders();
  }, []);

  const loadUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", user.id)
        .single();
      
      if (profile) {
        setFromEmail(profile.email);
      }
    }
  };

  const loadReminders = async () => {
    const { data } = await supabase
      .from("reminders")
      .select(`
        *,
        subcontracts (
          subcontractor_name,
          projects (name)
        )
      `)
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (data) {
      setReminders(data);
    }
  };

  const handleSendReminder = async () => {
    // Validate inputs using zod schema
    const reminderSchema = z.object({
      to_email: z
        .string()
        .email("Invalid email address")
        .max(255, "Email must be less than 255 characters"),
      subject: z
        .string()
        .min(1, "Subject is required")
        .max(200, "Subject must be less than 200 characters")
        .refine((s) => !s.includes('\n') && !s.includes('\r'), {
          message: "Subject cannot contain newline characters",
        }),
      body: z
        .string()
        .min(1, "Message is required")
        .max(5000, "Message must be less than 5000 characters"),
    });

    try {
      // Validate all inputs
      const validated = reminderSchema.parse({
        to_email: toEmail,
        subject: subject,
        body: body,
      });

      setLoading(true);

      // Create reminder record (email sending will be implemented later)
      const { error } = await supabase
        .from("reminders")
        .insert({
          from_email: fromEmail,
          to_email: validated.to_email,
          subject: validated.subject,
          body: validated.body,
          send_status: "queued",
          subcontract_id: null, // Will be linked when sending from Tracker
        });

      if (error) throw error;

      toast.success("Reminder queued successfully");
      setToEmail("");
      setSubject("");
      setBody("");
      loadReminders();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        // Show the first validation error
        const firstError = error.errors[0];
        toast.error(firstError.message);
      } else {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

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
            <Label htmlFor="from">From Email</Label>
            <Input 
              id="from" 
              value={fromEmail} 
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Auto-populated from your profile
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="to">To Email</Label>
            <Input 
              id="to" 
              placeholder="subcontractor@example.com"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input 
              id="subject" 
              placeholder="Missing Documents Required - [Project Name]"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea 
              id="body" 
              placeholder="Dear [Subcontractor],&#10;&#10;We are missing the following documents for [Project Name]:&#10;- F (Federal Tax Form)&#10;- COI (Certificate of Insurance)&#10;&#10;Please submit these at your earliest convenience.&#10;&#10;Thank you,"
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleSendReminder} disabled={loading}>
              <Send className="h-4 w-4 mr-2" />
              {loading ? "Sending..." : "Send Reminder"}
            </Button>
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
              {reminders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    No reminders sent yet
                  </TableCell>
                </TableRow>
              ) : (
                reminders.map((reminder) => (
                  <TableRow key={reminder.id}>
                    <TableCell>
                      {new Date(reminder.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{reminder.to_email}</TableCell>
                    <TableCell>{reminder.subject}</TableCell>
                    <TableCell>
                      {reminder.subcontracts?.projects?.name || "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={reminder.send_status} type="send_status" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
