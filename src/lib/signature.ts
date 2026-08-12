import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// E-signatures live in app_kv (RLS with no policies = service-role only), so
// they are never publicly reachable and never committed to the repo. Keyed
// per profile: only documents prepared by that person carry their signature.

const keyFor = (profileId: string) => `signature:${profileId}`;

export async function getSignature(profileId: string | null | undefined): Promise<string | null> {
  if (!profileId) return null;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("app_kv")
      .select("value")
      .eq("key", keyFor(profileId))
      .single();
    const uri = (data?.value as { data_uri?: string } | null)?.data_uri;
    return typeof uri === "string" && uri.startsWith("data:image/") ? uri : null;
  } catch {
    return null;
  }
}

export async function storeSignature(profileId: string, dataUri: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("app_kv").upsert({
    key: keyFor(profileId),
    value: { data_uri: dataUri },
    updated_at: new Date().toISOString(),
  });
}

export async function removeSignature(profileId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("app_kv").delete().eq("key", keyFor(profileId));
}
