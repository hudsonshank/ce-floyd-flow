import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function Subcontracts() {
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
            <Input placeholder="Search subcontracts..." className="pl-10" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Subcontractor</TableHead>
                <TableHead>Contract Value</TableHead>
                <TableHead>Contract Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Missing Items</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No subcontracts found. Sync projects from Procore first.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
