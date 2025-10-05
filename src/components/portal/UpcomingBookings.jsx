// src/components/portal/UpcomingBookings.jsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import BookingCard from '@/components/portal/BookingCard';

export default function UpcomingBookings({
  bookings = [],
  loading = false,
  onAction,
  onViewPayments,
  depositAmount = 50,
}) {
  return (
    <>
      <Card className="shadow-sm border-plum/10">
        <CardHeader><CardTitle>Upcoming Bookings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <span className="animate-spin inline-block w-8 h-8 border-4 border-gold border-t-transparent rounded-full" />
            </div>
          ) : bookings.length ? (
            bookings.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                onAction={onAction}
                onViewPayments={onViewPayments}
                depositAmount={depositAmount}
              />
            ))
          ) : (
            <p className="text-plum/70">No upcoming bookings.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
