// src/components/portal/ContactDetails.jsx
import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserRound, Phone, MapPin, Edit2, Trash2, Star, Plus, Save, X } from "lucide-react";

function formatAddressRow(a) {
  if (!a) return "No address on file yet.";
  const parts = [a.street, a.city, a.state, a.zip].filter(Boolean);
  return parts.join(", ");
}

/**
 * ContactDetails
 *
 * Props:
 * - profile: { name?: string; phone?: string }
 * - addresses: array of address docs (id, street, city, state, zip, isDefault, type)
 * - onSaveContact({ name, phone }): Promise|void
 * - onOpenAddAddress()
 * - onOpenEditAddress(address)
 * - onDeleteAddress(address)
 * - onSetDefaultAddress(address)
 * - savingContact?: boolean
 */
export default function ContactDetails({
  profile,
  addresses = [],
  onSaveContact,
  onOpenAddAddress,
  onOpenEditAddress,
  onDeleteAddress,
  onSetDefaultAddress,
  savingContact = false,
}) {
  const initialName = profile?.name || "";
  const initialPhone = profile?.phone || "";

  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setName(initialName);
    setPhone(initialPhone);
  }, [initialName, initialPhone]);

  const dirty =
    name.trim() !== initialName.trim() ||
    phone.trim() !== initialPhone.trim();

  const defaultAddress =
    addresses.find((a) => a.isDefault) || addresses[0] || null;

  const hasAddresses = addresses.length > 0;

  const handleSave = async () => {
    if (!dirty || !onSaveContact) {
      setIsEditing(false);
      return;
    }

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
    };

    const maybePromise = onSaveContact(payload);
    if (maybePromise && typeof maybePromise.then === "function") {
      try {
        await maybePromise;
      } catch (err) {
        console.error("Failed to save contact details", err);
      }
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setName(initialName);
    setPhone(initialPhone);
    setIsEditing(false);
  };

  return (
    <section className="space-y-6">
      {/* CONTACT INFO CARD */}
      <Card className="shadow-sm border-plum/10 bg-white">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserRound className="w-5 h-5 text-plum/80" />
            <CardTitle className="text-plum text-lg md:text-xl">
              Contact details
            </CardTitle>
          </div>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              className="border-plum/40 text-plum hover:bg-plum/5"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="w-4 h-4 mr-1" />
              Edit contact
            </Button>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Full name */}
            <div className="space-y-1">
              <Label className="flex items-center gap-2 text-plum/80">
                <UserRound className="w-4 h-4" />
                Full name
              </Label>
              {isEditing ? (
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="bg-white"
                />
              ) : (
                <p className="rounded-xl bg-plum/5 px-3 py-2 text-plum">
                  {initialName || "Add your name"}
                </p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <Label className="flex items-center gap-2 text-plum/80">
                <Phone className="w-4 h-4" />
                Phone number
              </Label>
              {isEditing ? (
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="bg-white"
                />
              ) : (
                <p className="rounded-xl bg-plum/5 px-3 py-2 text-plum">
                  {initialPhone || "Add a phone number"}
                </p>
              )}
              {!isEditing && (
                <p className="text-xs text-plum/60 mt-1">
                  Used for confirmations and reminders only. Never shared.
                </p>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-plum/10 mt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-plum/70"
                onClick={handleCancel}
                disabled={savingContact}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-gold text-white hover:bg-gold/90"
                onClick={handleSave}
                disabled={!dirty || savingContact}
              >
                <Save className="w-4 h-4 mr-1" />
                {savingContact ? "Saving…" : "Save changes"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ADDRESSES CARD */}
      <Card className="shadow-sm border-plum/10 bg-white">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-plum/80" />
            <CardTitle className="text-plum text-lg md:text-xl">
              Service addresses
            </CardTitle>
          </div>
          <Button
            size="sm"
            className="bg-gold text-white hover:bg-gold/90"
            onClick={onOpenAddAddress}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add address
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {!hasAddresses && (
            <p className="text-sm text-plum/70">
              You don&apos;t have a saved service address yet. Add one to make
              booking faster next time.
            </p>
          )}

          {hasAddresses && (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-plum/10 bg-plum/5 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm text-plum">
                      <span className="font-semibold capitalize">
                        {addr.type || "Home"}
                      </span>
                      {addr.isDefault && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] px-2 py-0.5">
                          <Star className="w-3 h-3" /> Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-plum/80 mt-0.5 break-words">
                      {formatAddressRow(addr)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-end">
                    {!addr.isDefault && onSetDefaultAddress && (
                      <Button
                        size="xs"
                        variant="outline"
                        className="border-emerald-200 text-emerald-700 text-xs px-2 py-1"
                        onClick={() => onSetDefaultAddress(addr)}
                      >
                        Set default
                      </Button>
                    )}
                    <Button
                      size="xs"
                      variant="outline"
                      className="text-plum border-plum/30 text-xs px-2 py-1"
                      onClick={() => onOpenEditAddress(addr)}
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      className="text-rose-600 border-rose-200 text-xs px-2 py-1"
                      onClick={() => onDeleteAddress(addr)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

