import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PaymentConfirmationPage() {
  const [search] = useSearchParams();
  const cancelled = search.get("cancelled") === "1";

  return (
    <div className="min-h-[80vh] bg-[#F7F7F7] px-4 py-16 flex items-center justify-center">
      <Card className="max-w-xl w-full bg-white border-plum/10 text-center">
        <CardHeader>
          <div className="mx-auto h-14 w-14 rounded-full bg-plum/5 flex items-center justify-center">
            {cancelled ? (
              <XCircle className="w-8 h-8 text-gold" />
            ) : (
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            )}
          </div>
          <CardTitle className="text-plum">
            {cancelled ? "Demo payment cancelled" : "Demo payment complete"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-plum/75">
          <p>
            This is a frontend-only demonstration. No card was charged and no
            payment processor was contacted.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="bg-gold hover:bg-gold/90 text-white rounded-full">
              <Link to="/payment-center">Payment Center</Link>
            </Button>
            <Button asChild variant="outline" className="border-plum text-plum rounded-full">
              <Link to="/portal">Client Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
