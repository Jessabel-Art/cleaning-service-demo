import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PaymentInstructions from "@/components/portal/PaymentInstructions";
import InvoiceDocument from "@/components/invoices/InvoiceDocument";
import { getAllDemoInvoices } from "@/data/demoRuntime";

const PAYMENT_INFO = {
  depositAmount: 50,
  cash: true,
  cashApp: "$cleanprodemo",
  zelle: "(000) 000-0000 (recipient: CleanPro Demo)",
  notes: "Please include your full name in the payment note. (Demo only.)",
};

const money = (n) =>
  Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "--" : date.toLocaleDateString();
}

export default function PaymentCenterPage({ initialInvoiceId = "" }) {
  const invoices = useMemo(() => getAllDemoInvoices(), []);
  const [selectedId, setSelectedId] = useState(initialInvoiceId || invoices[0]?.id || "");
  const selected = invoices.find((invoice) => invoice.id === selectedId) || invoices[0];

  useEffect(() => {
    if (initialInvoiceId) setSelectedId(initialInvoiceId);
  }, [initialInvoiceId]);

  return (
    <div className="min-h-[90vh] bg-[#F7F7F7] px-0 py-0 md:px-0 md:py-0">
      <motion.div
        className="mx-auto max-w-6xl space-y-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-plum">
            Payment Center
          </h1>
          <p className="text-plum/75 mt-2">
            Local demo invoices only. No payments are processed.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <Card className="h-fit bg-white border-plum/10">
            <CardHeader>
              <CardTitle className="text-plum flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-gold" />
                Demo invoices
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {invoices.map((invoice) => (
                <button
                  type="button"
                  key={invoice.id}
                  onClick={() => setSelectedId(invoice.id)}
                  className={`w-full text-left rounded-xl border p-4 transition ${
                    selected?.id === invoice.id
                      ? "border-gold bg-gold/10"
                      : "border-plum/10 bg-white hover:border-gold/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-plum">{invoice.invoiceNumber}</p>
                      <p className="text-sm text-plum/70">{invoice.serviceName}</p>
                      <p className="text-xs text-plum/55">
                        {invoice.clientName} · Due {formatDate(invoice.dueDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-plum">{money(invoice.total)}</p>
                      <p className="text-xs text-plum/60">{invoice.paymentStatus}</p>
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-5">
            <InvoiceDocument invoice={selected} />

            <Card className="bg-white border-plum/10">
              <CardHeader>
                <CardTitle className="text-plum flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gold" />
                  Invoice details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {selected ? (
                  <>
                    <Detail label="Invoice" value={selected.invoiceNumber} />
                    <Detail label="Client" value={selected.clientName} />
                    <Detail label="Issue date" value={formatDate(selected.createdAt || selected.issueDate)} />
                    <Detail label="Due date" value={formatDate(selected.dueDate)} />
                    <div className="border-t border-plum/10 pt-3 space-y-2">
                      {selected.lineItems.map((item) => (
                        <div key={item.label} className="flex justify-between gap-3">
                          <span>{item.label}</span>
                          <span>{money(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-plum/10 pt-3 space-y-2 font-medium text-plum">
                      <div className="flex justify-between">
                        <span>Total</span>
                        <span>{money(selected.total)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Paid</span>
                        <span>{money(selected.amountPaid ?? selected.paidAmount)}</span>
                      </div>
                      <div className="flex justify-between text-lg">
                        <span>Amount due</span>
                        <span>{money(selected.amountDue)}</span>
                      </div>
                    </div>
                    <Button className="w-full rounded-full bg-gold hover:bg-gold/90 text-white">
                      Demo payment disabled
                    </Button>
                  </>
                ) : (
                  <p>No demo invoice selected.</p>
                )}
              </CardContent>
            </Card>

            <PaymentInstructions paymentInfo={PAYMENT_INFO} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-plum/50">{label}</p>
      <p className="font-medium text-plum">{value}</p>
    </div>
  );
}
