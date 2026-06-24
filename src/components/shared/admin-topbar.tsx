"use client";

import { signOut, useSession } from "@/lib/auth/auth-client";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AdminTopbar() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "?";

  return (
    <header className="h-16 glass-card-dark border-b border-white/8 px-6 flex items-center justify-between">
      <div className="lg:hidden flex items-center gap-2">
        <span className="font-bold text-sm">Chekin Admin</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="text-xs text-muted-foreground">{(user as { role?: string } | null | undefined)?.role ?? "Admin"}</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
              <Avatar className="h-8 w-8 border border-white/20">
                <AvatarImage src={(user as { image?: string } | null | undefined)?.image} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 bg-card border-border">
            <DropdownMenuItem onClick={() => router.push("/admin/settings")}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={async () => {
                await signOut({ fetchOptions: { onSuccess: () => router.push("/login") } });
              }}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
