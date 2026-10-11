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

**STAFF LOGIN → REGISTRATION → DIGITAL STUB RELEASE → FOOD / RAFFLE CLAIM → RAFFLE DRAW → REPORTS**

There is **no separate check-in step**. Once a person is registered, authorized Stub Release staff can find the attendee and release the digital pass.

## Registration fields

- Full Name
- Location / Address
- Contact Number
- Age
- Attendee Type: Kid or Parent / Guardian
- Family / Household ID
- Optional linked Parent / Child name
- Privacy acknowledgement

## Staff roles

- Administrator
- Registration
- Digital Stub Release
- Food Claiming
- Raffle Claiming / Draw

The first launch creates a local Administrator account. The Administrator can add staff accounts with 4-digit PINs. Staff profiles are stored only on that device.

## Features

- Role-based staff login
- Registration and duplicate warnings
- Family / household linking
- Separate digital stub release
- Unique attendee code and QR pass
- Food claim with one-claim-only protection
- Food inventory and meals-remaining counter
- Kids-only raffle activation
- Kids-only raffle draw with winner history
- Duplicate-winner protection
- Searchable attendee masterlist
- Admin correction / undo with reason
- Audit trail with staff name and timestamp
- CSV attendee export
- CSV audit export
- JSON backup and restore
- Full event archive export
- Controlled event-data closeout
- Installable PWA
- Offline cache after first successful online load
- Same-browser tab sync using BroadcastChannel

## Data storage and multi-device limitation

This GitHub Pages build stores operational data in the browser's **localStorage**. It can work offline and can synchronize open tabs in the same browser, but **different phones do not automatically live-sync**.

For multiple staff devices that must share one live masterlist, the next upgrade should connect the app to a shared backend such as **Supabase** or a local event server. Until then, use one primary event device or carefully manage JSON backup/restore between devices.

## Local use

Run with a local static server:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

> Camera access normally requires HTTPS or localhost.
