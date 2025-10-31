import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle, XCircle } from "lucide-react";

type Status = "Complete" | "Pending Review" | "Missing" | "Invalid";

interface StatusBadgeProps {
  status: Status;
  showIcon?: boolean;
}

export function StatusBadge({ status, showIcon = true }: StatusBadgeProps) {
  const config = {
    Complete: {
      variant: "default" as const,
      icon: CheckCircle2,
      className: "bg-success text-success-foreground hover:bg-success/90",
    },
    "Pending Review": {
      variant: "secondary" as const,
      icon: Clock,
      className: "bg-warning text-warning-foreground hover:bg-warning/90",
    },
    Missing: {
      variant: "destructive" as const,
      icon: AlertCircle,
      className: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    },
    Invalid: {
      variant: "destructive" as const,
      icon: XCircle,
      className: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    },
  };

  const { icon: Icon, className } = config[status];

  return (
    <Badge className={className}>
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {status}
    </Badge>
  );
}
