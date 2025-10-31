import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Subcontract {
  id: string;
  title: string | null;
  number: string | null;
  subcontractor_name: string;
  contract_value: number | null;
  contract_date: string | null;
  status: string;
  missing_count: number;
  projects: {
    name: string;
  };
}

export default function Subcontracts() {
  const [subcontracts, setSubcontracts] = useState<Subcontract[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const loadSubcontracts = async () => {
      const { data } = await supabase
        .from('subcontracts')
        .select('id, title, number, subcontractor_name, contract_value, contract_date, status, missing_count, projects(name)')
        .order('subcontractor_name', { ascending: true });
      
      setSubcontracts(data || []);
    };

    loadSubcontracts();
  }, []);

  const filteredSubcontracts = subcontracts.filter(sub => 
    sub.subcontractor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.projects.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subcontracts</h1>
        <p className="text-muted-foreground">All subcontractor agreements</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subcontract List</CardTitle>
          <CardDescription>View all subcontracts across projects</CardDescription>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search subcontracts..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Subcontractor</TableHead>
                <TableHead>Title/Number</TableHead>
                <TableHead className="text-right">Contract Value</TableHead>
                <TableHead>Contract Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Missing Items</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubcontracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    {searchTerm ? 'No subcontracts match your search.' : 'No subcontracts found. Sync projects from Procore first.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubcontracts.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.projects.name}</TableCell>
                    <TableCell>{sub.subcontractor_name}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {sub.title && <div className="font-medium">{sub.title}</div>}
                        {sub.number && <div className="text-muted-foreground">{sub.number}</div>}
                        {!sub.title && !sub.number && '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {sub.contract_value ? `$${sub.contract_value.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell>
                      {sub.contract_date ? new Date(sub.contract_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={sub.status} type="subcontract" />
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={sub.missing_count > 0 ? "text-destructive font-medium" : ""}>
                        {sub.missing_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
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
