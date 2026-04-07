import { useEffect, useState } from "react";
import Link from "next/link";
import MemberLayout from "../../components/member/MemberLayout";
import api from "../../lib/api";

const fmtRp = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);


const kloterColor = (i) => ["vio", "mint", "amb", "sky"][i % 4];
const payColor    = { expected: "vio", proof_uploaded: "amb", verified: "mint", late: "rose", rejected: "rose" };
const payLabel    = { expected: "Menunggu Bayar", proof_uploaded: "Bukti Dikirim", verified: "✅ Terverifikasi", late: "⏰ Terlambat", rejected: "❌ Ditolak" };

export default function MemberHome() {
  const [kloters, setKloters] = useState([]);
  const [memberName, setMemberName] = useState("");
  const [loading, setLoading] = useState(true);
  const [openKloters, setOpenKloters] = useState([]);
  const [joining, setJoining] = useState(null);
  const [joinMsg, setJoinMsg] = useState({});

  useEffect(() => {
    let alive = true;
    const load = () => {
      api.get("/member/home").then((r) => {
        if (alive) {
          if (r.data?.kloters) setKloters(r.data.kloters);
          if (r.data?.name) {
            setMemberName(r.data.name);
            localStorage.setItem("kloterby_member_name", r.data.name);
          }
          setLoading(false);
        }
      }).catch(() => {
        if (alive) setLoading(false);
      });
      api.get("/member/kloters/open").then((r) => {
        if (alive && Array.isArray(r.data)) setOpenKloters(r.data);
      }).catch(() => {});
    };
    load();
    const interval = setInterval(load, 15000);
    return () => { alive = false; clearInterval(interval); };
  }, []);

  const handleJoin = async (kloter) => {
    setJoining(kloter.id);
    try {
      const r = await api.post(`/member/kloters/${kloter.id}/join`);
      setJoinMsg((p) => ({ ...p, [kloter.id]: `✅ Berhasil bergabung di Slot #${r.data.slot}!` }));
      // Refresh both lists
      api.get("/member/home").then((r2) => { if (r2.data?.kloters) setKloters(r2.data.kloters); }).catch(() => {});
      api.get("/member/kloters/open").then((r2) => { if (Array.isArray(r2.data)) setOpenKloters(r2.data); }).catch(() => {});
    } catch (err) {
      setJoinMsg((p) => ({ ...p, [kloter.id]: `⚠️ ${err.response?.data?.detail || "Gagal bergabung"}` }));
    }
    setJoining(null);
  };

  const pending = kloters.filter((k) => k.payment_status === "expected" || k.payment_status === "late" || k.payment_status === "rejected").length;
  const total = kloters.reduce((s, k) => s + k.contribution, 0);

  return (
    <MemberLayout title="Dashboard" subtitle="Pantau semua kloter dan pembayaran kamu">
      {/* Welcome banner */}
      <div className="welcome-banner">
        <div className="wb-noise" />
        <div className="wb-blob wb-blob1" />
        <div className="wb-blob wb-blob2" />
        <div className="wb-inner">
          <div className="wb-emoji">🎉</div>
          <div className="wb-text">
            <div className="wb-hi">Selamat datang kembali!</div>
            <div className="wb-name">{memberName || "Anggota Kloter"}</div>
            <div className="wb-sub">
              {pending > 0 ? `Ada ${pending} pembayaran yang perlu dikirim buktinya` : kloters.length > 0 ? "Semua pembayaran kamu up-to-date! 🎉" : "Kamu belum mengikuti kloter apapun"}
            </div>
            <div className="wb-stats">
              <div className="wb-stat">
                <div className="wb-stat-val">{kloters.length}</div>
                <div className="wb-stat-lbl">Kloter Aktif</div>
              </div>
              <div className="wb-stat">
                <div className="wb-stat-val">{pending}</div>
                <div className="wb-stat-lbl">Perlu Bayar</div>
              </div>
              <div className="wb-stat">
                <div className="wb-stat-val">{fmtRp(total).replace("Rp", "").trim()}</div>
                <div className="wb-stat-lbl">Total Iuran/Bulan</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Kloter list */}
      <div className="sec-head">
        <div className="sec-title">📦 Kloter Aktifku</div>
        <Link href="/member/upload" className="sec-link">Verifikasi & Bayar →</Link>
      </div>

      {loading && <div style={{ padding: "20px 0", color: "var(--ink3)", fontSize: 13 }}>Memuat kloter…</div>}

      {!loading && kloters.length === 0 && (
        <div style={{ padding: "40px 20px", textAlign: "center", background: "var(--surf)", borderRadius: 20, border: "1.5px dashed var(--bd)", marginBottom: 24 }}>
           <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
           <div style={{ fontWeight: 800, color: "var(--ink)" }}>Kamu belum bergabung di kloter manapun</div>
           <div style={{ fontSize: 12, color: "var(--ink3)", marginTop: 4 }}>Pilih kloter yang tersedia di bawah untuk mendaftar!</div>
        </div>
      )}

      <div className="grid2" style={{ marginBottom: 24 }}>
        {kloters.map((k, i) => {
          const color = kloterColor(i);
          const pct = Math.round((k.current_period / k.total_periods) * 100);
          const pc = payColor[k.payment_status] || "vio";
          return (
            <div key={k.id} className={`kloter-card ${color}`}>
              <div className="kc-head">
                <div>
                  <div className="kc-name">{k.name}</div>
                  <div className="kc-sub">Periode {k.current_period}/{k.total_periods}</div>
                </div>
                <div className={`kc-badge${k.status === "verifying" ? " soon" : k.status === "completed" ? " done" : " active"}`}>
                  {k.status === "verifying" ? "Verifikasi" : k.status === "collecting" ? "Aktif" : "Selesai"}
                </div>
              </div>

              <div className="kc-slot-badge">
                💰 {fmtRp(k.contribution)} / periode
              </div>

              <div className="kc-progress">
                <div className="kc-prog-head">
                  <span className="kc-prog-label">Progress periode</span>
                  <span className="kc-prog-val">{pct}%</span>
                </div>
                <div className="kc-prog-bar">
                  <div className={`kc-prog-fill ${color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div className="kc-footer">
                <div className={`kc-due${k.days_until_deadline <= 1 ? "" : " warn"}`}>
                  💸 GET: <b>{new Date(k.next_get_date).toLocaleDateString("id-ID")}</b>
                </div>
                <Link href={`/member/kloter/${k.id}`} className="kc-action">
                  Detail →
                </Link>
              </div>

              {/* Payment status */}
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1.5px solid var(--bd)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink3)" }}>Status bayar:</span>
                <span className={`tl-status-pill ${pc}`}>{payLabel[k.payment_status] || k.payment_status}</span>
              </div>

              {k.payment_status !== "verified" && k.payment_status !== "none" && (
                <Link href={`/member/upload?id=${k.payment_id}`} className="btn-pay" style={{ marginTop: 10, background: k.payment_status === "proof_uploaded" ? "var(--surf)" : undefined, color: k.payment_status === "proof_uploaded" ? "var(--ink2)" : undefined, border: k.payment_status === "proof_uploaded" ? "1.5px solid var(--bd)" : undefined, boxShadow: k.payment_status === "proof_uploaded" ? "none" : undefined }}>
                  {k.payment_status === "proof_uploaded" ? "📑 Lihat Status" : "📤 Upload Bukti Bayar"}
                </Link>
              )}
            </div>
          );
        })}
      </div>
      {/* Open Kloters */}
      {openKloters.length > 0 && (
        <>
          <div className="sec-head" style={{ marginTop: 8 }}>
            <div className="sec-title">🔓 Kloter Tersedia</div>
            <span style={{ fontSize: 11, color: "var(--ink3)", fontWeight: 600 }}>{openKloters.length} kloter buka slot</span>
          </div>
          <div className="grid2" style={{ marginBottom: 24 }}>
            {openKloters.map((k) => (
              <div key={k.id} style={{ background: "var(--surf2)", borderRadius: 16, border: "1.5px solid var(--bd)", padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ink)" }}>{k.name}</div>
                    <div style={{ fontSize: 11, color: "var(--ink3)", fontWeight: 600, marginTop: 2, textTransform: "capitalize" }}>{k.type}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "#fef3c7", color: "#92400e" }}>
                    {k.open_slots} slot tersisa
                  </span>
                </div>

                {/* Slot visual */}
                <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
                  {Array.from({ length: k.slot_total }, (_, i) => i + 1).map((slot) => (
                    <div key={slot} style={{
                      width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700,
                      background: slot <= k.filled_slots ? "var(--vio)" : "#e5e7eb",
                      color: slot <= k.filled_slots ? "#fff" : "#9ca3af",
                      border: slot <= k.filled_slots ? "none" : "1.5px dashed #d1d5db",
                    }}>{slot}</div>
                  ))}
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--vio)", fontFamily: "monospace" }}>{fmtRp(k.contribution)}/periode</div>
                  <div style={{ fontSize: 11, color: "var(--ink3)" }}>GET: {fmtRp(k.contribution * k.slot_total)}</div>
                </div>

                {joinMsg[k.id] && (
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, color: joinMsg[k.id].startsWith("✅") ? "#059669" : "#e11d48" }}>
                    {joinMsg[k.id]}
                  </div>
                )}

                {k.already_joined ? (
                  <div style={{ textAlign: "center", padding: "8px 0", fontSize: 12, fontWeight: 700, color: "#059669" }}>✅ Sudah bergabung</div>
                ) : (
                  <button
                    onClick={() => handleJoin(k)}
                    disabled={joining === k.id}
                    style={{ width: "100%", padding: "10px 0", borderRadius: 12, background: "var(--vio)", color: "#fff", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: joining === k.id ? .7 : 1 }}
                  >
                    {joining === k.id ? "Mendaftar…" : "🙋 Daftar Sekarang"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </MemberLayout>
  );
}
