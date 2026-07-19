import { BottomNav } from "@/components/bottom-nav";

// Staff-facing shell: content area + fixed bottom tab navigation.
// Auth protection for this group arrives in Step 2.
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="mx-auto w-full max-w-lg flex-1 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
