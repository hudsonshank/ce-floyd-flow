import { Search, RefreshCw, User, LogOut } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export function AppHeader() {
  const navigate = useNavigate();
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    const fetchLastSync = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('last_sync_at')
        .order('last_sync_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!error && data?.last_sync_at) {
        setLastSync(new Date(data.last_sync_at).toLocaleString());
      }
    };
    fetchLastSync();
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      navigate("/auth");
      toast.success("Signed out successfully");
    }
  };

  return (
    <header className="h-14 border-b border-border bg-card flex items-center gap-4 px-6">
      <SidebarTrigger />
      
      <div className="flex-1 flex items-center gap-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search projects, subcontracts..." 
            className="pl-10"
          />
        </div>
        
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Last Sync: {lastSync ?? 'Never'}</span>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
