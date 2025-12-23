// src/pages/DevSeedPage.jsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Timestamp } from 'firebase/firestore';
import { createBookingWithConflictCheck } from '@/lib/db';
import { auth } from '@/lib/firebase';

export default function DevSeedPage() {
  const { toast } = useToast();
  const [seededId, setSeededId] = useState(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';

  async function handleSeed() {
    if (!isLocal) {
      toast({
        variant: 'destructive',
        title: 'Unavailable in production',
        description: 'The seed page only runs locally.',
      });
      return;
    }
    setIsSeeding(true);
    try {
      const start = new Date();
      start.setDate(start.getDate() + 1);
      start.setHours(11, 0, 0, 0);
      const durationMinutes = 120;
      const end = new Date(start.getTime() + durationMinutes * 60000);

      const userId = auth.currentUser?.uid || 'seed-user';
      const ref = await createBookingWithConflictCheck(userId, {
        userId,
        serviceSlug: 'residential-cleaning',
        serviceName: 'Residential Cleaning',
        startAt: Timestamp.fromDate(start),
        endAt: Timestamp.fromDate(end),
        durationMinutes,
        status: 'confirmed',
        contact: {
          name: 'Seed Client',
          email: 'seed@example.com',
          emailLower: 'seed@example.com',
          phoneRaw: '401-555-1234',
        },
        address: {
          line1: '123 Test St',
          city: 'Providence',
          state: 'RI',
          zip: '02903',
        },
        notes: 'Seeded booking for validation test',
        createdVia: 'dev_seed',
      });

      setSeededId(ref.id);
      toast({
        title: 'Seed booking created',
        description: `ID: ${ref.id} for ${start.toLocaleString()}`,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: err?.message?.includes('conflict') ? 'Time conflict' : 'Seed failed',
        description: String(err?.message || err),
      });
    } finally {
      setIsSeeding(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-[#FFF7FB]">
      <Card className="max-w-md w-full border-[#F1D8E8]">
        <CardHeader>
          <CardTitle className="text-plum text-sm">Dev: Seed a booking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-[12px] text-plum/80">
          <p>This creates a booking tomorrow at 11:00 AM (120 mins). Use it to test overlap validation.</p>
          <Button
            type="button"
            onClick={handleSeed}
            disabled={isSeeding}
            className="rounded-full"
          >
            {isSeeding ? 'Seeding…' : 'Seed booking now'}
          </Button>
          {seededId && (
            <div className="text-[11px]">Created ID: <span className="font-mono">{seededId}</span></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
