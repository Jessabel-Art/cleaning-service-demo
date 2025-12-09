import { Timestamp } from 'firebase/firestore';
import { normalizePhone, normalizeAddress } from './contactModel';

export function buildBookingPayload(form, estimate, userId = null) {
  const start = form.startAt instanceof Date ? form.startAt : new Date(form.startAt);
  const durationHours = estimate?.durationHours || estimate?.duration || 2;
  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
  return {
    userId,
    serviceSlug: form.service || form.serviceSlug,
    serviceName: form.serviceName || '',
    frequency: form.frequency,
    propertyType: form.propertyType,
    sqft: form.sqft,
    bedrooms: form.bedrooms,
    bathrooms: form.bathrooms,
    condition: form.condition,
    pets: form.pets === 'yes',
    addons: form.addons || [],
  contact: { name: form.name, email: form.email, phone: normalizePhone(form.phone), phoneRaw: form.phone, emailLower: (form.email || '').toLowerCase() },
  address: normalizeAddress({ line1: form.street || form.address || '', city: form.city || '', state: form.state || '', zip: form.zip || '' }),
    notes: form.notes || '',
    estimate: estimate || {},
    cost: estimate?.total || 0,
    paid: 0,
    depositDue: 50,
    status: 'pending',
    startAt: Timestamp.fromDate(start),
    endAt: Timestamp.fromDate(end),
    durationMinutes: Math.round((durationHours || 2) * 60),
    createdAt: Timestamp.fromDate(new Date()),
    updatedAt: Timestamp.fromDate(new Date()),
  };
}

export function buildReviewPayload(user, rating, body) {
  return {
    userId: user?.uid || null,
    name: user?.displayName || user?.email || 'Anonymous',
    email: user?.email || null,
    rating: Number(rating) || 5,
    body: body || '',
    status: 'pending',
    source: 'client-portal',
  };
}
