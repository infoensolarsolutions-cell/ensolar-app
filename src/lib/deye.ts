import "server-only";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Deye Cloud OpenAPI client. Credentials live ONLY in environment variables;
// the access token and cached readings are stored server-side (RLS with no
// policies). The whole feature switches off cleanly when the env vars are
// absent. Regions use different hosts — DEYE_BASE_URL overrides the default.

const BASE =
  process.env.DEYE_BASE_URL?.replace(/\/$/, "") ??
  "https://eu1-developer.deyecloud.com/v1.0";

export function deyeEnabled(): boolean {
  return !!(
    process.env.DEYE_APP_ID &&
    process.env.DEYE_APP_SECRET &&
    process.env.DEYE_EMAIL &&
    process.env.DEYE_PASSWORD
  );
}

export type DeyeLatest = Record<string, unknown> & {
  generationPower?: number;
  batterySOC?: number;
  gridPower?: number;
  consumptionPower?: number;
  wirePower?: number;
  lastUpdateTime?: number;
};

export type DeyeStation = { id: number | string; name: string };

async function fetchJson(
  path: string,
  body: unknown,
  token?: string,
): Promise<Record<string, unknown>> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}${path}${sep}appId=${process.env.DEYE_APP_ID}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Deye API HTTP ${res.status}`);
  const json = (await res.json()) as Record<string, unknown>;
  if (json.success === false) {
    throw new Error(String(json.msg ?? json.code ?? "Deye API error"));
  }
  return json;
}

const TOKEN_KEY = "deye_token";
const TOKEN_MAX_AGE_MS = 50 * 24 * 3600 * 1000; // tokens last ~60 days; refresh at 50

async function obtainToken(): Promise<string> {
  const passwordSha = crypto
    .createHash("sha256")
    .update(process.env.DEYE_PASSWORD!)
    .digest("hex");
  const json = await fetchJson("/account/token", {
    appSecret: process.env.DEYE_APP_SECRET,
    email: process.env.DEYE_EMAIL,
    password: passwordSha,
  });
  const token = String(json.accessToken ?? "");
  if (!token) throw new Error("Deye login failed — check credentials and region (DEYE_BASE_URL).");
  const admin = createAdminClient();
  await admin.from("app_kv").upsert({
    key: TOKEN_KEY,
    value: { accessToken: token, obtainedAt: Date.now() },
    updated_at: new Date().toISOString(),
  });
  return token;
}

async function getToken(forceNew = false): Promise<string> {
  if (!forceNew) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("app_kv")
      .select("value")
      .eq("key", TOKEN_KEY)
      .maybeSingle();
    const v = data?.value as { accessToken?: string; obtainedAt?: number } | undefined;
    if (v?.accessToken && v.obtainedAt && Date.now() - v.obtainedAt < TOKEN_MAX_AGE_MS) {
      return v.accessToken;
    }
  }
  return obtainToken();
}

// Run a call; on an auth-ish failure retry once with a fresh token.
async function withToken<T>(fn: (token: string) => Promise<T>): Promise<T> {
  const token = await getToken();
  try {
    return await fn(token);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/401|token|auth/i.test(msg)) {
      return fn(await getToken(true));
    }
    throw e;
  }
}

export async function listStations(): Promise<DeyeStation[]> {
  const json = await withToken((t) => fetchJson("/station/list", { page: 1, size: 100 }, t));
  const raw =
    (json.stationList as unknown[]) ??
    (json.stations as unknown[]) ??
    (json.infos as unknown[]) ??
    [];
  return raw
    .map((s) => {
      const o = s as { id?: number | string; name?: string; stationName?: string };
      return { id: o.id ?? "", name: o.name ?? o.stationName ?? `Station ${o.id}` };
    })
    .filter((s) => s.id !== "");
}

export async function refreshStation(
  stationId: string,
): Promise<{ data?: DeyeLatest; error?: string }> {
  try {
    const json = await withToken((t) =>
      fetchJson("/station/latest", { stationId: Number(stationId) }, t),
    );
    const admin = createAdminClient();
    await admin.from("deye_cache").upsert({
      station_id: stationId,
      data: json,
      fetched_at: new Date().toISOString(),
    });
    return { data: json as DeyeLatest };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Deye error" };
  }
}

export const CACHE_FRESH_MS = 5 * 60 * 1000;

export async function getCachedStation(
  stationId: string,
): Promise<{ data: DeyeLatest; fetchedAt: string; stale: boolean } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("deye_cache")
    .select("data, fetched_at")
    .eq("station_id", stationId)
    .maybeSingle();
  if (!data) return null;
  return {
    data: data.data as DeyeLatest,
    fetchedAt: data.fetched_at,
    stale: Date.now() - new Date(data.fetched_at).getTime() > CACHE_FRESH_MS,
  };
}
