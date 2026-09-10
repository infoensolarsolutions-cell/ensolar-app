import { redirect } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { SideNav } from "@/components/side-nav";
import { BranchSwitcher } from "@/components/branch-switcher";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActiveBranch, getBranches } from "@/lib/branch";

// Staff-facing shell: bottom tabs on mobile, sidebar on desktop.
// The proxy handles the optimistic redirect; this is the authoritative check.
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await getProfile();
  if (!profile || !profile.active) redirect("/login");
  if (profile.role === "customer") redirect("/portal");

  // Branch lens: appears automatically once a second branch exists.
  let branchBar: React.ReactNode = null;
  if (["owner", "office_staff"].includes(profile.role)) {
    const supabase = await createClient();
    const branches = (await getBranches(supabase)).filter((b) => b.active);
    if (branches.length > 1) {
      const active = await getActiveBranch(branches);
      branchBar = (
        <div className="border-b border-gray-200 bg-white px-4 py-2">
          <div className="mx-auto w-full max-w-lg lg:max-w-6xl">
            <BranchSwitcher branches={branches} active={active} />
          </div>
        </div>
      );
    }
  }

  return (
    <div className="flex min-h-dvh">
      <SideNav role={profile.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        {branchBar}
        <main className="mx-auto w-full max-w-lg flex-1 pb-24 lg:max-w-6xl lg:pb-8">
          {children}
        </main>
        <div className="lg:hidden">
          <BottomNav role={profile.role} />
        </div>
      </div>
    </div>
  );
}
