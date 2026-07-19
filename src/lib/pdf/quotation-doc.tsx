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

// DejaVu ships in public/fonts (free Bitstream Vera license) because the
// built-in PDF fonts have no ₱ glyph.
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
  page: { fontFamily: "DejaVu", fontSize: 9, padding: 40, color: "#111" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  companyName: { fontSize: 15, fontWeight: "bold", color: "#157A2C" },
  companySub: { fontSize: 8, color: "#333", marginTop: 1 },
  rule: { borderBottomWidth: 2, borderBottomColor: GREEN, marginTop: 8, marginBottom: 14 },
  title: { fontSize: 13, fontWeight: "bold", textAlign: "center", marginBottom: 10 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  label: { color: "#555" },
  bold: { fontWeight: "bold" },
  table: { borderWidth: 1, borderColor: "#999" },
  tr: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#999" },
  th: { fontWeight: "bold", backgroundColor: "#EFEFEF", paddingVertical: 5, paddingHorizontal: 6 },
  td: { paddingVertical: 5, paddingHorizontal: 6 },
  cDesc: { flex: 5 },
  cQty: { flex: 1, textAlign: "right" },
  cPrice: { flex: 2, textAlign: "right" },
  cTotal: { flex: 2, textAlign: "right" },
  totals: { marginTop: 8, alignSelf: "flex-end", width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  grand: { borderTopWidth: 1, borderTopColor: "#111", marginTop: 3, paddingTop: 4, fontSize: 11, fontWeight: "bold" },
  terms: { marginTop: 16 },
  sigRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 44 },
  sigBox: { width: 200 },
  sigLine: { borderTopWidth: 1, borderTopColor: "#111", marginTop: 28, paddingTop: 3, textAlign: "center" },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, textAlign: "center", fontSize: 7, color: "#777" },
});

function Logo() {
  return (
    <Svg width={46} height={46} viewBox="0 0 512 512">
      <Rect x={12} y={12} width={488} height={488} fill={YELLOW} stroke="#000" strokeWidth={24} />
      <Rect x={244} y={12} width={24} height={488} fill="#000" />
      <Rect x={118} y={128} width={288} height={82} fill={GREEN} stroke="#000" strokeWidth={14} />
      <Rect x={138} y={288} width={288} height={82} fill={GREEN} stroke="#000" strokeWidth={14} />
    </Svg>
  );
}

export type QuotationPdfData = {
  quote_no: string;
  created_at: string;
  valid_until: string | null;
  customer: { name: string; phone?: string | null; address?: string | null };
  items: { description: string; qty: number; unit_price: number; line_total: number }[];
  subtotal: number;
  discount: number;
  total: number;
  terms: string | null;
  prepared_by: string;
};

function peso(n: number): string {
  return (
    "₱" +
    n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

function d(date: string | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Manila",
  }).format(new Date(date));
}

export function QuotationPdf({ data }: { data: QuotationPdfData }) {
  return (
    <Document title={data.quote_no}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Logo />
          <View>
            <Text style={styles.companyName}>
              ENSOLAR SOLUTIONS <Text style={{ color: "#111", fontSize: 11 }}>Installations Services</Text>
            </Text>
            <Text style={styles.companySub}>
              19 Espina Road, Taclobo, Dumaguete City 6200, Negros Oriental, Philippines
            </Text>
            <Text style={styles.companySub}>
              Landline: (035) 531-6455 · Mobile: (Smart) 0961-885-6986 · (TM) 0953-561-2557
            </Text>
            <Text style={styles.companySub}>
              info.ensolarsolutions@gmail.com · facebook.com/reneric2016
            </Text>
          </View>
        </View>
        <View style={styles.rule} />

        <Text style={styles.title}>QUOTATION</Text>

        <View style={styles.metaRow}>
          <View>
            <Text style={styles.label}>Quotation for:</Text>
            <Text style={styles.bold}>{data.customer.name}</Text>
            {data.customer.address ? <Text>{data.customer.address}</Text> : null}
            {data.customer.phone ? <Text>{data.customer.phone}</Text> : null}
          </View>
          <View>
            <Text>
              <Text style={styles.label}>Quotation No: </Text>
              <Text style={styles.bold}>{data.quote_no}</Text>
            </Text>
            <Text>
              <Text style={styles.label}>Date: </Text>
              {d(data.created_at)}
            </Text>
            <Text>
              <Text style={styles.label}>Valid until: </Text>
              {d(data.valid_until)}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.tr, { borderTopWidth: 0 }]}>
            <Text style={[styles.th, styles.cDesc]}>Description</Text>
            <Text style={[styles.th, styles.cQty]}>Qty</Text>
            <Text style={[styles.th, styles.cPrice]}>Unit Price</Text>
            <Text style={[styles.th, styles.cTotal]}>Amount</Text>
          </View>
          {data.items.map((item, i) => (
            <View key={i} style={styles.tr}>
              <Text style={[styles.td, styles.cDesc]}>{item.description}</Text>
              <Text style={[styles.td, styles.cQty]}>{item.qty}</Text>
              <Text style={[styles.td, styles.cPrice]}>{peso(item.unit_price)}</Text>
              <Text style={[styles.td, styles.cTotal]}>{peso(item.line_total)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.label}>Subtotal</Text>
            <Text>{peso(data.subtotal)}</Text>
          </View>
          {data.discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.label}>Discount</Text>
              <Text>-{peso(data.discount)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grand]}>
            <Text>TOTAL</Text>
            <Text>{peso(data.total)}</Text>
          </View>
        </View>

        {data.terms ? (
          <View style={styles.terms}>
            <Text style={styles.bold}>Terms & Conditions</Text>
            <Text style={{ marginTop: 3, lineHeight: 1.5 }}>{data.terms}</Text>
          </View>
        ) : null}

        <View style={styles.sigRow}>
          <View style={styles.sigBox}>
            <Text style={styles.label}>Prepared by:</Text>
            <Text style={styles.sigLine}>{data.prepared_by}</Text>
          </View>
          <View style={styles.sigBox}>
            <Text style={styles.label}>Conforme (customer):</Text>
            <Text style={styles.sigLine}>Signature over printed name / Date</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Thank you for choosing Ensolar Solutions Installation Services — Solar · Electrical · CCTV · FDAS · Solar Pumps
        </Text>
      </Page>
    </Document>
  );
}
