import { useState, useEffect } from "react";
import MemberLayout from "../../components/member/MemberLayout";
import api from "../../lib/api";

export default function MemberProfile() {
  const [profile, setProfile] = useState({
    name: "",
    nik: "",
    bank_name: "",
    bank_account_number: "",
    bank_account_name: ""
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.get("/member/profile")
      .then(r => {
        setProfile({
          name: r.data.name || "",
          nik: r.data.nik || "",
          bank_name: r.data.bank_name || "",
          bank_account_number: r.data.bank_account_number || "",
          bank_account_name: r.data.bank_account_name || ""
        });
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await api.put("/member/profile", profile);
      setMsg("✅ Profil berhasil diperbarui!");
      localStorage.setItem("kloterby_member_name", profile.name);
    } catch (err) {
      setMsg("❌ Gagal memperbarui profil.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <MemberLayout title="Profil Saya"><div>Loading...</div></MemberLayout>;

  return (
    <MemberLayout title="Profil Saya" subtitle="Kelola informasi akun dan rekening pencairan">
      <div className="card" style={{ maxWidth: 600, margin: "0 auto" }}>
        <form onSubmit={handleUpdate}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, marginBottom: 12 }}>👤 Informasi Dasar</h3>
            <div className="field">
              <label className="label">Nama Lengkap</label>
              <input 
                className="inp" 
                value={profile.name} 
                onChange={e => setProfile({...profile, name: e.target.value})} 
                required 
              />
            </div>
            <div className="field">
              <label className="label">NIK (Sesuai KTP)</label>
              <input 
                className="inp" 
                value={profile.nik} 
                onChange={e => setProfile({...profile, nik: e.target.value})} 
                placeholder="16 digit nomor KTP"
              />
            </div>
          </div>

          <div style={{ marginBottom: 24, padding: "20px", background: "var(--surf2)", borderRadius: 16 }}>
            <h3 style={{ fontSize: 16, marginBottom: 12 }}>🏦 Rekening Pencairan (GET)</h3>
            <p style={{ fontSize: 12, color: "var(--ink3)", marginBottom: 16 }}>
              Pastikan data ini benar. Admin akan mentransfer uang hasil tarikan ke rekening ini.
            </p>
            <div className="field">
              <label className="label">Nama Bank / E-Wallet</label>
              <input 
                className="inp" 
                value={profile.bank_name} 
                onChange={e => setProfile({...profile, bank_name: e.target.value})} 
                placeholder="BCA / Mandiri / Dana"
              />
            </div>
            <div className="field">
              <label className="label">Nomor Rekening</label>
              <input 
                className="inp" 
                value={profile.bank_account_number} 
                onChange={e => setProfile({...profile, bank_account_number: e.target.value})} 
                placeholder="Nomor rekening atau HP"
              />
            </div>
            <div className="field">
              <label className="label">Nama Pemilik Rekening</label>
              <input 
                className="inp" 
                value={profile.bank_account_name} 
                onChange={e => setProfile({...profile, bank_account_name: e.target.value})} 
                placeholder="Harus sesuai dengan nama di buku tabungan/aplikasi"
              />
            </div>
          </div>

          {msg && (
            <div style={{ 
              padding: "12px", 
              borderRadius: 12, 
              marginBottom: 16, 
              fontSize: 13, 
              fontWeight: 700,
              background: msg.startsWith("✅") ? "var(--mint-l)" : "var(--rose-l)",
              color: msg.startsWith("✅") ? "var(--mint-d)" : "var(--rose)",
              border: `1.5px solid ${msg.startsWith("✅") ? "var(--mint)" : "var(--rose-l)"}`
            }}>
              {msg}
            </div>
          )}

          <button type="submit" className="btn-pay" disabled={busy}>
            {busy ? "Menyimpan..." : "💾 Simpan Perubahan"}
          </button>
        </form>
      </div>
    </MemberLayout>
  );
}
