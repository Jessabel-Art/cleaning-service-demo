// src/components/portal/ProfileSettingsPanel.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  UserRound,
  Phone,
  MapPin,
  Edit2,
  Trash2,
  Star,
  Plus,
  Save,
  X,
  ArrowUp,
  ArrowDown,
  Mail,
  Lock,
} from "lucide-react";

function formatAddressRow(a) {
  if (!a) return "No address on file yet.";
  const parts = [a.street, a.city, a.state, a.zip].filter(Boolean);
  return parts.join(", ");
}

const PHONE_LS_KEY = "sanchez_client_phone";

/**
 * Try to read a phone number from the profile in as many shapes as possible,
 * then fall back to localStorage.
 */
function getInitialPhone(profile) {
  let fromProfile = "";

  if (profile) {
    fromProfile =
      profile.phone ||
      profile.phoneNumber ||
      profile.primaryPhone ||
      profile.contact?.phone ||
      profile.contact?.phoneNumber ||
      profile.contact?.primaryPhone ||
      "";
  }

  if (fromProfile) return fromProfile;

  if (typeof window !== "undefined") {
    try {
      const ls = window.localStorage.getItem(PHONE_LS_KEY);
      if (ls) return ls;
    } catch {
      // ignore
    }
  }

  return "";
}

// build a simple key so we only sync when the default address actually changes
function buildAddressKey(addr) {
  if (!addr) return "";
  return [
    addr.id || "",
    addr.street || "",
    addr.city || "",
    addr.state || "",
    addr.zip || "",
    addr.isDefault ? "1" : "0",
  ].join("|");
}

/**
 * ProfileSettingsPanel
 */
export default function ProfileSettingsPanel({
  profile,
  addresses = [],
  onSaveContact,
  onOpenAddAddress,
  onOpenEditAddress,
  onDeleteAddress,
  onSetDefaultAddress,
  onMoveAddressUp,
  onMoveAddressDown,
  savingContact = false,

  preferences,
  onSavePreferences,

  preferredContactMethod,
  onSavePreferredContactMethod,

  email,
  onEmailChange,
  onSaveEmail,
  onSendReset,
}) {
  // CONTACT INFO
  const initialName = profile?.name || "";
  const initialPhone = getInitialPhone(profile);

  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [isEditingContact, setIsEditingContact] = useState(false);

  useEffect(() => {
    setName(initialName);
    setPhone(initialPhone);
  }, [initialName, initialPhone]);

  const contactDirty =
    name.trim() !== initialName.trim() ||
    phone.trim() !== initialPhone.trim();

  // EMAIL STATE (local, saved together with contact)
  const [emailValue, setEmailValue] = useState(email || "");

  // keep local email in sync when auth email changes from outside
  useEffect(() => {
    setEmailValue(email || "");
  }, [email]);

  const emailDirty = emailValue.trim() !== (email || "").trim();

  const hasAddresses = addresses.length > 0;

  // pick the default address (or first) for syncing into profile doc
  const defaultAddress = hasAddresses
    ? addresses.find((a) => a.isDefault) || addresses[0]
    : null;

  const [lastSyncedAddressKey, setLastSyncedAddressKey] = useState("");

  // AUTO-SYNC DEFAULT ADDRESS -> PROFILE DOC (for Admin views)
  useEffect(() => {
    if (!onSaveContact) return;
    if (!defaultAddress) return;

    const key = buildAddressKey(defaultAddress);
    if (!key || key === lastSyncedAddressKey) return;

    const addressSummary = formatAddressRow(defaultAddress);
    const payload = {
      addressSummary,
      address: {
        line1: defaultAddress.street || "",
        city: defaultAddress.city || "",
        state: defaultAddress.state || "",
        zip: defaultAddress.zip || "",
      },
    };

    let cancelled = false;

    (async () => {
      try {
        const maybe = onSaveContact(payload);
        if (maybe && typeof maybe.then === "function") {
          await maybe;
        }
        if (!cancelled) {
          setLastSyncedAddressKey(key);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to sync profile address", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [defaultAddress, onSaveContact, lastSyncedAddressKey]);

  // CLEANING PREFS (autosave)
  const normalizedInitialPrefs = {
    fragrancePreference: preferences?.fragrancePreference || "standard",
    focusPreference: preferences?.focusPreference || "balanced",
    petPreference: preferences?.petPreference || "none",
  };

  const [localPrefs, setLocalPrefs] = useState(normalizedInitialPrefs);
  const [lastSavedPrefs, setLastSavedPrefs] = useState(
    normalizedInitialPrefs
  );
  const prefsFirstRender = useRef(true);

  useEffect(() => {
    const next = {
      fragrancePreference:
        preferences?.fragrancePreference || "standard",
      focusPreference: preferences?.focusPreference || "balanced",
      petPreference: preferences?.petPreference || "none",
    };
    setLocalPrefs(next);
    setLastSavedPrefs(next);
  }, [
    preferences?.fragrancePreference,
    preferences?.focusPreference,
    preferences?.petPreference,
  ]);

  const preferencesDirty =
    JSON.stringify(localPrefs) !== JSON.stringify(normalizedInitialPrefs);

  const handlePrefChange = (field, value) => {
    setLocalPrefs((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  useEffect(() => {
    if (!onSavePreferences) return;
    if (prefsFirstRender.current) {
      prefsFirstRender.current = false;
      return;
    }
    if (JSON.stringify(localPrefs) === JSON.stringify(lastSavedPrefs)) return;

    const timeout = setTimeout(async () => {
      try {
        const maybe = onSavePreferences(localPrefs);
        if (maybe && typeof maybe.then === "function") {
          await maybe;
        }
        setLastSavedPrefs(localPrefs);
      } catch (err) {
        console.error("Failed to auto-save preferences", err);
      }
    }, 600);

    return () => clearTimeout(timeout);
  }, [localPrefs, lastSavedPrefs, onSavePreferences]);

  // CONTACT METHOD (autosave)
  const [contactMethod, setContactMethod] = useState(
    preferredContactMethod || "email"
  );
  const [lastSavedContactMethod, setLastSavedContactMethod] = useState(
    preferredContactMethod || "email"
  );
  const contactFirstRender = useRef(true);

  useEffect(() => {
    const next = preferredContactMethod || "email";
    setContactMethod(next);
    setLastSavedContactMethod(next);
  }, [preferredContactMethod]);

  useEffect(() => {
    if (!onSavePreferredContactMethod) return;
    if (contactFirstRender.current) {
      contactFirstRender.current = false;
      return;
    }
    if (contactMethod === lastSavedContactMethod) return;

    const timeout = setTimeout(async () => {
      try {
        const maybe = onSavePreferredContactMethod(contactMethod);
        if (maybe && typeof maybe.then === "function") {
          await maybe;
        }
        setLastSavedContactMethod(contactMethod);
      } catch (err) {
        console.error("Failed to auto-save contact method", err);
      }
    }, 600);

    return () => clearTimeout(timeout);
  }, [
    contactMethod,
    lastSavedContactMethod,
    onSavePreferredContactMethod,
  ]);

  const anyContactDirty = contactDirty || emailDirty;

  const handleSaveContact = async () => {
    if (!anyContactDirty) {
      setIsEditingContact(false);
      return;
    }

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = emailValue.trim();

    try {
      // Persist to localStorage as a safety net so the phone always shows up
      if (typeof window !== "undefined") {
        try {
          if (trimmedPhone) {
            window.localStorage.setItem(PHONE_LS_KEY, trimmedPhone);
          } else {
            window.localStorage.removeItem(PHONE_LS_KEY);
          }
        } catch {
          // ignore
        }
      }

      // update profile (name + phone) — write to multiple keys to be backend-agnostic
      if (onSaveContact) {
        const maybeProfile = onSaveContact({
          name: trimmedName,
          phone: trimmedPhone,
          phoneNumber: trimmedPhone,
          primaryPhone: trimmedPhone,
          contact: {
            ...(profile?.contact || {}),
            phone: trimmedPhone,
            phoneNumber: trimmedPhone,
            primaryPhone: trimmedPhone,
          },
        });
        if (maybeProfile && typeof maybeProfile.then === "function") {
          await maybeProfile;
        }
      }

      // update auth email
      if (emailDirty && onSaveEmail) {
        if (onEmailChange) {
          onEmailChange(trimmedEmail);
        }
        const maybeEmail = onSaveEmail();
        if (maybeEmail && typeof maybeEmail.then === "function") {
          await maybeEmail;
        }
      }
    } catch (err) {
      console.error("Failed to save contact/email", err);
    }

    setIsEditingContact(false);
  };

  const handleCancelContact = () => {
    setName(initialName);
    setPhone(initialPhone);
    setEmailValue(email || "");
    setIsEditingContact(false);
  };

  return (
    <section className="space-y-6">
      {/* CONTACT INFO / EMAIL / CONTACT PREFS */}
      <Card className="shadow-sm border-plum/10 bg-white">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserRound className="w-5 h-5 text-plum/80" />
            <CardTitle className="text-plum text-lg md:text-xl">
              Contact details
            </CardTitle>
          </div>
          {!isEditingContact && (
            <Button
              variant="outline"
              size="sm"
              className="border-plum/40 text-plum hover:bg-plum/5"
              onClick={() => setIsEditingContact(true)}
            >
              <Edit2 className="w-4 h-4 mr-1" />
              Edit contact
            </Button>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* 2-column layout: left = name + phone, right = email */}
          <div className="grid gap-4 md:grid-cols-2 items-start">
            {/* Left column: name + phone */}
            <div className="space-y-4">
              {/* Full name */}
              <div className="space-y-1">
                <Label className="flex items-center gap-2 text-plum/80">
                  <UserRound className="w-4 h-4" />
                  Full name
                </Label>
                {isEditingContact ? (
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
                {isEditingContact ? (
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
                {!isEditingContact && (
                  <p className="text-xs text-plum/60 mt-1">
                    Used for confirmations and reminders only. Never shared.
                  </p>
                )}
              </div>
            </div>

            {/* Right column: email */}
            <div className="space-y-1">
              <Label
                htmlFor="account-email"
                className="flex items-center gap-2 text-plum/80"
              >
                <Mail className="w-4 h-4" />
                Sign-in email
              </Label>
              {isEditingContact ? (
                <Input
                  id="account-email"
                  type="email"
                  value={emailValue}
                  onChange={(e) => setEmailValue(e.target.value)}
                  placeholder="you@example.com"
                  className="bg-white"
                  autoComplete="email"
                />
              ) : (
                <p className="rounded-xl bg-plum/5 px-3 py-2 text-plum break-all">
                  {email || "Add an email address"}
                </p>
              )}
              <p className="text-[11px] text-plum/70 mt-1">
                You may be asked to re-authenticate for security when
                changing your email.
              </p>
            </div>
          </div>

          {/* Contact preferences bottom-right */}
          <div className="pt-3 mt-1 border-t border-plum/10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-2">
              <div className="space-y-1 md:text-right">
                <Label className="text-xs font-medium text-plum/70">
                  Contact preferences
                </Label>
                <div className="flex flex-wrap md:justify-end items-center gap-4 text-xs text-plum">
                  {[
                    { value: "email", label: "Email" },
                    { value: "sms", label: "Text message (SMS)" },
                    { value: "both", label: "Both" },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className="inline-flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="contactMethod"
                        value={opt.value}
                        checked={contactMethod === opt.value}
                        onChange={() => setContactMethod(opt.value)}
                        className="h-3 w-3 rounded-full border border-plum/50"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[11px] text-plum/60">
                  We&apos;ll use this for confirmations, reminders, and
                  important updates.
                </p>
              </div>
            </div>
          </div>

          {isEditingContact && (
            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-plum/10 mt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-plum/70"
                onClick={handleCancelContact}
                disabled={savingContact}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-gold text-white hover:bg-gold/90"
                onClick={handleSaveContact}
                disabled={!anyContactDirty || savingContact}
              >
                <Save className="w-4 h-4 mr-1" />
                {savingContact ? "Saving…" : "Save changes"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SERVICE ADDRESSES CARD */}
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
              You don&apos;t have a saved service address yet. Add one to
              make booking faster next time.
            </p>
          )}

          {hasAddresses && (
            <div className="space-y-3">
              {addresses.map((addr, index) => {
                const nickname = addr.nickname || addr.type || "Home";
                return (
                  <div
                    key={addr.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-plum/10 bg-plum/5 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm text-plum">
                        <span className="font-semibold">
                          {nickname}
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
                      {addr.accessInstructions && (
                        <p className="text-[11px] text-plum/70 mt-0.5 break-words">
                          <span className="font-semibold">
                            Access:
                          </span>{" "}
                          {addr.accessInstructions}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 justify-end">
                      {onMoveAddressUp && index > 0 && (
                        <Button
                          size="xs"
                          variant="outline"
                          className="border-plum/20 text-plum text-xs px-2 py-1"
                          onClick={() => onMoveAddressUp(addr)}
                          title="Move up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                      )}
                      {onMoveAddressDown &&
                        index < addresses.length - 1 && (
                          <Button
                            size="xs"
                            variant="outline"
                            className="border-plum/20 text-plum text-xs px-2 py-1"
                            onClick={() => onMoveAddressDown(addr)}
                            title="Move down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                        )}

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
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CLEANING PREFERENCES CARD */}
      <Card
        className={`shadow-sm border-plum/10 bg-white ${
          preferencesDirty ? "ring-2 ring-gold/40 border-gold" : ""
        }`}
      >
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserRound className="w-5 h-5 text-plum/80" />
            <CardTitle className="text-plum text-lg md:text-xl">
              Cleaning preferences
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Fragrance */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-plum/70">
              Fragrance preference
            </Label>
            <div className="flex flex-wrap items-center gap-4 text-xs text-plum">
              {[
                { value: "standard", label: "Standard" },
                { value: "light", label: "Light scent" },
                { value: "fragrance_free", label: "Fragrance-free" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="inline-flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="fragrancePreference"
                    value={opt.value}
                    checked={
                      localPrefs.fragrancePreference === opt.value
                    }
                    onChange={() =>
                      handlePrefChange("fragrancePreference", opt.value)
                    }
                    className="h-3 w-3 rounded-full border border-plum/50"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Focus areas */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-plum/70">
              Focus areas
            </Label>
            <div className="flex flex-wrap items-center gap-4 text-xs text-plum">
              {[
                { value: "balanced", label: "Balanced clean" },
                {
                  value: "kitchen_bathroom",
                  label: "Extra focus on kitchen & bathrooms",
                },
                {
                  value: "living_areas",
                  label: "Extra focus on living areas & bedrooms",
                },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="inline-flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="focusPreference"
                    value={opt.value}
                    checked={localPrefs.focusPreference === opt.value}
                    onChange={() =>
                      handlePrefChange("focusPreference", opt.value)
                    }
                    className="h-3 w-3 rounded-full border border-plum/50"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Pets */}
          <div className="space-y-1">
            <Label className="text-xs font-medium text-plum/70">
              Pets in the home
            </Label>
            <div className="flex flex-wrap items-center gap-4 text-xs text-plum">
              {[
                { value: "none", label: "No pets" },
                { value: "dogs", label: "Dog(s)" },
                { value: "cats", label: "Cat(s)" },
                { value: "other", label: "Other pets" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className="inline-flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="petPreference"
                    value={opt.value}
                    checked={localPrefs.petPreference === opt.value}
                    onChange={() =>
                      handlePrefChange("petPreference", opt.value)
                    }
                    className="h-3 w-3 rounded-full border border-plum/50"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
            <p className="text-[11px] text-plum/60">
              This helps us plan for allergies, supplies, and how your
              pets might react to visitors.
            </p>
          </div>

          <p className="text-[11px] text-plum/60">
            We&apos;ll use these preferences for all future bookings.
            You can still add special notes per appointment.
          </p>
        </CardContent>
      </Card>

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
    </section>
  );
}
