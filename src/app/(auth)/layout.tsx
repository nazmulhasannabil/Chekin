export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand mark */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="h-9 w-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">C</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-foreground">Chekin</span>
          </div>
          <p className="text-sm text-muted-foreground">Smart Attendance Management</p>
        </div>
        {children}
      </div>
    </div>
  );
}
