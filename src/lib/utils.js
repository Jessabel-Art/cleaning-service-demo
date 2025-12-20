import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

// Format an address from either a booking object or an address-like object/string.
// Returns a string suitable for display with optional newline between lines.
export function formatAddress(addrOrBooking) {
	if (!addrOrBooking) return 'Address on file';

	// If a plain string was provided, return as-is
	if (typeof addrOrBooking === 'string') {
		return addrOrBooking || 'Address on file';
	}

	const b = addrOrBooking;
	// Resolve an address-like object from common booking shapes
	const addrObj =
		(b && (b.address || b.serviceAddressData || (b.contact && b.contact.address))) || b;

	if (typeof addrObj === 'string') {
		return addrObj || 'Address on file';
	}

	// Compose line1 from common fields
	const line1 =
		(addrObj && (addrObj.line1 || addrObj.street)) ||
		(b && (
			b.addressLine1 ||
			b.street ||
			b.streetAddress ||
			b.serviceAddress ||
			(b.contact && (b.contact.addressLine1 || b.contact.streetAddress || b.contact.street))
		)) ||
		null;

	// City/state/zip from either addrObj or booking/contact fallbacks
	const city = (addrObj && addrObj.city) || (b && (b.city || (b.contact && b.contact.city))) || null;
	const state =
		(addrObj && (addrObj.state || addrObj.stateCode)) ||
		(b && (b.state || b.stateCode || (b.contact && (b.contact.state || b.contact.stateCode)))) ||
		null;
	const zip =
		(addrObj && (addrObj.zip || addrObj.postalCode)) ||
		(b && (b.zip || b.zipCode || b.postalCode || (b.contact && (b.contact.zip || b.contact.zipCode || b.contact.postalCode)))) ||
		null;

	const cityState = [city, state].filter(Boolean).join(', ') || null;
	const line2 = [cityState, zip].filter(Boolean).join(' ') || null;

	const result = [line1, line2].filter(Boolean).join('\n');
	return result || 'Address on file';
}