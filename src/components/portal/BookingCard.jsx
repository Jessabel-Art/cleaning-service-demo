import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const BookingCard = ({ booking, onAction, onViewPayments, depositAmount }) => {
  return (
    <Card className="shadow-sm border-plum/10">
      <CardHeader>
        <CardTitle>
          {booking.service || 'Service'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-plum">
          <span className="font-medium">Date:</span> {booking.date}
        </p>
        <p className="text-plum">
          <span className="font-medium">Status:</span> {booking.status}
        </p>
        <p className="text-plum">
          <span className="font-medium">Total:</span> ${booking.cost}
        </p>
        <p className="text-plum">
          <span className="font-medium">Paid:</span> ${booking.paid}
        </p>
        {booking.status === 'Upcoming' && (
          <p className="text-plum/70">
            Deposit required: <span className="font-bold">${depositAmount}</span>
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        {booking.status === 'Upcoming' && (
          <Button
            variant="outline"
            className="border-gold text-gold hover:bg-gold/10"
            onClick={onViewPayments}
          >
            View Payment Instructions
          </Button>
        )}
        <Button
          variant="ghost"
          className="text-plum"
          onClick={() => onAction?.("Action clicked")}
        >
          Booking Actions
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BookingCard;
