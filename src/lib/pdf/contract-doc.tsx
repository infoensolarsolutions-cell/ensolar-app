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
  page: { fontFamily: "DejaVu", fontSize: 9.5, paddingTop: 36, paddingBottom: 48, paddingHorizontal: 46, color: "#111", lineHeight: 1.45 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  companyName: { fontSize: 12, fontWeight: "bold", color: "#157A2C" },
  companySub: { fontSize: 7, color: "#333", marginTop: 1 },
  rule: { borderBottomWidth: 2, borderBottomColor: GREEN, marginTop: 6, marginBottom: 14 },
  title: { fontSize: 12, fontWeight: "bold", textAlign: "center", marginBottom: 10 },
  para: { marginBottom: 6, textAlign: "justify" },
  bold: { fontWeight: "bold" },
  footer: {
    position: "absolute", bottom: 22, left: 46, right: 46,
    textAlign: "center", fontSize: 7, color: "#999",
  },
});

function Logo() {
  return (
    <Svg width={36} height={36} viewBox="0 0 512 512">
      <Rect x={12} y={12} width={488} height={488} fill={YELLOW} stroke="#000" strokeWidth={24} />
      <Rect x={244} y={12} width={24} height={488} fill="#000" />
      <Rect x={118} y={128} width={288} height={82} fill={GREEN} stroke="#000" strokeWidth={14} />
      <Rect x={138} y={288} width={288} height={82} fill={GREEN} stroke="#000" strokeWidth={14} />
    </Svg>
  );
}

function isHeadingLine(line: string): boolean {
  const letters = line.replace(/[^A-Za-z]/g, "");
  if (!letters) return false;
  const upper = letters.replace(/[^A-Z]/g, "");
  return line.length <= 70 && upper.length / letters.length > 0.9;
}

export function ContractPdf({
  contractNo,
  body,
}: {
  contractNo: string;
  body: string;
}) {
  // Blank-line-separated blocks; first non-empty line is the document title.
  const blocks = body.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const titleBlock = blocks[0]?.trim() ?? "";
  const rest = blocks.slice(1);

  return (
    <Document title={contractNo}>
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
              (035) 531-6455 · 0961-885-6986 · info.ensolarsolutions@gmail.com
            </Text>
          </View>
        </View>
        <View style={styles.rule} fixed />

        <Text style={styles.title}>{titleBlock}</Text>
        <Text style={{ fontSize: 8, color: "#666", textAlign: "center", marginBottom: 10 }}>
          {contractNo}
        </Text>

        {rest.map((block, i) => {
          const lines = block.split("\n");
          const heading = lines.length === 1 && isHeadingLine(lines[0].trim());
          return (
            <Text key={i} style={[styles.para, ...(heading ? [styles.bold] : [])]}>
              {block}
            </Text>
          );
        })}

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${contractNo} · Page ${pageNumber} of ${totalPages}`
          }
        />
      </Page>
    </Document>
  );
}
