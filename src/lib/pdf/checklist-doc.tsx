import path from "node:path";
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Svg,
  Rect,
  Text,
  View,
} from "@react-pdf/renderer";
import type { ChecklistItem, Equipment } from "@/lib/checklists";
import { fullLoadAmps } from "@/lib/checklists";

const fontDir = path.join(process.cwd(), "public", "fonts");
Font.register({
  family: "DejaVu",
  fonts: [
    { src: path.join(fontDir, "DejaVuSans.ttf") },
    { src: path.join(fontDir, "DejaVuSans-Bold.ttf"), fontWeight: "bold" },
  ],
});

const GREEN = "#1FA23C";
const YELLOW = "#FFF200";
const BORDER = "#999";

const styles = StyleSheet.create({
  page: { fontFamily: "DejaVu", fontSize: 8, padding: 36, color: "#111" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  companyName: { fontSize: 13, fontWeight: "bold", color: "#157A2C" },
  companySub: { fontSize: 7, color: "#333", marginTop: 1 },
  rule: { borderBottomWidth: 2, borderBottomColor: GREEN, marginTop: 6, marginBottom: 10 },
  title: { fontSize: 11, fontWeight: "bold", textAlign: "center", marginBottom: 8 },
  metaBox: { borderWidth: 1, borderColor: BORDER, padding: 6, marginBottom: 8 },
  metaRow: { flexDirection: "row", flexWrap: "wrap" },
  metaCell: { width: "50%", paddingVertical: 1.5 },
  label: { color: "#555" },
  bold: { fontWeight: "bold" },
  table: { borderWidth: 1, borderColor: BORDER },
  tr: { flexDirection: "row", borderTopWidth: 1, borderTopColor: BORDER },
  th: { fontWeight: "bold", backgroundColor: "#EFEFEF", paddingVertical: 4, paddingHorizontal: 4, fontSize: 7.5 },
  td: { paddingVertical: 4, paddingHorizontal: 4 },
  cNo: { width: 18, textAlign: "center" },
  cItem: { flex: 5 },
  cTick: { width: 34, textAlign: "center", alignItems: "center" },
  cComment: { flex: 2.4 },
  req: { fontSize: 6.8, color: "#555", marginTop: 1.5 },
  markedBy: { fontSize: 6.5, color: "#157A2C", marginTop: 1.5 },
  sigRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 26, gap: 14 },
  sigBox: { flex: 1 },
  sigLine: { borderTopWidth: 1, borderTopColor: "#111", marginTop: 22, paddingTop: 2, textAlign: "center", fontSize: 7 },
  footer: { position: "absolute", bottom: 18, left: 36, right: 36, textAlign: "center", fontSize: 6.5, color: "#777" },
});

function Logo() {
  return (
    <Svg width={38} height={38} viewBox="0 0 512 512">
      <Rect x={12} y={12} width={488} height={488} fill={YELLOW} stroke="#000" strokeWidth={24} />
      <Rect x={244} y={12} width={24} height={488} fill="#000" />
      <Rect x={118} y={128} width={288} height={82} fill={GREEN} stroke="#000" strokeWidth={14} />
      <Rect x={138} y={288} width={288} height={82} fill={GREEN} stroke="#000" strokeWidth={14} />
    </Svg>
  );
}

// Empty box for site ticking; marked boxes carry an X.
function Tick({ marked }: { marked: boolean }) {
  return (
    <View
      style={{
        width: 11,
        height: 11,
        borderWidth: 1,
        borderColor: "#111",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {marked ? <Text style={{ fontSize: 8, fontWeight: "bold" }}>X</Text> : null}
    </View>
  );
}

export type ChecklistPdfData = {
  title: string;
  project_no: string;
  customer_name: string;
  site_address: string | null;
  equipment: Equipment | null;
  items: ChecklistItem[];
  remarks: string | null;
  completed_at: string | null;
};

function d(date: string | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-PH", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Manila",
  }).format(new Date(date));
}

export function ChecklistPdf({ data }: { data: ChecklistPdfData }) {
  const eq = data.equipment;
  return (
    <Document title={`${data.project_no} — ${data.title}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow} fixed>
          <Logo />
          <View>
            <Text style={styles.companyName}>
              ENSOLAR SOLUTIONS <Text style={{ color: "#111", fontSize: 9 }}>Installations Services</Text>
            </Text>
            <Text style={styles.companySub}>
              19 Espina Road, Taclobo, Dumaguete City 6200, Negros Oriental, Philippines
            </Text>
            <Text style={styles.companySub}>
              Landline: (035) 531-6455 · Mobile: (Smart) 0961-885-6986 · (TM) 0953-561-2557 · info.ensolarsolutions@gmail.com
            </Text>
          </View>
        </View>
        <View style={styles.rule} fixed />

        <Text style={styles.title}>{data.title.toUpperCase()}</Text>

        <View style={styles.metaBox}>
          <View style={styles.metaRow}>
            <Text style={styles.metaCell}>
              <Text style={styles.label}>Project No: </Text>
              <Text style={styles.bold}>{data.project_no}</Text>
            </Text>
            <Text style={styles.metaCell}>
              <Text style={styles.label}>Customer / Project: </Text>
              <Text style={styles.bold}>{data.customer_name}</Text>
            </Text>
            <Text style={styles.metaCell}>
              <Text style={styles.label}>Site: </Text>
              {data.site_address ?? "____________________________"}
            </Text>
            <Text style={styles.metaCell}>
              <Text style={styles.label}>Date of inspection: </Text>
              {data.completed_at ? d(data.completed_at) : "____________________"}
            </Text>
            {eq && (
              <>
                <Text style={styles.metaCell}>
                  <Text style={styles.label}>Inverter: </Text>
                  <Text style={styles.bold}>{eq.brand} {eq.model}</Text>
                </Text>
                <Text style={styles.metaCell}>
                  <Text style={styles.label}>Rating: </Text>
                  {eq.kw} kW · {eq.voltage} V {eq.phases === 3 ? "three-phase" : "single-phase"} · full-load ≈ {fullLoadAmps(eq)} A
                </Text>
                {eq.ah ? (
                  <Text style={styles.metaCell}>
                    <Text style={styles.label}>Battery bank: </Text>
                    {eq.qty && eq.qty > 1 ? `${eq.qty} × ` : ""}{eq.ah} Ah @ {eq.voltage} V
                  </Text>
                ) : null}
              </>
            )}
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.tr, { borderTopWidth: 0 }]}>
            <Text style={[styles.th, styles.cNo]}>#</Text>
            <Text style={[styles.th, styles.cItem]}>Item / Minimum requirement</Text>
            <Text style={[styles.th, styles.cTick]}>Comply</Text>
            <Text style={[styles.th, styles.cTick]}>Not comply</Text>
            <Text style={[styles.th, styles.cTick]}>N/A</Text>
            <Text style={[styles.th, styles.cComment]}>Comments</Text>
          </View>
          {data.items.map((item, i) => (
            <View key={item.key} style={styles.tr} wrap={false}>
              <Text style={[styles.td, styles.cNo]}>{i + 1}</Text>
              <View style={[styles.td, styles.cItem]}>
                <Text style={styles.bold}>{item.label}</Text>
                {item.requirement ? <Text style={styles.req}>{item.requirement}</Text> : null}
                {item.status && item.by ? (
                  <Text style={styles.markedBy}>
                    {item.status === "pass" ? "Complied" : item.status === "fail" ? "Non-compliant" : "N/A"}
                    {" — "}{item.by}{item.at ? ` · ${d(item.at)}` : ""}
                  </Text>
                ) : null}
              </View>
              <View style={[styles.td, styles.cTick]}>
                <Tick marked={item.status === "pass"} />
              </View>
              <View style={[styles.td, styles.cTick]}>
                <Tick marked={item.status === "fail"} />
              </View>
              <View style={[styles.td, styles.cTick]}>
                <Tick marked={item.status === "na"} />
              </View>
              <Text style={[styles.td, styles.cComment, { fontSize: 7 }]}>
                {item.comment ?? ""}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 8 }} wrap={false}>
          <Text style={styles.label}>Overall remarks / issues found:</Text>
          <Text style={{ marginTop: 2, minHeight: 24 }}>
            {data.remarks ?? ""}
          </Text>
          {!data.remarks && (
            <>
              <Text style={{ borderBottomWidth: 1, borderBottomColor: "#999", marginTop: 10 }}> </Text>
              <Text style={{ borderBottomWidth: 1, borderBottomColor: "#999", marginTop: 14 }}> </Text>
            </>
          )}
        </View>

        <View style={styles.sigRow} wrap={false}>
          <View style={styles.sigBox}>
            <Text style={styles.sigLine}>Checked by — Name, Signature & Date</Text>
            <Text style={{ fontSize: 7, color: "#555", marginTop: 8 }}>
              Designation: ______________________
            </Text>
          </View>
          <View style={styles.sigBox}>
            <Text style={styles.sigLine}>Verified by (Supervisor) — Name, Signature & Date</Text>
            <Text style={{ fontSize: 7, color: "#555", marginTop: 8 }}>
              Designation: ______________________
            </Text>
          </View>
          <View style={styles.sigBox}>
            <Text style={styles.sigLine}>Noted by (Manager / Owner)</Text>
          </View>
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `${data.project_no} · ${data.title} · Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
