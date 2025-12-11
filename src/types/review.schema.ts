/**
 * Firestore Reviews Collection Schema
 * 
 * Collection: reviews
 * Purpose: Store client reviews with privacy controls and admin approval workflow
 */

import { Timestamp } from "firebase/firestore";

export interface Review {
  // === Identity ===
  id: string;                    // Firestore document ID
  clientId: string;              // Firebase Auth UID of the reviewer
  bookingId?: string;            // Optional link to a specific booking
  
  // === Content ===
  rating: number;                // 1-5 stars
  comment: string;               // The review text (primary field)
  body?: string;                 // Legacy field, kept for backward compatibility
  serviceName?: string;          // e.g., "Residential Cleaning", "Commercial Cleaning"
  source?: string;               // e.g., "client-portal", "email", "phone"
  
  // === Privacy & Display ===
  displayMode: "anonymous" | "initials" | "firstInitialLastName";
  displayName: string;           // ONLY the safe, formatted name for public display
                                // Examples:
                                //   - "Anonymous" (anonymous mode)
                                //   - "J.S." (initials mode)
                                //   - "J. Santos" (firstInitialLastName mode)
  
  // === Workflow ===
  status: "pending" | "approved" | "rejected" | "declined";
  createdAt: Timestamp;         // When client submitted the review
  publishedAt?: Timestamp;      // When admin approved (only set if status=approved)
  updatedAt?: Timestamp;        // Last update timestamp
  
  // === Optional Metadata ===
  screenshot?: string;          // URL/path to review screenshot (if imported from external source)
  city?: string;               // Client's city (for display context)
}

/**
 * Display Mode Explanations
 * 
 * anonymous:
 *   - displayName = "Anonymous"
 *   - No personal info shown
 * 
 * initials:
 *   - displayName = "J.S." (first initial + last initial)
 *   - Derived from client's profile.name or auth.displayName
 *   - Falls back to single initial if only one name part
 * 
 * firstInitialLastName:
 *   - displayName = "J. Santos" (first initial + space + last name)
 *   - Most identifiable option while preserving some privacy
 *   - Falls back to full name if only one name part
 */

/**
 * Status Workflow
 * 
 * pending → Client submits review, default state
 * approved → Admin approves, sets publishedAt, shows on homepage
 * rejected/declined → Admin rejects, not shown publicly
 */

/**
 * Security Rules (firestore.rules)
 * 
 * - Public (unauthenticated): Can read approved reviews only
 * - Clients: Can create reviews with status="pending" and their own clientId
 * - Admins: Can read all, update status, delete reviews
 * - Validation: displayMode must be one of the three allowed values
 * 
 * See REVIEWS_PRIVACY_UPDATE.md for full implementation details and code examples
 */
