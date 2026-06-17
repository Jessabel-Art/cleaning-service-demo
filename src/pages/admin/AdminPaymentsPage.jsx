import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAllDemoInvoices } from "@/data/demoRuntime";

const money = (n) =>
  Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "--" : date.toLocaleDateString();
}

export default function AdminPaymentsPage() {
  const [search, setSearch] = useState("");
  const invoices = useMemo(() => getAllDemoInvoices(), []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return invoices;
    return invoices.filter((invoice) =>
      [
        invoice.invoiceNumber,
        invoice.clientName,
        invoice.serviceName,
        invoice.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [invoices, search]);

  const totals = useMemo(
    () => ({
      billed: invoices.reduce((sum, invoice) => sum + invoice.total, 0),
      paid: invoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0),
      due: invoices.reduce((sum, invoice) => sum + invoice.amountDue, 0),
    }),
    [invoices]
  );

  const exportCsv = () => {
    const rows = [
      ["Invoice", "Client", "Service", "Status", "Issue Date", "Total", "Paid", "Due"],
      ...filtered.map((invoice) => [
        invoice.invoiceNumber,
        invoice.clientName,
        invoice.serviceName,
        invoice.status,
        formatDate(invoice.issueDate),
        invoice.total,
        invoice.paidAmount,
        invoice.amountDue,
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cleanpro-demo-invoices.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-plum">Invoices</h2>
        <p className="text-sm text-plum/70">
          Demo invoice and payment summaries from local data.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Billed" value={money(totals.billed)} />
        <Metric label="Paid" value={money(totals.paid)} />
        <Metric label="Open balance" value={money(totals.due)} />
      </div>

      <Card className="bg-white border-plum/10">
        <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-plum flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gold" />
            Invoice ledger
          </CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-plum/50 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                className="bg-white pl-9"
                placeholder="Search invoices"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Button variant="outline" onClick={exportCsv} className="border-plum text-plum">
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-plum/60 border-b border-plum/10">
              <tr>
                <th className="py-3 pr-4">Invoice</th>
                <th className="py-3 pr-4">Client</th>
                <th className="py-3 pr-4">Service</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4 text-right">Total</th>
                <th className="py-3 pr-4 text-right">Due</th>
                <th className="py-3 pr-4 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-plum/10">
              {filtered.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="py-3 pr-4 font-medium text-plum">
                    {invoice.invoiceNumber}
                    <p className="text-xs text-plum/50">{formatDate(invoice.issueDate)}</p>
                  </td>
                  <td className="py-3 pr-4 text-plum">{invoice.clientName}</td>
                  <td className="py-3 pr-4 text-plum/75">{invoice.serviceName}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full bg-[#EEF5FB] px-2 py-1 text-xs text-[#0B283D]">
                      {invoice.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right text-plum">{money(invoice.total)}</td>
                  <td className="py-3 pr-4 text-right text-plum">{money(invoice.amountDue)}</td>
                  <td className="py-3 pr-4 text-right">
                    <Button asChild size="sm" variant="outline" className="border-gold/60 text-gold hover:bg-gold/10">
                      <Link to={`/invoices/${invoice.id}`}>Invoice</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-white border border-plum/10 p-4">
      <p className="text-xs uppercase tracking-wide text-plum/50">{label}</p>
      <p className="text-xl font-semibold text-plum">{value}</p>
    </div>
  );
}
