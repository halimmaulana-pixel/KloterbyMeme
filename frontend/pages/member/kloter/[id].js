import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Link from "next/link";
import MemberLayout from "../../../components/member/MemberLayout";
import api from "../../../lib/api";

const fmtRp = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const FALLBACK = {
  id: "k254",
  name: "Kloter 254",
  type: "bulanan",
  contribution: 1000000,
  status: "collecting",
  current_period: 5,
  total_periods: 11,
  next_get_date: "2026-09-15",
  my_slot: 5,
  my_payment_status: "expected",
  my_unique_code: "254005",
  my_expected_amount: 1000000,
  my_penalty: 0,
  get_value: 11000000,
  admin_name: "Budi Santoso",
  bank_name: "BCA",
  account_number: "0254 1005 0001",
  payment_deadline_hour: 20,
  timeline: [
    { period: 1, member: "Siti Nur",    date: "2026-01-15", status: "lunas",    amount: 1000000, desc: "Iuran lunas tepat waktu" },
    { period: 2, member: "Budi S.",     date: "2026-02-15", status: "lunas",    amount: 1000000, desc: "Iuran lunas tepat waktu" },
    { period: 3, member: "Alya F.",     date: "2026-03-15", status: "telat",    amount: 1050000, desc: "Terlambat 2 hari — denda Rp 50k" },
    { period: 4, member: "Dewi R.",     date: "2026-04-15", status: "lunas",    amount: 1000000, desc: "Iuran lunas tepat waktu" },
    { period: 5, member: "Anda",        date: "2026-05-15", status: "pending",  amount: 1000000, desc: "Menunggu pembayaran" },
    { period: 6, member: "—",           date: "2026-06-15", status: "upcoming", amount: 1000000, desc: "Belum dimulai" },
  ],
};

const dotEmoji = { lunas: "✅", telat: "⏰", pending: "⏳", get: "🎉", upcoming: "⭕" };

export default function MemberKloterDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [detail, setDetail] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [editBank, setEditBank] = useState(false);
  const [bankForm, setBankForm] = useState({ bank_name: "", bank_account_number: "", bank_account_name: "" });
  const [bankSaving, setBankSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    Promise.all([
      api.get(`/member/kloter/${id}`),
      api.get("/member/profile"),
    ]).then(([r1, r2]) => {
      if (!alive) return;
      if (r1.data) setDetail(r1.data);
      if (r2.data) {
        setProfile(r2.data);
        setBankForm({ bank_name: r2.data.bank_name || "", bank_account_number: r2.data.bank_account_number || "", bank_account_name: r2.data.bank_account_name || "" });
      }
    }).catch(() => {}).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  const saveBank = async () => {
    setBankSaving(true);
    try {
      await api.put("/member/profile/bank", bankForm);
      setProfile((p) => ({ ...p, ...bankForm }));
      setEditBank(false);
    } catch (_) {}
    setBankSaving(false);
  };

  const pct = Math.round((detail.current_period / detail.total_periods) * 100);
  const statusLabel = detail.status === "collecting" ? "Aktif" : detail.status === "verifying" ? "Verifikasi" : "Selesai";
  const payLabel = { expected: "⏳ Menunggu Bayar", proof_uploaded: "📤 Bukti Dikirim", verified: "✅ Terverifikasi", late: "⏰ Terlambat", rejected: "❌ Ditolak" };

  return (
    <MemberLayout title={detail.name} subtitle="Detail kloter & pembayaran">
      {loading && <div style={{ fontSize: 12, color: "var(--ink3)", marginBottom: 16 }}>Memuat detail…</div>}

      {/* Back + Section header */}
      <div className="sec-head" style={{ marginBottom: 20 }}>
        <div className="sec-title">📦 {detail.name}</div>
        <Link href="/member/home" className="sec-link">← Kembali</Link>
      </div>

      <div className="grid2">
        {/* LEFT COLUMN */}
        <div>
          {/* Payment due countdown */}
          {detail.my_payment_status === "expected" && (
            <div className="countdown-box">
              <div className="cb-icon">⚠️</div>
              <div className="cb-text">
                <div className="cb-title">Batas bayar jam {detail.payment_deadline_hour}:00</div>
                <div className="cb-sub">Lewat kena denda Rp 25k/hari</div>
              </div>
              <div className="cb-timer">{detail.days_until_deadline ?? "—"}d</div>
            </div>
          )}

          {/* Payment info card */}
          <div className="detail-card highlight">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 24 }}>💸</span>
              <div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800, color: "var(--ink)" }}>Bayar Iuran</div>
                <div style={{ fontSize: 12, color: "var(--ink3)", fontWeight: 600 }}>{detail.name} · Periode {detail.current_period}</div>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <span className={`tl-status-pill ${detail.my_payment_status === "verified" ? "lunas" : detail.my_payment_status === "late" ? "telat" : detail.my_payment_status === "proof_uploaded" ? "pending" : "pending"}`}>
                  {payLabel[detail.my_payment_status] || detail.my_payment_status}
                </span>
              </div>
            </div>

            <div className="info-row">
              <div className="ir-label">Kloter</div>
              <div className="ir-val">{detail.name}</div>
            </div>
            <div className="info-row">
              <div className="ir-label">Periode</div>
              <div className="ir-val">{detail.current_period} dari {detail.total_periods}</div>
            </div>
            <div className="info-row">
              <div className="ir-label">Slot Saya</div>
              <div className="ir-val vio">#{detail.my_slot}</div>
            </div>
            <div className="info-row">
              <div className="ir-label">Iuran Normal</div>
              <div className="ir-val mono">{fmtRp(detail.contribution)}</div>
            </div>
            <div className="info-row">
              <div className="ir-label">Denda ({detail.days_late ?? 0} hari)</div>
              <div className="ir-val mono mint">{fmtRp(detail.my_penalty ?? 0)}</div>
            </div>
            <div className="info-row" style={{ borderTop: "2px solid var(--bd)", paddingTop: 10, marginTop: 2 }}>
              <div className="ir-label" style={{ fontSize: 14, fontWeight: 800, color: "var(--ink)" }}>Total Bayar</div>
              <div className="ir-val mono" style={{ fontSize: 18, color: "var(--vio)" }}>{fmtRp(detail.my_expected_amount)}</div>
            </div>
          </div>

          {/* Bank account */}
          <div className="detail-card">
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink2)", marginBottom: 10 }}>🏦 Rekening Tujuan</div>
            <div style={{ background: "var(--vio-l)", border: "1.5px solid #c4b5fd", borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--vio-d)", marginBottom: 6 }}>{detail.bank_name ?? "BCA"} — Admin Kloterby</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: "var(--ink)", letterSpacing: ".1em", marginBottom: 4 }}>
                {detail.account_number ?? "—"}
              </div>
              <div style={{ fontSize: 11, color: "var(--ink3)", fontWeight: 600 }}>a.n. {detail.admin_name ?? "Admin"}</div>
            </div>
            <div style={{ background: "var(--amb-l)", border: "1.5px solid #fcd34d", borderRadius: 10, padding: "10px 14px", fontSize: 11.5, fontWeight: 700, color: "var(--amb-d)", display: "flex", alignItems: "flex-start", gap: 8 }}>
              <span>⚡</span>
              <span>Nomor rekening mengandung <b>kode unik #{detail.my_unique_code}</b> — transfer ke nomor ini agar verifikasi otomatis!</span>
            </div>
          </div>

          {/* Rekening Saya — untuk menerima GET */}
          <div className="detail-card" style={{ marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink2)" }}>🏦 Rekening Saya (untuk GET)</div>
              <button onClick={() => setEditBank(!editBank)} style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 8, border: "1.5px solid var(--bd)", background: "var(--surf2)", cursor: "pointer", color: "var(--ink2)" }}>
                {editBank ? "Batal" : "✏️ Edit"}
              </button>
            </div>

            {!editBank ? (
              profile?.bank_name ? (
                <div style={{ background: "var(--mint-l)", border: "1.5px solid #6ee7b7", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--mint-d)", marginBottom: 2 }}>{profile.bank_name}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 700, color: "var(--ink)", letterSpacing: ".06em" }}>{profile.bank_account_number}</div>
                  <div style={{ fontSize: 11, color: "var(--ink3)", marginTop: 2 }}>a.n. {profile.bank_account_name}</div>
                </div>
              ) : (
                <div style={{ background: "var(--amb-l)", border: "1.5px solid #fcd34d", borderRadius: 10, padding: "10px 14px", fontSize: 11.5, fontWeight: 700, color: "var(--amb-d)" }}>
                  ⚠️ Belum ada info rekening. Isi sekarang agar admin tahu ke mana transfer GET kamu!
                </div>
              )
            ) : (
              <div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink2)", marginBottom: 4 }}>Bank / E-Wallet</div>
                  <input style={inp} placeholder="BCA / GoPay / OVO / dll" value={bankForm.bank_name} onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink2)", marginBottom: 4 }}>Nomor Rekening / Akun</div>
                  <input style={inp} placeholder="0812345678 / 0123456789" value={bankForm.bank_account_number} onChange={(e) => setBankForm({ ...bankForm, bank_account_number: e.target.value })} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink2)", marginBottom: 4 }}>Nama Pemilik</div>
                  <input style={inp} placeholder="Sesuai buku tabungan" value={bankForm.bank_account_name} onChange={(e) => setBankForm({ ...bankForm, bank_account_name: e.target.value })} />
                </div>
                <button onClick={saveBank} disabled={bankSaving} style={{ width: "100%", padding: "10px 0", borderRadius: 10, background: "var(--vio)", color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer" }}>
                  {bankSaving ? "Menyimpan…" : "💾 Simpan Rekening"}
                </button>
              </div>
            )}
          </div>

          {/* Action buttons */}
          {detail.my_payment_status !== "verified" && detail.my_payment_status !== "none" && (
            <Link href={`/member/upload?id=${detail.my_payment_id}`} className="btn-pay" style={{ textDecoration: "none", background: detail.my_payment_status === "proof_uploaded" ? "var(--surf)" : undefined, color: detail.my_payment_status === "proof_uploaded" ? "var(--ink2)" : undefined, border: detail.my_payment_status === "proof_uploaded" ? "1.5px solid var(--bd)" : undefined, boxShadow: detail.my_payment_status === "proof_uploaded" ? "none" : undefined }}>
              <span>{detail.my_payment_status === "proof_uploaded" ? "📑" : "💸"}</span>
              <span>{detail.my_payment_status === "proof_uploaded" ? "Lihat Status Verifikasi" : "Upload Bukti Bayar"}</span>
            </Link>
          )}
          <button className="btn-wa">
            <span>💬</span><span>Tanya Admin via WA</span>
          </button>
          <Link href="/member/home" className="btn-ghost" style={{ textDecoration: "none", marginTop: 8 }}>
            ← Kembali ke Dashboard
          </Link>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          {/* GET info */}
          <div className="get-box">
            <div className="cb-icon">🎯</div>
            <div className="cb-text">
              <div className="cb-title">GET: {fmtRp(detail.get_value ?? detail.contribution * detail.total_periods)}</div>
              <div className="cb-sub">{new Date(detail.next_get_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</div>
            </div>
          </div>

          {/* Kloter info */}
          <div className="detail-card">
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 800, color: "var(--ink)", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              📋 Info Kloter
              <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 20, background: detail.status === "collecting" ? "var(--mint-l)" : "var(--amb-l)", color: detail.status === "collecting" ? "var(--mint-d)" : "var(--amb-d)" }}>
                {statusLabel}
              </span>
            </div>
            <div className="info-row">
              <div className="ir-label">Tipe</div>
              <div className="ir-val" style={{ textTransform: "capitalize" }}>{detail.type}</div>
            </div>
            <div className="info-row">
              <div className="ir-label">Slot total</div>
              <div className="ir-val">{detail.total_periods} anggota</div>
            </div>
            <div className="info-row">
              <div className="ir-label">Iuran/periode</div>
              <div className="ir-val mono">{fmtRp(detail.contribution)}</div>
            </div>
            <div className="info-row">
              <div className="ir-label">Progress periode</div>
              <div className="ir-val">{pct}%</div>
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ height: 6, background: "var(--surf2)", borderRadius: 99, overflow: "hidden", border: "1px solid var(--bd)" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, var(--vio), var(--pink))", borderRadius: 99, transition: "width .6s ease" }} />
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="detail-card">
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 800, color: "var(--ink)", marginBottom: 14 }}>📜 Timeline GET</div>
            <div className="timeline">
              {detail.timeline.map((t, i) => (
                <div key={i} className="tl-item">
                  <div className={`tl-dot ${t.status}`}>{dotEmoji[t.status] || "⭕"}</div>
                  <div className="tl-body">
                    <div className="tl-period">Periode {t.period} · {t.member}</div>
                    <div className="tl-desc">{t.desc}</div>
                    <div className="tl-meta">{new Date(t.date).toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short" })}</div>
                    <span className={`tl-status-pill ${t.status}`}>
                      {t.status === "lunas" ? "✅ Lunas" : t.status === "telat" ? "⏰ Telat" : t.status === "pending" ? "⏳ Menunggu" : t.status === "get" ? "🎉 GET" : "○ Upcoming"}
                    </span>
                  </div>
                  <div className={`tl-amount${t.status === "telat" ? " telat" : t.status === "get" ? " get" : ""}`}>
                    {t.status === "get" ? `+${fmtRp(t.amount)}` : `−${fmtRp(t.amount)}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MemberLayout>
  );
}

const inp = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--bd)", background: "var(--surf2)", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", outline: "none" };
