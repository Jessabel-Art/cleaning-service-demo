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
            onClick={() =>
              setAddrForm({
                street: address.street || "",
                city: address.city || "",
                state: address.state || "",
                zip: address.zip || "",
              })
            }
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
                <p className="font-semibold text-plum break-words">
                  {address.street}
                </p>
                <p className="text-plum/80">
                  {address.city}, {address.state} {address.zip}
                </p>
                <p className="mt-1 text-xs text-plum/70">
                  Saved as your default service address. You can update it
                  below.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <Button
                  variant="outline"
                  className="border-plum text-plum hover:bg-plum/10"
                  type="button"
                  onClick={() =>
                    setAddrForm({
                      street: address.street || "",
                      city: address.city || "",
                      state: address.state || "",
                      zip: address.zip || "",
                    })
                  }
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
            <div className="md:col-span-2">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                value={addrForm.street}
                onChange={(e) =>
                  setAddrForm({ ...addrForm, street: e.target.value })
                }
                placeholder="123 Main St, Unit 2"
                required
              />
            </div>

            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={addrForm.city}
                onChange={(e) =>
                  setAddrForm({ ...addrForm, city: e.target.value })
                }
                placeholder="Providence"
                required
              />
            </div>

            <div>
              <Label htmlFor="state">State</Label>
              <Select
                value={addrForm.state}
                onValueChange={(value) =>
                  setAddrForm({ ...addrForm, state: value })
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

            <div>
              <Label htmlFor="zip">ZIP</Label>
              <Input
                id="zip"
                value={addrForm.zip}
                onChange={(e) =>
                  setAddrForm({
                    ...addrForm,
                    zip: e.target.value.replace(/\D/g, ""),
                  })
                }
                placeholder="02909"
                inputMode="numeric"
                required
              />
              <p className="text-[11px] text-plum/60 mt-1">
                Numbers only, 5 digits.
              </p>
            </div>

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
