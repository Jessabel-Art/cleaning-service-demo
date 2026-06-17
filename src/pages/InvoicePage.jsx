import React, { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import InvoiceDocument from "@/components/invoices/InvoiceDocument";
import { getAllDemoInvoices } from "@/data/demoRuntime";

export default function InvoicePage() {
  const { invoiceId } = useParams();
  const invoices = useMemo(() => getAllDemoInvoices(), []);
  const invoice =
    invoices.find(
      (item) => item.id === invoiceId || item.invoiceNumber === invoiceId
    ) || invoices[0];

  return (
    <div className="min-h-[90vh] bg-[#F7F7F7] px-3 py-8 sm:px-4 md:py-12">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-plum">Demo Invoice</h1>
            <p className="text-sm text-plum/70">
              Rendered from local hardcoded demo data only.
            </p>
          </div>
          <Button asChild variant="outline" className="border-plum text-plum">
            <Link to="/payment-center">Back to payment center</Link>
          </Button>
        </div>

        <InvoiceDocument invoice={invoice} />
      </div>
    </div>
  );
}
