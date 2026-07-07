import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { BRAND, CORPORATE_OFFICE } from "@/lib/constants/brand";
import { formatCurrency } from "@/lib/i18n/format";
import { PURPOSE_LABELS } from "@/features/payments/utils/purpose-labels";
import type { PaymentMethod, PaymentPurpose } from "@prisma/client";

Font.register({
  family: "HindSiliguri",
  src: "https://fonts.gstatic.com/s/hindsiliguri/v12/5aU669o8X9htMNmrwW_3ee1w2A.ttf",
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1a1a1a",
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#0d6b4d",
    paddingBottom: 12,
    marginBottom: 20,
  },
  brand: { fontSize: 18, fontWeight: "bold", color: "#0d6b4d" },
  brandBn: { fontFamily: "HindSiliguri", fontSize: 11, color: "#555", marginTop: 2 },
  title: { fontSize: 14, fontWeight: "bold", marginTop: 10, letterSpacing: 1 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  label: { color: "#666", width: "40%" },
  value: { width: "60%", textAlign: "right" },
  amountBox: {
    marginTop: 16,
    marginBottom: 16,
    padding: 14,
    backgroundColor: "#f4faf7",
    borderWidth: 1,
    borderColor: "#0d6b4d",
  },
  amountEn: { fontSize: 16, fontWeight: "bold", color: "#0d6b4d" },
  amountBn: { fontFamily: "HindSiliguri", fontSize: 12, marginTop: 4, color: "#333" },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: 12,
  },
  signature: { marginTop: 24, flexDirection: "row", justifyContent: "space-between" },
  sigLine: { borderTopWidth: 1, borderTopColor: "#999", width: "40%", paddingTop: 4, fontSize: 8, color: "#666" },
  hash: { fontSize: 7, color: "#999", marginTop: 8 },
});

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  MOBILE_BANKING: "Mobile Banking",
};

export interface ReceiptPdfData {
  slNo: number;
  trackingId: string;
  customerName: string;
  purpose: PaymentPurpose;
  installmentIndex?: number | null;
  amount: number;
  paymentMethod: PaymentMethod;
  signatureAnchor: string;
  issuedAt: Date;
}

function ReceiptDocument({ data }: { data: ReceiptPdfData }) {
  const purposeLabel = PURPOSE_LABELS[data.purpose]?.en ?? data.purpose;
  const purposeBn = PURPOSE_LABELS[data.purpose]?.bn ?? data.purpose;
  const monthLine =
    data.purpose === "INSTALLMENT" && data.installmentIndex
      ? ` (Month ${data.installmentIndex})`
      : "";

  return (
    <Document>
      <Page size="A5" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>{BRAND.nameEn}</Text>
          <Text style={styles.brandBn}>{BRAND.nameBn}</Text>
          <Text style={{ fontSize: 8, color: "#888", marginTop: 4 }}>{CORPORATE_OFFICE.addressEn}</Text>
          <Text style={styles.title}>MONEY RECEIPT</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Receipt No.</Text>
          <Text style={styles.value}>{data.slNo}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Customer ID</Text>
          <Text style={styles.value}>{data.trackingId}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{data.customerName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Purpose</Text>
          <Text style={styles.value}>
            {purposeLabel}
            {monthLine}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Payment method</Text>
          <Text style={styles.value}>{METHOD_LABELS[data.paymentMethod]}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{data.issuedAt.toLocaleDateString("en-GB")}</Text>
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountEn}>{formatCurrency(data.amount, "en")}</Text>
          <Text style={styles.amountBn}>{formatCurrency(data.amount, "bn")}</Text>
          <Text style={{ fontFamily: "HindSiliguri", fontSize: 9, marginTop: 4, color: "#555" }}>
            {purposeBn}
            {data.installmentIndex ? ` — মাস ${data.installmentIndex}` : ""}
          </Text>
        </View>

        <View style={styles.signature}>
          <View>
            <View style={styles.sigLine}>
              <Text>Authorized Signature</Text>
            </View>
          </View>
          <View>
            <View style={styles.sigLine}>
              <Text>Customer Signature</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.hash}>Verification: {data.signatureAnchor.slice(0, 40)}…</Text>
          <Text style={{ fontSize: 7, color: "#aaa" }}>
            This is a computer-generated receipt. Tampering invalidates the verification hash.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderReceiptPdf(data: ReceiptPdfData): Promise<Buffer> {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  return renderToBuffer(<ReceiptDocument data={data} />);
}
