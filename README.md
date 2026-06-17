# Cleaning Business Website Demo

A fully functional frontend demo website for a residential and commercial cleaning business. This project showcases a complete customer-facing website, client portal, admin portal, booking flow, calendar views, client records, appointment data, and invoice generation using hardcoded local demo data.

This version is designed as a portfolio/demo project. It does not require a live backend, database, cloud functions, authentication server, payment processor, or cloud storage to run.

## Live Demo

Live demo link:

`https://cleaning-demo.jessabel.art`

Replace this placeholder once the project is deployed to the portfolio subdomain.

## Project Status

Current status: frontend-only demo

This project is currently configured to run as a self-contained demo. All business data is local and hardcoded. The booking process, invoices, calendar, client records, admin dashboard, and portal views are designed to simulate a real cleaning business workflow without storing or sending live data.

The demo is useful for:

* Portfolio presentation
* Client previews
* UI/UX demonstrations
* Cleaning business website concept demos
* Admin dashboard demonstrations
* Booking flow demonstrations
* Invoice layout demonstrations
* Client portal demonstrations
* Frontend development case study

## Main Features

### Public Website

The public website includes business-facing marketing pages for a cleaning service company.

Typical sections include:

* Home page
* Services overview
* Residential cleaning services
* Commercial cleaning services
* Booking call-to-action sections
* Contact sections
* Responsive navigation
* Mobile-friendly layout
* Branded header and footer
* Service cards
* Trust-building content
* Customer-focused sales copy

### Booking Flow

The booking flow simulates a real customer appointment request.

Current demo behavior:

* User fills out the booking form
* The app generates a mock appointment locally
* The app generates a matching mock invoice locally
* The user sees a booking confirmation
* No data is saved to a backend
* No emails are sent
* No payment is processed
* No cloud function is triggered

This allows the booking experience to feel realistic while remaining safe for demo use.

### Client Portal

The client portal demonstrates what a customer could see after booking services.

Demo portal functionality may include:

* Client dashboard
* Upcoming appointments
* Past appointments
* Invoice access
* Service details
* Client profile information
* Payment status examples
* Appointment status examples

All client portal data comes from local hardcoded sample records.

### Admin Portal

The admin portal demonstrates how a cleaning business owner or staff member could manage operations.

Demo admin functionality may include:

* Admin dashboard
* Appointment overview
* Client list
* Calendar view
* Invoice list
* Revenue summaries
* Recent activity
* Upcoming jobs
* Service statuses
* Demo business metrics

All admin data is generated from local demo data files.

### Calendar

The calendar is populated with hardcoded cleaning appointments and demo events.

Current demo behavior:

* Displays sample upcoming appointments
* Shows a filled business schedule
* Uses local data only
* Does not connect to Google Calendar
* Does not connect to Firestore
* Does not use backend listeners
* Does not save calendar changes

### Invoice System

The invoice system displays hardcoded sample invoices using the same general layout as the real cleaning business invoice format.

Demo invoice sections include:

* Business branding
* Invoice number
* Invoice date
* Due date
* Bill-to information
* Appointment details
* Service address
* Line-item table
* Unit prices
* Subtotal
* Deposit received
* Amount paid
* Amount due
* Payment status
* Payment method
* Notes for cleaner
* Terms and conditions

Invoices are generated from local demo invoice data and are not connected to a payment gateway.

### Demo Data

The project uses local hardcoded sample data instead of a backend.

Demo data may include:

* Clients
* Appointments
* Calendar events
* Invoices
* Services
* Dashboard metrics
* Payment statuses
* Client notes
* Cleaner notes

Recommended location:

```txt
src/data/
```

Common demo data files:

```txt
src/data/demoClients.js
src/data/demoAppointments.js
src/data/demoInvoices.js
src/data/demoCalendarEvents.js
```

## Tech Stack

This project is built as a modern React frontend.

Common technologies used in the project may include:

* React
* Vite
* React Router
* Tailwind CSS
* shadcn/ui components
* Lucide React icons
* Framer Motion
* JavaScript or TypeScript depending on the project setup
* Local hardcoded demo data

## Folder Structure

General project structure:

```txt
src/
  assets/
    logo/
    images/

  components/
    common/
    ui/
    layout/
    portal/
    admin/
    client/
    invoices/
    booking/

  data/
    demoClients.js
    demoAppointments.js
    demoInvoices.js
    demoCalendarEvents.js

  pages/
    public/
    admin/
    client/
    booking/
    invoices/

  routes/
  hooks/
  utils/
  styles/
```

Actual folders may vary depending on the final implementation.

## Running the Project Locally

Install dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm run dev
```

Build the project:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Demo Limitations

This project is intentionally configured as a frontend-only demo.

Current limitations:

* Booking submissions are not stored
* Client data is not saved
* Invoice data is not saved
* Calendar changes are not saved
* No real authentication is active
* No real payments are processed
* No confirmation emails are sent
* No SMS notifications are sent
* No backend database is connected
* No cloud storage is connected
* No server-side validation is active
* No production security rules are active

This is expected behavior for the demo version.

## Making This Demo a Live Production Website

To convert this demo into a real live cleaning business website, several backend systems would need to be connected or rebuilt.

### 1. Database

A live site needs a database to store:

* Clients
* Bookings
* Appointments
* Invoices
* Services
* Staff users
* Admin users
* Payment records
* Contact form submissions
* Calendar events
* Service addresses
* Customer notes
* Cleaner notes

Possible database options:

* Firebase Firestore
* Supabase Postgres
* Neon Postgres
* PlanetScale
* MongoDB Atlas
* Railway Postgres
* Render Postgres
* AWS DynamoDB
* Google Cloud SQL
* PostgreSQL hosted on a VPS

For this type of business site, Firebase or Supabase would be the fastest practical options.

### 2. Authentication

A live client/admin portal needs real authentication.

Possible authentication options:

* Firebase Authentication
* Supabase Auth
* Clerk
* Auth0
* NextAuth/Auth.js
* AWS Cognito
* Magic link login
* Email/password login
* Google OAuth login

Recommended roles:

* Public visitor
* Client
* Cleaner/staff
* Admin/owner

The admin portal should be protected and should not be accessible to public users.

### 3. Booking Storage

The demo booking flow currently creates a local mock appointment. For production, booking submissions should be saved to a database.

A live booking should usually create:

* Client record
* Appointment record
* Invoice record
* Calendar event
* Admin notification
* Client confirmation email
* Optional deposit/payment record

### 4. Invoice Generation

A production invoice system should support:

* Persistent invoice records
* Unique invoice numbers
* Invoice status tracking
* Paid/unpaid/partial status
* Deposits
* Taxes
* Discounts
* Tips
* Service add-ons
* PDF generation
* Email delivery
* Payment links
* Admin editing
* Client viewing

Possible invoice/PDF generation options:

* Serverless function that generates HTML-to-PDF
* React PDF
* Puppeteer
* Playwright
* pdf-lib
* Stripe invoices
* Square invoices
* QuickBooks integration
* Wave invoice integration

### 5. Payments

A live site can connect to a real payment provider.

Possible payment options:

* Stripe
* Square
* PayPal
* Cash App Pay through Square
* Clover
* QuickBooks Payments
* Wave Payments

Recommended payment flow:

* Customer books service
* System creates appointment
* System creates invoice
* Customer pays deposit or full amount
* Payment provider sends webhook
* Backend updates invoice/payment status
* Client and admin receive confirmation

### 6. Email Notifications

A live site should send automated emails for:

* Booking confirmation
* Appointment reminder
* Invoice created
* Payment received
* Appointment rescheduled
* Appointment cancelled
* Admin new-booking alert
* Contact form submission

Possible email services:

* Resend
* SendGrid
* Mailgun
* Postmark
* Amazon SES
* Firebase Extensions
* Supabase Edge Functions with Resend
* Nodemailer through a serverless function

### 7. SMS Notifications

Optional SMS notifications could be added for:

* Appointment reminders
* New booking alerts
* Cleaner assignment updates
* Same-day reminders
* Payment reminders

Possible SMS services:

* Twilio
* Telnyx
* Vonage
* MessageBird

### 8. Cloud Functions or Serverless Functions

A live site should move sensitive operations to the server.

Server-side functions may be needed for:

* Creating bookings
* Creating invoices
* Sending emails
* Sending SMS messages
* Processing payment webhooks
* Generating PDFs
* Validating admin permissions
* Updating appointment statuses
* Syncing calendar events
* Handling contact form submissions

Possible serverless/function providers:

* Firebase Cloud Functions
* Supabase Edge Functions
* Vercel Serverless Functions
* Netlify Functions
* Cloudflare Workers
* AWS Lambda
* Google Cloud Run
* Google Cloud Functions
* Azure Functions
* Render web services
* Railway services

### 9. Cloud Storage

Cloud storage may be needed for:

* Uploaded logos
* Before/after cleaning photos
* Invoice PDFs
* Contract PDFs
* Customer attachments
* Staff documents
* Service images
* Marketing images

Possible cloud storage providers:

* Firebase Storage
* Supabase Storage
* AWS S3
* Cloudflare R2
* Google Cloud Storage
* Azure Blob Storage
* UploadThing
* ImageKit
* Cloudinary

Recommended options:

* Firebase Storage if using Firebase
* Supabase Storage if using Supabase
* Cloudflare R2 or AWS S3 for scalable file storage
* Cloudinary for image-heavy websites

### 10. Calendar Integration

The demo calendar is local only. A production system could integrate with:

* Google Calendar API
* Microsoft Outlook Calendar API
* Apple Calendar via ICS feeds
* Cal.com
* Calendly
* Square Appointments
* Jobber
* Housecall Pro
* Launch27
* ZenMaid

Production calendar features could include:

* Admin scheduling
* Cleaner assignment
* Customer rescheduling
* Availability rules
* Blocked dates
* Recurring appointments
* Appointment reminders
* Calendar sync
* Route planning

### 11. Admin Dashboard

The admin dashboard should eventually be connected to real business data.

Production dashboard metrics could include:

* Total revenue
* Outstanding invoices
* Paid invoices
* Upcoming appointments
* Completed appointments
* Cancelled appointments
* New clients
* Repeat clients
* Average booking value
* Monthly revenue
* Weekly schedule
* Staff workload
* Service category performance

### 12. Security

Before going live, the site needs production-grade security.

Required security work:

* Protect admin routes
* Protect client routes
* Add role-based access control
* Validate all form submissions server-side
* Sanitize user inputs
* Secure database rules
* Secure storage rules
* Hide private environment variables
* Move sensitive operations out of frontend code
* Add rate limiting for forms
* Add spam protection
* Add audit logging for admin actions
* Verify payment webhooks securely

### 13. Environment Variables

A production version should use environment variables for sensitive keys.

Example environment variables:

```bash
VITE_APP_ENV=production
VITE_SITE_URL=https://your-domain.com

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
```

Frontend-exposed variables should only use safe public keys. Secret keys must stay server-side.

## Suggested Production Architecture Options

### Option 1: Firebase Stack

Best for fast development and simple business apps.

Recommended services:

* Firebase Authentication
* Firestore
* Firebase Storage
* Firebase Cloud Functions
* Firebase Hosting
* Stripe Extension or custom Stripe functions
* SendGrid/Resend email function

Pros:

* Fast setup
* Good for real-time updates
* Easy authentication
* Good frontend integration
* Strong fit for booking and portal apps

Cons:

* Firestore data modeling must be planned carefully
* Costs can grow with heavy reads/writes
* Complex queries can be limiting

### Option 2: Supabase Stack

Best for SQL-based data and structured business records.

Recommended services:

* Supabase Auth
* Supabase Postgres
* Supabase Storage
* Supabase Edge Functions
* Row Level Security
* Stripe integration through Edge Functions
* Resend for email

Pros:

* Real SQL database
* Strong relational data model
* Good for invoices, appointments, clients, payments
* Built-in auth and storage
* Good admin dashboard potential

Cons:

* Row Level Security must be configured carefully
* Edge function setup requires backend knowledge

### Option 3: Vercel + Serverless + Database

Best for React/Next-style deployments and custom backend logic.

Recommended services:

* Vercel hosting
* Vercel Serverless Functions
* Neon Postgres or Supabase Postgres
* Clerk/Auth0 authentication
* UploadThing or S3-compatible storage
* Stripe payments
* Resend email

Pros:

* Flexible
* Professional deployment workflow
* Easy custom APIs
* Strong ecosystem

Cons:

* More services to configure
* Requires more backend architecture decisions

### Option 4: Netlify + Functions

Best for simple serverless hosting.

Recommended services:

* Netlify hosting
* Netlify Functions
* Supabase/Firebase database
* Stripe
* Resend or SendGrid
* Cloudinary or S3-compatible storage

Pros:

* Simple deployment
* Built-in forms and functions
* Good for static React apps

Cons:

* More limited for complex backend workflows

## Recommended Path to Production

For the fastest path from this demo to a real cleaning business website, use either Firebase or Supabase.

Recommended Firebase path:

1. Add Firebase Authentication
2. Create Firestore collections for clients, appointments, invoices, payments, and services
3. Replace demo data with Firestore reads
4. Add Cloud Functions for booking creation, invoice creation, email notifications, and payment webhooks
5. Add Firebase Storage for invoice PDFs and uploaded files
6. Add Stripe or Square payment integration
7. Add production security rules
8. Deploy to Firebase Hosting, Vercel, or Netlify

Recommended Supabase path:

1. Add Supabase Auth
2. Create Postgres tables for clients, appointments, invoices, payments, and services
3. Replace demo data with Supabase queries
4. Add Row Level Security policies
5. Add Supabase Edge Functions for booking creation, invoice generation, emails, and payment webhooks
6. Add Supabase Storage for files
7. Add Stripe or Square payment integration
8. Deploy frontend to Vercel or Netlify

## Example Database Collections or Tables

### clients

```txt
id
first_name
last_name
email
phone
service_address
billing_address
notes
created_at
updated_at
```

### appointments

```txt
id
client_id
service_id
appointment_date
start_time
end_time
frequency
status
service_address
cleaner_notes
internal_notes
created_at
updated_at
```

### invoices

```txt
id
invoice_number
client_id
appointment_id
subtotal
tax
deposit_received
amount_paid
amount_due
payment_status
payment_method
due_date
created_at
updated_at
```

### invoice_items

```txt
id
invoice_id
description
quantity
unit_price
amount
```

### payments

```txt
id
invoice_id
client_id
payment_provider
provider_payment_id
amount
status
payment_method
paid_at
created_at
```

### services

```txt
id
name
description
base_price
duration_minutes
active
created_at
updated_at
```

### users

```txt
id
auth_user_id
role
client_id
display_name
email
created_at
updated_at
```

## Deployment Notes

This demo can be deployed as a static frontend.

Possible static hosting providers:

* Vercel
* Netlify
* Firebase Hosting
* Cloudflare Pages
* GitHub Pages
* Render Static Sites

Recommended demo deployment:

* Deploy to Vercel or Netlify
* Connect the GitHub repository
* Set the build command to `npm run build`
* Set the output directory to `dist`
* Add a custom subdomain from the portfolio domain

Example:

```txt
cleaning-demo.yourportfolio.com
```

## Build Settings

Common deployment settings for Vite:

```txt
Build command: npm run build
Output directory: dist
Install command: npm install
```

## Future Improvements

Possible future improvements include:

* Real booking persistence
* Real client accounts
* Admin authentication
* Staff accounts
* Cleaner assignment
* Recurring appointment scheduling
* Real invoice PDF export
* Payment links
* Stripe or Square checkout
* Email notifications
* SMS reminders
* Contact form storage
* Google Calendar sync
* Before/after photo uploads
* Service area ZIP code validation
* Quote request workflow
* Coupon codes
* Reviews/testimonials management
* Blog or cleaning tips section
* SEO metadata improvements
* Analytics tracking
* Accessibility audit
* Performance optimization
* End-to-end testing

## Testing Checklist

Before presenting or deploying the demo, verify:

* Home page loads correctly
* Header logo displays correctly
* Navigation works on desktop
* Navigation works on mobile
* Booking form opens correctly
* Booking form submits without backend errors
* Booking confirmation displays correctly
* Demo invoice displays correctly
* Client portal loads correctly
* Admin portal loads correctly
* Calendar displays demo appointments
* Invoice links work
* Client data displays correctly
* No Firebase Cloud Function errors appear in the console
* No Sanchez branding remains
* No pink legacy backgrounds remain
* Build completes successfully

## Known Demo Behavior

Because this is a demo, the following behavior is intentional:

* Refreshing the page does not preserve new booking submissions
* Demo records do not change permanently
* Invoice data is sample data
* Payment statuses are sample data
* Calendar events are sample data
* Admin metrics are calculated from sample data
* Login/auth behavior may be simulated or simplified
* No real customer information is stored

## License

Copyright © 2026 Jessabel.art

This project was created as a portfolio demonstration and showcase application.

All rights reserved.

No portion of this project may be copied, redistributed, sold, republished, or used commercially without prior written permission from the author.

This repository and accompanying demo are intended solely for portfolio, educational, and demonstration purposes unless otherwise specified by the author.

## Author

### Jessabel

Portfolio:

`https://jessabel.art`

Demo Site:

`https://cleaning-demo.jessabel.art`

GitHub:

`https://github.com/Jessabel-Art`

### Project Description

This project demonstrates a modern cleaning business website and management platform featuring:

* Marketing website
* Online booking experience
* Client portal
* Admin portal
* Calendar scheduling
* Invoice generation
* Service management workflows
* Responsive design
* Modern React frontend architecture

The current deployment is a frontend-only demonstration environment powered by local demo data and intended to showcase user experience, interface design, component architecture, and business workflow implementation.

### Future Production Version

A production deployment of this project can be extended with:

* Authentication
* Database integration
* Real appointment scheduling
* Payment processing
* Email notifications
* SMS reminders
* Cloud storage
* PDF invoice generation
* CRM functionality
* Staff management
* Customer self-service tools

### Contact

Website:

`https://jessabel.art`

For project inquiries, freelance work, custom business websites, dashboard development, frontend engineering, and full-stack application development, please use the contact information available on the portfolio website.
