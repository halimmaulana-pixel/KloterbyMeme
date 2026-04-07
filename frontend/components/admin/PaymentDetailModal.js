import { useEffect } from "react";
import api from "../../lib/api";

const fmtRp = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const STATUS_LABEL = {
  expected: { label: "Menunggu Bayar", color: "#f59e0b", bg: "#fffbeb" },
  proof_uploaded: { label: "Bukti Dikirim", color: "#8b5cf6", bg: "#f5f3ff" },
  verified: { label: "Terverifikasi", color: "#10b981", bg: "#ecfdf5" },
  late: { label: "Terlambat", color: "#ef4444", bg: "#fef2f2" },
  manual_review: { label: "Manual Review", color: "#f97316", bg: "#fff7ed" },
};

export default function PaymentDetailModal({ item, onClose, onApprove, onReject, busy }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!item) return null;

  const st = STATUS_LABEL[item.status] || { label: item.status, color: "#6b7280", bg: "#f9fafb" };
  const totalTransfer = item.expected_amount + Number(item.unique_code);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(30,20,50,.45)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 20, width: "100%", maxWidth: 480,
          boxShadow: "0 24px 60px rgba(0,0,0,.18)", overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #7c3aed, #a78bfa)", padding: "20px 24px", position: "relative" }}>
          <button onClick={onClose} style={{ position: "absolute", top: 14, right: 16, background: "rgba(255,255,255,.2)", border: "none", borderRadius: 8, color: "#fff", fontSize: 16, cursor: "pointer", padding: "2px 8px", lineHeight: 1.5 }}>✕</button>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff" }}>
              {item.member_name?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>{item.member_name}</div>
              <div style={{ color: "rgba(255,255,255,.8)", fontSize: 12, marginTop: 2 }}>{item.kloter_name} · Periode {item.period_number}</div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>
          {/* Status */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ background: st.bg, color: st.color, fontWeight: 700, fontSize: 12, padding: "4px 12px", borderRadius: 20, border: `1.5px solid ${st.color}30` }}>
              {st.label}
            </span>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>
              Jatuh tempo: {item.due_datetime ? new Date(item.due_datetime).toLocaleString("id-ID") : "—"}
            </span>
          </div>

          {/* Amount breakdown */}
          <div style={{ background: "#f9f7ff", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12, color: "#6b7280" }}>
              <span>Iuran</span>
              <span style={{ fontFamily: "monospace" }}>{fmtRp(item.expected_amount)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12, color: "#6b7280" }}>
              <span>Kode Unik</span>
              <span style={{ fontFamily: "monospace", color: "#7c3aed" }}>+#{item.unique_code}</span>
            </div>
            <div style={{ borderTop: "1.5px dashed #e5e7eb", paddingTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 15 }}>
              <span style={{ color: "#1f2937" }}>Total Transfer</span>
              <span style={{ color: "#7c3aed", fontFamily: "monospace" }}>{fmtRp(totalTransfer)}</span>
            </div>
          </div>

          {/* Proof */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>📎 Bukti Transfer</div>
            {item.proof_url ? (
              <a href={item.proof_url} target="_blank" rel="noreferrer" style={{ display: "block", textDecoration: "none" }}>
                <div style={{ border: "2px dashed #a78bfa", borderRadius: 12, padding: "12px", textAlign: "center", background: "#faf5ff", cursor: "pointer" }}>
                  {/\.(jpg|jpeg|png|gif|webp)$/i.test(item.proof_url) ? (
                    <img src={item.proof_url} alt="Bukti" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, objectFit: "contain" }} />
                  ) : (
                    <div style={{ fontSize: 13, color: "#7c3aed", fontWeight: 700 }}>📄 Lihat Bukti (klik untuk buka)</div>
                  )}
                  <div style={{ fontSize: 11, color: "#8b5cf6", marginTop: 6, fontWeight: 600 }}>Klik untuk buka di tab baru ↗</div>
                </div>
              </a>
            ) : (
              <div style={{ border: "2px dashed #e5e7eb", borderRadius: 12, padding: "20px", textAlign: "center", color: "#9ca3af", fontSize: 12 }}>
                Belum ada bukti yang dikirim
              </div>
            )}
          </div>

          {/* Actions */}
          {item.status !== "verified" && (
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => onApprove(item.id)}
                disabled={busy}
                style={{ flex: 1, padding: "11px", borderRadius: 12, background: busy ? "#d1fae5" : "#10b981", color: "#fff", fontWeight: 800, fontSize: 13, border: "none", cursor: busy ? "default" : "pointer" }}
              >
                {busy ? "Memproses…" : "✓ Approve"}
              </button>
              <button
                onClick={() => onReject(item.id)}
                disabled={busy}
                style={{ flex: 1, padding: "11px", borderRadius: 12, background: busy ? "#fee2e2" : "#ef4444", color: "#fff", fontWeight: 800, fontSize: 13, border: "none", cursor: busy ? "default" : "pointer" }}
              >
                ✕ Reject
              </button>
            </div>
          )}
          {item.status === "verified" && (
            <div style={{ textAlign: "center", padding: "10px", background: "#ecfdf5", borderRadius: 12, color: "#10b981", fontWeight: 700, fontSize: 13 }}>
              ✅ Pembayaran sudah diverifikasi
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
