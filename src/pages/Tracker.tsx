import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export default function Tracker() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Document Tracker</h1>
        <p className="text-muted-foreground">Track F/G/H/COI/W-9 completion by subcontract</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project: Select a Project</CardTitle>
          <CardDescription>Excel-style tracking grid for document completion</CardDescription>
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
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12">
                    <div className="text-muted-foreground">
                      <p>No subcontracts to track</p>
                      <p className="text-sm mt-2">Select a project or sync from Procore</p>
                    </div>
                  </TableCell>
                </TableRow>
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
