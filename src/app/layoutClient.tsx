"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/layout/Sidebar";
import { useSidebarStore } from "@/hooks/use-sidebar-store";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PanelLeft } from "lucide-react";

export default function ClientLayoutShell({ children }: { children: React.ReactNode }) {
  const { isCollapsed, toggleSidebar } = useSidebarStore();
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isPublicPage =
    ["/", "/login/usuario", "/login/cliente", "/accept-invite", "/terminos", "/sin-acceso", "/recuperar-password"].includes(pathname) ||
    pathname.startsWith("/public/");

  if (!isClient || isPublicPage || loading) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main
        className={cn(
          "flex-1 flex flex-col transition-all duration-300 ease-in-out",
          isCollapsed ? "md:ml-16" : "md:ml-64"
        )}
      >
        <header className="flex items-center h-14 px-4 border-b md:hidden sticky top-0 bg-card z-20">
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            <PanelLeft className="h-6 w-6" />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        </header>
        <div className="p-4 md:p-8 flex-1">{children}</div>
      </main>
    </div>
  );
}
