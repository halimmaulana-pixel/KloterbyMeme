import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import api from "../../lib/api";

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
      setMsg({ type: "success", text: "Password berhasil diperbarui!" });
      setPasswords({ old_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.detail || "Gagal mengubah password" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <Head>
        <title>Pengaturan Akun | Kloterby</title>
      </Head>

      <div className="header">
        <Link href="/member/home">
          <a className="back-btn">← Kembali</a>
        </Link>
        <h1>Pengaturan Akun</h1>
      </div>

      <div className="card">
        <h2>Informasi Profil</h2>
        {profile ? (
          <div className="profile-info">
            <div className="info-row">
              <span className="label">Nama</span>
              <span className="value">{profile.name}</span>
            </div>
            <div className="info-row">
              <span className="label">WhatsApp</span>
              <span className="value">{profile.wa}</span>
            </div>
            <div className="info-row">
              <span className="label">NIK</span>
              <span className="value">{profile.nik || "-"}</span>
            </div>
          </div>
        ) : <p>Loading profil...</p>}
      </div>

      <div className="card">
        <h2>Ganti Password</h2>
        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label>Password Lama</label>
            <input 
              type="password" 
              required 
              value={passwords.old_password}
              onChange={e => setPasswords({...passwords, old_password: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label>Password Baru</label>
            <input 
              type="password" 
              required 
              value={passwords.new_password}
              onChange={e => setPasswords({...passwords, new_password: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label>Konfirmasi Password Baru</label>
            <input 
              type="password" 
              required 
              value={passwords.confirm_password}
              onChange={e => setPasswords({...passwords, confirm_password: e.target.value})}
            />
          </div>

          {msg.text && (
            <div className={`alert ${msg.type}`}>
              {msg.text}
            </div>
          )}

          <button type="submit" className="save-btn" disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan Password Baru"}
          </button>
        </form>
      </div>

      <style jsx>{`
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 2rem 1rem;
          font-family: 'Inter', sans-serif;
          background: #f8fafc;
          min-height: 100vh;
        }
        .header {
          display: flex;
          align-items: center;
          margin-bottom: 2rem;
        }
        .back-btn {
          color: #64748b;
          text-decoration: none;
          margin-right: 1rem;
          font-weight: 500;
        }
        h1 { font-size: 1.5rem; color: #1e293b; margin: 0; }
        h2 { font-size: 1.1rem; color: #334155; margin-bottom: 1.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; }
        .card {
          background: white;
          padding: 1.5rem;
          border-radius: 0.75rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          margin-bottom: 1.5rem;
        }
        .profile-info { display: flex; flex-direction: column; gap: 1rem; }
        .info-row { display: flex; justify-content: space-between; font-size: 0.95rem; }
        .label { color: #64748b; }
        .value { color: #1e293b; font-weight: 500; }
        
        .form-group { margin-bottom: 1.25rem; }
        label { display: block; margin-bottom: 0.4rem; font-size: 0.9rem; color: #475569; font-weight: 500; }
        input {
          width: 100%;
          padding: 0.7rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          font-size: 1rem;
        }
        .save-btn {
          width: 100%;
          padding: 0.75rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 1rem;
        }
        .save-btn:disabled { background: #94a3b8; }
        .alert {
          padding: 0.75rem;
          border-radius: 0.5rem;
          font-size: 0.9rem;
          margin-bottom: 1rem;
          text-align: center;
        }
        .alert.error { background: #fef2f2; color: #b91c1c; }
        .alert.success { background: #f0fdf4; color: #16a34a; }
      `}</style>
    </div>
  );
}
