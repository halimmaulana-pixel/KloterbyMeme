import { useState, useEffect } from "react";
import Head from "next/head";
import AdminLayout from "../../components/admin/AdminLayout";
import api from "../../lib/api";

const typeIcon = { bank: "🏦", ewallet: "📱" };

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

  return (
    <AdminLayout title="Akun Bank" subtitle="Kelola rekening tujuan transfer member ✨">
      <Head>
        <title>Manajemen Bank | Admin Kloterby ✨</title>
      </Head>

      <div className="reports-container">
        <div className="sec-head" style={{ marginBottom: '24px' }}>
          <div className="sec-title">🏦 Rekening Terdaftar</div>
          <button className="btn-main" style={{ width: "auto", padding: "10px 20px" }} onClick={() => setShowModal(true)}>
            ✨ Tambah Rekening
          </button>
        </div>

        {loading ? (
          <div className="loading-state">Memuat data rekening... 🏦</div>
        ) : (
          <div className="grid3">
            {banks.length > 0 ? (
              banks.map(b => (
                <div key={b.id} className="detail-card highlight" style={{ borderTop: `4px solid ${b.type === 'bank' ? '#7c3aed' : '#25d366'}` }}>
                  <div className="kc-head">
                    <div className="kc-name" style={{ fontSize: '14px', color: '#64748b' }}>{b.bank_name}</div>
                    <div className="stat-icon" style={{ background: b.type === 'bank' ? '#ede9fe' : '#dcfce7', color: b.type === 'bank' ? '#7c3aed' : '#16a34a' }}>
                      {typeIcon[b.type] || "💰"}
                    </div>
                  </div>
                  
                  <div className="stat-val" style={{ fontSize: '20px', margin: '8px 0', fontFamily: 'JetBrains Mono, monospace' }}>
                    {b.account_number}
                  </div>
                  
                  <div className="ir-label">Atas Nama:</div>
                  <div className="ir-val" style={{ textAlign: 'left', fontWeight: '700', marginTop: '2px' }}>
                    {b.account_holder_name}
                  </div>

                  <div className="tl-status-pill lunas" style={{ marginTop: '12px', width: '100%', justifyContent: 'center', opacity: 0.8 }}>
                    {b.type === 'bank' ? 'Rekening Bank' : 'E-Wallet / QRIS'}
                  </div>
                </div>
              ))
            ) : (
              <div className="detail-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🍃</div>
                <div className="sec-title">Belum ada rekening</div>
                <p style={{ color: '#64748b' }}>Klik tombol "Tambah Rekening" untuk memulai.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Tambah Rekening */}
      {showModal && (
        <div className="overlay show" style={{ zIndex: 1000 }}>
          <div className="modal" style={{ maxWidth: '420px', animation: 'fadeInUp 0.3s ease-out' }}>
            <div className="modal-head">
              <div className="modal-title">✨ Tambah Akun Baru</div>
              <div className="modal-close" onClick={() => setShowModal(false)}>✕</div>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreate}>
                <div className="field" style={{ marginBottom: '16px' }}>
                  <label className="label">Jenis Akun</label>
                  <select className="inp" value={newBank.type} onChange={e => setNewBank({...newBank, type: e.target.value})} style={{ cursor: 'pointer' }}>
                    <option value="bank">🏦 Bank (BCA, Mandiri, BRI, dll)</option>
                    <option value="ewallet">📱 E-Wallet (Dana, OVO, ShopeePay)</option>
                  </select>
                </div>
                
                <div className="field" style={{ marginBottom: '16px' }}>
                  <label className="label">Nama Bank/E-Wallet</label>
                  <input className="inp" placeholder="Contoh: BCA atau DANA" value={newBank.bank_name} onChange={e => setNewBank({...newBank, bank_name: e.target.value})} required />
                </div>

                <div className="field" style={{ marginBottom: '16px' }}>
                  <label className="label">Nomor Rekening / HP</label>
                  <input className="inp" style={{ fontFamily: 'JetBrains Mono, monospace' }} placeholder="Masukkan nomor tanpa spasi" value={newBank.account_number} onChange={e => setNewBank({...newBank, account_number: e.target.value})} required />
                </div>

                <div className="field" style={{ marginBottom: '24px' }}>
                  <label className="label">Atas Nama (Pemilik)</label>
                  <input className="inp" placeholder="Masukkan nama pemilik akun" value={newBank.account_holder_name} onChange={e => setNewBank({...newBank, account_holder_name: e.target.value})} required />
                </div>

                <div style={{ display: "flex", gap: '12px' }}>
                  <button type="button" className="btn-ghost" style={{ flex: 1, marginTop: 0 }} onClick={() => setShowModal(false)}>Batal</button>
                  <button type="submit" className="btn-main" style={{ flex: 2, marginTop: 0 }} disabled={busy}>
                    {busy ? "Menyimpan..." : "🚀 Simpan Akun"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .loading-state {
          padding: 100px 20px;
          text-align: center;
          font-size: 1.1rem;
          color: #64748b;
          font-weight: 600;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </AdminLayout>
  );
}
