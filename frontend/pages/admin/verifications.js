import { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import api, { getMediaURL } from "../../lib/api";

const fmtWa = (wa) => {
  if (!wa) return "—";
  const local = wa.startswith && wa.startsWith("62") ? "0" + wa.slice(2) : wa;
  return local;
};

export default function AdminVerifications() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadPending(); }, []);

  const loadPending = async () => {
    try {
      const res = await api.get("/member/admin/pending");
      setMembers(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleVerify = async (id, action) => {
    if (!confirm(`Yakin ingin ${action === 'approve' ? 'menyetujui' : 'menolak'} member ini?`)) return;
    setBusy(true);
    try {
      await api.post(`/member/admin/${id}/verify`, { action });
      setMembers(prev => prev.filter(m => m.id !== id));
      setSelected(null);
    } catch (err) { alert("Gagal memproses verifikasi"); }
    finally { setBusy(false); }
  };

  if (loading) return <AdminLayout title="Verifikasi Member"><div style={{ padding: 40, textAlign: "center", color: "var(--t3)" }}>Memuat pendaftaran…</div></AdminLayout>;

  return (
    <AdminLayout title="Verifikasi Pendaftaran Baru">
      <div className="page-title">🔍 Verifikasi Pendaftaran</div>
      <div className="page-sub">Review pendaftaran mandiri dari calon anggota baru</div>

      <div style={{ display: "flex", gap: 24, marginTop: 20 }}>
        <div style={{ flex: 1 }}>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1.5px solid var(--b)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg)" }}>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: "var(--t)" }}>Daftar Tunggu ({members.length})</h2>
            </div>
            <div className="table-container" style={{ maxHeight: "calc(100vh - 280px)", overflowY: "auto" }}>
              <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--s2)", borderBottom: "1.5px solid var(--b)" }}>
                    <th style={th}>Nama Calon Member</th>
                    <th style={th}>WhatsApp</th>
                    <th style={th}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr 
                      key={m.id} 
                      style={{ 
                        cursor: "pointer", 
                        borderBottom: "1px solid var(--b)",
                        background: selected?.id === m.id ? "var(--pd)" : "transparent"
                      }} 
                      onClick={() => setSelected(m)}
                    >
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 10, background: selected?.id === m.id ? "var(--p)" : "var(--b)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900 }}>
                            {m.name.slice(0, 2).toUpperCase()}
                          </div>
                          <b style={{ color: selected?.id === m.id ? "var(--p2)" : "var(--t)" }}>{m.name}</b>
                        </div>
                      </td>
                      <td style={{ ...td, fontFamily: "monospace", color: "var(--t2)" }}>{m.wa}</td>
                      <td style={td}>
                        <button className={`btn ${selected?.id === m.id ? "purple" : ""}`} style={{ fontSize: 11, padding: "4px 12px" }}>Detail</button>
                      </td>
                    </tr>
                  ))}
                  {members.length === 0 && (
                    <tr>
                      <td colSpan="3" style={{ textAlign: "center", padding: 60, color: "var(--t3)" }}>
                        <div style={{ fontSize: 32, marginBottom: 10 }}>🎉</div>
                        <p style={{ fontWeight: 700 }}>Semua pendaftaran sudah diproses!</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div style={{ width: 400 }}>
          {selected ? (
            <div className="card" style={{ position: "sticky", top: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--t)" }}>Detail Pendaftaran</h2>
                  <p style={{ fontSize: 11, color: "var(--t3)", fontWeight: 700, marginTop: 2 }}>Daftar pada: {new Date(selected.created_at).toLocaleString('id-ID')}</p>
                </div>
                <div style={{ background: "var(--pd)", color: "var(--p)", fontSize: 10, fontWeight: 900, padding: "4px 10px", borderRadius: 20, border: "1.5px solid #a78bfa30" }}>PENDING</div>
              </div>

              <div style={fieldGroup}>
                <label style={label}>Nama Lengkap</label>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--t)" }}>{selected.name}</div>
              </div>
              
              <div style={fieldGroup}>
                <label style={label}>Nomor WhatsApp</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--t)", fontFamily: "monospace" }}>{selected.wa}</div>
                  <a href={`https://wa.me/${selected.wa}`} target="_blank" rel="noreferrer" className="btn wa" style={{ padding: "4px 10px", fontSize: 10 }}>Chat WA</a>
                </div>
              </div>

              <div style={fieldGroup}>
                <label style={label}>NIK</label>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--t)", fontFamily: "monospace" }}>{selected.nik || "—"}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                <div>
                  <label style={label}>📸 Foto Selfie</label>
                  <a href={getMediaURL(selected.selfie_url)} target="_blank" rel="noreferrer">
                    <div style={{ width: "100%", height: 120, borderRadius: 12, border: "2px dashed var(--b)", overflow: "hidden", position: "relative", cursor: "zoom-in" }}>
                      <img src={getMediaURL(selected.selfie_url)} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Selfie" />
                      <div style={{ position: "absolute", bottom: 0, inset: "auto 0 0", background: "rgba(0,0,0,.5)", color: "white", fontSize: 9, textAlign: "center", padding: "4px" }}>Perbesar 🔍</div>
                    </div>
                  </a>
                </div>
                <div>
                  <label style={label}>🪪 Foto KTP</label>
                  <a href={getMediaURL(selected.ktp_url)} target="_blank" rel="noreferrer">
                    <div style={{ width: "100%", height: 120, borderRadius: 12, border: "2px dashed var(--b)", overflow: "hidden", position: "relative", cursor: "zoom-in" }}>
                      <img src={getMediaURL(selected.ktp_url)} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="KTP" />
                      <div style={{ position: "absolute", bottom: 0, inset: "auto 0 0", background: "rgba(0,0,0,.5)", color: "white", fontSize: 9, textAlign: "center", padding: "4px" }}>Perbesar 🔍</div>
                    </div>
                  </a>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 10, paddingTop: 20, borderTop: "1.5px solid var(--b)" }}>
                <button 
                    className="btn red" 
                    style={{ flex: 1 }} 
                    onClick={() => handleVerify(selected.id, "reject")}
                    disabled={busy}
                >
                    ✕ Tolak
                </button>
                <button 
                    className="btn primary" 
                    style={{ flex: 2 }} 
                    onClick={() => handleVerify(selected.id, "approve")}
                    disabled={busy}
                >
                    ✓ Setujui Member
                </button>
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: "center", padding: "80px 20px", color: "var(--t3)", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 64, height: 64, background: "var(--bg)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, marginBottom: 16 }}>🔍</div>
              <p style={{ fontWeight: 700, fontSize: 13 }}>Pilih member dari daftar untuk<br/>melihat detail verifikasi.</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

const th = { padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 800, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".05em" };
const td = { padding: "14px 20px", verticalAlign: "middle", fontSize: 13 };
const fieldGroup = { marginBottom: 16 };
const label = { display: "block", fontSize: 11, fontWeight: 800, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 };
const inp = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--b)", background: "var(--bg)", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", outline: "none" };
