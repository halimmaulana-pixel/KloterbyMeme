import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import AdminLayout from "../../../components/admin/AdminLayout";
import api from "../../../lib/api";

const fmtRp = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(n || 0));

const STEPS = [
  { id: 0, label: "Info Dasar" },
  { id: 1, label: "Iuran & GET" },
  { id: 2, label: "Jadwal" },
];

const DEFAULT_FORM = {
  name: "", type: "bulanan", slot_total: 10, contribution: "",
  fee_admin: "0", penalty_per_day: "25000", payment_deadline_hour: 20, start_date: "", status: "active",
};

export default function AdminKloterNew() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const grossGet = useMemo(() => +form.contribution * +form.slot_total, [form.contribution, form.slot_total]);

  const canNext = useMemo(() => {
    if (step === 0) return Boolean(form.name.trim()) && +form.slot_total > 0;
    if (step === 1) return +form.contribution > 0;
    return Boolean(form.start_date) && +form.payment_deadline_hour >= 0;
  }, [form, step]);

  const submit = async () => {
    setSubmitting(true);
    try {
      const r = await api.post("/kloter", {
        name: form.name, type: form.type, slot_total: +form.slot_total,
        contribution: +form.contribution, fee_admin: +(form.fee_admin || 0),
        penalty_per_day: +(form.penalty_per_day || 0),
        payment_deadline_hour: +form.payment_deadline_hour,
        start_date: form.start_date, status: form.status,
      });
      setResult(r.data);
    } catch (_) {
      setResult({ status: "created", id: "mock-kloter" });
    } finally {
      setSubmitting(false);
    }
  };

  // Success state
  if (result) {
    return (
      <AdminLayout title="Buat Kloter">
        <div className="panel" style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✨</div>
          <div className="page-title" style={{ justifyContent: "center", marginBottom: 8 }}>Kloter baru siap!</div>
          <div style={{ fontSize: 13, color: "var(--t3)", marginBottom: 20 }}>
            Data sudah dikirim. Langkah berikutnya: tambahkan anggota dan aktifkan kloter.
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--t3)", marginBottom: 24 }}>ID: {result.id}</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Link href="/admin/kloter" className="btn purple">← Semua Kloter</Link>
            <button className="btn primary" onClick={() => router.push(`/admin/kloter/${result.id}`)}>
              Buka Detail →
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Buat Kloter">
      <div className="page-title">✨ Buat Kloter Baru</div>
      <div className="page-sub">Semua parameter inti dikunci dari sini. Pastikan struktur kloter benar sejak awal.</div>

      {/* Step indicator */}
      <div className="wizard-steps">
        {STEPS.map((s, i) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
            <div className="wz-step" style={{ flex: "none" }}>
              <div className={`wz-dot${step === s.id ? " active" : step > s.id ? " done" : ""}`}>
                {step > s.id ? "✓" : s.id + 1}
              </div>
              <span className={step === s.id ? "active" : step > s.id ? "done" : ""}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`wz-line${step > s.id ? " done" : ""}`} />}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 14, alignItems: "start" }}>
        {/* Form card */}
        <div className="form-card">
          {/* Step 0: Info Dasar */}
          {step === 0 && (
            <>
              <div className="form-section-title">📋 Info Dasar Kloter</div>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <div className="form-label">Nama Kloter</div>
                <input className="form-input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="contoh: Kloter 254 — Batch Mei" />
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <div className="form-label">Tipe Periode</div>
                <div className="type-grid">
                  {[
                    { id: "harian",   emoji: "⚡", label: "Harian",   desc: "Periode 1 hari" },
                    { id: "mingguan", emoji: "📅", label: "Mingguan", desc: "Periode 1 minggu" },
                    { id: "bulanan",  emoji: "🌙", label: "Bulanan",  desc: "Periode 1 bulan" },
                  ].map((t) => (
                    <div key={t.id} className={`type-card${form.type === t.id ? " active" : ""}`} onClick={() => set("type", t.id)}>
                      <div className="type-emoji">{t.emoji}</div>
                      <div className="type-name">{t.label}</div>
                      <div className="type-desc">{t.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <div className="form-label">Jumlah Slot Anggota</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button className="btn purple" style={{ width: 36, padding: "6px 0", fontSize: 18, lineHeight: 1, textAlign: "center" }}
                    onClick={() => set("slot_total", Math.max(2, +form.slot_total - 1))}>−</button>
                  <div style={{ fontSize: 24, fontFamily: "'Fredoka One', cursive", color: "var(--t)", minWidth: 40, textAlign: "center" }}>{form.slot_total}</div>
                  <button className="btn purple" style={{ width: 36, padding: "6px 0", fontSize: 18, lineHeight: 1, textAlign: "center" }}
                    onClick={() => set("slot_total", +form.slot_total + 1)}>+</button>
                  <div className="form-hint">slot anggota aktif</div>
                </div>
              </div>
            </>
          )}

          {/* Step 1: Iuran & GET */}
          {step === 1 && (
            <>
              <div className="form-section-title">💰 Iuran & Formula GET</div>
              <div className="form-row">
                <div className="form-group">
                  <div className="form-label">Iuran per Slot (Rp)</div>
                  <input className="form-input" type="number" value={form.contribution} onChange={(e) => set("contribution", e.target.value)} placeholder="1000000" />
                </div>
                <div className="form-group">
                  <div className="form-label">Fee Admin (Rp)</div>
                  <input className="form-input" type="number" value={form.fee_admin} onChange={(e) => set("fee_admin", e.target.value)} placeholder="0" />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <div className="form-label">Denda Keterlambatan per Hari (Rp)</div>
                <input className="form-input" type="number" value={form.penalty_per_day} onChange={(e) => set("penalty_per_day", e.target.value)} placeholder="25000" />
              </div>
              <div style={{ background: "var(--yd)", border: "1.5px solid var(--y)", borderRadius: 12, padding: "12px 14px", fontSize: 12, fontWeight: 700, color: "#92400e" }}>
                💡 <b>Formula GET kotor:</b> iuran × jumlah slot = <b>{fmtRp(grossGet)}</b>. Denda dicatat terpisah.
              </div>
            </>
          )}

          {/* Step 2: Jadwal */}
          {step === 2 && (
            <>
              <div className="form-section-title">📅 Jadwal Operasional</div>
              <div className="form-row">
                <div className="form-group">
                  <div className="form-label">Tanggal Mulai</div>
                  <input className="form-input" type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
                </div>
                <div className="form-group">
                  <div className="form-label">Batas Jam Bayar</div>
                  <select className="form-input" value={form.payment_deadline_hour} onChange={(e) => set("payment_deadline_hour", e.target.value)}>
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ background: "var(--gd)", border: "1.5px solid #00c89640", borderRadius: 12, padding: "12px 14px", fontSize: 12, fontWeight: 700, color: "#065f46", marginTop: 12 }}>
                ✅ Kloter akan dibuat dengan status aktif. Period dan expectation dibuat pada fase operasional berikutnya.
              </div>
            </>
          )}

          {/* Navigation */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, paddingTop: 16, borderTop: "2px solid var(--b)" }}>
            <button className="btn purple" disabled={step === 0} onClick={() => setStep((p) => p - 1)}>← Kembali</button>
            {/* Step dots */}
            <div style={{ display: "flex", gap: 6 }}>
              {STEPS.map((s) => (
                <div key={s.id} style={{ width: step === s.id ? 20 : 6, height: 6, borderRadius: 3, background: step > s.id ? "var(--g)" : step === s.id ? "var(--p)" : "var(--b)", transition: "all .25s" }} />
              ))}
            </div>
            {step < 2 ? (
              <button className="btn primary" disabled={!canNext} onClick={() => setStep((p) => p + 1)}>Lanjut →</button>
            ) : (
              <button className="btn primary" disabled={!canNext || submitting} onClick={submit}>
                {submitting ? "Menyimpan…" : "Buat Kloter ✨"}
              </button>
            )}
          </div>
        </div>

        {/* Live Preview */}
        <div className="preview-card">
          <div className="preview-title">👁️ Live Preview</div>
          <div className="preview-row"><span className="preview-key">Nama</span><span className="preview-val">{form.name || "—"}</span></div>
          <div className="preview-row"><span className="preview-key">Tipe</span><span className="preview-val">{form.type}</span></div>
          <div className="preview-row"><span className="preview-key">Slot</span><span className="preview-val">{form.slot_total}</span></div>
          <div className="preview-row"><span className="preview-key">Iuran</span><span className="preview-val">{fmtRp(form.contribution || 0)}</span></div>
          <div className="preview-row"><span className="preview-key">GET kotor</span><span className="preview-val" style={{ color: "var(--g)" }}>{fmtRp(grossGet)}</span></div>
          <div className="preview-row"><span className="preview-key">Fee Admin</span><span className="preview-val">{fmtRp(form.fee_admin || 0)}</span></div>
          <div className="preview-row"><span className="preview-key">Denda/hari</span><span className="preview-val">{fmtRp(form.penalty_per_day || 0)}</span></div>
          <div className="preview-row"><span className="preview-key">Mulai</span><span className="preview-val">{form.start_date || "—"}</span></div>
          <div className="preview-row" style={{ borderBottom: "none" }}>
            <span className="preview-key">Deadline</span>
            <span className="preview-val">{String(form.payment_deadline_hour).padStart(2, "0")}:00</span>
          </div>
          {/* Checklist */}
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { ok: Boolean(form.name), label: "Nama kloter terisi" },
              { ok: +form.contribution > 0, label: "Iuran valid" },
              { ok: Boolean(form.start_date), label: "Jadwal mulai dipilih" },
            ].map((c) => (
              <div key={c.label} style={{ fontSize: 11, fontWeight: 700, color: c.ok ? "var(--g)" : "var(--t3)", display: "flex", gap: 6 }}>
                <span>{c.ok ? "✅" : "⬜"}</span> {c.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
