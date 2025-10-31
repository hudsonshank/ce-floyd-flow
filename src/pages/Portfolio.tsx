import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, FileText, CheckCircle2, AlertTriangle } from "lucide-react";

export default function Portfolio() {
  const tiles = [
    {
      title: "Active Projects",
      value: "0",
      description: "Currently tracked",
      icon: FolderKanban,
      color: "text-primary",
    },
    {
      title: "Total Contracts",
      value: "0",
      description: "Across all projects",
      icon: FileText,
      color: "text-accent",
    },
    {
      title: "Complete Attachments",
      value: "0%",
      description: "All documents received",
      icon: CheckCircle2,
      color: "text-success",
    },
    {
      title: "Projects at Risk",
      value: "0",
      description: "≥2 missing/invalid items",
      icon: AlertTriangle,
      color: "text-warning",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Portfolio Dashboard</h1>
        <p className="text-muted-foreground">Company-wide contract tracking overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.title} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{tile.title}</CardTitle>
              <tile.icon className={`h-4 w-4 ${tile.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tile.value}</div>
              <p className="text-xs text-muted-foreground">{tile.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates across all projects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p>No projects synced yet</p>
            <p className="text-sm mt-2">Connect to Procore in Settings to begin tracking</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
