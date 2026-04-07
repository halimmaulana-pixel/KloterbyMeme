import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import AdminLayout from "../../../components/admin/AdminLayout";
import PaymentDetailModal from "../../../components/admin/PaymentDetailModal";
import api from "../../../lib/api";

const fmtWa = (wa) => wa?.startsWith("62") ? "0" + wa.slice(2) : (wa || "—");

const fmtRp = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(n || 0));

const FALLBACK = {
  id: "k254", name: "Kloter Melati Bulanan", type: "bulanan",
  slot_total: 11, contribution: 1000000, fee_admin: 500000,
  penalty_per_day: 25000, payment_deadline_hour: 20,
  start_date: "2026-01-01", status: "active",
  current_period: { number: 4, recipient: "Sari Dewi (Slot #4)", due_date: "28 Apr 2026", progress_pct: 73, paid_count: 8, expected_count: 11 },
  members: [
    { id: "m1", slot: 1, name: "Meme Admin",    status: "lunas",   isAdmin: true  },
    { id: "m2", slot: 2, name: "Rina Sari",     status: "lunas",   isAdmin: false },
    { id: "m3", slot: 3, name: "Dian Pratama",  status: "pending", isAdmin: false },
    { id: "m4", slot: 4, name: "Sari Dewi",     status: "lunas",   isAdmin: false, getTurn: true },
    { id: "m5", slot: 5, name: "Nadia S.",       status: "telat",   isAdmin: false },
  ],
  timeline: [
    { id: "t1", label: "GET #1", name: "Meme Admin",  amount: 11000000, state: "done", date: "31 Jan 2026" },
    { id: "t2", label: "GET #2", name: "Rina Sari",   amount: 11000000, state: "done", date: "28 Feb 2026" },
    { id: "t3", label: "GET #3", name: "Dian Pratama",amount: 11000000, state: "done", date: "31 Mar 2026" },
    { id: "t4", label: "GET #4", name: "Sari Dewi",   amount: 11000000, state: "now",  date: "28 Apr 2026" },
    { id: "t5", label: "GET #5", name: "Nadia S.",    amount: 11000000, state: "next", date: "31 Mei 2026" },
  ],
  queue: [
    { id: "q1", name: "Dian Pratama",  subtitle: "Bukti transfer masuk · Periode 4", amount: 1000000, time: "10 menit lalu", tone: "p" },
    { id: "q2", name: "Nadia S.",       subtitle: "Telat 1 hari · Butuh keputusan",  amount: 1025000, time: "1 jam lalu",    tone: "o" },
  ],
};

const TONES = ["p", "g", "o", "r", "bl", "pk"];
const toneColor = { p: "#a78bfa", g: "#00c896", o: "#ff7043", r: "#ff4d6a", bl: "#60a5fa", pk: "#f472b6" };

export default function AdminKloterDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [detail, setDetail] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("periode");
  const [allMembers, setAllMembers] = useState([]);
  const [addSlot, setAddSlot] = useState(null); // slot number to fill
  const [addMemberId, setAddMemberId] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addErr, setAddErr] = useState("");
  const [modalItem, setModalItem] = useState(null);
  const [modalBusy, setModalBusy] = useState(false);

  const loadDetail = (alive = true) => {
    Promise.all([
      api.get(`/kloter/${id}`).catch(() => null),
      api.get("/payments/queue").catch(() => null),
    ]).then(([kl, pq]) => {
      if (!alive) return;
      if (kl?.data?.id) setDetail((p) => ({ ...p, ...kl.data }));
      if (Array.isArray(pq?.data)) {
        const kloterName = kl?.data?.name;
        const q = pq.data
          .filter((x) => !kloterName || x.kloter_name === kloterName)
          .slice(0, 5)
          .map((x) => ({
            id: x.id,
            name: x.member_name,
            member_name: x.member_name,
            member_wa: x.member_wa,
            kloter_name: x.kloter_name,
            period_number: x.period_number,
            subtitle: `${x.kloter_name} · Periode ${x.period_number}`,
            amount: x.expected_amount,
            expected_amount: x.expected_amount,
            unique_code: x.unique_code,
            status: x.status,
            due_datetime: x.due_datetime,
            proof_url: x.proof_url,
            time: new Date(x.due_datetime).toLocaleString("id-ID"),
            tone: x.status === "manual_review" ? "o" : x.status === "late" ? "r" : "p",
          }));
        if (q.length) setDetail((p) => ({ ...p, queue: q }));
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    if (!id) return;
    let alive = true;
    loadDetail(alive);
    api.get("/member/admin/list").then((r) => { if (alive && Array.isArray(r.data)) setAllMembers(r.data); }).catch(() => {});
    return () => { alive = false; };
  }, [id]);

  const handleAddMember = async () => {
    if (!addMemberId) { setAddErr("Pilih member terlebih dahulu"); return; }
    setAddBusy(true); setAddErr("");
    try {
      await api.post(`/kloter/${id}/add-member`, { member_id: addMemberId, slot_number: addSlot });
      setAddSlot(null); setAddMemberId("");
      loadDetail();
    } catch (err) {
      setAddErr(err.response?.data?.detail || "Gagal menambah member");
    }
    setAddBusy(false);
  };

  const handleApprove = async (expectationId) => {
    setModalBusy(true);
    try {
      await api.post(`/payments/${expectationId}/verify`);
      setModalItem(null);
      loadDetail();
    } catch (err) {
      alert(err.response?.data?.detail || "Gagal approve. Coba lagi.");
    }
    setModalBusy(false);
  };

  const handleReject = async (expectationId) => {
    setModalBusy(true);
    try {
      await api.post(`/payments/${expectationId}/reject`, { note: "Ditolak dari detail kloter" });
      setModalItem(null);
      loadDetail();
    } catch (err) {
      alert(err.response?.data?.detail || "Gagal reject. Coba lagi.");
    }
    setModalBusy(false);
  };

  const grossGet = detail.contribution * detail.slot_total;
  const netEstimate = grossGet - detail.fee_admin;

  // Safe accessor — kloter baru belum punya current_period
  const cp = detail.current_period ?? {
    number: 0, recipient: "—", due_date: "—",
    progress_pct: 0, paid_count: 0, expected_count: detail.slot_total,
  };

  const [initBusy, setInitBusy] = useState(false);
  const handleInitPeriods = async () => {
    if (!confirm("Buat jadwal periode dan tagihan iuran untuk kloter ini?")) return;
    setInitBusy(true);
    try {
      await api.post(`/kloter/${id}/init-periods`);
      loadDetail();
    } catch (err) {
      alert(err.response?.data?.detail || "Gagal mengaktifkan kloter");
    }
    setInitBusy(false);
  };

  return (
    <AdminLayout title="Detail Kloter">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link href="/admin/kloter">Semua Kloter</Link>
        <span className="sep">›</span>
        <strong>{detail.name}</strong>
        <span className="sep">›</span>
        <span>Detail</span>
      </div>

      {/* Page header */}
      <div className="page-header">
        <div className="kloter-title-block">
          <div className="kloter-avatar">🌸</div>
          <div>
            <div className="kloter-name">{detail.name}</div>
            <div className="kloter-meta">
              <span className="badge badge-hijau">✅ {detail.status === "active" ? "Aktif" : detail.status}</span>
              <span className="badge badge-biru">📅 {detail.type.charAt(0).toUpperCase() + detail.type.slice(1)}</span>
              <span className="badge badge-kuning">⏳ Periode {cp.number}</span>
              <span className="badge badge-ungu">🏠 {detail.slot_total} Slot</span>
              <span style={{ fontSize: 11, color: "var(--t2)", fontWeight: 600 }}>Mulai {new Date(detail.start_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</span>
            </div>
          </div>
        </div>
        <div className="header-actions">
          {cp.number === 0 && (
            <button className="btn primary" onClick={handleInitPeriods} disabled={initBusy}>
              {initBusy ? "⏳ Memproses..." : "📅 Buka Jadwal Iuran"}
            </button>
          )}
          <button className="btn purple">💬 Blast WA</button>
          <button className="btn primary" onClick={() => router.push("/admin/disbursements")}>💸 Rilis GET</button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="stats-grid">
        {[
          { icon: "👥", label: "Total Slot",     value: detail.slot_total,                       sub: "kapasitas batch",   color: "var(--bl)" },
          { icon: "💰", label: "Iuran/Slot",     value: `${detail.contribution / 1e6}jt`,         sub: "per periode",       color: "var(--g)"  },
          { icon: "🎁", label: "Nilai GET",      value: `${grossGet / 1e6}jt`,                   sub: fmtRp(grossGet),     color: "var(--o)"  },
          { icon: "✅", label: "Sudah Bayar",    value: cp.paid_count,         sub: `dari ${cp.expected_count}`, color: "var(--g)" },
          { icon: "⏳", label: "Belum Bayar",    value: cp.expected_count - cp.paid_count, sub: "perlu follow-up", color: "var(--r)" },
          { icon: "💵", label: "Dana Terkumpul", value: `${(detail.contribution * cp.paid_count) / 1e6}jt`, sub: "periode ini", color: "var(--g)" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="main-grid">
        {/* Left column */}
        <div className="left-col">
          <div className="section-card">
            {/* Tabs */}
            <div className="tabs">
              {[
                { id: "periode",   label: "💰 Periode Berjalan" },
                { id: "anggota",   label: "👥 Semua Anggota" },
                { id: "timeline",  label: "📅 Timeline GET" },
                { id: "keuangan",  label: "📊 Keuangan" },
              ].map((t) => (
                <div key={t.id} className={`tab${activeTab === t.id ? " active" : ""}`} onClick={() => setActiveTab(t.id)}>
                  {t.label}
                </div>
              ))}
            </div>

            {/* Tab: Periode berjalan */}
            <div className={`tab-content${activeTab === "periode" ? " active" : ""}`}>
              <div className="section-body">
                <div className="rilis-card">
                  <div>
                    <div className="rilis-label">🎉 Penerima GET Periode Ini</div>
                    <div className="rilis-penerima">{cp.recipient} ✨</div>
                    <div style={{ fontSize: 11, color: "var(--t2)", fontWeight: 600, marginTop: 4 }}>
                      Jatuh tempo: {cp.due_date} · Syarat: {cp.expected_count}/{cp.expected_count} lunas
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="rilis-amount">{fmtRp(grossGet)}</div>
                    <div className="rilis-sub">{cp.paid_count} dari {cp.expected_count} sudah bayar</div>
                    <button className="btn primary" style={{ marginTop: 8, fontSize: 11, padding: "6px 14px" }} onClick={() => router.push("/admin/disbursements")}>💸 Rilis GET →</button>
                  </div>
                </div>

                {/* Progress */}
                <div className="periode-banner">
                  <div className="periode-label">Period aktif — Periode {cp.number}</div>
                  <div className="periode-penerima">{cp.recipient}</div>
                  <div className="periode-info">
                    <span>Jatuh tempo {cp.due_date}</span>
                    <span>Deadline jam {String(detail.payment_deadline_hour).padStart(2, "0")}:00</span>
                  </div>
                  <div className="periode-progress-wrap">
                    <div className="periode-progress-label">
                      <span>Pembayaran masuk</span>
                      <strong>{cp.paid_count}/{cp.expected_count}</strong>
                    </div>
                    <div className="periode-bar">
                      <div className="periode-fill" style={{ width: `${cp.progress_pct}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab: Anggota */}
            <div className={`tab-content${activeTab === "anggota" ? " active" : ""}`}>
              <div style={{ padding: "4px 0 12px", fontSize: 12, color: "var(--t2)", fontWeight: 600 }}>
                {detail.filled_slots ?? detail.members?.filter(m => !m.empty).length ?? 0} / {detail.slot_total} slot terisi
              </div>
              <table className="member-table">
                <thead>
                  <tr>
                    <th>Slot</th>
                    <th>Nama</th>
                    <th>Status</th>
                    <th>WA</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.members.map((m, i) => m.empty ? (
                    <tr key={`empty-${m.slot}`} style={{ background: "#fafafa" }}>
                      <td><span className="slot-badge" style={{ background: "#e5e7eb", color: "#9ca3af" }}>{m.slot}</span></td>
                      <td colSpan={3}>
                        <span style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>— Slot kosong —</span>
                      </td>
                      <td>
                        <button className="btn primary" style={{ fontSize: 11, padding: "4px 12px" }}
                          onClick={() => { setAddSlot(m.slot); setAddMemberId(""); setAddErr(""); }}>
                          + Isi Slot
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={m.id} className={m.getTurn ? "highlight" : ""}>
                      <td><span className={`slot-badge ${m.isAdmin ? "slot-admin" : "slot-normal"}`}>{m.slot}</span></td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="avatar-sm" style={{ background: toneColor[TONES[i % TONES.length]] }}>
                            {m.name.slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 13 }}>{m.name}</div>
                            {m.isAdmin && <div style={{ fontSize: 10, color: "var(--g)", fontWeight: 700 }}>Admin</div>}
                            {m.getTurn && <div style={{ fontSize: 10, color: "var(--o)", fontWeight: 700 }}>🎉 GET periode ini</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        {m.status === "verified" || m.status === "lunas" ? (
                          <span className="badge badge-hijau" style={{ fontSize: 9 }}>✅ Lunas</span>
                        ) : m.status === "proof_uploaded" ? (
                          <span className="badge badge-ungu" style={{ fontSize: 9 }}>⏳ Menunggu</span>
                        ) : m.status === "late" ? (
                          <span className="badge badge-merah" style={{ fontSize: 9 }}>⏰ Telat</span>
                        ) : m.status === "rejected" ? (
                          <span className="badge badge-merah" style={{ fontSize: 9, opacity: 0.7 }}>❌ Ditolak</span>
                        ) : (
                          <span className="badge badge-kuning" style={{ fontSize: 9 }}>⏳ Belum Bayar</span>
                        )}
                      </td>
                      <td style={{ fontSize: 12, fontFamily: "monospace", color: "var(--t2)" }}>{fmtWa(m.wa)}</td>
                      <td>
                        {m.wa && (
                          <a href={`https://wa.me/${m.wa}`} target="_blank" rel="noreferrer" className="wa-btn">💬</a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tab: Timeline */}
            <div className={`tab-content${activeTab === "timeline" ? " active" : ""}`}>
              <div className="timeline">
                {detail.timeline.map((t) => (
                  <div key={t.id} className="timeline-item">
                    <div className={`tl-dot tl-dot-${t.state}`}>{String(t.label).replace("GET #", "")}</div>
                    <div className="tl-info">
                      <div className="tl-name">{t.name}</div>
                      <div className="tl-sub">{t.label}</div>
                    </div>
                    <div className="tl-right">
                      <div className="tl-amount">{fmtRp(t.amount)}</div>
                      <div className="tl-date">{t.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tab: Keuangan */}
            <div className={`tab-content${activeTab === "keuangan" ? " active" : ""}`}>
              <div className="section-body">
                <div className="finance-row"><span className="finance-label">Gross GET</span><span className="finance-value">{fmtRp(grossGet)}</span></div>
                <div className="finance-row"><span className="finance-label">Fee Admin</span><span className="finance-value">{fmtRp(detail.fee_admin)}</span></div>
                <div className="finance-row profit"><span className="finance-label">Denda/hari</span><span className="finance-value">{fmtRp(detail.penalty_per_day)}</span></div>
                <div className="finance-row total"><span className="finance-label">NET estimasi</span><span className="finance-value">{fmtRp(netEstimate)}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="right-col">
          {/* Verification queue */}
          <div className="section-card">
            <div className="section-head">
              <div className="section-title">✅ Antrian Verifikasi</div>
              {detail.queue?.length > 0 && (
                <span className="badge badge-oranye">{detail.queue.length}</span>
              )}
            </div>
            <div className="section-body">
              {detail.queue?.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: "var(--t3)", fontSize: 12 }}>Tidak ada antrian 🎉</div>
              ) : (
                detail.queue.map((q) => (
                  <div key={q.id} className="verif-item" style={{ cursor: "pointer" }} onClick={() => setModalItem(q)}>
                    <div className="verif-avatar" style={{ background: toneColor[q.tone || "p"] }}>
                      {q.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="verif-info">
                      <div className="verif-name">{q.name}</div>
                      <div className="verif-sub">{q.subtitle}</div>
                      <div className="verif-amount">{fmtRp(q.amount)}</div>
                      <div className="verif-time">{q.time}</div>
                      <div className="verif-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="vbtn vbtn-ok" onClick={() => handleApprove(q.id)}>✓ Approve</button>
                        <button className="vbtn vbtn-no" onClick={() => handleReject(q.id)}>✕ Tolak</button>
                        {q.member_wa && (
                          <a href={`https://wa.me/${q.member_wa}`} target="_blank" rel="noreferrer" className="vbtn vbtn-wa">💬 WA</a>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Risk panel */}
          <div className="section-card">
            <div className="section-head">
              <div className="section-title">🚨 Risk Notes</div>
            </div>
            <div className="section-body">
              {detail.members.filter((m) => m.status === "telat").length > 0 && (
                <div className="risk-item risk-red">
                  <span className="risk-icon">🔴</span>
                  <div>
                    <div className="risk-title">{detail.members.filter((m) => m.status === "telat").length} anggota telat</div>
                    <div className="risk-desc">Denda berjalan. Follow up segera.</div>
                  </div>
                </div>
              )}
              {detail.members.filter((m) => m.status === "pending").length > 0 && (
                <div className="risk-item risk-yellow">
                  <span className="risk-icon">⏳</span>
                  <div>
                    <div className="risk-title">{detail.members.filter((m) => m.status === "pending").length} menunggu verifikasi</div>
                    <div className="risk-desc">Bukti masuk, belum diproses.</div>
                  </div>
                </div>
              )}
              <div className="risk-item risk-green">
                <span className="risk-icon">✅</span>
                <div>
                  <div className="risk-title">Data kloter lengkap</div>
                  <div className="risk-desc">Siap operasional penuh.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading && <div style={{ marginTop: 16, fontSize: 12, color: "var(--t3)" }}>Memuat data…</div>}

      {/* Modal: Isi Slot */}
      {addSlot && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setAddSlot(null)}>
          <div style={{ background: "var(--s)", borderRadius: 20, padding: 28, maxWidth: 420, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>➕ Isi Slot #{addSlot}</div>
            <div style={{ fontSize: 12, color: "var(--t2)", marginBottom: 20 }}>
              Pilih member yang akan ditempatkan di slot ini. Member akan langsung terdaftar dan mendapat kewajiban iuran.
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--t2)", marginBottom: 6 }}>Pilih Member</label>
              <select
                value={addMemberId}
                onChange={(e) => setAddMemberId(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--b)", background: "var(--bg)", fontSize: 13, fontFamily: "inherit" }}
              >
                <option value="">— Pilih member —</option>
                {allMembers
                  .filter((m) => !detail.members?.some((dm) => !dm.empty && dm.member_id === m.id))
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · {fmtWa(m.wa)}{m.active_kloters?.length ? ` · ${m.active_kloters.length} kloter aktif` : ""}
                    </option>
                  ))}
              </select>
            </div>

            {addErr && <div style={{ fontSize: 12, color: "#ef4444", fontWeight: 600, marginBottom: 10 }}>⚠️ {addErr}</div>}

            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1.5px solid var(--b)", background: "var(--bg)", cursor: "pointer", fontWeight: 700 }}
                onClick={() => setAddSlot(null)}>Batal</button>
              <button style={{ flex: 2, padding: "10px 0", borderRadius: 10, background: "var(--p)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14 }}
                disabled={addBusy} onClick={handleAddMember}>
                {addBusy ? "Menyimpan…" : `✓ Masukkan ke Slot #${addSlot}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalItem && (
        <PaymentDetailModal
          item={modalItem}
          onClose={() => setModalItem(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          busy={modalBusy}
        />
      )}
    </AdminLayout>
  );
}
