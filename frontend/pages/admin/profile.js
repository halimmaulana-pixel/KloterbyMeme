import { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import api from "../../lib/api";

export default function AdminProfile() {
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await api.get("/admin-users/me");
      setProfile({ name: res.data.name, email: res.data.email });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: "", text: "" });
    try {
      await api.put("/admin-users/me", {
        name: profile.name,
        email: profile.email,
        password: password || undefined
      });
      setMsg({ type: "ok", text: "✅ Profil berhasil diperbarui!" });
      setPassword("");
    } catch (err) {
      setMsg({ type: "err", text: err.response?.data?.detail || "Gagal memperbarui profil" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminLayout title="Profil Saya"><div>Loading...</div></AdminLayout>;

  return (
    <AdminLayout title="Profil Saya">
      <div className="card" style={{ maxWidth: 600 }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, marginBottom: 5 }}>Informasi Akun</h2>
          <p style={{ color: "var(--t3)", fontSize: 14 }}>Ubah data diri dan password Anda di sini.</p>
        </div>

        <form onSubmit={handleSave}>
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
            <label className="label">Email Address</label>
            <input 
              className="inp" 
              type="email"
              value={profile.email} 
              onChange={e => setProfile({...profile, email: e.target.value})}
              required 
            />
          </div>

          <div className="field">
            <label className="label">
              Password Baru
              <span style={{ fontSize: 11, color: "var(--ora)", marginLeft: 10 }}>Kosongkan jika tidak ingin mengubah</span>
            </label>
            <input 
              className="inp" 
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {msg.text && (
            <div style={{ 
              padding: 12, 
              borderRadius: 8, 
              marginBottom: 20,
              fontSize: 14,
              backgroundColor: msg.type === "ok" ? "#e6fffa" : "#fff5f5",
              color: msg.type === "ok" ? "#2c7a7b" : "#c53030",
              border: `1px solid ${msg.type === "ok" ? "#b2f5ea" : "#feb2b2"}`
            }}>
              {msg.text}
            </div>
          )}

          <button className="btn-main" type="submit" disabled={saving}>
            {saving ? "⏳ Menyimpan..." : "💾 Simpan Perubahan"}
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}
