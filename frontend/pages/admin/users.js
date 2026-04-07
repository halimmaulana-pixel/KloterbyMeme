import { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import api from "../../lib/api";

export default function ManageAdmins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", password: "", role: "admin" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      const res = await api.get("/admin-users/list");
      setAdmins(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await api.post("/admin-users/create", newAdmin);
      setShowModal(false);
      setNewAdmin({ name: "", email: "", password: "", role: "admin" });
      loadAdmins();
    } catch (err) {
      setMsg(err.response?.data?.detail || "Gagal menambah admin");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <AdminLayout title="Kelola Admin"><div>Loading...</div></AdminLayout>;

  return (
    <AdminLayout title="Kelola Admin">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <p style={{ color: "var(--t3)", fontSize: 14 }}>Daftar akun yang memiliki akses ke panel admin.</p>
        </div>
        <button className="btn-main" style={{ width: "auto", padding: "10px 20px" }} onClick={() => setShowModal(true)}>
          ➕ Tambah Admin
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
              <th style={{ padding: 15, textAlign: "left" }}>Nama</th>
              <th style={{ padding: 15, textAlign: "left" }}>Email</th>
              <th style={{ padding: 15, textAlign: "left" }}>Role</th>
              <th style={{ padding: 15, textAlign: "left" }}>Terdaftar</th>
            </tr>
          </thead>
          <tbody>
            {admins.map(a => (
              <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: 15, fontWeight: 600 }}>{a.name}</td>
                <td style={{ padding: 15, color: "var(--t2)" }}>{a.email}</td>
                <td style={{ padding: 15 }}>
                  <span style={{ 
                    padding: "4px 8px", 
                    borderRadius: 6, 
                    fontSize: 11, 
                    fontWeight: 700,
                    textTransform: "uppercase",
                    backgroundColor: a.role === "owner" ? "#ebf8ff" : "#f7fafc",
                    color: a.role === "owner" ? "#2b6cb0" : "#4a5568",
                    border: `1px solid ${a.role === "owner" ? "#bee3f8" : "#edf2f7"}`
                  }}>
                    {a.role}
                  </span>
                </td>
                <td style={{ padding: 15, color: "var(--t3)" }}>
                  {new Date(a.created_at).toLocaleDateString("id-ID")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ 
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: "rgba(0,0,0,0.5)", display: "flex", 
          alignItems: "center", justifyContent: "center", zIndex: 1000 
        }}>
          <div className="card" style={{ width: "100%", maxWidth: 450, position: "relative" }}>
            <h2 style={{ fontSize: 18, marginBottom: 20 }}>Tambah Admin Baru</h2>
            <form onSubmit={handleCreate}>
              <div className="field">
                <label className="label">Nama Lengkap</label>
                <input 
                  className="inp" 
                  value={newAdmin.name} 
                  onChange={e => setNewAdmin({...newAdmin, name: e.target.value})}
                  required 
                />
              </div>
              <div className="field">
                <label className="label">Email Address</label>
                <input 
                  className="inp" 
                  type="email"
                  value={newAdmin.email} 
                  onChange={e => setNewAdmin({...newAdmin, email: e.target.value})}
                  required 
                />
              </div>
              <div className="field">
                <label className="label">Password</label>
                <input 
                  className="inp" 
                  type="password"
                  value={newAdmin.password} 
                  onChange={e => setNewAdmin({...newAdmin, password: e.target.value})}
                  required 
                />
              </div>
              <div className="field">
                <label className="label">Role</label>
                <select 
                  className="inp"
                  value={newAdmin.role}
                  onChange={e => setNewAdmin({...newAdmin, role: e.target.value})}
                >
                  <option value="admin">Admin (Biasa)</option>
                  <option value="owner">Owner (Akses Penuh)</option>
                </select>
              </div>

              {msg && <div style={{ color: "red", fontSize: 13, marginBottom: 15 }}>{msg}</div>}

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" className="btn-sms" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn-main" style={{ flex: 2 }} disabled={busy}>
                  {busy ? "Memproses..." : "🚀 Simpan Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
