import { redirect } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { getProfile } from "@/lib/auth";

// Staff-facing shell: content area + fixed bottom tab navigation.
// The proxy handles the optimistic redirect; this is the authoritative check.
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await getProfile();
  if (!profile || !profile.active) redirect("/login");
  if (profile.role === "customer") redirect("/portal");

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-lg flex-1 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
