import { useState, useEffect } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import api from "../../lib/api";

export default function AdminBank() {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newBank, setNewBank] = useState({ bank_name: "", account_number: "", account_holder_name: "", type: "bank" });
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadBanks(); }, []);

  const loadBanks = async () => {
    try {
      const res = await api.get("/bank/list");
      setBanks(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/bank", newBank);
      setShowModal(false);
      setNewBank({ bank_name: "", account_number: "", account_holder_name: "", type: "bank" });
      loadBanks();
    } catch (err) { alert("Gagal menambah akun bank"); }
    finally { setBusy(false); }
  };

  if (loading) return <AdminLayout title="Akun Bank"><div>Loading...</div></AdminLayout>;

  return (
    <AdminLayout title="Manajemen Akun Bank">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <p style={{ color: "var(--t3)", fontSize: 14 }}>Daftar rekening & e-wallet untuk menerima setoran member.</p>
        <button className="btn-main" style={{ width: "auto", padding: "10px 20px" }} onClick={() => setShowModal(true)}>
          ➕ Tambah Rekening
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {banks.map(b => (
          <div key={b.id} className="card" style={{ borderLeft: `4px solid ${b.type === 'bank' ? 'var(--p)' : 'var(--wa)'}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "var(--t3)", textTransform: "uppercase" }}>{b.bank_name}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "var(--t)", margin: "4px 0" }}>{b.account_number}</div>
                <div style={{ fontSize: 14, color: "var(--t2)" }}>an. {b.account_holder_name}</div>
              </div>
              <span className={`pill ${b.type === 'bank' ? 'aktif' : 'lunas'}`}>{b.type}</span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="card" style={{ width: "100%", maxWidth: 400 }}>
            <h2 style={{ fontSize: 18, marginBottom: 20 }}>Tambah Akun Baru</h2>
            <form onSubmit={handleCreate}>
              <div className="field">
                <label className="label">Jenis Akun</label>
                <select className="inp" value={newBank.type} onChange={e => setNewBank({...newBank, type: e.target.value})}>
                  <option value="bank">Bank (BCA, Mandiri, dll)</option>
                  <option value="ewallet">E-Wallet (Dana, OVO, dll)</option>
                </select>
              </div>
              <div className="field">
                <label className="label">Nama Bank/E-Wallet</label>
                <input className="inp" placeholder="BCA / DANA" value={newBank.bank_name} onChange={e => setNewBank({...newBank, bank_name: e.target.value})} required />
              </div>
              <div className="field">
                <label className="label">Nomor Rekening/HP</label>
                <input className="inp" placeholder="0254xxx / 0812xxx" value={newBank.account_number} onChange={e => setNewBank({...newBank, account_number: e.target.value})} required />
              </div>
              <div className="field">
                <label className="label">Nama Pemilik</label>
                <input className="inp" placeholder="Admin Meme" value={newBank.account_holder_name} onChange={e => setNewBank({...newBank, account_holder_name: e.target.value})} required />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" className="btn-sms" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn-main" style={{ flex: 2 }} disabled={busy}>{busy ? "Memproses..." : "🚀 Simpan Akun"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
