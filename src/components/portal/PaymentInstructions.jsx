import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BadgeDollarSign, DollarSign, Mail, Info } from 'lucide-react';

const PaymentInstructions = ({ paymentInfo }) => {
  const P = paymentInfo || {};
  return (
    <Card id="payment-instructions" className="mt-6 shadow-sm border-plum/10">
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BadgeDollarSign className="h-5 w-5 text-gold" />
          <CardTitle>Payment Instructions</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg bg-plum/5 p-4">
          <p className="text-plum/80">
            A <strong>${P.depositAmount ?? 50} non-refundable deposit</strong> is required to confirm your
            appointment. Since we don’t accept payments on the website, please use one of the methods below and include
            your <strong>full name and booking ID</strong> in the payment note.
          </p>
        </div>

        {P.cash && (
          <Row
            icon={DollarSign}
            title="Cash"
            text="Cash is accepted at time of service. Deposits can be sent via Cash App or Zelle."
          />
        )}

        <Row
          icon={DollarSign}
          title="Cash App"
          text={
            <>
              Send to <span className="font-semibold">{P.cashApp || '$SterlingsterlsG'}</span> and include your name & booking ID.
            </>
          }
        />

        <Row
          icon={Mail}
          title="Zelle"
          text={
            <>
              Send to <span className="font-semibold">{P.zelle || '401-658-6708, use my name Sterling Sanchez in Zelle'}</span> and include your name & booking ID in notes.
            </>
          }
        />

        <div className="rounded-lg bg-rose-50 border border-gold/20 p-3 text-sm text-plum/80">
          <Info className="inline-block w-4 h-4 mr-1 text-gold" />
          {P.notes || 'Please include your full name and booking ID in the payment note.'}
        </div>
      </CardContent>
    </Card>
  );
};

const Row = ({ icon: Icon, title, text }) => (
  <div className="rounded-xl border border-gold/20 bg-white p-4 flex items-start gap-3">
    <Icon className="w-5 h-5 text-gold mt-0.5" />
    <div>
      <p className="text-plum font-medium">{title}</p>
      <p className="text-sm text-plum/70">{text}</p>
    </div>
  </div>
);

export default PaymentInstructions;
