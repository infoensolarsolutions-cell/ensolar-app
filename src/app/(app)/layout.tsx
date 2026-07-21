import { redirect } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { SideNav } from "@/components/side-nav";
import { getProfile } from "@/lib/auth";

// Staff-facing shell: bottom tabs on mobile, sidebar on desktop.
// The proxy handles the optimistic redirect; this is the authoritative check.
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await getProfile();
  if (!profile || !profile.active) redirect("/login");
  if (profile.role === "customer") redirect("/portal");

  return (
    <div className="flex min-h-dvh">
      <SideNav role={profile.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-lg flex-1 pb-24 lg:max-w-3xl lg:pb-8">
          {children}
        </main>
        <div className="lg:hidden">
          <BottomNav role={profile.role} />
        </div>
      </div>
    </div>
  );
}
