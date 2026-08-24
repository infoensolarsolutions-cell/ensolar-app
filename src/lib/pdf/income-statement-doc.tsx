import path from "node:path";
import {
  Document, Font, Page, StyleSheet, Svg, Rect, Text, View,
} from "@react-pdf/renderer";
import type { IncomeStatement, StmtRow } from "@/lib/income-statement";

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
  page: { fontFamily: "DejaVu", fontSize: 6.8, padding: 28, color: "#111" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  companyName: { fontSize: 12, fontWeight: "bold", color: "#157A2C" },
  companySub: { fontSize: 6.5, color: "#333", marginTop: 1 },
  rule: { borderBottomWidth: 2, borderBottomColor: GREEN, marginTop: 5, marginBottom: 8 },
  title: { fontSize: 11, fontWeight: "bold", textAlign: "center" },
  subtitle: { fontSize: 7, color: "#555", textAlign: "center", marginBottom: 8 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#E5E5E5" },
  label: { flex: 2.6, paddingVertical: 2.2, paddingRight: 4 },
  cell: { flex: 1, paddingVertical: 2.2, textAlign: "right" },
  bold: { fontWeight: "bold" },
  headerCell: { backgroundColor: "#EFEFEF", fontWeight: "bold" },
  totalRow: { backgroundColor: "#F2FBF4", fontWeight: "bold", borderTopWidth: 1, borderTopColor: "#111" },
  footer: { position: "absolute", bottom: 16, left: 28, right: 28, textAlign: "center", fontSize: 6, color: "#999" },
});

function Logo() {
  return (
    <Svg width={30} height={30} viewBox="0 0 512 512">
      <Rect x={12} y={12} width={488} height={488} fill={YELLOW} stroke="#000" strokeWidth={24} />
      <Rect x={244} y={12} width={24} height={488} fill="#000" />
      <Rect x={118} y={128} width={288} height={82} fill={GREEN} stroke="#000" strokeWidth={14} />
      <Rect x={138} y={288} width={288} height={82} fill={GREEN} stroke="#000" strokeWidth={14} />
    </Svg>
  );
}

const money = (n: number): string =>
  n === 0
    ? "–"
    : n < 0
      ? `(${Math.abs(n).toLocaleString("en-PH", { maximumFractionDigits: 0 })})`
      : n.toLocaleString("en-PH", { maximumFractionDigits: 0 });

const pct = (v: number): string => (Number.isNaN(v) ? "–" : `${Math.round(v * 100)}%`);

function cellText(row: StmtRow, v: number): string {
  return row.kind === "pct" ? pct(v) : money(v);
}

export function IncomeStatementPdf({ statement }: { statement: IncomeStatement }) {
  const { title, columnLabels, rows } = statement;
  return (
    <Document title={title}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.headerRow}>
          <Logo />
          <View>
            <Text style={styles.companyName}>
              ENSOLAR SOLUTIONS <Text style={{ color: "#111", fontSize: 8 }}>Installations Services</Text>
            </Text>
            <Text style={styles.companySub}>
              19 Espina Road, Taclobo, Dumaguete City 6200, Negros Oriental, Philippines · (035) 531-6455 · info.ensolarsolutions@gmail.com
            </Text>
          </View>
        </View>
        <View style={styles.rule} />

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          Cash basis · amounts in Philippine Pesos · ( ) denotes negative
        </Text>

        <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: "#111" }]}>
          <Text style={[styles.label, styles.bold]}> </Text>
          {columnLabels.map((m) => (
            <Text key={m} style={[styles.cell, styles.bold]}>{m}</Text>
          ))}
          <Text style={[styles.cell, styles.bold]}>TOTAL</Text>
        </View>

        {rows.map((row, i) => {
          if (row.kind === "header") {
            return (
              <View key={i} style={[styles.row, styles.headerCell]}>
                <Text style={[styles.label, styles.bold]}>{row.label}</Text>
                {columnLabels.map((m) => (
                  <Text key={m} style={styles.cell}> </Text>
                ))}
                <Text style={styles.cell}> </Text>
              </View>
            );
          }
          const rowStyle =
            row.kind === "total"
              ? [styles.row, styles.totalRow]
              : row.kind === "subtotal"
                ? [styles.row, { fontWeight: "bold" as const }]
                : [styles.row];
          return (
            <View key={i} style={rowStyle}>
              <Text style={[styles.label, ...(row.kind === "line" ? [{ paddingLeft: 8 }] : [])]}>
                {row.label}
              </Text>
              {row.values.map((v, j) => (
                <Text key={j} style={styles.cell}>{cellText(row, v)}</Text>
              ))}
              <Text style={[styles.cell, styles.bold]}>{cellText(row, row.total)}</Text>
            </View>
          );
        })}

        <Text style={styles.footer} fixed>
          Generated from the Ensolar Business Management System · cash-basis figures from recorded payments, POS sales, project costs and expenses
        </Text>
      </Page>
    </Document>
  );
}
