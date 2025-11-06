import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, FileText, CheckCircle2, AlertTriangle, Clock, TrendingUp, DollarSign } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ProjectRisk {
  id: string;
  name: string;
  missingCount: number;
  totalContracts: number;
  contractValue: number;
}

interface IncompleteSubcontract {
  id: string;
  subcontractor_name: string;
  project_name: string;
  missing_count: number;
  status: string;
  contract_value: number | null;
}

export default function Portfolio() {
  const navigate = useNavigate();
  const [activeProjects, setActiveProjects] = useState<number>(0);
  const [totalContracts, setTotalContracts] = useState<number>(0);
  const [completeAttachmentsPct, setCompleteAttachmentsPct] = useState<number>(0);
  const [projectsAtRisk, setProjectsAtRisk] = useState<number>(0);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [pendingReview, setPendingReview] = useState<number>(0);
  const [riskyProjects, setRiskyProjects] = useState<ProjectRisk[]>([]);
  const [incompleteContracts, setIncompleteContracts] = useState<IncompleteSubcontract[]>([]);

  useEffect(() => {
    const loadStats = async () => {
      // Active projects
      const { count: activeCount } = await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Active');
      setActiveProjects(activeCount ?? 0);

      // Total contracts and total value
      const { data: allSubs } = await supabase
        .from('subcontracts')
        .select('contract_value');
      setTotalContracts(allSubs?.length ?? 0);
      const total = allSubs?.reduce((sum, sub) => sum + (sub.contract_value || 0), 0) ?? 0;
      setTotalValue(total);

      // Attachments completion %
      const [{ count: totalAtt }, { count: completeAtt }] = await Promise.all([
        supabase.from('attachments').select('id', { count: 'exact', head: true }),
        supabase.from('attachments').select('id', { count: 'exact', head: true }).eq('status', 'Complete'),
      ]);
      const pct = totalAtt && totalAtt > 0 ? Math.round(((completeAtt ?? 0) / totalAtt) * 100) : 0;
      setCompleteAttachmentsPct(pct);

      // Pending review count
      const { count: pendingCount } = await supabase
        .from('attachments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Pending Review');
      setPendingReview(pendingCount ?? 0);

      // Projects at risk with details
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name')
        .eq('status', 'Active');

      const projectRisks: ProjectRisk[] = [];
      if (projectsData) {
        for (const project of projectsData) {
          const { data: subs } = await supabase
            .from('subcontracts')
            .select('id, contract_value')
            .eq('project_id', project.id);

          if (subs && subs.length > 0) {
            const { data: missingAttachments } = await supabase
              .from('attachments')
              .select('subcontract_id')
              .in('subcontract_id', subs.map(s => s.id))
              .in('status', ['Missing', 'Invalid']);

            const missingCount = missingAttachments?.length ?? 0;
            if (missingCount >= 2) {
              projectRisks.push({
                id: project.id,
                name: project.name,
                missingCount,
                totalContracts: subs.length,
                contractValue: subs.reduce((sum, s) => sum + (s.contract_value || 0), 0),
              });
            }
          }
        }
      }
      setRiskyProjects(projectRisks.sort((a, b) => b.missingCount - a.missingCount).slice(0, 5));
      setProjectsAtRisk(projectRisks.length);

      // Incomplete subcontracts needing attention
      const { data: incompleteSubs } = await supabase
        .from('subcontracts')
        .select(`
          id,
          subcontractor_name,
          status,
          contract_value,
          projects!inner(name)
        `)
        .neq('status', 'Complete')
        .order('last_updated_at', { ascending: false })
        .limit(10);

      if (incompleteSubs) {
        const subsWithMissing = await Promise.all(
          incompleteSubs.map(async (sub: any) => {
            const { count } = await supabase
              .from('attachments')
              .select('id', { count: 'exact', head: true })
              .eq('subcontract_id', sub.id)
              .in('status', ['Missing', 'Invalid']);

            return {
              id: sub.id,
              subcontractor_name: sub.subcontractor_name,
              project_name: sub.projects.name,
              missing_count: count ?? 0,
              status: sub.status,
              contract_value: sub.contract_value,
            };
          })
        );

        setIncompleteContracts(
          subsWithMissing
            .filter(s => s.missing_count > 0)
            .sort((a, b) => b.missing_count - a.missing_count)
            .slice(0, 8)
        );
      }
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
      title: "Total Contract Value",
      value: `$${(totalValue / 1000000).toFixed(1)}M`,
      description: `${totalContracts} contracts`,
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      title: "Documents Complete",
      value: `${completeAttachmentsPct}%`,
      description: "All attachments verified",
      icon: CheckCircle2,
      color: "text-success",
    },
    {
      title: "Needs Attention",
      value: String(pendingReview + incompleteContracts.length),
      description: "Review & missing docs",
      icon: AlertTriangle,
      color: "text-warning",
    },
  ];

  const hasProjects = activeProjects > 0 || totalContracts > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Portfolio Dashboard</h1>
        <p className="text-muted-foreground mt-1">Real-time insights across all active projects</p>
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

      {!hasProjects ? (
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground">No projects synced yet</p>
              <p className="text-sm text-muted-foreground/70 mt-2">Connect to Procore in Settings to begin tracking</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Projects at Risk */}
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Projects at Risk</CardTitle>
                    <CardDescription className="mt-1">Projects with missing/invalid documents</CardDescription>
                  </div>
                  {projectsAtRisk > 0 && (
                    <div className="flex items-center gap-1 text-xs text-destructive font-medium bg-destructive/10 px-2 py-1 rounded">
                      <AlertTriangle className="h-3 w-3" />
                      {projectsAtRisk} at risk
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {riskyProjects.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">All projects on track!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {riskyProjects.map((project) => (
                      <div
                        key={project.id}
                        className="flex items-start justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => navigate('/tracker')}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{project.name}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{project.totalContracts} contracts</span>
                            <span>•</span>
                            <span>${(project.contractValue / 1000).toFixed(0)}K</span>
                          </div>
                        </div>
                        <div className="ml-3 flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 px-2 py-1 rounded whitespace-nowrap">
                          <AlertTriangle className="h-3 w-3" />
                          {project.missingCount} missing
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Items */}
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Action Required</CardTitle>
                    <CardDescription className="mt-1">Contracts needing your attention</CardDescription>
                  </div>
                  {pendingReview > 0 && (
                    <div className="flex items-center gap-1 text-xs text-warning font-medium bg-warning/10 px-2 py-1 rounded">
                      <Clock className="h-3 w-3" />
                      {pendingReview} pending
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {incompleteContracts.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No action items!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {incompleteContracts.slice(0, 5).map((contract) => (
                      <div
                        key={contract.id}
                        className="flex items-start justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => navigate('/tracker')}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{contract.subcontractor_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground truncate">{contract.project_name}</p>
                            <StatusBadge status={contract.status} type="subcontract" showIcon={false} />
                          </div>
                        </div>
                        <div className="ml-3 flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 px-2 py-1 rounded whitespace-nowrap">
                          {contract.missing_count} missing
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Key Insights */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Key Insights</CardTitle>
              <CardDescription>Quick stats and recommendations</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Completion Rate</span>
                  </div>
                  <p className="text-2xl font-bold">{completeAttachmentsPct}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {completeAttachmentsPct >= 75 ? 'On track' : 'Needs improvement'}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-warning" />
                    <span className="text-sm font-medium">Pending Review</span>
                  </div>
                  <p className="text-2xl font-bold">{pendingReview}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pendingReview > 0 ? 'Documents awaiting review' : 'All caught up!'}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium">High Priority</span>
                  </div>
                  <p className="text-2xl font-bold">{incompleteContracts.filter(c => c.missing_count >= 3).length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Contracts with 3+ missing docs
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
