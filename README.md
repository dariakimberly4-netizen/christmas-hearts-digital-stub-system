# CHRISTmas in Our Hearts 2026 — Digital Registration & Stub System

A mobile-friendly event system for **Heart Warriors Philippines Inc.**

**Event:** CHRISTmas in Our Hearts / Christmas With a Heart  
**Date:** December 3, 2026  
**Time:** 1:00 PM  
**Venue:** Philippine Heart Center

## Rules

- **Kid** → Food ✅ + Raffle ✅
- **Parent / Guardian** → Food ✅ + Raffle ❌
- Food can be claimed only once per registered attendee.
- Parent / Guardian raffle access is blocked by the app.
- Only activated kid raffle entries appear in the raffle draw.

## Registration fields

- Full Name
- Location / Address
- Contact Number
- Age
- Attendee Type: Kid or Parent / Guardian
- Optional linked Parent / Child name

## Features

- Event dashboard and live counters
- Registration and unique attendee code
- Digital event pass with QR code
- Food claim screen with one-claim-only protection
- Raffle claim screen with strict parent exclusion
- Camera QR scan when the browser supports `BarcodeDetector`
- Manual attendee code fallback
- Kids-only raffle draw
- Searchable attendee masterlist
- CSV export
- JSON backup and restore
- Installable PWA
- Offline cache after first successful online load

## Data storage

This GitHub Pages build stores attendee records in the browser's **localStorage**. Data stays on that browser/device unless staff export a JSON backup and restore it on another device.

For one event device, this is simple and reliable. For multiple staff devices that need live shared records, connect the app to a backend/database such as Supabase or a local network server.

## Running locally

You can open the project with a simple static server, for example:

```bash
python -m http.server 8080
```

Then visit `http://localhost:8080`.

> Camera access normally requires HTTPS or localhost.
