import React from "react";
import logoPrimary from "@/assets/logo/logo-primary.png";

const money = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "--"
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
}

export default function InvoiceDocument({ invoice }) {
  if (!invoice) {
    return (
      <div className="rounded-xl border border-dashed border-plum/20 bg-white p-6 text-sm text-plum/70">
        No demo invoice selected.
      </div>
    );
  }

  return (
    <article className="overflow-hidden rounded-xl border border-plum/10 bg-white shadow-sm">
      <div className="border-t-8 border-gold p-5 sm:p-7">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <img src={logoPrimary} alt="CleanPro Demo" className="h-12 w-auto" />
            <div>
              <p className="text-lg font-semibold text-plum">CleanPro Demo</p>
              <p className="text-xs text-plum/60">Professional Cleaning Services</p>
            </div>
          </div>

          <div className="rounded-lg bg-[#EEF5FB] px-4 py-3 text-sm text-plum sm:text-right">
            <p className="font-semibold">{invoice.invoiceNumber}</p>
            <p>Created {formatDate(invoice.createdAt || invoice.issueDate)}</p>
            <p>Due {formatDate(invoice.dueDate)}</p>
          </div>
        </header>

        <h1 className="my-8 text-center text-2xl font-bold uppercase tracking-wide text-plum">
          Invoice
        </h1>

        <section className="grid gap-4 md:grid-cols-2">
          <InfoBlock title="Bill To">
            <p className="font-semibold">{invoice.clientName}</p>
            <p>{invoice.clientAddress}</p>
          </InfoBlock>

          <InfoBlock title="Appointment">
            <Detail label="Service" value={invoice.serviceName} />
            <Detail
              label="Date / Time"
              value={`${formatDate(invoice.appointmentDate)} at ${invoice.appointmentTime}`}
            />
            <Detail label="Frequency" value={invoice.frequency} />
            <Detail label="Status" value={invoice.status} />
            <Detail label="Service address" value={invoice.serviceAddress} />
          </InfoBlock>
        </section>

        <section className="mt-7 overflow-hidden rounded-lg border border-plum/10">
          <table className="w-full text-sm">
            <thead className="bg-plum text-left text-white">
              <tr>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 text-right font-semibold">Qty</th>
                <th className="px-4 py-3 text-right font-semibold">Unit</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-plum/10">
              {(invoice.lineItems || []).map((item) => (
                <tr key={item.label || item.description}>
                  <td className="px-4 py-3 text-plum">{item.label || item.description}</td>
                  <td className="px-4 py-3 text-right text-plum/75">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-plum/75">
                    {money(item.unitPrice)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-plum">
                    {money(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <InfoBlock title="Payment Details">
              <Detail label="Payment status" value={invoice.paymentStatus} />
              <Detail label="Payment method" value={invoice.paymentMethod} />
            </InfoBlock>

            <InfoBlock title="Notes For Cleaner">
              <p>{invoice.cleanerNotes}</p>
            </InfoBlock>

            <InfoBlock title="Terms And Conditions">
              <p>{invoice.terms}</p>
            </InfoBlock>
          </div>

          <div className="h-fit rounded-lg border border-plum/10 bg-[#F7F7F7] p-4 text-sm">
            <TotalRow label="Subtotal" value={invoice.subtotal} />
            <TotalRow label="Deposit received" value={invoice.depositReceived} />
            <TotalRow label="Amount paid" value={invoice.amountPaid} />
            <div className="mt-3 border-t border-plum/10 pt-3">
              <div className="flex items-center justify-between text-lg font-bold text-plum">
                <span>Amount due</span>
                <span>{money(invoice.amountDue)}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}

function InfoBlock({ title, children }) {
  return (
    <div className="rounded-lg border border-plum/10 bg-white p-4 text-sm text-plum/80">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-gold">
        {title}
      </h2>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <p>
      <span className="font-semibold text-plum">{label}: </span>
      <span>{value || "--"}</span>
    </p>
  );
}

function TotalRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-plum/10 py-2 text-plum">
      <span>{label}</span>
      <span className="font-semibold">{money(value)}</span>
    </div>
  );
}
