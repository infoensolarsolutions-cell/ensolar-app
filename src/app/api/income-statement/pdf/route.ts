import { createElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayManila } from "@/lib/format";
import { computeIncomeStatement, PERIOD_LABELS, type StmtPeriod } from "@/lib/income-statement";
import { IncomeStatementPdf } from "@/lib/pdf/income-statement-doc";

export async function GET(request: Request) {
  const profile = await getProfile();
  if (!profile || profile.role !== "owner") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const currentYear = Number(todayManila().slice(0, 4));
  const search = new URL(request.url).searchParams;
  const raw = Number(search.get("year"));
  const year = Number.isInteger(raw) && raw >= 2018 && raw <= currentYear ? raw : currentYear;
  const periodRaw = search.get("period") as StmtPeriod | null;
  const period: StmtPeriod =
    periodRaw && periodRaw in PERIOD_LABELS ? periodRaw : "monthly";

  const supabase = await createClient();
  const statement = await computeIncomeStatement(supabase, year, period);

  const doc = createElement(IncomeStatementPdf, { statement }) as Parameters<
    typeof renderToBuffer
  >[0];
  const buffer = await renderToBuffer(doc);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Ensolar-Income-Statement-${period === "annual" ? "yearly" : year + "-" + period}.pdf"`,
    },
  });
}
