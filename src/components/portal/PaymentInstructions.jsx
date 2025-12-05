// src/components/portal/PaymentInstructions.jsx
import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BadgeDollarSign, DollarSign, Mail, Info, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

const PaymentInstructions = ({ paymentInfo, onStripePay }) => {
  const P = paymentInfo || {};

  const depositAmount = P.depositAmount ?? 50;
  const stripeEnabled = !!P.stripeEnabled;

  return (
    <Card
      id="payment-instructions"
      className="mt-6 shadow-sm border-plum/10"
    >
      <CardHeader className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BadgeDollarSign className="h-5 w-5 text-gold" />
          <div>
            <CardTitle className="text-plum">
              Payment & Deposit Info
            </CardTitle>
            <p className="text-xs text-plum/70 mt-0.5">
              How to pay your deposit and remaining balance.
            </p>
          </div>
        </div>

        <div className="hidden sm:inline-flex items-center gap-2 rounded-full bg-plum/5 px-3 py-1 text-[11px] text-plum/80">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Secure, direct payment to Sanchez Services
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Deposit highlight */}
        <div className="rounded-xl bg-plum/5 border border-plum/10 p-4">
          <p className="text-sm text-plum/85">
            A{" "}
            <strong>${depositAmount.toFixed ? depositAmount.toFixed(2) : depositAmount} non-refundable deposit</strong>{" "}
            is required to confirm your appointment.
          </p>
          <p className="text-xs text-plum/70 mt-2">
            Please complete your deposit within{" "}
            <span className="font-medium">24 hours of booking</span> and
            always include your <span className="font-medium">full name</span>{" "}
            in the payment note so we can match it to your appointment.
          </p>
        </div>

        {/* OPTIONAL: Online card payment (Stripe – future) */}
        {stripeEnabled && (
          <Row
            icon={CreditCard}
            title="Pay online with card"
            badge="Recommended"
            text={
              <>
                Pay securely with debit or credit card. Your deposit will be
                applied directly to your booking, and you&apos;ll receive an
                instant email receipt.
              </>
            }
            extra={
              <Button
                type="button"
                className="mt-2 bg-gold hover:bg-gold/90 text-white text-xs rounded-full"
                onClick={onStripePay || (() => {})}
              >
                Pay deposit online
              </Button>
            }
          />
        )}

        {/* Cash at time of service */}
        {P.cash && (
          <Row
            icon={DollarSign}
            title="Cash"
            text={
              <>
                Cash is accepted at time of service. Deposits should still be
                sent ahead of time using Cash App or Zelle so your booking is
                fully confirmed.
              </>
            }
          />
        )}

        {/* Cash App */}
        {P.cashApp !== false && (
          <Row
            icon={DollarSign}
            title="Cash App"
            text={
              <>
                Send deposit to{" "}
                <span className="font-semibold">
                  {P.cashApp || "$Sterlingsterls"}
                </span>{" "}
                and include your full name in the notes.
              </>
            }
          />
        )}

        {/* Zelle */}
        {P.zelle !== false && (
          <Row
            icon={Mail}
            title="Zelle"
            text={
              <>
                Send deposit via Zelle to{" "}
                <span className="font-semibold">
                  {P.zelle ||
                    "401-658-6708 (use recipient name: Sterling Sanchez)"}
                </span>{" "}
                and include your full name in the memo line.
              </>
            }
          />
        )}

        {/* Notes / policy */}
        <div className="rounded-lg bg-rose-50 border border-gold/20 p-3 text-sm text-plum/80 flex items-start gap-2">
          <Info className="w-4 h-4 text-gold mt-0.5 shrink-0" />
          <div>
            <p>
              {P.notes ||
                "Deposits are non-refundable but can be transferred once if you reschedule with proper notice, according to the cancellation policy."}
            </p>
            {P.extraNotice && (
              <p className="mt-1 text-xs text-plum/65">{P.extraNotice}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Row = ({ icon: Icon, title, text, badge, extra }) => (
  <div className="rounded-xl border border-gold/20 bg-white p-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
    <div className="flex gap-3">
      <Icon className="w-5 h-5 text-gold mt-0.5 shrink-0" />
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-plum">{title}</p>
          {badge && (
            <span className="inline-flex items-center rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold">
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm text-plum/70 mt-0.5">{text}</p>
      </div>
    </div>
    {extra && <div className="sm:ml-8">{extra}</div>}
  </div>
);

export default PaymentInstructions;
