import EmployeeNav from "@/components/shared/employee-nav";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 glass-card-dark border-b border-white/8 px-4 h-14 flex items-center">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span className="text-primary font-bold text-xs">C</span>
          </div>
          <span className="font-semibold text-sm">Chekin</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-24 overflow-y-auto">{children}</main>

      {/* Mobile bottom navigation */}
      <EmployeeNav />
    </div>
  );
}
