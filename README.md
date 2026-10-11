# CHRISTmas in Our Hearts 2026 — Digital Event System

A mobile-friendly, offline-capable event operations system for **Heart Warriors Philippines Inc.**

**Event:** CHRISTmas in Our Hearts / Christmas With a Heart  
**Date:** December 3, 2026  
**Time:** 1:00 PM  
**Venue:** Philippine Heart Center

## Eligibility rules

- **Kid** → Food ✅ + Raffle ✅
- **Parent / Guardian** → Food ✅ + Raffle ❌
- One food claim per registered attendee.
- Parent / Guardian raffle access is permanently blocked by the app.
- Only activated kid raffle entries are included in the raffle draw.
- Previous raffle winners cannot win again.

## Final event flow

**PARENT / GUARDIAN REGISTRATION → DIGITAL STUB RELEASE → FOOD / RAFFLE CLAIM → RAFFLE DRAW → REPORTS**

There is **no separate check-in step**. Parents/Guardians complete the registration themselves. One submission creates one Parent/Guardian record and one Kid record under the same Family ID.

## Parent registration fields

### Parent / Guardian
- Full Name
- Location / Address
- Contact Number
- Age

### Kid
- Full Name
- Location / Address
- Contact Number
- Age

The system automatically creates a shared Family ID and separate attendee codes for the parent and child.

## Staff roles

- Administrator
- Digital Stub Release
- Food Claiming
- Raffle Claiming / Draw

Parents do not need a staff account. Staff Login is only for authorized event operations.

## Features

- Parent / Guardian self-registration
- Parent + child family linking
- Duplicate registration warnings
- Separate digital stub release
- Unique attendee code and QR pass
- Food claim with one-claim-only protection
- Food inventory and meals-remaining counter
- Kids-only raffle activation
- Kids-only raffle draw with winner history
- Duplicate-winner protection
- Searchable attendee masterlist
- Admin correction / undo with reason
- Audit trail with registration source, staff name, and timestamp
- CSV attendee export
- CSV audit export
- JSON backup and restore
- Full event archive export
- Controlled event-data closeout
- Installable PWA
- Offline cache after first successful online load
- Same-browser tab sync using BroadcastChannel

## Important: current multi-device limitation

This GitHub Pages version stores data in the browser's **localStorage**. Parent registrations made on the designated event registration phone/tablet are immediately available to staff using that same browser/device.

**Different phones do not automatically live-sync.** If parents must register from their own phones and staff must instantly see those registrations, the app needs a shared backend such as Supabase or a local event server.

## Local use

Run with a local static server:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

> Camera access normally requires HTTPS or localhost.
