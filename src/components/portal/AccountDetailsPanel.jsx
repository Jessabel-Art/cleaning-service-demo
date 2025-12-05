// src/components/portal/AccountDetailsPanel.jsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Lock,
  CreditCard,
} from "lucide-react";
import PaymentInstructions from "@/components/portal/PaymentInstructions";

/**
 * AccountDetailsPanel
 *
 * Props:
 * - email: string
 * - onEmailChange: (value: string) => void
 * - onSaveEmail: () => Promise|void
 * - onSendReset: () => Promise|void
 * - paymentInfo: object (same shape you were passing to <PaymentInstructions>)
 */
export default function AccountDetailsPanel({
  email,
  onEmailChange,
  onSaveEmail,
  onSendReset,
  paymentInfo,
}) {
  return (
    <section className="space-y-6">
      {/* EMAIL CARD */}
      <div className="rounded-2xl border border-plum/15 bg-white p-4 md:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-plum/5 flex items-center justify-center">
            <Mail className="w-4 h-4 text-plum/80" />
          </div>
          <h3 className="text-lg font-semibold text-plum">Email</h3>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <div className="w-full sm:max-w-sm">
            <Label htmlFor="account-email" className="text-sm text-plum/80">
              Sign-in email
            </Label>
            <Input
              id="account-email"
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="you@example.com"
              className="bg-white mt-1"
              autoComplete="email"
            />
          </div>
          <Button
            type="button"
            onClick={onSaveEmail}
            className="bg-gold text-white hover:bg-gold/90"
          >
            Save Email
          </Button>
        </div>

        <p className="text-xs text-plum/70 mt-2">
          You may be asked to re-authenticate for security when changing your
          email.
        </p>
      </div>

      {/* PASSWORD CARD */}
      <div className="rounded-2xl border border-plum/15 bg-white p-4 md:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-plum/5 flex items-center justify-center">
            <Lock className="w-4 h-4 text-plum/80" />
          </div>
          <h3 className="text-lg font-semibold text-plum">Password</h3>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <Button
            type="button"
            onClick={onSendReset}
            className="bg-rose-500 hover:bg-rose-600 text-white"
          >
            Send Password Reset Email
          </Button>
        </div>

        <p className="text-xs text-plum/70 mt-2">
          We&apos;ll email you a secure link so you can choose a new password.
        </p>
      </div>

      {/* PAYMENT & DEPOSIT INFO */}
      <div className="rounded-2xl border border-plum/15 bg-white p-4 md:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-plum/5 flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-plum/80" />
          </div>
          <h3 className="text-lg font-semibold text-plum">
            Payment &amp; Deposit Info
          </h3>
        </div>

        <PaymentInstructions paymentInfo={paymentInfo} />
      </div>
    </section>
  );
}
