# ARCHITECTURE.md - Kloterby Meme

## Overview
Kloterby Meme adalah sistem manajemen arisan (kloter) otomatis yang menangani pendaftaran anggota, penagihan, verifikasi pembayaran, dan pencairan dana (disbursement).

## Technology Stack
- **Backend**: FastAPI (Python 3.10+) + SQLAlchemy (PostgreSQL)
- **Frontend**: Next.js (React 19) + Axios
- **Automation**: Celery + Redis (untuk denda harian, reminder WA, dan generate periode)
- **Database**: PostgreSQL (untuk data transaksional dan ledger)

## Domain Models & State Machine

### 1. Kloter (Arisan Group)
Entitas utama yang mendefinisikan kontribusi bulanan, jumlah slot, dan jadwal mulai.

### 2. Period (Periode)
Setiap kloter dibagi menjadi N periode (N = jumlah slot). 
- **Status**: `UPCOMING` -> `COLLECTING` -> `VERIFYING` -> `READY_GET` -> `COMPLETED`.
- Transisi ke `READY_GET` hanya terjadi jika semua pembayaran dalam periode tersebut sudah `VERIFIED` atau `DEFAULTED`.

### 3. Payment (Pembayaran)
- **Expectation**: Tagihan yang dibuat otomatis untuk setiap anggota di awal periode.
- **Status**: `EXPECTED` -> `PROOF_UPLOADED` -> `MANUAL_REVIEW` -> `VERIFIED` (Terminal) atau `LATE` -> `DEFAULTED` (Terminal).
- **Concurrency Control**: Menggunakan `WITH FOR UPDATE` pada baris `PeriodProgress` untuk memastikan counter `paid_count` dan `late_count` akurat saat diproses oleh banyak admin/worker secara bersamaan.

## Key Workflows

### Penagihan (Billing)
1. `PeriodWorker` menjalankan generate periode.
2. `PaymentExpectation` dibuat dengan kode unik (`unique_code`) untuk setiap anggota.
3. Anggota mengunggah bukti bayar via `/member/upload`.

### Verifikasi & Disbursement
1. Admin memverifikasi bukti bayar di `/admin/payments`.
2. Jika semua tagihan dalam satu periode lunas (`paid_count + defaulted_count == total_slot`), sistem menandai periode sebagai `READY_GET`.
3. `DisbursementService` membuat entri penarikan dana untuk pemenang periode tersebut.

## Security & Isolation
- **Tenant Isolation**: Setiap request dipisahkan berdasarkan `tenant_id` (Operator Arisan).
- **Audit Logging**: Semua aksi kritis (verifikasi, penolakan, disbursement) dicatat di tabel `audit_logs`.

## Deployment
- **Frontend**: Vercel / Static Hosting
- **Backend**: Docker Containerized
- **Uploads**: Disimpan secara lokal di `/uploads/` (Memerlukan Persistent Volume)
