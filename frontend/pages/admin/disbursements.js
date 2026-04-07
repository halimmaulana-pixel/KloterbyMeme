import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import StatCard from "../../components/admin/StatCard";
import api from "../../lib/api";

const fmtRp = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);

const fmtWa = (wa) => (wa?.startsWith("62") ? "0" + wa.slice(2) : wa) || "—";

const waLink = (wa, name, amount, kloter, period) => {
  const num = wa?.replace(/\D/g, "");
  const msg = encodeURIComponent(
    `Halo ${name}! 🎉\n\nSelamat, GET kamu dari *${kloter}* Periode ${period} sudah ditransfer!\n\nNominal: *${fmtRp(amount)}*\n\nMohon segera cek rekening kamu. Terima kasih! 🙏`
  );
  return `https://wa.me/${num}?text=${msg}`;
};

const FALLBACK_READY = [];
const FALLBACK_HISTORY = [];

export default function AdminDisbursements() {
  const [ready, setReady] = useState(FALLBACK_READY);
  const [history, setHistory] = useState(FALLBACK_HISTORY);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState([]);
  const [popup, setPopup] = useState(null); // item to show release popup
  const [tab, setTab] = useState("ready"); // "ready" | "history"

  const loadAll = async () => {
    const [r1, r2] = await Promise.allSettled([
      api.get("/disbursements/ready"),
      api.get("/disbursements/history"),
    ]);
    if (r1.status === "fulfilled" && Array.isArray(r1.value.data)) setReady(r1.value.data);
    if (r2.status === "fulfilled" && Array.isArray(r2.value.data)) setHistory(r2.value.data);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const totals = useMemo(() => ready.reduce(
    (a, x) => ({ gross: a.gross + +x.gross_amount, fee: a.fee + +x.fee_deducted, penalty: a.penalty + +x.penalty_added, net: a.net + +x.net_amount }),
    { gross: 0, fee: 0, penalty: 0, net: 0 }
  ), [ready]);

  const confirmRelease = (item) => setPopup(item);

  const doRelease = async (id) => {
    setReleasing((p) => [...p, id]);
    try {
      await api.post(`/disbursements/${id}/release`);
      setPopup(null);
      await loadAll();
    } catch (err) {
      alert(err.response?.data?.detail || "Gagal release GET. Coba lagi.");
      setPopup(null);
    }
    setReleasing((p) => p.filter((x) => x !== id));
  };

  const stats = [
    { emoji: "💸", value: ready.length,        label: "Siap Release",  trend: "antrian payout",   tone: "orange" },
    { emoji: "🧾", value: fmtRp(totals.gross), label: "Gross Total",   trend: "nilai kotor",      tone: "purple" },
    { emoji: "🏷️", value: fmtRp(totals.fee),   label: "Fee Admin",     trend: "potongan sistem",  tone: "red" },
    { emoji: "✅", value: fmtRp(totals.net),   label: "Net Release",   trend: "siap ditransfer",  tone: "green" },
  ];

  return (
    <AdminLayout title="Disbursement">
      <div className="page-title">💸 Disbursement</div>
      <div className="page-sub">Release GET yang sudah lolos verifikasi — transfer langsung ke penerima</div>

      <div className="stat-grid">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["ready", "🎉 Antrian GET"], ["history", "📋 Riwayat"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: "8px 18px", borderRadius: 10, border: "1.5px solid var(--b)", cursor: "pointer", fontSize: 13, fontWeight: 700,
              background: tab === id ? "var(--p)" : "var(--s)", color: tab === id ? "#fff" : "var(--t2)" }}>
            {label} {id === "ready" && ready.length > 0 && <span style={{ background: "#ef4444", color: "#fff", borderRadius: 20, padding: "1px 7px", fontSize: 11, marginLeft: 6 }}>{ready.length}</span>}
          </button>
        ))}
      </div>

      {/* === READY TAB === */}
      {tab === "ready" && (
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">🎉 Queue Release GET</div>
            <div className="panel-action">{loading ? "Memuat..." : `${ready.length} payout siap`}</div>
          </div>

          {ready.map((item) => {
            const isBusy = releasing.includes(item.id);
            return (
              <div className="disb-card" key={item.id}>
                <div className="disb-icon">🎉</div>
                <div className="disb-info">
                  <div className="disb-name">{item.recipient_name} · {item.kloter_name}</div>
                  <div className="disb-meta">
                    Periode {item.period_number} ·
                    Gross {fmtRp(item.gross_amount)} · Fee −{fmtRp(item.fee_deducted)} · Denda +{fmtRp(item.penalty_added)}
                  </div>
                  {item.bank_name ? (
                    <div style={{ fontSize: 11, color: "#059669", fontWeight: 700, marginTop: 3 }}>
                      🏦 {item.bank_name} · {item.bank_account_number} a.n {item.bank_account_name}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700, marginTop: 3 }}>⚠️ Info bank belum diisi</div>
                  )}
                </div>
                <div className="disb-amt">{fmtRp(item.net_amount)}</div>
                <div className="disb-actions">
                  <button className="btn primary" disabled={isBusy} onClick={() => confirmRelease(item)}>
                    {isBusy ? "Releasing…" : "Release GET"}
                  </button>
                </div>
              </div>
            );
          })}

          {!loading && ready.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--t3)", fontSize: 13 }}>
              🎉 Tidak ada payout yang menunggu
            </div>
          )}
        </div>
      )}

      {/* === HISTORY TAB === */}
      {tab === "history" && (
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">📋 Riwayat Disbursement</div>
            <div className="panel-action">{history.length} transaksi</div>
          </div>

          {history.map((item) => (
            <div className="disb-card" key={item.id}>
              <div className="disb-icon" style={{ fontSize: 20 }}>✅</div>
              <div className="disb-info">
                <div className="disb-name">{item.recipient_name} · {item.kloter_name}</div>
                <div className="disb-meta">
                  Periode {item.period_number} · Released {item.released_at || "—"}
                </div>
                {item.bank_name && (
                  <div style={{ fontSize: 11, color: "var(--t2)", marginTop: 2 }}>
                    🏦 {item.bank_name} · {item.bank_account_number}
                  </div>
                )}
              </div>
              <div className="disb-amt">{fmtRp(item.net_amount)}</div>
              {item.recipient_wa && (
                <a href={waLink(item.recipient_wa, item.recipient_name, item.net_amount, item.kloter_name, item.period_number)}
                  target="_blank" rel="noreferrer"
                  className="btn"
                  style={{ fontSize: 12, padding: "6px 12px", textDecoration: "none", display: "flex", alignItems: "center", gap: 5, color: "#25d366", borderColor: "#25d366" }}>
                  💬 WA
                </a>
              )}
            </div>
          ))}

          {!loading && history.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--t3)", fontSize: 13 }}>
              Belum ada riwayat disbursement
            </div>
          )}
        </div>
      )}

      {/* === POPUP: Konfirmasi Release GET === */}
      {popup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setPopup(null)}>
          <div style={{ background: "var(--s)", borderRadius: 20, padding: 28, maxWidth: 440, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}
            onClick={(e) => e.stopPropagation()}>

            <div style={{ fontSize: 22, textAlign: "center", marginBottom: 6 }}>🎉</div>
            <div style={{ fontSize: 16, fontWeight: 800, textAlign: "center", marginBottom: 4 }}>Konfirmasi Release GET</div>
            <div style={{ fontSize: 12, color: "var(--t2)", textAlign: "center", marginBottom: 20 }}>Pastikan transfer sudah dikirim sebelum klik Release</div>

            {/* Recipient info */}
            <div style={{ background: "var(--bg)", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--pd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "var(--p)" }}>
                  {(popup.recipient_name || "?").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{popup.recipient_name}</div>
                  <div style={{ fontSize: 11, color: "var(--t2)" }}>{popup.kloter_name} · Periode {popup.period_number}</div>
                </div>
              </div>

              {/* Bank details */}
              <div style={{ borderTop: "1.5px solid var(--b)", paddingTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--t2)", marginBottom: 8 }}>📤 Transfer ke:</div>
                {popup.bank_name ? (
                  <div style={{ background: "#f0fdf4", border: "1.5px solid #6ee7b7", borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#065f46" }}>{popup.bank_name}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "monospace", color: "#059669", marginTop: 2 }}>{popup.bank_account_number}</div>
                    <div style={{ fontSize: 12, color: "#065f46", marginTop: 2 }}>a.n <b>{popup.bank_account_name || popup.recipient_name}</b></div>
                  </div>
                ) : (
                  <div style={{ background: "#fef9c3", border: "1.5px solid #fcd34d", borderRadius: 10, padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "#92400e" }}>
                    ⚠️ Info bank belum diisi. Tanyakan ke member atau isi di halaman Member.
                  </div>
                )}
              </div>

              {/* Amount breakdown */}
              <div style={{ borderTop: "1.5px solid var(--b)", paddingTop: 12, marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--t2)", marginBottom: 4 }}>
                  <span>Gross</span><span style={{ fontFamily: "monospace" }}>{fmtRp(popup.gross_amount)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#ef4444", marginBottom: 4 }}>
                  <span>Fee Admin</span><span style={{ fontFamily: "monospace" }}>−{fmtRp(popup.fee_deducted)}</span>
                </div>
                {popup.penalty_added > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#f59e0b", marginBottom: 4 }}>
                    <span>Denda</span><span style={{ fontFamily: "monospace" }}>+{fmtRp(popup.penalty_added)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 800, borderTop: "1.5px solid var(--b)", paddingTop: 8, marginTop: 4 }}>
                  <span>Total Transfer</span>
                  <span style={{ color: "var(--p)", fontFamily: "monospace" }}>{fmtRp(popup.net_amount)}</span>
                </div>
              </div>
            </div>

            {/* WA Button */}
            {popup.recipient_wa && (
              <a href={waLink(popup.recipient_wa, popup.recipient_name, popup.net_amount, popup.kloter_name, popup.period_number)}
                target="_blank" rel="noreferrer"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 0", borderRadius: 10, border: "1.5px solid #25d366", background: "#f0fdf4", color: "#25d366", fontWeight: 700, fontSize: 13, textDecoration: "none", marginBottom: 12 }}>
                💬 Kirim Notif WA ke {fmtWa(popup.recipient_wa)}
              </a>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn" style={{ flex: 1, padding: "10px 0" }} onClick={() => setPopup(null)}>Batal</button>
              <button className="btn primary" style={{ flex: 2, padding: "10px 0", fontSize: 14 }}
                disabled={releasing.includes(popup.id)}
                onClick={() => doRelease(popup.id)}>
                {releasing.includes(popup.id) ? "Releasing…" : "✓ Release GET Sekarang"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
