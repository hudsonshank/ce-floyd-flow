import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Project {
  id: string;
  name: string;
}

interface Subcontract {
  id: string;
  subcontractor_name: string;
  contract_value: number | null;
  status: string;
  last_updated_at: string;
  missing_count: number;
}

interface Attachment {
  id: string;
  type: string;
  status: string;
  subcontract_id: string;
}

export default function Tracker() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [subcontracts, setSubcontracts] = useState<Subcontract[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  useEffect(() => {
    const loadProjects = async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, name')
        .order('name', { ascending: true });
      setProjects(data || []);
      if (data && data.length > 0) {
        setSelectedProjectId(data[0].id);
      }
    };
    loadProjects();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    
    const loadSubcontracts = async () => {
      const { data: subsData } = await supabase
        .from('subcontracts')
        .select('id, subcontractor_name, contract_value, status, last_updated_at, missing_count')
        .eq('project_id', selectedProjectId)
        .order('subcontractor_name', { ascending: true });
      
      setSubcontracts(subsData || []);

      if (subsData && subsData.length > 0) {
        const subIds = subsData.map(s => s.id);
        const { data: attData } = await supabase
          .from('attachments')
          .select('id, type, status, subcontract_id')
          .in('subcontract_id', subIds);
        setAttachments(attData || []);
      } else {
        setAttachments([]);
      }
    };

    loadSubcontracts();
  }, [selectedProjectId]);

  const getAttachmentStatus = (subId: string, docType: string) => {
    const att = attachments.find(a => a.subcontract_id === subId && a.type === docType);
    return att?.status || 'Missing';
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Document Tracker</h1>
        <p className="text-muted-foreground">Track F/G/H/COI/W-9 completion by subcontract</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Project: {selectedProject?.name || 'Select a Project'}</CardTitle>
              <CardDescription>Excel-style tracking grid for document completion</CardDescription>
            </div>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subcontractor</TableHead>
                  <TableHead className="text-right">Contract $</TableHead>
                  <TableHead className="text-center">F</TableHead>
                  <TableHead className="text-center">G</TableHead>
                  <TableHead className="text-center">H</TableHead>
                  <TableHead className="text-center">COI</TableHead>
                  <TableHead className="text-center">W-9</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Update</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subcontracts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12">
                      <div className="text-muted-foreground">
                        <p>No subcontracts to track</p>
                        <p className="text-sm mt-2">Select a project or sync from Procore</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  subcontracts.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.subcontractor_name}</TableCell>
                      <TableCell className="text-right">
                        {sub.contract_value ? `$${sub.contract_value.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={getAttachmentStatus(sub.id, 'F')} type="attachment" />
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={getAttachmentStatus(sub.id, 'G')} type="attachment" />
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={getAttachmentStatus(sub.id, 'H')} type="attachment" />
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={getAttachmentStatus(sub.id, 'COI')} type="attachment" />
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={getAttachmentStatus(sub.id, 'W-9')} type="attachment" />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={sub.status} type="subcontract" />
                      </TableCell>
                      <TableCell>{new Date(sub.last_updated_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Upload className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Document Types Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
            <div className="flex items-center gap-2">
              <StatusBadge status="Complete" type="attachment" />
              <span className="text-sm">Document received & verified</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status="Pending Review" type="attachment" />
              <span className="text-sm">Needs validation</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status="Missing" type="attachment" />
              <span className="text-sm">Not yet received</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status="Invalid" type="attachment" />
              <span className="text-sm">Failed validation</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
