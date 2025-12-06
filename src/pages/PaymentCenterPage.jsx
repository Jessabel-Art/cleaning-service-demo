// src/pages/PaymentCenterPage.jsx
import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  DollarSign,
  FileDown,
  Info,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";

const PaymentCenterPage = () => {
  const navigate = useNavigate();

  return (
    <div className="py-12 md:py-20 px-4 bg-[#FFF7FB] min-h-[80vh]">
      <motion.div
        className="max-w-4xl mx-auto space-y-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {/* Top-left nav: sticky back button + breadcrumb */}
        <div className="mb-6">
          <div className="sticky top-3 z-20 md:static md:top-auto flex items-center gap-3">
            <Button
              variant="outline"
              className="border-plum text-plum hover:bg-plum/5 rounded-full flex items-center gap-2"
              onClick={() => navigate("/portal")}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>

            {/* Breadcrumb */}
            <div className="hidden sm:flex items-center gap-1 text-xs text-plum/60">
              <button
                type="button"
                onClick={() => navigate("/portal")}
                className="hover:underline"
              >
                Client Portal
              </button>
              <span>/</span>
              <span className="font-medium text-plum/80">
                Payment Center
              </span>
            </div>
          </div>

          {/* Mobile breadcrumb below button */}
          <div className="sm:hidden mt-2 text-xs text-plum/60">
            <button
              type="button"
              onClick={() => navigate("/portal")}
              className="hover:underline"
            >
              Client Portal
            </button>{" "}
            /{" "}
            <span className="font-medium text-plum/80">
              Payment Center
            </span>
          </div>
        </div>

        {/* Header */}
        <header className="text-center space-y-2">
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-plum/60">
            Payment &amp; deposits
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-plum">
            Payment Center
          </h1>
          <p className="text-sm md:text-base text-plum/75 max-w-2xl mx-auto">
            Review how deposits work, see your billing history, and manage
            payments in one place. Card management and Stripe integration will
            plug in here later.
          </p>
        </header>

        {/* Deposit rules */}
        <Card className="border-plum/10 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-plum">
              <Info className="w-5 h-5 text-gold" />
              Deposit rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-plum/80">
            <p>
              • New clients: a{" "}
              <span className="font-semibold">$50 non-refundable deposit</span>{" "}
              is required to secure the first appointment.
            </p>
            <p>
              • Returning clients: deposits are{" "}
              <span className="font-semibold">waived</span>; payment is due at
              time of service or in advance.
            </p>
            <p>
              • Cancellations within 48 hours of your appointment may result in
              forfeiture of the deposit.
            </p>
            <p className="text-xs text-plum/60 mt-2">
              These rules will be kept in sync with what you see on the booking
              confirmation page and in your client portal.
            </p>
          </CardContent>
        </Card>

        {/* Saved payment methods (Stripe placeholder) */}
        <Card className="border-plum/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-plum">
              <CreditCard className="w-5 h-5 text-gold" />
              Saved payment methods
            </CardTitle>
            <Button
              size="sm"
              className="bg-gold text-white hover:bg-gold/90 rounded-full"
              disabled
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Manage cards (coming soon)
            </Button>
          </CardHeader>
          <CardContent className="text-sm text-plum/75">
            <p className="mb-2">
              Card management isn&apos;t enabled yet. Once Stripe is connected,
              this section will let you:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Add or remove cards securely.</li>
              <li>Update your default payment method.</li>
              <li>Access the Stripe customer billing portal.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Billing history */}
        <Card className="border-plum/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-plum">
              <DollarSign className="w-5 h-5 text-gold" />
              Billing history
            </CardTitle>
            <span className="text-xs text-plum/60">
              Stripe charges &amp; paid bookings will show here later.
            </span>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-dashed border-plum/20 bg-plum/5 p-4 text-sm text-plum/70 text-center">
              Billing history will appear here once online payments are enabled.
              For now, you can see completed appointments and totals in your{" "}
              <span className="font-semibold">
                Client Portal &gt; Appointments
              </span>{" "}
              section.
            </div>
          </CardContent>
        </Card>

        {/* Receipts & upcoming payments placeholders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-plum/10 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-plum">
                <FileDown className="w-5 h-5 text-gold" />
                Receipts
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-plum/75">
              <p className="mb-2">
                When Stripe is connected, each paid charge will have a receipt
                you can download as a PDF.
              </p>
              <div className="rounded-xl border border-dashed border-plum/20 bg-plum/5 p-3 text-xs text-plum/70">
                Placeholder: &quot;Download receipt&quot; buttons for each paid
                booking will show here.
              </div>
            </CardContent>
          </Card>

          <Card className="border-plum/10 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-plum">
                <DollarSign className="w-5 h-5 text-gold" />
                Upcoming payments
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-plum/75 space-y-2">
              <p>
                This section will list bookings that either require a deposit or
                have a remaining balance.
              </p>
              <div className="rounded-xl border border-dashed border-plum/20 bg-plum/5 p-3 text-xs text-plum/70">
                Placeholder: any booking where a deposit or balance is due will
                appear here with a &quot;Pay now&quot; button once Stripe is
                integrated.
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentCenterPage;
