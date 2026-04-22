# CMCHS Demo Equipment Tracker

A single-page web application for managing medical demonstration equipment loans across multiple customers and events. Built for Connected Healthcare Systems (CHS) in partnership with Cass Medical.

---

## Overview

The tracker gives the CHS team a live view of every piece of demo equipment — where it is, who has it, when it's due back, and what's coming up next. Everything is stored in Firebase and accessible from any device via browser.

---

## Logging In

The app is protected by a login password. A separate **admin password** (`notouchy`) is required for destructive actions such as removing items from loans, retiring equipment, or converting loan records.

---

## Tabs

### 📦 Scan / Loan
The main tab for creating new loans. You can:
- Type CHS Asset Numbers manually or scan QR codes via the device camera
- Add multiple devices to a **batch loan** at once
- Set the customer name, location, start/end dates, account manager, email, and contact number
- Add loan notes
- The system checks for **date conflicts** before confirming — if an item is already booked for an overlapping period, a warning modal appears with options to proceed or skip that item

Once confirmed, a **Loan Form PDF** is generated automatically and can be emailed directly to the account manager.

### 🗄️ Database
A searchable, filterable table of all equipment. Each row shows:
- CHS Asset No., Model, Description, Serial No., Status (Available / On Loan / Overdue), Shelf Location, and more

Click any row to open the full **Equipment Detail Panel**, which shows all fields including Battery Serial Number, network details (LAN/WLAN MAC, Device ID), pricing (US$ and NZ$), tile/AirTag info, and loan history.

The **Edit** button (admin password required) lets you update any field. Equipment can also be **retired** from this tab.

Use the **checkboxes** to select multiple items and add them directly to a loan via the **Loan Basket**.

### 📋 Loans
The central hub for tracking all active and upcoming loans. Loans are split into two sections:

**Upcoming Loans** — loans with a future start date, shown with a 📅 Scheduled or ⏳ Upcoming badge. These include:
- Confirmed scheduled loans (items booked ahead of time)
- Unconfirmed upcoming bookings (items still out on a current loan, pre-booked for a future one)

**Current Loans** — loans that are actively running (start date has passed), shown with a green Active badge or red ⚠ Overdue badge.

Each loan card shows the customer, account manager, location, dates, device count, and any loan notes. Click a card to expand the item list.

#### Loan Actions
Each card has buttons to:
- **📄 View** — open the editable Loan Form PDF
- **Extend** — push the due date forward
- **Reassign** — change the account manager
- **+ Add items** — add more equipment to the loan
- **Return items** — mark items as returned (with optional individual or bulk return)
- **🗑️ Delete** — remove the loan record (admin password required)

#### Multi-Loan Equipment Scheduling
Equipment can be booked across multiple non-overlapping loans simultaneously. The system tracks the full chain:
- An item on Loan A that is also booked for Loan B and Loan C will show:
  - On **Loan A's list**: *"⏳ Scheduled for Loan B from [date] — Then scheduled for Loan C"*
  - On **Loan B's upcoming list**: *"⚠ Currently on loan to Loan A · due back [date] — Then scheduled for Loan C"*
- When Loan B's start date arrives, the equipment automatically activates and moves to Loan B on the next page load
- No manual intervention is needed — the chain resolves itself in order

#### Fix: Convert to Upcoming
If equipment records become incorrectly set as active on a future loan (e.g. due to data entry errors), a **↺ Fix: Move to Upcoming** button appears on scheduled loan cards. This clears the equipment records and re-registers the items as upcoming bookings, restoring correct data without losing any information.

### 🔢 Count
A stocktake tool for physically counting equipment. Scan or type asset numbers to mark items as counted. The overview shows:
- Items counted in this session
- Items counted via the old system
- Items never counted

### 📥 Import
Import equipment from Excel (.xlsx) or CSV files. Existing items matched by CHS Asset Number are updated; new ones are added. Recognised column headers include all standard fields plus `Battery Serial Number`.

### 🗃️ Retired
A read-only archive of retired/decommissioned equipment. Items can be restored from here if needed.

---

## Equipment Fields

| Field | Description |
|---|---|
| CHS Asset No. | Unique internal identifier |
| Model | Short model name |
| Description | Full product description |
| Serial Number | Manufacturer serial number |
| Battery Serial Number | Serial number of the fitted battery |
| Part Number | Manufacturer part/SKU number |
| Manufacture Date | Date of manufacture |
| Purchase Date | Date purchased by CHS |
| US$ Price | Purchase price in USD |
| NZ$ Price | Purchase price in NZD |
| Shelf Location | Physical storage location when not on loan |
| Tile No. / Tile Type / Tile UUID | AirTag/Tile tracker details |
| Device ID | Network device identifier |
| LAN MAC / WLAN MAC | MAC addresses |
| Old CHS # | Legacy asset number |
| Notes | Internal notes (not shown on loan forms) |
| Account Manager | Assigned account manager |
| Borrower Email | Borrower contact email |

---

## Loan Form PDF

Each loan generates a printable form showing:
- Customer name, address, loan dates, account manager, and contact number
- Table of equipment with CHS Asset No., Description, Serial/Part No., and signature columns (Dispatched CHS, Customer Received, Dispatched Customer, CHS Received)
- Notes field and CHS Authorised signature line
- CHS and Cass Medical branding

The form is editable directly in the browser before printing or saving. Changes are saved to Firebase automatically. The form can be emailed to the account manager via EmailJS.

**Note:** Loan form notes are separate from equipment-level notes. Equipment notes (e.g. "New Battery: XXXX") are stored against the device only and never appear on loan forms.

---

## Notifications & Emails

The system sends automatic emails via EmailJS for:
- **Loan confirmation** — sent to the account manager when a loan is created
- **Overdue reminders** — sent when a loan passes its due date (checked every minute)
- **Upcoming loan start** — sent 2 days before a scheduled loan begins
- **Due soon reminders** — sent when a loan is due within 2 days

---

## Data & Storage

- All equipment and loan history is stored in **Firebase Realtime Database**
- Upcoming/scheduled loan bookings are stored separately under `/upcomingLoans`
- Loan form PDFs and notes are stored under `/loanDocs`
- The app auto-saves with a debounced save (800ms) and an immediate save for critical operations
- A sync indicator (top-right) shows Saving… / Saved / Save failed status in real time

---

## Key Behaviours

- **Items never disappear** — equipment booked into multiple loans always remains visible in every relevant loan list
- **Upcoming loans don't overwrite active loans** — adding an item to a future loan while it's currently out preserves the active loan record
- **Auto-activation** — when an upcoming loan's start date arrives, the equipment record automatically transfers on the next page load
- **Conflict detection** — adding an item to a loan that overlaps with an existing booking triggers a review modal; non-overlapping bookings are always allowed without interruption
- **Admin password protection** — all destructive actions (remove, delete, retire, edit) require the admin password

---

## Browser Support

Works in any modern browser with camera access for QR scanning. Recommended: Chrome or Safari on desktop or mobile.
