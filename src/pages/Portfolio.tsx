import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, FileText, CheckCircle2, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Portfolio() {
  const [activeProjects, setActiveProjects] = useState<number>(0);
  const [totalContracts, setTotalContracts] = useState<number>(0);
  const [completeAttachmentsPct, setCompleteAttachmentsPct] = useState<number>(0);
  const [projectsAtRisk, setProjectsAtRisk] = useState<number>(0);

  useEffect(() => {
    const loadStats = async () => {
      // Active projects (visible to current user per RLS)
      const { count: activeCount } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Active');
      setActiveProjects(activeCount ?? 0);

      // Total contracts (subcontracts)
      const { count: subsCount } = await supabase
        .from('subcontracts')
        .select('id', { count: 'exact', head: true });
      setTotalContracts(subsCount ?? 0);

      // Attachments completion % (best-effort; may be 0 if none accessible yet)
      const [{ count: totalAtt } , { count: completeAtt }] = await Promise.all([
        supabase.from('attachments').select('id', { count: 'exact', head: true }),
        supabase.from('attachments').select('id', { count: 'exact', head: true }).eq('status', 'Complete'),
      ]);
      const pct = totalAtt && totalAtt > 0 ? Math.round(((completeAtt ?? 0) / totalAtt) * 100) : 0;
      setCompleteAttachmentsPct(pct);

      // Projects at risk: projects with any subcontract missing_count >= 2
      const { data: riskySubs } = await supabase
        .from('subcontracts')
        .select('project_id, missing_count')
        .gte('missing_count', 2);
      const risky = new Set((riskySubs ?? []).map((s) => s.project_id));
      setProjectsAtRisk(risky.size);
    };

    loadStats();
  }, []);

  const tiles = [
    {
      title: "Active Projects",
      value: String(activeProjects),
      description: "Currently tracked",
      icon: FolderKanban,
      color: "text-primary",
    },
    {
      title: "Total Contracts",
      value: String(totalContracts),
      description: "Across all projects",
      icon: FileText,
      color: "text-accent",
    },
    {
      title: "Complete Attachments",
      value: `${completeAttachmentsPct}%`,
      description: "All documents received",
      icon: CheckCircle2,
      color: "text-success",
    },
    {
      title: "Projects at Risk",
      value: String(projectsAtRisk),
      description: "≥2 missing/invalid items",
      icon: AlertTriangle,
      color: "text-warning",
    },
  ];

  const hasProjects = activeProjects > 0 || totalContracts > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Portfolio Dashboard</h1>
        <p className="text-muted-foreground mt-1">Company-wide contract tracking overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.title} className="transition-all hover:shadow-md border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{tile.title}</CardTitle>
              <div className={`p-2 rounded-md bg-muted/50`}>
                <tile.icon className={`h-4 w-4 ${tile.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{tile.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{tile.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-xl">Recent Activity</CardTitle>
          <CardDescription>Latest updates across all projects</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {hasProjects ? (
            <div className="text-sm text-muted-foreground">Data synced. Explore Projects and Subcontracts pages for details.</div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No projects synced yet</p>
              <p className="text-sm text-muted-foreground/70 mt-2">Connect to Procore in Settings to begin tracking</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
