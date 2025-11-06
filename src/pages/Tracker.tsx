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
  title: string | null;
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
        .select('id, subcontractor_name, contract_value, status, last_updated_at, title')
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

  // Calculate total contract value for the selected project
  const totalContractValue = subcontracts.reduce((sum, sub) => {
    return sum + (sub.contract_value || 0);
  }, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Document Tracker</h1>
          <p className="text-muted-foreground mt-1">Excel-style tracking grid for F/G/H/COI/W-9 completion</p>
        </div>
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="w-[320px] border-border/50">
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{selectedProject?.name || 'Select a Project'}</CardTitle>
              <CardDescription className="text-sm mt-1.5">
                {subcontracts.length} {subcontracts.length === 1 ? 'subcontract' : 'subcontracts'}
                {totalContractValue > 0 && (
                  <span className="ml-2 font-semibold text-foreground">
                    • Total Value: ${totalContractValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 border-b">
                  <TableHead className="font-medium text-xs">Subcontractor</TableHead>
                  <TableHead className="font-medium text-xs">Title</TableHead>
                  <TableHead className="text-right font-medium text-xs">Contract Value</TableHead>
                  <TableHead className="text-center font-medium text-xs">Contract Status</TableHead>
                  <TableHead className="text-center font-medium text-xs border-l border-border/50">Att. F</TableHead>
                  <TableHead className="text-center font-medium text-xs">Att. G</TableHead>
                  <TableHead className="text-center font-medium text-xs">Att. H</TableHead>
                  <TableHead className="text-center font-medium text-xs">COI</TableHead>
                  <TableHead className="text-center font-medium text-xs">W-9</TableHead>
                  <TableHead className="font-medium text-xs">Last Updated</TableHead>
                  <TableHead className="text-right font-medium text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subcontracts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12">
                      <div className="text-muted-foreground">
                        <p className="text-lg font-medium">No subcontracts found</p>
                        <p className="text-sm mt-2">Select a different project or sync from Procore to load subcontracts</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  subcontracts.map((sub) => (
                    <TableRow key={sub.id} className="hover:bg-muted/20 border-b border-border/50">
                      <TableCell className="font-medium text-sm">{sub.subcontractor_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sub.title || '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {sub.contract_value ? `$${sub.contract_value.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={sub.status} type="subcontract" showIcon={false} />
                      </TableCell>
                      <TableCell className="text-center border-l border-border/50">
                        <StatusBadge status={getAttachmentStatus(sub.id, 'F')} type="attachment" showIcon={false} />
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={getAttachmentStatus(sub.id, 'G')} type="attachment" showIcon={false} />
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={getAttachmentStatus(sub.id, 'H')} type="attachment" showIcon={false} />
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={getAttachmentStatus(sub.id, 'COI')} type="attachment" showIcon={false} />
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={getAttachmentStatus(sub.id, 'W-9')} type="attachment" showIcon={false} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(sub.last_updated_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Upload documents">
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Attachment Status Legend</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-4">
              <div className="flex items-center gap-3">
                <StatusBadge status="Complete" type="attachment" showIcon={false} />
                <span className="text-sm text-muted-foreground">Document received and verified</span>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status="Pending Review" type="attachment" showIcon={false} />
                <span className="text-sm text-muted-foreground">Uploaded, awaiting validation</span>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status="Invalid" type="attachment" showIcon={false} />
                <span className="text-sm text-muted-foreground">Failed validation, needs correction</span>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status="Missing" type="attachment" showIcon={false} />
                <span className="text-sm text-muted-foreground">Not yet received</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Required Documents</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-3 text-sm">
              <div><strong className="font-medium">Attachment F:</strong> <span className="text-muted-foreground">Prevailing Wage Compliance</span></div>
              <div><strong className="font-medium">Attachment G:</strong> <span className="text-muted-foreground">List of Subcontractors/Suppliers</span></div>
              <div><strong className="font-medium">Attachment H:</strong> <span className="text-muted-foreground">Non-Collusion Affidavit</span></div>
              <div><strong className="font-medium">COI:</strong> <span className="text-muted-foreground">Certificate of Insurance</span></div>
              <div><strong className="font-medium">W-9:</strong> <span className="text-muted-foreground">Tax Information Form</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
