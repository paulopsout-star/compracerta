"use client";

import { useState } from "react";
import { Sidebar, type UserRole } from "./sidebar";
import { Header } from "./header";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface DashboardLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
  role?: UserRole;
  userName?: string;
}

export function DashboardLayout({
  children,
  pageTitle,
  role = "vendedor",
  userName = "João Silva",
}: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-col md:w-64 md:shrink-0">
        <Sidebar role={role} userName={userName} />
      </div>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar role={role} userName={userName} />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          pageTitle={pageTitle}
          onMenuToggle={() => setMobileOpen(true)}
          userName={userName}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
