import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import api from "../../lib/api";
import MemberLayout from "../../components/member/MemberLayout";

export default function MemberSettings() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [passwords, setPasswords] = useState({ old_password: "", new_password: "", confirm_password: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/member/profile");
      setProfile(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm_password) {
      setMsg({ type: "error", text: "Konfirmasi password baru tidak cocok" });
      return;
    }

    setLoading(true);
    setMsg({ type: "", text: "" });
    try {
      await api.post("/member/change-password", {
        old_password: passwords.old_password,
        new_password: passwords.new_password
      });
      setMsg({ type: "success", text: "Password berhasil diperbarui! ✨" });
      setPasswords({ old_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.detail || "Gagal mengubah password" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MemberLayout title="Pengaturan Akun" subtitle="Kelola profil dan keamanan akun kamu">
      <Head>
        <title>Pengaturan Akun | Kloterby Meme ✨</title>
      </Head>

      <div className="grid2">
        {/* Profile Card */}
        <div className="detail-card highlight">
          <div className="sec-head">
            <div className="sec-title">👤 Informasi Profil</div>
          </div>
          {profile ? (
            <>
              <div className="info-row">
                <div className="ir-label">Nama Lengkap</div>
                <div className="ir-val">{profile.name}</div>
              </div>
              <div className="info-row">
                <div className="ir-label">Nomor WhatsApp</div>
                <div className="ir-val mono">{profile.wa}</div>
              </div>
              <div className="info-row">
                <div className="ir-label">NIK</div>
                <div className="ir-val">{profile.nik || "-"}</div>
              </div>
              <div className="info-row">
                <div className="ir-label">Status Akun</div>
                <div className="ir-val"><span className="tl-status-pill lunas">Aktif ✨</span></div>
              </div>
            </>
          ) : (
            <div className="loading-state">Memuat profil...</div>
          )}
        </div>

        {/* Password Card */}
        <div className="detail-card">
          <div className="sec-head">
            <div className="sec-title">🔒 Ganti Password</div>
          </div>
          <form onSubmit={handleChangePassword}>
            <div className="field">
              <label className="label">Password Lama</label>
              <input 
                className="inp"
                type="password" 
                required 
                placeholder="Masukkan password saat ini"
                value={passwords.old_password}
                onChange={e => setPasswords({...passwords, old_password: e.target.value})}
              />
            </div>
            <div className="field">
              <label className="label">Password Baru</label>
              <input 
                className="inp"
                type="password" 
                required 
                placeholder="Minimal 6 karakter"
                value={passwords.new_password}
                onChange={e => setPasswords({...passwords, new_password: e.target.value})}
              />
            </div>
            <div className="field">
              <label className="label">Konfirmasi Password Baru</label>
              <input 
                className="inp"
                type="password" 
                required 
                placeholder="Ulangi password baru"
                value={passwords.confirm_password}
                onChange={e => setPasswords({...passwords, confirm_password: e.target.value})}
              />
            </div>

            {msg.text && (
              <div className={`tl-status-pill ${msg.type === 'success' ? 'lunas' : 'telat'}`} style={{ width: '100%', justifyContent: 'center', padding: '10px', marginBottom: '15px' }}>
                {msg.text}
              </div>
            )}

            <button type="submit" className="btn-pay" disabled={loading}>
              {loading ? "Menyimpan..." : "Update Password ✨"}
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        .loading-state {
          padding: 20px;
          text-align: center;
          color: #64748b;
          font-style: italic;
        }
        .field {
          margin-bottom: 15px;
        }
      `}</style>
    </MemberLayout>
  );
}
