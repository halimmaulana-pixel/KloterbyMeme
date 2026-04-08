import { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import api, { getMediaURL } from "../../lib/api";

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

  if (loading) return <AdminLayout title="Verifikasi Member"><div>Loading...</div></AdminLayout>;

  return (
    <AdminLayout title="Verifikasi Pendaftaran Baru">
      <div style={{ display: "flex", gap: 24 }}>
        <div style={{ flex: 1 }}>
          <div className="card">
            <h2 style={{ fontSize: 16, marginBottom: 16 }}>Daftar Tunggu ({members.length})</h2>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>WhatsApp</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id} className={selected?.id === m.id ? "active" : ""} onClick={() => setSelected(m)} style={{ cursor: "pointer" }}>
                      <td><b>{m.name}</b></td>
                      <td>{m.wa}</td>
                      <td><button className="btn-sms">Detail</button></td>
                    </tr>
                  ))}
                  {members.length === 0 && <tr><td colSpan="3" style={{ textAlign: "center", padding: 20 }}>Tidak ada pendaftaran baru.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div style={{ width: 400 }}>
          {selected ? (
            <div className="card">
              <h2 style={{ fontSize: 18, marginBottom: 4 }}>Detail Calon Member</h2>
              <p style={{ fontSize: 12, color: "var(--t3)", marginBottom: 20 }}>Daftar pada: {new Date(selected.created_at).toLocaleString('id-ID')}</p>

              <div className="field">
                <label className="label">Nama Lengkap</label>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{selected.name}</div>
              </div>
              <div className="field">
                <label className="label">NIK</label>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{selected.nik}</div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="label">📸 Foto Selfie</label>
                <a href={getMediaURL(selected.selfie_url)} target="_blank" rel="noreferrer">
                  <img src={getMediaURL(selected.selfie_url)} style={{ width: "100%", borderRadius: 12, border: "1.5px solid var(--bd)", marginTop: 8 }} alt="Selfie" />
                </a>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="label">🪪 Foto KTP</label>
                <a href={getMediaURL(selected.ktp_url)} target="_blank" rel="noreferrer">
                  <img src={getMediaURL(selected.ktp_url)} style={{ width: "100%", borderRadius: 12, border: "1.5px solid var(--bd)", marginTop: 8 }} alt="KTP" />
                </a>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 30 }}>
                <button 
                    className="btn-sms" 
                    style={{ flex: 1, color: "var(--rose)" }} 
                    onClick={() => handleVerify(selected.id, "reject")}
                    disabled={busy}
                >
                    ❌ Tolak
                </button>
                <button 
                    className="btn-main" 
                    style={{ flex: 2 }} 
                    onClick={() => handleVerify(selected.id, "approve")}
                    disabled={busy}
                >
                    ✅ Setujui Member
                </button>
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: "center", padding: "60px 20px", color: "var(--t3)" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
              <p>Pilih member dari daftar untuk melihat detail verifikasi.</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
