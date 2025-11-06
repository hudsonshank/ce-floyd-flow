import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle, XCircle, Send } from "lucide-react";

type StatusType = "attachment" | "subcontract" | "send_status";

interface StatusBadgeProps {
  status: string;
  type: StatusType;
  showIcon?: boolean;
}

export function StatusBadge({ status, type, showIcon = true }: StatusBadgeProps) {
  const getStatusConfig = () => {
    if (type === "attachment") {
      switch (status) {
        case "Missing":
          return { 
            icon: AlertCircle, 
            className: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            label: "Missing" 
          };
        case "Pending Review":
          return { 
            icon: Clock, 
            className: "bg-warning text-warning-foreground hover:bg-warning/90",
            label: "Pending Review" 
          };
        case "Invalid":
          return { 
            icon: XCircle, 
            className: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            label: "Invalid" 
          };
        case "Complete":
          return { 
            icon: CheckCircle2, 
            className: "bg-success text-success-foreground hover:bg-success/90",
            label: "Complete" 
          };
        default:
          return { 
            icon: AlertCircle, 
            className: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
            label: status 
          };
      }
    } else if (type === "subcontract") {
      switch (status) {
        case "Draft":
          return {
            icon: Clock,
            className: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
            label: "Draft"
          };
        case "Out for Bid":
          return {
            icon: Clock,
            className: "bg-blue-500 text-white hover:bg-blue-600",
            label: "Out for Bid"
          };
        case "Out for Signature":
          return {
            icon: Clock,
            className: "bg-warning text-warning-foreground hover:bg-warning/90",
            label: "Out for Signature"
          };
        case "Approved":
        case "Executed":
          return {
            icon: CheckCircle2,
            className: "bg-success text-success-foreground hover:bg-success/90",
            label: status
          };
        case "Complete":
          return {
            icon: CheckCircle2,
            className: "bg-green-600 text-white hover:bg-green-700",
            label: "Complete"
          };
        case "Terminated":
        case "Void":
          return {
            icon: XCircle,
            className: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            label: status
          };
        case "Processing":
          return {
            icon: Clock,
            className: "bg-blue-400 text-white hover:bg-blue-500",
            label: "Processing"
          };
        case "Submitted":
          return {
            icon: Send,
            className: "bg-purple-500 text-white hover:bg-purple-600",
            label: "Submitted"
          };
        case "Partially Received":
          return {
            icon: Clock,
            className: "bg-yellow-500 text-white hover:bg-yellow-600",
            label: "Partially Received"
          };
        case "Received":
          return {
            icon: CheckCircle2,
            className: "bg-green-500 text-white hover:bg-green-600",
            label: "Received"
          };
        case "Closed":
          return {
            icon: CheckCircle2,
            className: "bg-gray-600 text-white hover:bg-gray-700",
            label: "Closed"
          };
        default:
          return {
            icon: AlertCircle,
            className: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
            label: status
          };
      }
    } else {
      // send_status
      switch (status) {
        case "queued":
          return { 
            icon: Clock, 
            className: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
            label: "Queued" 
          };
        case "sent":
          return { 
            icon: CheckCircle2, 
            className: "bg-success text-success-foreground hover:bg-success/90",
            label: "Sent" 
          };
        case "bounced":
          return { 
            icon: XCircle, 
            className: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            label: "Bounced" 
          };
        case "failed":
          return { 
            icon: AlertCircle, 
            className: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
            label: "Failed" 
          };
        default:
          return { 
            icon: Send, 
            className: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
            label: status 
          };
      }
    }
  };

  const { icon: Icon, className, label } = getStatusConfig();

  return (
    <Badge className={className}>
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {label}
    </Badge>
  );
}
