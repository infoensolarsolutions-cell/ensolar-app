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

const TOKEN_MAX_AGE_MS = 50 * 24 * 3600 * 1000; // tokens last ~60 days; refresh at 50

// A Deye account can hold several organizations ("profiles"); each needs its
// own token. Station references are stored as "orgId:stationId" so the right
// token is used later ("" org = the account's default/personal scope).
function tokenKey(orgId: string): string {
  return orgId ? `deye_token:${orgId}` : "deye_token";
}

async function obtainToken(orgId: string): Promise<string> {
  const passwordSha = crypto
    .createHash("sha256")
    .update(process.env.DEYE_PASSWORD!)
    .digest("hex");
  const json = await fetchJson("/account/token", {
    appSecret: process.env.DEYE_APP_SECRET,
    email: process.env.DEYE_EMAIL,
    password: passwordSha,
    ...(orgId ? { companyId: Number(orgId) } : {}),
  });
  const token = String(json.accessToken ?? "");
  if (!token) throw new Error("Deye login failed — check credentials and region (DEYE_BASE_URL).");
  const admin = createAdminClient();
  await admin.from("app_kv").upsert({
    key: tokenKey(orgId),
    value: { accessToken: token, obtainedAt: Date.now() },
    updated_at: new Date().toISOString(),
  });
  return token;
}

async function getToken(orgId: string, forceNew = false): Promise<string> {
  if (!forceNew) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("app_kv")
      .select("value")
      .eq("key", tokenKey(orgId))
      .maybeSingle();
    const v = data?.value as { accessToken?: string; obtainedAt?: number } | undefined;
    if (v?.accessToken && v.obtainedAt && Date.now() - v.obtainedAt < TOKEN_MAX_AGE_MS) {
      return v.accessToken;
    }
  }
  return obtainToken(orgId);
}

// Run a call; on an auth-ish failure retry once with a fresh token.
async function withToken<T>(orgId: string, fn: (token: string) => Promise<T>): Promise<T> {
  const token = await getToken(orgId);
  try {
    return await fn(token);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/401|token|auth/i.test(msg)) {
      return fn(await getToken(orgId, true));
    }
    throw e;
  }
}

type DeyeOrg = { id: string; name: string };

async function listOrgs(): Promise<DeyeOrg[]> {
  const json = await withToken("", (t) => fetchJson("/account/info", {}, t));
  const raw =
    (json.orgInfoList as unknown[]) ??
    (json.orgList as unknown[]) ??
    (json.companyList as unknown[]) ??
    [];
  if (raw.length === 0) {
    console.error("[deye] /account/info returned no organizations; keys:", Object.keys(json));
  }
  return raw
    .map((o) => {
      const x = o as {
        companyId?: number | string;
        orgId?: number | string;
        id?: number | string;
        companyName?: string;
        name?: string;
        orgName?: string;
      };
      const id = x.companyId ?? x.orgId ?? x.id ?? "";
      return {
        id: String(id),
        name: x.companyName ?? x.name ?? x.orgName ?? `Profile ${id}`,
      };
    })
    .filter((o) => o.id !== "");
}

async function stationsForOrg(orgId: string): Promise<{ id: string; name: string }[]> {
  const json = await withToken(orgId, (t) =>
    fetchJson("/station/list", { page: 1, size: 100 }, t),
  );
  const raw =
    (json.stationList as unknown[]) ??
    (json.stations as unknown[]) ??
    (json.infos as unknown[]) ??
    [];
  return raw
    .map((s) => {
      const o = s as { id?: number | string; name?: string; stationName?: string };
      return {
        id: o.id !== undefined ? String(o.id) : "",
        name: o.name ?? o.stationName ?? `Station ${o.id}`,
      };
    })
    .filter((s) => s.id !== "");
}

// All stations across every organization (profile) on the account, each
// labeled with its profile name and referenced as "orgId:stationId".
export async function listStations(): Promise<DeyeStation[]> {
  const orgs = await listOrgs().catch((e) => {
    console.error("[deye] listing organizations failed:", e instanceof Error ? e.message : e);
    return [] as DeyeOrg[];
  });
  console.error(`[deye] organizations found: ${orgs.map((o) => `${o.id}=${o.name}`).join(", ") || "none"}`);
  if (orgs.length === 0) {
    const stations = await stationsForOrg("");
    return stations.map((s) => ({ id: s.id, name: s.name }));
  }
  const all: DeyeStation[] = [];
  for (const org of orgs) {
    try {
      const stations = await stationsForOrg(org.id);
      console.error(`[deye] org ${org.id} (${org.name}): ${stations.length} stations`);
      for (const s of stations) {
        all.push({
          id: `${org.id}:${s.id}`,
          name: orgs.length > 1 ? `${org.name} · ${s.name}` : s.name,
        });
      }
    } catch (e) {
      // One profile failing shouldn't hide the other's stations — but say so
      // in the logs.
      console.error(`[deye] org ${org.id} (${org.name}) station list failed:`, e instanceof Error ? e.message : e);
    }
  }
  return all;
}

function parseStationRef(ref: string): { orgId: string; stationId: string } {
  const i = ref.indexOf(":");
  return i === -1
    ? { orgId: "", stationId: ref }
    : { orgId: ref.slice(0, i), stationId: ref.slice(i + 1) };
}

export async function refreshStation(
  stationRef: string,
): Promise<{ data?: DeyeLatest; error?: string }> {
  try {
    const { orgId, stationId } = parseStationRef(stationRef);
    const json = await withToken(orgId, (t) =>
      fetchJson("/station/latest", { stationId: Number(stationId) }, t),
    );
    const admin = createAdminClient();
    await admin.from("deye_cache").upsert({
      station_id: stationRef,
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

// ── Daily generation history (kWh per day) ──────────────────────────────────

export type DeyeDaily = { date: string; kwh: number };

const HISTORY_FRESH_MS = 60 * 60 * 1000; // energy bars only move hourly-ish

const historyKey = (ref: string) => `${ref}#history`;

function manilaDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
}

export async function refreshHistory(
  stationRef: string,
  days = 30,
): Promise<{ items?: DeyeDaily[]; error?: string }> {
  try {
    const { orgId, stationId } = parseStationRef(stationRef);
    const json = await withToken(orgId, (t) =>
      fetchJson(
        "/station/history",
        {
          stationId: Number(stationId),
          startAt: manilaDate(-(days - 1)),
          endAt: manilaDate(0),
          granularity: 2, // daily items
        },
        t,
      ),
    );
    const raw = ((json.stationDataItems ??
      json.items ??
      json.dataList ??
      []) as Record<string, unknown>[]);
    const items: DeyeDaily[] = raw
      .map((r) => {
        const y = r.year, m = r.month, dd = r.day;
        const date =
          typeof y === "number" && typeof m === "number" && typeof dd === "number"
            ? `${y}-${String(m).padStart(2, "0")}-${String(dd).padStart(2, "0")}`
            : String(r.date ?? r.time ?? "");
        const kwhRaw = r.generationValue ?? r.energy ?? r.dayEnergy ?? r.value;
        const kwh = typeof kwhRaw === "number" ? kwhRaw : Number(kwhRaw) || 0;
        return { date, kwh: Math.round(kwh * 100) / 100 };
      })
      .filter((i) => /^\d{4}-\d{2}-\d{2}/.test(i.date))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    const admin = createAdminClient();
    await admin.from("deye_cache").upsert({
      station_id: historyKey(stationRef),
      data: { items },
      fetched_at: new Date().toISOString(),
    });
    return { items };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Deye history error" };
  }
}

export async function getCachedHistory(
  stationRef: string,
): Promise<{ items: DeyeDaily[]; stale: boolean } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("deye_cache")
    .select("data, fetched_at")
    .eq("station_id", historyKey(stationRef))
    .maybeSingle();
  if (!data) return null;
  return {
    items: ((data.data as { items?: DeyeDaily[] }).items ?? []),
    stale: Date.now() - new Date(data.fetched_at).getTime() > HISTORY_FRESH_MS,
  };
}
