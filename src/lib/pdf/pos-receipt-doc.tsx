import path from "node:path";
import {
  Document, Font, Page, StyleSheet, Svg, Rect, Text, View,
} from "@react-pdf/renderer";

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
  page: { fontFamily: "DejaVu", fontSize: 9, padding: 30, color: "#111" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  companyName: { fontSize: 12, fontWeight: "bold", color: "#157A2C" },
  companySub: { fontSize: 7, color: "#333", marginTop: 1 },
  rule: { borderBottomWidth: 2, borderBottomColor: GREEN, marginTop: 6, marginBottom: 10 },
  title: { fontSize: 11, fontWeight: "bold", textAlign: "center", marginBottom: 2 },
  subtitle: { fontSize: 7, color: "#666", textAlign: "center", marginBottom: 10 },
  meta: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  label: { color: "#555" },
  bold: { fontWeight: "bold" },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ccc", paddingVertical: 3 },
  cName: { flex: 5 },
  cQty: { flex: 1, textAlign: "right" },
  cPrice: { flex: 2, textAlign: "right" },
  cTotal: { flex: 2, textAlign: "right" },
  totals: { marginTop: 6, alignSelf: "flex-end", width: 180 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.5 },
  grand: { borderTopWidth: 1, borderTopColor: "#111", marginTop: 2, paddingTop: 3, fontSize: 11, fontWeight: "bold" },
  footer: { marginTop: 16, textAlign: "center", fontSize: 7, color: "#777" },
});

function Logo() {
  return (
    <Svg width={34} height={34} viewBox="0 0 512 512">
      <Rect x={12} y={12} width={488} height={488} fill={YELLOW} stroke="#000" strokeWidth={24} />
      <Rect x={244} y={12} width={24} height={488} fill="#000" />
      <Rect x={118} y={128} width={288} height={82} fill={GREEN} stroke="#000" strokeWidth={14} />
      <Rect x={138} y={288} width={288} height={82} fill={GREEN} stroke="#000" strokeWidth={14} />
    </Svg>
  );
}

export type PosReceiptData = {
  sale_no: string;
  sold_at: string;
  lines: { name: string; qty: number; unit_price: number; line_total: number }[];
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  provider_ref: string | null;
  sold_by: string;
};

function peso(n: number): string {
  return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PosReceiptPdf({ data }: { data: PosReceiptData }) {
  return (
    <Document title={data.sale_no}>
      <Page size="A5" style={styles.page}>
        <View style={styles.headerRow}>
          <Logo />
          <View>
            <Text style={styles.companyName}>
              ENSOLAR SOLUTIONS <Text style={{ color: "#111", fontSize: 9 }}>Installations Services</Text>
            </Text>
            <Text style={styles.companySub}>
              19 Espina Road, Taclobo, Dumaguete City 6200, Negros Oriental
            </Text>
            <Text style={styles.companySub}>
              (035) 531-6455 · 0961-885-6986 · info.ensolarsolutions@gmail.com
            </Text>
          </View>
        </View>
        <View style={styles.rule} />

        <Text style={styles.title}>SALES RECEIPT</Text>
        <Text style={styles.subtitle}>This is not a BIR official receipt.</Text>

        <View style={styles.meta}>
          <Text><Text style={styles.label}>Sale No: </Text><Text style={styles.bold}>{data.sale_no}</Text></Text>
          <Text>
            <Text style={styles.label}>Date: </Text>
            {new Intl.DateTimeFormat("en-PH", {
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila",
            }).format(new Date(data.sold_at))}
          </Text>
        </View>

        <View style={[styles.tr, { borderBottomWidth: 1, borderBottomColor: "#111" }]}>
          <Text style={[styles.cName, styles.bold]}>Item</Text>
          <Text style={[styles.cQty, styles.bold]}>Qty</Text>
          <Text style={[styles.cPrice, styles.bold]}>Price</Text>
          <Text style={[styles.cTotal, styles.bold]}>Amount</Text>
        </View>
        {data.lines.map((l, i) => (
          <View key={i} style={styles.tr}>
            <Text style={styles.cName}>{l.name}</Text>
            <Text style={styles.cQty}>{l.qty}</Text>
            <Text style={styles.cPrice}>{peso(l.unit_price)}</Text>
            <Text style={styles.cTotal}>{peso(l.line_total)}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.label}>Subtotal</Text><Text>{peso(data.subtotal)}</Text>
          </View>
          {data.discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.label}>Discount</Text><Text>-{peso(data.discount)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grand]}>
            <Text>TOTAL</Text><Text>{peso(data.total)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.label}>Paid via</Text>
            <Text>
              {data.payment_method.replace("_", " ")}
              {data.provider_ref ? ` (${data.provider_ref})` : ""}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Served by {data.sold_by} · Thank you for your purchase!{"\n"}
          Solar · Electrical · CCTV · FDAS · Solar Pumps
        </Text>
      </Page>
    </Document>
  );
}
