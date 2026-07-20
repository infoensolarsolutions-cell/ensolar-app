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
  title: { fontSize: 11, fontWeight: "bold", textAlign: "center", marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  label: { color: "#555" },
  bold: { fontWeight: "bold" },
  section: { marginTop: 8, borderTopWidth: 0.5, borderTopColor: "#999", paddingTop: 6 },
  net: {
    marginTop: 10, borderWidth: 1, borderColor: "#111", padding: 8,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  netAmount: { fontSize: 14, fontWeight: "bold" },
  sigRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 36 },
  sigBox: { width: 180 },
  sigLine: { borderTopWidth: 1, borderTopColor: "#111", marginTop: 24, paddingTop: 3, textAlign: "center", fontSize: 8 },
});

function Logo() {
  return (
    <Svg width={32} height={32} viewBox="0 0 512 512">
      <Rect x={12} y={12} width={488} height={488} fill={YELLOW} stroke="#000" strokeWidth={24} />
      <Rect x={244} y={12} width={24} height={488} fill="#000" />
      <Rect x={118} y={128} width={288} height={82} fill={GREEN} stroke="#000" strokeWidth={14} />
      <Rect x={138} y={288} width={288} height={82} fill={GREEN} stroke="#000" strokeWidth={14} />
    </Svg>
  );
}

export type PayslipPdfData = {
  employee_name: string;
  position: string | null;
  period_start: string;
  period_end: string;
  rate: number;
  rate_type: string;
  days_worked: number;
  gross: number;
  sss: number;
  philhealth: number;
  pagibig: number;
  tax: number;
  advance_deduction: number;
  net: number;
};

function peso(n: number): string {
  return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function d(date: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Manila",
  }).format(new Date(`${date}T00:00:00+08:00`));
}

export function PayslipPdf({ data }: { data: PayslipPdfData }) {
  const deductions = data.sss + data.philhealth + data.pagibig + data.tax + data.advance_deduction;
  return (
    <Document title={`Payslip ${data.employee_name}`}>
      <Page size="A5" style={styles.page}>
        <View style={styles.headerRow}>
          <Logo />
          <View>
            <Text style={styles.companyName}>
              ENSOLAR SOLUTIONS <Text style={{ color: "#111", fontSize: 9 }}>Installations Services</Text>
            </Text>
            <Text style={styles.companySub}>
              19 Espina Road, Taclobo, Dumaguete City 6200 · (035) 531-6455
            </Text>
          </View>
        </View>
        <View style={styles.rule} />

        <Text style={styles.title}>PAYSLIP</Text>

        <View style={styles.row}>
          <Text style={styles.bold}>{data.employee_name}</Text>
          <Text>{data.position ?? ""}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Pay period (weekly)</Text>
          <Text>{d(data.period_start)} – {d(data.period_end)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Rate</Text>
          <Text>
            {peso(data.rate)} / {data.rate_type === "daily" ? "day" : "month"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Days credited</Text>
          <Text>{data.days_worked}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.bold}>Gross pay</Text>
            <Text style={styles.bold}>{peso(data.gross)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.bold, { marginBottom: 2 }]}>Deductions</Text>
          <View style={styles.row}><Text style={styles.label}>SSS</Text><Text>{peso(data.sss)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>PhilHealth</Text><Text>{peso(data.philhealth)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Pag-IBIG</Text><Text>{peso(data.pagibig)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Withholding tax</Text><Text>{peso(data.tax)}</Text></View>
          {data.advance_deduction > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Cash advance</Text>
              <Text>{peso(data.advance_deduction)}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.bold}>Total deductions</Text>
            <Text style={styles.bold}>{peso(deductions)}</Text>
          </View>
        </View>

        <View style={styles.net}>
          <Text style={styles.bold}>NET PAY</Text>
          <Text style={styles.netAmount}>{peso(data.net)}</Text>
        </View>

        <View style={styles.sigRow}>
          <View style={styles.sigBox}>
            <Text style={styles.sigLine}>Prepared by</Text>
          </View>
          <View style={styles.sigBox}>
            <Text style={styles.sigLine}>Received by (employee)</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
