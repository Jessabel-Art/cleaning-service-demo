// src/pages/admin/AdminPaymentsPage.jsx
import React, {
  useMemo,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  FileDown,
  Filter,
  DollarSign,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  derivePaymentInfo,
  buildInvoiceLineItems,
  formatMoney,
} from "@/lib/payments";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import logoPrimary from "@/assets/logo/logo-primary.png";

import { useAdminAuth } from "./hooks/useAdminAuth";
import AdminHeader from "./components/AdminHeader";
import AdminSidebar from "./components/AdminSidebar";
import { AdminUIProvider } from "./context/AdminUIContext";
import AuthPage from "../AuthPage";

const PAYMENT_METHOD_OPTIONS = [
  { id: "card_stripe", label: "Card (Stripe)" },
  { id: "cash_app", label: "Cash App" },
  { id: "zelle", label: "Zelle" },
  { id: "cash", label: "Cash" },
  { id: "other", label: "Other" },
];

const PAYMENT_STATUS_OPTIONS = [
  "Paid in full",
  "Deposit paid",
  "Partial payment",
  "Unpaid",
  "Refunded",
  "Cancelled",
];

// small helper to coerce firebase timestamps
function toDate(tsLike) {
  if (!tsLike) return null;
  if (typeof tsLike.toDate === "function") return tsLike.toDate();
  if (tsLike instanceof Date) return tsLike;
  const d = new Date(tsLike);
  return Number.isNaN(d.getTime()) ? null : d;
}

// --- small local normalization helpers ---
function toDateLike(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(v);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeBooking(b) {
  const raw = b.raw || b || {};
  const scheduled = toDateLike(
    b.startAt ??
      b.scheduledAt ??
      b.date ??
      raw.startAt ??
      raw.scheduledAt ??
      raw.date
  );
  return {
    ...b,
    scheduledAt: scheduled,
    startAt: b.startAt ?? raw.startAt,
    date: b.date ?? raw.date,
    amount: Number(
      b.amount ?? b.price ?? b.cost ?? raw.amount ?? raw.price ?? raw.cost ?? 0
    ),
    depositAmount: Number(b.depositAmount ?? raw.depositAmount ?? 0),
    depositPaid: !!(b.depositPaid ?? raw.depositPaid),
    amountPaid: Number(b.amountPaid ?? raw.amountPaid ?? raw.paid ?? 0),
    remainingBalance: b.remainingBalance ?? raw.remainingBalance,
    refunded: !!(b.refunded ?? raw.refunded),
    refundedAmount: Number(b.refundedAmount ?? raw.refundedAmount ?? 0),
    balancePaymentMethod: b.balancePaymentMethod ?? raw.balancePaymentMethod,
    paymentMethod: b.paymentMethod ?? raw.paymentMethod,
    depositPaymentMethod: b.depositPaymentMethod ?? raw.depositPaymentMethod,
    stripePaymentIntentId:
      b.stripePaymentIntentId ?? raw.stripePaymentIntentId,
    stripeSessionId: b.stripeSessionId ?? raw.stripeSessionId,
  };
}

const AdminPaymentsPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAdminAuth();

  // Bookings loaded from Firestore
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [filter, setFilter] = useState("all");

  const [editDepositId, setEditDepositId] = useState(null);
  const [editBalanceId, setEditBalanceId] = useState(null);
  const [payMethodDraft, setPayMethodDraft] = useState("cash_app");

  const [editStatusId, setEditStatusId] = useState(null);
  const [statusDraft, setStatusDraft] = useState("");

  const [generatingPdfFor, setGeneratingPdfFor] = useState(null);

  // ---------- Firestore subscription ----------
  useEffect(() => {
    // Admin view: subscribe to all bookings (ordered newest first)
    let cancelled = false;
    try {
      const col = collection(db, "bookings");
      const q = query(col, orderBy("startAt", "desc"));
      const unsub = onSnapshot(
        q,
        (snap) => {
          if (cancelled) return;
          const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setBookings(rows);
          setLoadingBookings(false);
        },
        (err) => {
          console.error("AdminPayments: failed to load bookings", err);
          toast({
            variant: "destructive",
            title: "Could not load bookings",
            description: String(err?.message || err),
          });
          setLoadingBookings(false);
        }
      );
      return () => {
        cancelled = true;
        unsub();
      };
    } catch (e) {
      console.warn("AdminPayments: subscription failed", e);
      setLoadingBookings(false);
    }
  }, [toast]);

  // Map bookings to include derived payment info from shared helper
  const allRows = useMemo(
    () =>
      bookings.map((b) => {
        const normalized = normalizeBooking(b);
        const payment = derivePaymentInfo(normalized);

        // Allow a manual/overridden payment status from Firestore
        const manualStatus =
          normalized.paymentStatus ||
          normalized.status ||
          b.paymentStatus ||
          b.status;

        if (manualStatus) {
          payment.paymentStatus = manualStatus;
        }

        return {
          id: b.id,
          ...normalized,
          payment,
        };
      }),
    [bookings]
  );

  // ---------- KPI metrics ----------
  const kpis = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    let totalCollected30 = 0;
    let outstandingBalances = 0;
    let depositsNotReceivedCount = 0;
    let refundsThisMonth = 0;

    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    allRows.forEach((r) => {
      const p = r.payment || {};
      const when = toDate(r.startAt || r.scheduledAt);

      const paidAmount = Number(p.amountPaid || 0);
      const remaining = Number(
        p.remainingBalance ?? p.remaining ?? 0
      );
      const depositAmt = Number(p.depositAmount || 0);
      const refundedAmt = Number(p.refundedAmount || 0);

      if (when && when >= thirtyDaysAgo && when <= now) {
        totalCollected30 += paidAmount;
      }

      if (remaining > 0) {
        outstandingBalances += remaining;
      }

      if (depositAmt > 0 && !p.depositPaid) {
        depositsNotReceivedCount += 1;
      }

      if (
        p.refunded &&
        when &&
        when.getFullYear() === currentYear &&
        when.getMonth() === currentMonth
      ) {
        refundsThisMonth += refundedAmt;
      }
    });

    return {
      totalCollected30,
      outstandingBalances,
      depositsNotReceivedCount,
      refundsThisMonth,
    };
  }, [allRows]);

  // ---------- Filtered rows ----------
  const rows = useMemo(() => {
    if (filter === "all") return allRows;
    if (filter === "deposit_not_received")
      return allRows.filter(
        (r) =>
          (r.payment?.depositAmount || 0) > 0 && !r.payment?.depositPaid
      );
    if (filter === "balance_overdue")
      return allRows.filter((r) => {
        const remaining =
          r.payment?.remainingBalance || r.payment?.remaining || 0;
        const when = r.startAt || r.scheduledAt;
        return remaining > 0 && when && toDate(when) < new Date();
      });
    if (filter === "cancelled_with_deposit")
      return allRows.filter(
        (r) =>
          (r.status === "cancelled" || r.status === "canceled") &&
          (r.payment?.depositAmount || 0) > 0 &&
          !r.payment?.depositPaid
      );
    return allRows;
  }, [allRows, filter]);

  // ---------- Filter summary (for visible rows) ----------
  const filterSummary = useMemo(() => {
    let outstanding = 0;
    let missingDeposits = 0;
    let totalDeposits = 0;
    let totalPaid = 0;

    rows.forEach((r) => {
      const p = r.payment || {};
      const remaining = Number(
        p.remainingBalance ?? p.remaining ?? 0
      );
      const depositAmt = Number(p.depositAmount || 0);
      const paidAmt = Number(p.amountPaid || 0);

      totalDeposits += depositAmt;
      totalPaid += paidAmt;
      if (remaining > 0) outstanding += remaining;
      if (depositAmt > 0 && !p.depositPaid) missingDeposits += 1;
    });

    return {
      count: rows.length,
      outstanding,
      missingDeposits,
      totalDeposits,
      totalPaid,
    };
  }, [rows]);

  // ---------- Handlers: mark deposit / balance ----------
  async function handleMarkDepositReceived(booking, method) {
    try {
      const nb = normalizeBooking(booking);
      const info = derivePaymentInfo(nb);
      const depositAmount = Number(info.depositAmount || 0);
      if (depositAmount <= 0) {
        toast({
          title: "No deposit to mark",
          description: "This booking has no deposit configured.",
          variant: "destructive",
        });
        return;
      }
      const ref = doc(db, "bookings", booking.id);
      await updateDoc(ref, {
        depositPaid: true,
        depositPaymentMethod: method,
        depositPaidAt: serverTimestamp ? serverTimestamp() : new Date(),
        updatedAt: serverTimestamp ? serverTimestamp() : new Date(),
      });
      setEditDepositId(null);
      toast({
        title: "Deposit recorded",
        description: `Marked deposit received (${method})`,
      });
    } catch (err) {
      console.error("Could not mark deposit", err);
      toast({
        title: "Could not mark deposit",
        description: String(err?.message || err),
        variant: "destructive",
      });
    }
  }

  async function handleMarkBalancePaid(booking, method) {
    try {
      const nb = normalizeBooking(booking);
      const info = derivePaymentInfo(nb);
      const remaining = Number(info.remainingBalance || 0);
      const amountPaid = Number(info.amountPaid || 0);
      if (remaining <= 0) {
        toast({
          title: "No balance due",
          description: "Remaining balance is zero.",
          variant: "destructive",
        });
        return;
      }
      const ref = doc(db, "bookings", booking.id);
      const newPaid = amountPaid + remaining;
      await updateDoc(ref, {
        amountPaid: newPaid,
        paid: newPaid,
        remainingBalance: 0,
        balancePaymentMethod: method,
        balancePaidAt: serverTimestamp ? serverTimestamp() : new Date(),
        updatedAt: serverTimestamp ? serverTimestamp() : new Date(),
      });
      setEditBalanceId(null);
      toast({
        title: "Balance recorded",
        description: `Marked balance paid (${method})`,
      });
    } catch (err) {
      console.error("Could not mark balance", err);
      toast({
        title: "Could not mark balance",
        description: String(err?.message || err),
        variant: "destructive",
      });
    }
  }

  // ---------- Handler: manual payment status override ----------
  async function handleUpdatePaymentStatus(booking, newStatus) {
    try {
      const ref = doc(db, "bookings", booking.id);
      await updateDoc(ref, {
        paymentStatus: newStatus,
        updatedAt: serverTimestamp ? serverTimestamp() : new Date(),
      });
      setEditStatusId(null);
      toast({
        title: "Status updated",
        description: `Payment status set to "${newStatus}".`,
      });
    } catch (err) {
      console.error("Could not update payment status", err);
      toast({
        title: "Could not update status",
        description: String(err?.message || err),
        variant: "destructive",
      });
    }
  }

  // ---------- Invoice (client-side HTML / CSV) ----------
  function buildInvoiceHtml(booking, info, lineItems, subtotal, discountsTotal) {
    const orderCode = booking.id || "booking";
    const invoiceDate = new Date().toLocaleDateString();
    const addr =
      booking.address || booking.contact?.address || "Address on file";
    const rowsHtml = lineItems
      .map(
        (li) =>
          `<tr><td style="padding:6px 8px">${li.label}</td><td style="padding:6px 8px;text-align:right">${formatMoney(
            li.amount
          )}</td></tr>`
      )
      .join("");

    return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${orderCode}</title></head><body><div style="font-family:Arial,Helvetica,sans-serif;max-width:800px;margin:20px auto;color:#111"><img src="${logoPrimary}" alt="logo" style="height:48px;margin-bottom:12px"/><h2>Invoice</h2><div>Invoice #: <strong>${orderCode}</strong></div><div>Date: ${invoiceDate}</div><div style="margin-top:12px"><strong>Bill to:</strong><div style="white-space:pre-line">${addr}</div></div><table style="width:100%;border-collapse:collapse;margin-top:12px">${rowsHtml}<tr><td style="padding:6px 8px"><strong>Total</strong></td><td style="padding:6px 8px;text-align:right"><strong>${formatMoney(
      subtotal
    )}</strong></td></tr></table></div></body></html>`;
  }

  function handleDownloadInvoiceClient(format, booking) {
    const nb = normalizeBooking(booking);
    const info = derivePaymentInfo(nb);
    const { lineItems, subtotal, discountsTotal } = buildInvoiceLineItems(
      nb,
      info,
      nb.address
    );
    if (format === "pdf") {
      const html = buildInvoiceHtml(
        nb,
        info,
        lineItems,
        subtotal,
        discountsTotal
      );
      const w = window.open("", "_blank");
      if (!w)
        return toast({
          title: "Popup blocked",
          description: "Allow popups to view PDF invoices.",
          variant: "destructive",
        });
      w.document.write(html);
      w.document.close();
    } else if (format === "csv") {
      const cols = ["Label", "Qty", "UnitPrice", "Amount"];
      const lines = [cols.join(",")];
      lineItems.forEach((li) => {
        lines.push(
          [
            `"${li.label.replace(/"/g, '""')}"`,
            li.qty || 1,
            li.unitPrice || "",
            li.amount || "",
          ].join(",")
        );
      });
      const blob = new Blob([lines.join("\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${booking.id || "booking"}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  }

  // ---------- Invoice via Cloud Function ----------
  const handleDownloadInvoice = useCallback(
    async (bookingId) => {
      try {
        setGeneratingPdfFor(bookingId);
        const funcs = await import("firebase/functions");
        const { getFunctions, httpsCallable } = funcs;
        const functionsClient = getFunctions();
        const gen = httpsCallable(functionsClient, "generateInvoicePdf");
        const resp = await gen({ bookingId });
        const data = resp?.data || {};
        if (data && data.url) {
          window.open(data.url, "_blank");
          setGeneratingPdfFor(null);
          return;
        }

        // Fallback: function returned base64 PDF
        if (data && data.pdfBase64) {
          try {
            const filename = `invoice-${bookingId || "invoice"}.pdf`;
            const byteCharacters = atob(data.pdfBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast({
              title: "Invoice downloaded",
              description: "PDF downloaded to your device.",
            });
            setGeneratingPdfFor(null);
            return;
          } catch (decodeErr) {
            console.error("Failed to decode base64 PDF", decodeErr);
            toast({
              variant: "destructive",
              title: "Invoice generation failed",
              description: "Received PDF but could not decode it.",
            });
            setGeneratingPdfFor(null);
            return;
          }
        }

        toast({ variant: "destructive", title: "Invoice generation failed" });
        setGeneratingPdfFor(null);
      } catch (err) {
        console.error("generateInvoicePdf failed", err);
        toast({
          variant: "destructive",
          title: "Could not generate invoice",
          description: String(err?.message || err),
        });
        setGeneratingPdfFor(null);
      }
    },
    [toast]
  );

  // ---------- CSV export ----------
  const handleExportCsv = useCallback(() => {
    if (!rows.length) return;

    const cols = [
      "Date",
      "Client",
      "Service",
      "Total",
      "Deposit",
      "Remaining",
      "Methods",
      "Status",
    ];
    const lines = [cols.join(",")];
    rows.forEach((r) => {
      const dateStr =
        toDate(r.startAt || r.scheduledAt)?.toISOString() || "";
      const payment = r.payment || {};
      const row = [
        dateStr,
        `"${String(r.clientName || "").replace(/"/g, '""')}"`,
        `"${String(r.serviceName || "").replace(/"/g, '""')}"`,
        Number(payment.totalAmount || 0).toFixed(2),
        Number(payment.depositAmount || 0).toFixed(2),
        Number(
          payment.remainingBalance || payment.remaining || 0
        ).toFixed(2),
        `"${String(payment.methodLabel || "").replace(/"/g, '""')}"`,
        payment.paymentStatus || r.status,
      ];
      lines.push(row.join(","));
    });
    const csv = lines.join("\n");
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-payments-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [rows]);

  // ---------- auth/layout guards ----------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCEFF6]">
        <div className="text-[#431039] text-sm font-medium">
          Loading admin…
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <AuthPage />;
  }

  // ---------- helper: status badge classes ----------
  function getStatusBadgeClass(paymentStatus) {
    const s = String(paymentStatus || "").toLowerCase();
    if (s.includes("refunded")) return "bg-slate-100 text-slate-700";
    if (s.includes("paid in full")) return "bg-emerald-100 text-emerald-800";
    if (s.includes("partial")) return "bg-amber-100 text-amber-800";
    if (s.includes("deposit")) return "bg-orange-100 text-orange-800";
    if (s.includes("unpaid")) return "bg-rose-100 text-rose-800";
    return "bg-plum/5 text-plum/80";
  }

  // ---------- main admin shell ----------
  return (
    <AdminUIProvider>
      <div className="min-h-screen flex bg-[#FFF7FB]">
        <AdminSidebar
          activeView="payments"
          onChangeView={() => navigate("/admin")}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader activeView="payments" user={user} />

          <main className="flex-1 px-6 py-4 lg:px-10 lg:py-6 bg-[#FFF7FB]">
            {/* Page header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-plum/60 font-semibold">
                  Admin billing
                </p>
                <h1 className="text-2xl md:text-3xl font-bold text-plum">
                  Payments &amp; Deposits
                </h1>
                <p className="text-xs md:text-sm text-plum/70 max-w-xl">
                  Review deposits, balances, and payment methods across all
                  bookings.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 rounded-full"
                  onClick={handleExportCsv}
                  disabled={!rows.length}
                >
                  <FileDown className="w-4 h-4" />
                  Export CSV
                </Button>
              </div>
            </div>

            {/* KPI strip */}
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
              <div className="bg-white border border-[#F1D8E8] rounded-2xl px-4 py-3 flex flex-col gap-1 shadow-sm">
                <div className="flex items-center justify-between text-[11px] text-plum/70">
                  <span>Last 30 days collected</span>
                  <DollarSign className="w-4 h-4 text-gold" />
                </div>
                <div className="text-lg font-semibold text-plum">
                  {formatMoney(kpis.totalCollected30 || 0)}
                </div>
                <p className="text-[11px] text-plum/60">
                  Based on booking dates in the last 30 days.
                </p>
              </div>

              <div className="bg-white border border-[#F1D8E8] rounded-2xl px-4 py-3 flex flex-col gap-1 shadow-sm">
                <div className="flex items-center justify-between text-[11px] text-plum/70">
                  <span>Outstanding balances</span>
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                </div>
                <div className="text-lg font-semibold text-rose-700">
                  {formatMoney(kpis.outstandingBalances || 0)}
                </div>
                <p className="text-[11px] text-plum/60">
                  Remaining balance across all unpaid or partial bookings.
                </p>
              </div>

              <div className="bg-white border border-[#F1D8E8] rounded-2xl px-4 py-3 flex flex-col gap-1 shadow-sm">
                <div className="flex items-center justify-between text-[11px] text-plum/70">
                  <span>Deposits not received</span>
                  <CreditCard className="w-4 h-4 text-plum" />
                </div>
                <div className="text-lg font-semibold text-plum">
                  {kpis.depositsNotReceivedCount || 0}
                </div>
                <p className="text-[11px] text-plum/60">
                  Bookings where a deposit is required but not yet paid.
                </p>
              </div>

              <div className="bg-white border border-[#F1D8E8] rounded-2xl px-4 py-3 flex flex-col gap-1 shadow-sm">
                <div className="flex items-center justify-between text-[11px] text-plum/70">
                  <span>Refunds this month</span>
                  <RefreshCw className="w-4 h-4 text-plum" />
                </div>
                <div className="text-lg font-semibold text-plum">
                  {formatMoney(kpis.refundsThisMonth || 0)}
                </div>
                <p className="text-[11px] text-plum/60">
                  Total refunded in the current calendar month.
                </p>
              </div>
            </section>

            {/* Filters row */}
            <div className="mb-1 flex flex-col gap-2">
              <div className="flex flex-wrap gap-2 items-center text-[11px]">
                <span className="text-plum/70 font-medium mr-1">Filter:</span>

                <Select
                  value={filter}
                  onValueChange={(v) => setFilter(v)}
                >
                  <SelectTrigger className="h-8 w-56 rounded-full bg-white text-xs text-plum/80 border-plum/20 flex items-center gap-1">
                    <Filter className="w-3 h-3 text-plum/70" />
                    <SelectValue
                      placeholder="All payments"
                      className="text-xs"
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All payments</SelectItem>
                    <SelectItem value="deposit_not_received">
                      Deposit not received
                    </SelectItem>
                    <SelectItem value="balance_overdue">
                      Balance overdue
                    </SelectItem>
                    <SelectItem value="cancelled_with_deposit">
                      Cancelled with deposit
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="text-[11px] text-plum/65">
                {filterSummary.count === 0 ? (
                  <>No bookings match this filter right now.</>
                ) : (
                  <>
                    Showing{" "}
                    <span className="font-semibold text-plum">
                      {filterSummary.count}
                    </span>{" "}
                    bookings · Outstanding{" "}
                    <span className="font-semibold text-plum">
                      {formatMoney(filterSummary.outstanding)}
                    </span>{" "}
                    · Missing deposits:{" "}
                    <span className="font-semibold text-plum">
                      {filterSummary.missingDeposits}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Main table card */}
            <Card className="bg-white border-[#F1D8E8] rounded-2xl shadow-sm mt-3">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-plum">
                  <CreditCard className="w-5 h-5 text-gold" />
                  Payments &amp; deposits overview
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="hidden md:grid grid-cols-[1.3fr_1.8fr_0.8fr_1fr_0.8fr_0.8fr_0.9fr_1.1fr] px-4 py-2 text-[11px] uppercase tracking-[0.08em] text-plum/60 border-t border-[#F1D8E8]">
                  <span>Date</span>
                  <span>Client • Service</span>
                  <span className="text-right">Total</span>
                  <span className="text-right">Payment</span>
                  <span className="text-right">Deposit</span>
                  <span className="text-right">Remaining</span>
                  <span className="text-right">Status</span>
                  <span className="text-right">Actions</span>
                </div>

                <div className="divide-y divide-plum/10">
                  {loadingBookings && (
                    <div className="px-4 py-6 text-xs text-plum/65 text-center">
                      Loading payments…
                    </div>
                  )}

                  {!loadingBookings && rows.length === 0 && (
                    <div className="px-4 py-6 text-xs text-plum/65 text-center">
                      No bookings to show yet. Once bookings come in,
                      you&apos;ll see payment status here.
                    </div>
                  )}

                  {rows.map((row) => {
                    const payment = row.payment || {};
                    const remaining = Number(
                      payment.remainingBalance ??
                        payment.remaining ??
                        0
                    );
                    const fullyPaid =
                      remaining <= 0 &&
                      (payment.paymentStatus || "")
                        .toLowerCase()
                        .includes("paid in full");

                    return (
                      <div
                        key={row.id}
                        className="px-4 py-3 flex flex-col gap-2 md:grid md:grid-cols-[1.3fr_1.8fr_0.8fr_1fr_0.8fr_0.8fr_0.9fr_1.1fr] md:items-center text-[13px] bg-white"
                      >
                        {/* Date */}
                        <div className="text-xs text-plum/70">
                          <span>
                            {(
                              toDate(row.startAt || row.scheduledAt) ||
                              new Date()
                            ).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Client + service */}
                        <div>
                          <p className="text-xs font-medium text-plum">
                            {row.clientName}
                          </p>
                          <p className="text-[11px] text-plum/65">
                            {row.serviceName}
                          </p>
                        </div>

                        {/* Total */}
                        <div className="text-right text-xs text-plum font-semibold">
                          {formatMoney(
                            payment.totalAmount || payment.total || 0
                          )}
                        </div>

                        {/* Payment summary (status + method) */}
                        <div className="text-right text-xs text-plum">
                          <div className="font-medium text-plum">
                            {payment.paymentStatus || "Unpaid"}
                          </div>
                          <div className="text-[11px] text-plum/70">
                            Method: {payment.methodLabel || "Not recorded"}
                          </div>
                        </div>

                        {/* Deposit */}
                        <div className="text-right text-xs text-plum/80">
                          {formatMoney(payment.depositAmount || 0)}
                        </div>

                        {/* Remaining */}
                        <div className="text-right text-xs">
                          {remaining > 0 ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full bg-rose-50 text-[11px] text-rose-700 border border-rose-100">
                              {formatMoney(remaining)} due
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-50 text-[11px] text-emerald-700 border border-emerald-100">
                              {formatMoney(0)}
                            </span>
                          )}
                        </div>

                        {/* Status badge */}
                        <div className="flex justify-end">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${getStatusBadgeClass(
                              payment.paymentStatus
                            )}`}
                          >
                            {payment.paymentStatus || "Pending"}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col items-end gap-1 mt-1">
                          {/* Inline deposit editor */}
                          {editDepositId === row.id ? (
                            <div className="flex items-center gap-2">
                              <Select
                                value={payMethodDraft}
                                onValueChange={(v) => setPayMethodDraft(v)}
                              >
                                <SelectTrigger className="h-8 w-40 text-xs">
                                  <SelectValue placeholder="Method" />
                                </SelectTrigger>
                                <SelectContent>
                                  {PAYMENT_METHOD_OPTIONS.map((o) => (
                                    <SelectItem key={o.id} value={o.id}>
                                      {o.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                size="xs"
                                onClick={() =>
                                  handleMarkDepositReceived(
                                    row,
                                    payMethodDraft
                                  )
                                }
                              >
                                Save
                              </Button>
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => setEditDepositId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <>
                              {/* Only show when a deposit exists and is not paid */}
                              {payment.depositAmount > 0 &&
                                !payment.depositPaid && (
                                  <Button
                                    size="xs"
                                    className="text-xs"
                                    onClick={() => {
                                      setPayMethodDraft(
                                        payment.methodRaw || "cash_app"
                                      );
                                      setEditDepositId(row.id);
                                    }}
                                  >
                                    Mark deposit received
                                  </Button>
                                )}

                              {/* Only show when remaining balance > 0 */}
                              {remaining > 0 && (
                                <>
                                  {editBalanceId === row.id ? (
                                    <div className="mt-1 flex items-center gap-2">
                                      <Select
                                        value={payMethodDraft}
                                        onValueChange={(v) =>
                                          setPayMethodDraft(v)
                                        }
                                      >
                                        <SelectTrigger className="h-8 w-40 text-xs">
                                          <SelectValue placeholder="Method" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {PAYMENT_METHOD_OPTIONS.map(
                                            (o) => (
                                              <SelectItem
                                                key={o.id}
                                                value={o.id}
                                              >
                                                {o.label}
                                              </SelectItem>
                                            )
                                          )}
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        size="xs"
                                        onClick={() =>
                                          handleMarkBalancePaid(
                                            row,
                                            payMethodDraft
                                          )
                                        }
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="xs"
                                        onClick={() =>
                                          setEditBalanceId(null)
                                        }
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      size="xs"
                                      className="text-xs"
                                      onClick={() => {
                                        setPayMethodDraft(
                                          payment.methodRaw || "card_stripe"
                                        );
                                        setEditBalanceId(row.id);
                                      }}
                                    >
                                      Mark balance paid
                                    </Button>
                                  )}
                                </>
                              )}

                              {/* Manual payment status override */}
                              {editStatusId === row.id ? (
                                <div className="mt-1 flex items-center gap-2">
                                  <Select
                                    value={statusDraft}
                                    onValueChange={(v) => setStatusDraft(v)}
                                  >
                                    <SelectTrigger className="h-8 w-40 text-xs">
                                      <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {PAYMENT_STATUS_OPTIONS.map((label) => (
                                        <SelectItem key={label} value={label}>
                                          {label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    size="xs"
                                    onClick={() =>
                                      handleUpdatePaymentStatus(
                                        row,
                                        statusDraft ||
                                          payment.paymentStatus ||
                                          "Unpaid"
                                      )
                                    }
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="xs"
                                    onClick={() => setEditStatusId(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  className="text-[11px]"
                                  onClick={() => {
                                    setStatusDraft(
                                      payment.paymentStatus || "Unpaid"
                                    );
                                    setEditStatusId(row.id);
                                  }}
                                >
                                  Edit status
                                </Button>
                              )}

                              {/* Invoice actions */}
                              <div className="flex gap-1 mt-1">
                                <Button
                                  size="xs"
                                  variant="outline"
                                  className="text-[11px]"
                                  onClick={() => handleDownloadInvoice(row.id)}
                                  disabled={generatingPdfFor === row.id}
                                >
                                  {generatingPdfFor === row.id ? (
                                    "Generating…"
                                  ) : (
                                    "View invoice"
                                  )}
                                </Button>
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  className="text-[11px]"
                                  onClick={() =>
                                    handleDownloadInvoiceClient("csv", row)
                                  }
                                >
                                  CSV
                                </Button>
                              </div>

                              {fullyPaid && (
                                <span className="text-[10px] text-plum/60 mt-0.5">
                                  Paid in full
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer summary bar */}
                {!loadingBookings && rows.length > 0 && (
                  <div className="border-t border-[#F1D8E8] px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-plum/70">
                    <span>
                      Showing{" "}
                      <span className="font-semibold text-plum">
                        {filterSummary.count}
                      </span>{" "}
                      bookings
                    </span>
                    <div className="flex flex-wrap gap-3">
                      <span>
                        Deposits:{" "}
                        <span className="font-semibold text-plum">
                          {formatMoney(filterSummary.totalDeposits)}
                        </span>
                      </span>
                      <span>
                        Outstanding:{" "}
                        <span className="font-semibold text-plum">
                          {formatMoney(filterSummary.outstanding)}
                        </span>
                      </span>
                      <span>
                        Paid:{" "}
                        <span className="font-semibold text-plum">
                          {formatMoney(filterSummary.totalPaid)}
                        </span>
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </AdminUIProvider>
  );
};

export default AdminPaymentsPage;
