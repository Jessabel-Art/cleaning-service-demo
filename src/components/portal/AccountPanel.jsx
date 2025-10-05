// src/components/portal/AccountPanel.jsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AccountPanel({ user, onLogout }) {
  return (
    <Card className="shadow-sm border-plum/10">
      <CardHeader><CardTitle>Account Overview</CardTitle></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-plum/5 p-4">
          <p className="text-plum/80">Signed in as</p>
          <p className="font-semibold text-plum break-words">
            {user?.email || user?.phoneNumber || 'client'}
          </p>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-plum/5 p-4">
          <p className="text-plum/80">Quick Actions</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-plum text-plum hover:bg-plum/10"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              Go to Top
            </Button>
            <Button size="sm" variant="ghost" onClick={onLogout}>
              Log Out
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
