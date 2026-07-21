import type { Metadata } from "next";
import { TopBar } from "@/components/top-bar";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PhotoSlots } from "./photo-slots";

export const metadata: Metadata = { title: "Landing Page Photos" };

export default async function LandingPhotosPage() {
  await requireRole("owner");
  const supabase = await createClient();
  const { data: files } = await supabase.storage.from("landing").list();

  const existing: Record<string, string> = {};
  for (const f of files ?? []) {
    existing[f.name] = f.updated_at ?? String(Date.now());
  }

  const baseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/landing`;

  return (
    <>
      <TopBar title="Landing Page Photos" backHref="/more" />
      <div className="space-y-4 p-4">
        <div className="rounded-xl bg-gray-100 px-4 py-3 text-xs text-gray-600">
          These photos appear on your public landing page at{" "}
          <span className="font-mono">ensolar-app.vercel.app</span>. Upload
          straight from your phone gallery — photos are resized automatically.
          Changes show on the website within a few minutes.
        </div>
        <PhotoSlots baseUrl={baseUrl} existing={existing} />
      </div>
    </>
  );
}
