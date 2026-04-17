"use client";

import { useState } from "react";
import { Sidebar, type UserRole } from "./sidebar";
import { Header } from "./header";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface DashboardLayoutProps {
  children: React.ReactNode;
  role?: UserRole;
  userName?: string;
  greeting?: string;
  subtitle?: string;
}

export function DashboardLayout({
  children,
  role = "vendedor",
  userName = "João",
  greeting,
  subtitle,
}: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar — fixed 240px */}
      <div className="hidden md:flex md:flex-col md:w-[240px] md:shrink-0">
        <Sidebar role={role} />
      </div>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[240px]">
          <Sidebar role={role} />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header
          userName={userName}
          greeting={greeting}
          subtitle={subtitle}
          onMenuToggle={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-6 lg:px-8 pb-8 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
