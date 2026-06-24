import AdminSidebar from "@/components/shared/admin-sidebar";
import AdminTopbar from "@/components/shared/admin-topbar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar — hidden on mobile */}
      <AdminSidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar />
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
