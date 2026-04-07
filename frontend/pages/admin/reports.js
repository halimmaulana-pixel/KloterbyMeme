import AdminLayout from "../../components/admin/AdminLayout";
import { useState, useEffect } from "react";
import api from "../../lib/api";

const fmtRp = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export default function AdminReports() {
  const [summary, setSummary] = useState(null);
  const [receivables, setReceivables] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/reports/summary"),
      api.get("/reports/receivables")
    ]).then(([s, r]) => {
      setSummary(s.data);
      setReceivables(r.data);
    }).catch(e => console.error(e)).finally(() => setLoading(false));
  }, []);

  if (loading) return <AdminLayout title="Laporan Keuangan"><div>Loading...</div></AdminLayout>;

  return (
    <AdminLayout title="Laporan Keuangan">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 20 }}>💰 4 Laci Virtual (Real-time)</h2>
          <div className="card" style={{ padding: "8px 16px", background: "var(--vio-l)", border: "1.5px solid var(--vio)", color: "var(--vio-d)", fontWeight: 800 }}>
            Kas Tersedia: {fmtRp(summary.total_cash)}
          </div>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <div className="card" style={{ background: "#f0f9ff", border: "1px solid #bae6fd" }}>
            <div style={{ fontSize: 13, color: "#0369a1", fontWeight: 700 }}>1. Laci Modal (Pokok Iuran)</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#0c4a6e", margin: "8px 0" }}>{fmtRp(summary.laci_modal)}</div>
            <div style={{ fontSize: 11, color: "#075985" }}>Total uang iuran yang mengendap.</div>
          </div>
          <div className="card" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
            <div style={{ fontSize: 13, color: "#15803d", fontWeight: 700 }}>2. Laci Profit (Admin Fee)</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#064e3b", margin: "8px 0" }}>{fmtRp(summary.laci_profit)}</div>
            <div style={{ fontSize: 11, color: "#166534" }}>Keuntungan murni dari jasa admin.</div>
          </div>
          <div className="card" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
            <div style={{ fontSize: 13, color: "#b91c1c", fontWeight: 700 }}>3. Laci Piutang (Talangan)</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#7f1d1d", margin: "8px 0" }}>{fmtRp(summary.laci_piutang)}</div>
            <div style={{ fontSize: 11, color: "#991b1b" }}>Uang Anda yang masih dipinjam member.</div>
          </div>
          <div className="card" style={{ background: "#fffbeb", border: "1px solid #fef3c7" }}>
            <div style={{ fontSize: 13, color: "#b45309", fontWeight: 700 }}>4. Laci Denda</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#78350f", margin: "8px 0" }}>{fmtRp(summary.laci_denda)}</div>
            <div style={{ fontSize: 11, color: "#92400e" }}>Hasil denda keterlambatan member.</div>
          </div>
        </div>
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>📋 Detail Piutang Aktif (Daftar Talangan)</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Kloter</th>
                  <th>Periode</th>
                  <th>Jumlah</th>
                  <th>Jatuh Tempo</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {receivables.map(r => (
                  <tr key={r.id}>
                    <td><b>{r.member_name}</b></td>
                    <td>{r.kloter_name}</td>
                    <td>Ke-{r.period_number}</td>
                    <td style={{ color: "var(--rose)", fontWeight: 700 }}>{fmtRp(r.amount)}</td>
                    <td>{new Date(r.due_date).toLocaleDateString('id-ID')}</td>
                    <td>
                      <button className="btn-sms" onClick={() => window.open(`https://wa.me/${r.wa}?text=Halo%20${r.member_name},%20iuran%20${r.kloter_name}%20periode%20${r.period_number}%20sudah%20ditalangi%20Admin.%20Mohon%20segera%20dilunasi%20ya.`, "_blank")}>
                        💬 Tagih WA
                      </button>
                    </td>
                  </tr>
                ))}
                {receivables.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: 20, color: "var(--t3)" }}>Tidak ada piutang aktif. Semua iuran sudah lunas!</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
