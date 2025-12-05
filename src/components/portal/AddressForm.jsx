// src/components/portal/AddressForm.jsx
import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// If you have a Textarea component in your UI library, use it.
// Otherwise this will fall back to a plain <textarea>.
import { Textarea } from "@/components/ui/textarea";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

const AddressForm = ({
  address,
  addrForm,
  setAddrForm,
  onSave,
  onClearForm,
  onRemoveAddress,
}) => {
  const hasAddress =
    address &&
    (address.street || address.city || address.state || address.zip);

  const handleUseSavedAddress = () => {
    if (!address) return;
    setAddrForm({
      street: address.street || "",
      city: address.city || "",
      state: address.state || "",
      zip: address.zip || "",
      nickname: address.nickname || address.type || "",
      accessInstructions: address.accessInstructions || "",
      isDefault: !!address.isDefault,
    });
  };

  const handleChange = (field, value) => {
    setAddrForm({
      ...addrForm,
      [field]: value,
    });
  };

  const handleZipChange = (e) => {
    handleChange("zip", e.target.value.replace(/\D/g, ""));
  };

  return (
    <Card className="shadow-sm border-plum/10">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-gold" />
          <div>
            <CardTitle className="text-plum">
              Service Address
            </CardTitle>
            <p className="text-xs text-plum/70 mt-0.5">
              This is the address cleaners will arrive to on service day.
            </p>
          </div>
        </div>

        {hasAddress && (
          <Button
            variant="outline"
            size="sm"
            className="border-plum text-plum hover:bg-plum/10"
            type="button"
            onClick={handleUseSavedAddress}
          >
            Use saved address
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Current saved address */}
        <div className="space-y-3">
          {hasAddress ? (
            <>
              <div className="rounded-xl bg-plum/5 p-4">
                {address.nickname && (
                  <p className="text-xs font-semibold text-plum mb-1">
                    {address.nickname}
                    {address.isDefault ? " (Default)" : ""}
                  </p>
                )}
                <p className="font-semibold text-plum break-words">
                  {address.street}
                </p>
                <p className="text-plum/80">
                  {address.city}, {address.state} {address.zip}
                </p>
                {address.accessInstructions && (
                  <p className="mt-1 text-[11px] text-plum/70 break-words">
                    <span className="font-semibold">Access:</span>{" "}
                    {address.accessInstructions}
                  </p>
                )}
                <p className="mt-1 text-xs text-plum/70">
                  {address.isDefault
                    ? "This is your default service address."
                    : "You can set this as your default address when editing."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <Button
                  variant="outline"
                  className="border-plum text-plum hover:bg-plum/10"
                  type="button"
                  onClick={handleUseSavedAddress}
                >
                  Edit
                </Button>

                {onRemoveAddress && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-rose-600 hover:bg-rose-50 inline-flex items-center gap-1"
                    onClick={onRemoveAddress}
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove address
                  </Button>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-plum/70">
              No address on file yet. Add your service address so you
              don’t have to re-type it when you book.
            </p>
          )}
        </div>

        {/* Add / Update form */}
        <div className="pt-4 border-t border-plum/10">
          <p className="text-xs font-medium text-plum/70 uppercase tracking-wide mb-3">
            {hasAddress ? "Update address" : "Add address"}
          </p>

          <form
            onSubmit={onSave}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {/* Nickname */}
            <div className="md:col-span-2">
              <Label htmlFor="nickname">
                Address nickname (optional)
              </Label>
              <Input
                id="nickname"
                value={addrForm.nickname || ""}
                onChange={(e) =>
                  handleChange("nickname", e.target.value)
                }
                placeholder="Home, Office, Parents’ house"
              />
              <p className="text-[11px] text-plum/60 mt-1">
                This label helps you recognize this address if you save more than one.
              </p>
            </div>

            {/* Street */}
            <div className="md:col-span-2">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                value={addrForm.street}
                onChange={(e) =>
                  handleChange("street", e.target.value)
                }
                placeholder="123 Main St, Unit 2"
                required
              />
            </div>

            {/* City */}
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={addrForm.city}
                onChange={(e) =>
                  handleChange("city", e.target.value)
                }
                placeholder="Providence"
                required
              />
            </div>

            {/* State */}
            <div>
              <Label htmlFor="state">State</Label>
              <Select
                value={addrForm.state}
                onValueChange={(value) =>
                  handleChange("state", value)
                }
              >
                <SelectTrigger id="state" className="bg-white">
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((st) => (
                    <SelectItem key={st} value={st}>
                      {st}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ZIP */}
            <div>
              <Label htmlFor="zip">ZIP</Label>
              <Input
                id="zip"
                value={addrForm.zip}
                onChange={handleZipChange}
                placeholder="02909"
                inputMode="numeric"
                required
              />
              <p className="text-[11px] text-plum/60 mt-1">
                Numbers only, 5 digits.
              </p>
            </div>

            {/* Access Instructions */}
            <div className="md:col-span-2">
              <Label htmlFor="accessInstructions">
                Entry / Access Instructions (optional)
              </Label>
              <Textarea
                id="accessInstructions"
                value={addrForm.accessInstructions || ""}
                onChange={(e) =>
                  handleChange("accessInstructions", e.target.value)
                }
                placeholder="Codes, keys, gate info, parking notes, special directions…"
                className="min-h-[80px]"
              />
              <p className="text-[11px] text-plum/60 mt-1">
                These notes are shared with your cleaner for smoother access on service day.
              </p>
            </div>

            {/* Default checkbox */}
            <div className="md:col-span-2 flex items-center gap-2 mt-1">
              <input
                id="isDefault"
                type="checkbox"
                checked={!!addrForm.isDefault}
                onChange={(e) =>
                  handleChange("isDefault", e.target.checked)
                }
                className="h-4 w-4 rounded border-plum/40 text-plum focus:ring-plum"
              />
              <Label
                htmlFor="isDefault"
                className="text-sm text-plum/80 cursor-pointer"
              >
                Make this my default service address
              </Label>
            </div>

            {/* Buttons */}
            <div className="md:col-span-2 flex flex-wrap gap-3 pt-1">
              <Button
                type="submit"
                className="bg-gold hover:bg-gold/90 text-white rounded-full"
              >
                Save address
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-plum text-plum hover:bg-plum/10"
                onClick={onClearForm}
              >
                Clear form
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};

export default AddressForm;
