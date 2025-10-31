import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Project {
  id: string;
  name: string;
  number: string | null;
  pm_name: string | null;
  status: string | null;
  last_sync_at: string | null;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, number, pm_name, status, last_sync_at')
      .order('name', { ascending: true });
    if (error) {
      toast.error("Failed to load projects");
    } else {
      setProjects(data || []);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSync = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('procore-sync');
      if (error) throw error;
      toast.success(`Sync completed! ${data.projectsCount} projects, ${data.commitmentsCount} commitments`);
      await fetchProjects();
    } catch (e: any) {
      toast.error(e.message || 'Sync failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">All construction projects</p>
        </div>
        <Button onClick={handleSync} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Syncing...' : 'Sync from Procore'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project List</CardTitle>
          <CardDescription>View and manage all active projects</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>PM Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Sync</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No projects found. Sync from Procore to get started.
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.number ?? '-'}</TableCell>
                    <TableCell>{p.pm_name ?? '-'}</TableCell>
                    <TableCell>{p.status ?? '-'}</TableCell>
                    <TableCell>{p.last_sync_at ? new Date(p.last_sync_at).toLocaleString() : '-'}</TableCell>
                    <TableCell className="text-right">—</TableCell>
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
