import AdminLayout from "../../components/admin/AdminLayout";
import { useState, useEffect } from "react";
import api from "../../lib/api";

export default function MemberQuality() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const res = await api.get("/members");
      // Sort by reputation score descending
      const sorted = res.data.sort((a, b) => (b.reputation_score || 0) - (a.reputation_score || 0));
      setMembers(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRatingStars = (score) => {
    const stars = Math.round(score * 5);
    return "⭐".repeat(Math.max(1, Math.min(5, stars)));
  };

  if (loading) return <AdminLayout title="Kualitas Member"><div>Loading...</div></AdminLayout>;

  return (
    <AdminLayout title="Kualitas & Rating Member">
      <div className="card">
        <p style={{ color: "var(--t3)", marginBottom: 20 }}>
          Rating otomatis berdasarkan kecepatan bayar dan riwayat ditalangi.
        </p>
        
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nama Member</th>
                <th>WA</th>
                <th>Rating</th>
                <th>Reputation</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>{m.wa}</td>
                  <td style={{ fontSize: 18 }}>{getRatingStars(m.reputation_score)}</td>
                  <td>{(m.reputation_score * 100).toFixed(0)}%</td>
                  <td>
                    <button className="btn-sms" onClick={() => window.open(`https://wa.me/${m.wa}`, "_blank")}>
                      💬 Chat
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
