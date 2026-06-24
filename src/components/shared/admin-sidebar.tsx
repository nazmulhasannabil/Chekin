"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", exact: true, icon: "⬡" },
      { href: "/admin/live", label: "Live Board", icon: "◉" },
      { href: "/admin/anomalies", label: "Anomalies", icon: "⚠" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/admin/employees", label: "Employees", icon: "👥" },
      { href: "/admin/branches", label: "Branches", icon: "🏢" },
      { href: "/admin/departments", label: "Departments", icon: "🏗" },
    ],
  },
  {
    label: "Attendance",
    items: [
      { href: "/admin/attendance", label: "Records", icon: "📋" },
      { href: "/admin/corrections", label: "Corrections", icon: "✏" },
      { href: "/admin/shifts", label: "Shifts", icon: "🕐" },
      { href: "/admin/leave", label: "Leave", icon: "📅" },
    ],
  },
  {
    label: "Reports",
    items: [
      { href: "/admin/reports", label: "Reports", icon: "📊" },
      { href: "/admin/exports", label: "Exports", icon: "💾" },
      { href: "/admin/audit", label: "Audit Log", icon: "🔍" },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/admin/settings", label: "Settings", icon: "⚙" },
      { href: "/admin/settings/biometrics", label: "Biometrics", icon: "🔐" },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 flex-col glass-card-dark border-r border-white/8 min-h-screen">
      {/* Brand */}
      <div className="h-16 flex items-center px-4 border-b border-white/8">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span className="text-primary font-bold text-sm">C</span>
          </div>
          <div>
            <p className="font-bold text-sm leading-none">Chekin</p>
            <p className="text-[10px] text-muted-foreground">Admin Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 px-2">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "nav-item text-sm",
                      isActive && "active"
                    )}
                  >
                    <span className="text-base leading-none w-5 text-center">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
