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
import { pesoInWords } from "@/lib/format";

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

const styles = StyleSheet.create({
  page: { fontFamily: "DejaVu", fontSize: 10, padding: 40, color: "#111" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  companyName: { fontSize: 14, fontWeight: "bold", color: "#157A2C" },
  companySub: { fontSize: 7.5, color: "#333", marginTop: 1 },
  rule: { borderBottomWidth: 2, borderBottomColor: GREEN, marginTop: 8, marginBottom: 16 },
  title: { fontSize: 13, fontWeight: "bold", textAlign: "center" },
  subtitle: { fontSize: 8, color: "#666", textAlign: "center", marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  label: { color: "#555" },
  bold: { fontWeight: "bold" },
  amountBox: {
    borderWidth: 1, borderColor: "#111", marginTop: 10, marginBottom: 4,
    padding: 10, alignItems: "center",
  },
  amount: { fontSize: 18, fontWeight: "bold" },
  words: { fontSize: 9, marginBottom: 14, textAlign: "center", color: "#333" },
  detail: { marginBottom: 4 },
  sigRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 48 },
  sigBox: { width: 200 },
  sigLine: { borderTopWidth: 1, borderTopColor: "#111", marginTop: 26, paddingTop: 3, textAlign: "center", fontSize: 8 },
  note: { marginTop: 22, fontSize: 7.5, color: "#777", textAlign: "center" },
});

function Logo() {
  return (
    <Svg width={42} height={42} viewBox="0 0 512 512">
      <Rect x={12} y={12} width={488} height={488} fill={YELLOW} stroke="#000" strokeWidth={24} />
      <Rect x={244} y={12} width={24} height={488} fill="#000" />
      <Rect x={118} y={128} width={288} height={82} fill={GREEN} stroke="#000" strokeWidth={14} />
      <Rect x={138} y={288} width={288} height={82} fill={GREEN} stroke="#000" strokeWidth={14} />
    </Svg>
  );
}

export type ReceiptPdfData = {
  or_no: string;
  received_at: string;
  customer_name: string;
  project_no: string | null;
  milestone_label: string | null;
  amount: number;
  method: string;
  provider_ref: string | null;
  received_by: string;
};

function peso(n: number): string {
  return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function d(date: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Manila",
  }).format(new Date(date));
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash", gcash: "GCash", maya: "Maya", bank_transfer: "Bank Transfer",
  check: "Check", card: "Card", online: "Online Payment",
};

export function ReceiptPdf({ data }: { data: ReceiptPdfData }) {
  return (
    <Document title={data.or_no}>
      <Page size="A5" style={styles.page}>
        <View style={styles.headerRow}>
          <Logo />
          <View>
            <Text style={styles.companyName}>
              ENSOLAR SOLUTIONS <Text style={{ color: "#111", fontSize: 10 }}>Installations Services</Text>
            </Text>
            <Text style={styles.companySub}>
              19 Espina Road, Taclobo, Dumaguete City 6200, Negros Oriental, Philippines
            </Text>
            <Text style={styles.companySub}>
              (035) 531-6455 · 0961-885-6986 · info.ensolarsolutions@gmail.com
            </Text>
          </View>
        </View>
        <View style={styles.rule} />

        <Text style={styles.title}>ACKNOWLEDGMENT RECEIPT</Text>
        <Text style={styles.subtitle}>This is not a BIR official receipt.</Text>

        <View style={styles.row}>
          <Text>
            <Text style={styles.label}>Receipt No: </Text>
            <Text style={styles.bold}>{data.or_no}</Text>
          </Text>
          <Text>
            <Text style={styles.label}>Date: </Text>
            {d(data.received_at)}
          </Text>
        </View>

        <Text style={styles.detail}>
          <Text style={styles.label}>Received from: </Text>
          <Text style={styles.bold}>{data.customer_name}</Text>
        </Text>
        {data.project_no ? (
          <Text style={styles.detail}>
            <Text style={styles.label}>For project: </Text>
            {data.project_no}
            {data.milestone_label ? ` — ${data.milestone_label}` : ""}
          </Text>
        ) : null}
        <Text style={styles.detail}>
          <Text style={styles.label}>Payment method: </Text>
          {METHOD_LABELS[data.method] ?? data.method}
          {data.provider_ref ? ` (Ref: ${data.provider_ref})` : ""}
        </Text>

        <View style={styles.amountBox}>
          <Text style={styles.amount}>{peso(data.amount)}</Text>
        </View>
        <Text style={styles.words}>{pesoInWords(data.amount)}</Text>

        <View style={styles.sigRow}>
          <View style={styles.sigBox}>
            <Text style={styles.label}>Received by:</Text>
            <Text style={styles.sigLine}>{data.received_by}</Text>
          </View>
          <View style={styles.sigBox}>
            <Text style={styles.label}> </Text>
            <Text style={styles.sigLine}>Customer signature</Text>
          </View>
        </View>

        <Text style={styles.note}>
          Ensolar Solutions Installation Services — Solar · Electrical · CCTV · FDAS · Solar Pumps
        </Text>
      </Page>
    </Document>
  );
}
