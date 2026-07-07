"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

const PURPOSES = [
  "DOWNPAYMENT",
  "INSTALLMENT",
  "UTILITIES",
  "SAND_FILLING",
  "DOCUMENT_VERIFICATION",
  "MISCELLANEOUS",
  "FULL_SETTLEMENT",
] as const;

interface LedgerRow {
  purpose: string;
  installmentIndex: number | null;
  amountDue: number;
  amountPaid: number;
  status: string;
}

interface Customer {
  id: string;
  trackingId: string;
  fullName: string;
  totalInstallments: number;
}

interface Props {
  customer: Customer;
  onClose: () => void;
  onSuccess: () => void;
}

function firstUnpaidInstallment(ledger: LedgerRow[]): number {
  const row = ledger.find(
    (x) =>
      x.purpose === "INSTALLMENT" &&
      x.status !== "PAID" &&
      x.amountDue - x.amountPaid > 0.01,
  );
  return row?.installmentIndex ?? 1;
}

export function PaymentEntryModal({ customer, onClose, onSuccess }: Props) {
  const [purpose, setPurpose] = useState<string>("INSTALLMENT");
  const [installmentIndex, setInstallmentIndex] = useState(1);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [description, setDescription] = useState("");
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [outstanding, setOutstanding] = useState<{ totalOutstanding: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLedgerLoading(true);
    fetch(`/api/customers/${customer.id}`)
      .then((r) => r.json())
      .then((d) => {
        const rows = (d.ledger ?? []) as LedgerRow[];
        setLedger(rows);
        setInstallmentIndex(firstUnpaidInstallment(rows));
      })
      .finally(() => setLedgerLoading(false));
  }, [customer.id]);

  useEffect(() => {
    if (purpose === "FULL_SETTLEMENT") {
      fetch(`/api/payments/outstanding/${customer.id}`)
        .then((r) => r.json())
        .then((d) => {
          setOutstanding(d);
          setAmount(String(d.totalOutstanding));
        });
    }
  }, [purpose, customer.id]);

  const installmentRow = useMemo(
    () => ledger.find((x) => x.purpose === "INSTALLMENT" && x.installmentIndex === installmentIndex),
    [ledger, installmentIndex],
  );

  const installmentRemaining = useMemo(() => {
    if (!installmentRow) return null;
    return Math.max(0, installmentRow.amountDue - installmentRow.amountPaid);
  }, [installmentRow]);

  useEffect(() => {
    if (purpose !== "INSTALLMENT" || installmentRemaining === null) return;
    setAmount(String(installmentRemaining));
  }, [purpose, installmentIndex, installmentRemaining]);

  const installmentPaid = installmentRow?.status === "PAID" || (installmentRemaining ?? 0) <= 0.01;

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const isSettle = purpose === "FULL_SETTLEMENT";
      const url = isSettle ? "/api/payments/settle" : "/api/payments";

      let payAmount = Number(amount || 0);
      if (purpose === "INSTALLMENT" && installmentRemaining !== null) {
        if (installmentPaid) {
          throw new Error("This installment is already fully paid. Select another month.");
        }
        // Never allow more than remaining for this month
        payAmount = Math.min(payAmount, installmentRemaining);
      }
      if (!Number.isFinite(payAmount) || payAmount <= 0) {
        throw new Error("Please enter a valid payment amount.");
      }

      const body = isSettle
        ? {
            customerId: customer.id,
            amountPaid: payAmount,
            paymentMethod: method,
            settlementType: "EARLY_PAYOFF",
          }
        : {
            customerId: customer.id,
            purpose,
            ...(purpose === "INSTALLMENT" ? { installmentIndex } : {}),
            amountPaid: payAmount,
            paymentMethod: method,
            ...(description ? { description } : {}),
          };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Payment failed");
      }
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md rounded-xl border border-card-border bg-surface p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Record Payment</h2>
            <button onClick={onClose} className="text-muted-text hover:text-foreground"><X size={20} /></button>
          </div>
          <p className="mb-4 text-sm text-muted-text">{customer.trackingId} — {customer.fullName}</p>
          <div className="space-y-3">
            <div>
              <Label>Payment Purpose</Label>
              <Select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                {PURPOSES.map((p) => (
                  <option key={p} value={p}>{p.replace(/_/g, " ")}</option>
                ))}
              </Select>
            </div>
            {purpose === "INSTALLMENT" && (
              <div>
                <Label>Month (1–{customer.totalInstallments})</Label>
                <Input
                  type="number"
                  min={1}
                  max={customer.totalInstallments}
                  value={installmentIndex}
                  onChange={(e) => setInstallmentIndex(Number(e.target.value))}
                  disabled={ledgerLoading}
                />
                {ledgerLoading ? (
                  <Skeleton className="mt-2 h-3 w-48" />
                ) : installmentRow ? (
                  <p className={`mt-1 text-xs ${installmentPaid ? "text-emerald" : "text-muted-text"}`}>
                    {installmentPaid
                      ? `Month ${installmentIndex} is already paid.`
                      : `Remaining for month ${installmentIndex}: ৳${installmentRemaining?.toLocaleString("en-IN")}/-`}
                  </p>
                ) : null}
              </div>
            )}
            {purpose === "FULL_SETTLEMENT" && outstanding && (
              <div className="rounded-lg bg-surface-alt p-3 text-sm">
                <p>Outstanding: ৳{outstanding.totalOutstanding.toLocaleString("en-IN")}</p>
              </div>
            )}
            <div>
              <Label>Amount (BDT)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                readOnly={purpose === "FULL_SETTLEMENT"}
              />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CASH">Cash</option>
                <option value="MOBILE_BANKING">Mobile Banking</option>
              </Select>
            </div>
            {["UTILITIES", "MISCELLANEOUS"].includes(purpose) && (
              <div>
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            )}
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button
              className="w-full"
              onClick={submit}
              disabled={loading || ledgerLoading || (purpose === "INSTALLMENT" && installmentPaid)}
            >
              {loading ? "Processing..." : "Confirm Payment"}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
