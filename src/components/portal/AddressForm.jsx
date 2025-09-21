import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';

// Controlled form, validation hints, editable
const AddressForm = ({
  address,
  addrForm,
  setAddrForm,
  onSave,
  onClearForm,
  onRemoveAddress,
}) => {
  const hasAddress =
    address && (address.street || address.city || address.state || address.zip);

  return (
    <Card className="shadow-sm border-plum/10">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-gold" />
          <CardTitle>Service Address</CardTitle>
        </div>
        {hasAddress && (
          <Button
            variant="outline"
            size="sm"
            className="border-plum text-plum hover:bg-plum/10"
            onClick={() =>
              setAddrForm({
                street: address.street || '',
                city: address.city || '',
                state: address.state || '',
                zip: address.zip || '',
              })
            }
          >
            Update
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {hasAddress ? (
          <>
            <div className="rounded-lg bg-plum/5 p-4">
              <p className="font-semibold text-plum break-words">{address.street}</p>
              <p className="text-plum/80">
                {address.city}, {address.state} {address.zip}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                className="border-plum text-plum hover:bg-plum/10"
                onClick={() =>
                  setAddrForm({
                    street: address.street || '',
                    city: address.city || '',
                    state: address.state || '',
                    zip: address.zip || '',
                  })
                }
              >
                Edit
              </Button>
              <Button variant="ghost" onClick={onRemoveAddress}>
                Remove
              </Button>
            </div>
          </>
        ) : (
          <p className="text-plum/70">No address on file. Add one below.</p>
        )}

        {/* Add / Update form */}
        <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="street">Street Address</Label>
            <Input
              id="street"
              value={addrForm.street}
              onChange={(e) => setAddrForm({ ...addrForm, street: e.target.value })}
              placeholder="123 Main St, Unit 2"
              required
            />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={addrForm.city}
              onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
              placeholder="Springfield"
              required
            />
          </div>
          <div>
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={addrForm.state}
              onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value.toUpperCase() })}
              placeholder="MA"
              required
            />
          </div>
          <div>
            <Label htmlFor="zip">ZIP</Label>
            <Input
              id="zip"
              value={addrForm.zip}
              onChange={(e) =>
                setAddrForm({ ...addrForm, zip: e.target.value.replace(/\D/g, '') })
              }
              placeholder="12345"
              required
            />
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-3">
            <Button type="submit" className="bg-gold hover:bg-gold/90 text-white rounded-full">
              Save Address
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-plum text-plum hover:bg-plum/10"
              onClick={onClearForm}
            >
              Clear Form
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddressForm;
