import { useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import api from "../../lib/api";

const fmtWa = (wa) => {
  if (!wa) return "—";
  const local = wa.startsWith("62") ? "0" + wa.slice(2) : wa;
  return local.replace(/(\d{4})(\d{4})(\d+)/, "$1-$2-$3");
};

const STATUS_BADGE = {
  active:   { label: "Aktif",    bg: "#ecfdf5", color: "#10b981" },
  inactive: { label: "Nonaktif", bg: "#fef2f2", color: "#ef4444" },
  banned:   { label: "Banned",   bg: "#fef2f2", color: "#dc2626" },
};

const EMPTY_FORM = { name: "", wa: "", nik: "", bank_name: "", bank_account_number: "", bank_account_name: "" };

export default function AdminMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [bankModal, setBankModal] = useState(null); // { id, name, bank_name, bank_account_number, bank_account_name }
  const [bankForm, setBankForm] = useState({});
  const [bankSaving, setBankSaving] = useState(false);

  const load = () => {
    api.get("/member/admin/list")
      .then((r) => setMembers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = members.filter((m) => {
    const q = search.trim().toLowerCase();
    return !q || `${m.name} ${m.wa} ${m.nik || ""}`.toLowerCase().includes(q);
  });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.wa.trim()) { setFormErr("Nama dan nomor WA wajib diisi"); return; }
    setSaving(true); setFormErr("");
    try {
      await api.post("/member/admin/create", form);
      setShowAdd(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setFormErr(err.response?.data?.detail || "Gagal menambah member");
    } finally {
      setSaving(false);
    }
  };

  const openBankModal = (m) => {
    setBankModal(m);
    setBankForm({ bank_name: m.bank_name || "", bank_account_number: m.bank_account_number || "", bank_account_name: m.bank_account_name || "" });
  };

  const handleBankSave = async () => {
    setBankSaving(true);
    try {
      await api.put(`/member/admin/${bankModal.id}/bank`, bankForm);
      setBankModal(null);
      load();
    } catch (_) {}
    setBankSaving(false);
  };

  return (
    <AdminLayout title="Member" subtitle="Daftar semua anggota terdaftar">
      <div className="page-title">👥 Daftar Member</div>
      <div className="page-sub">Semua anggota yang terdaftar di platform ini</div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
        <div className="search-box" style={{ maxWidth: 300, flex: 1 }}>
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Cari nama, WA, NIK…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={{ fontSize: 12, color: "var(--t3)", marginLeft: "auto" }}>{filtered.length} member</div>
        <button className="btn primary" style={{ fontSize: 13, padding: "8px 18px" }} onClick={() => { setShowAdd(true); setFormErr(""); setForm(EMPTY_FORM); }}>
          + Tambah Member
        </button>
      </div>

      {/* Table */}
      <div style={{ background: "var(--s)", borderRadius: 16, border: "1.5px solid var(--b)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--t3)", fontSize: 13 }}>Memuat data…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--t3)", fontSize: 13 }}>Tidak ada member ditemukan</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--bg)", borderBottom: "1.5px solid var(--b)" }}>
                <th style={th}>#</th>
                <th style={th}>Nama</th>
                <th style={th}>WhatsApp</th>
                <th style={th}>NIK</th>
                <th style={th}>Bank / E-Wallet</th>
                <th style={th}>Status</th>
                <th style={th}>Kloter Aktif</th>
                <th style={th}>Bergabung</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => {
                const st = STATUS_BADGE[m.status] || STATUS_BADGE.active;
                return (
                  <tr key={m.id} style={{ borderBottom: "1px solid var(--b)", transition: "background .1s" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={td}>{i + 1}</td>
                    <td style={td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: "var(--pd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "var(--p)", flexShrink: 0 }}>
                          {m.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 700, color: "var(--t)" }}>{m.name}</span>
                      </div>
                    </td>
                    <td style={{ ...td, fontFamily: "monospace" }}>{fmtWa(m.wa)}</td>
                    <td style={{ ...td, fontFamily: "monospace", color: "var(--t2)" }}>{m.nik || "—"}</td>
                    <td style={td}>
                      {m.bank_name ? (
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{m.bank_name}</div>
                          <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--t2)" }}>{m.bank_account_number}</div>
                          <div style={{ fontSize: 10, color: "var(--t3)" }}>{m.bank_account_name}</div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--t3)" }}>Belum diisi</span>
                      )}
                    </td>
                    <td style={td}>
                      <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>{st.label}</span>
                    </td>
                    <td style={td}>
                      {m.active_kloters.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {m.active_kloters.slice(0, 2).map((k) => (
                            <span key={k} style={{ fontSize: 10, fontWeight: 700, background: "var(--pd)", color: "var(--p)", padding: "2px 8px", borderRadius: 10 }}>{k}</span>
                          ))}
                          {m.active_kloters.length > 2 && <span style={{ fontSize: 10, color: "var(--t3)" }}>+{m.active_kloters.length - 2}</span>}
                        </div>
                      ) : <span style={{ color: "var(--t3)", fontSize: 11 }}>—</span>}
                    </td>
                    <td style={{ ...td, color: "var(--t2)" }}>{m.created_at || "—"}</td>
                    <td style={td}>
                      <button className="btn" style={{ fontSize: 11, padding: "4px 10px" }} onClick={() => openBankModal(m)}>
                        🏦 Bank
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* === MODAL: Tambah Member === */}
      {showAdd && (
        <div style={overlay} onClick={() => setShowAdd(false)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>➕ Tambah Member Baru</div>
            <div style={{ fontSize: 12, color: "var(--t2)", marginBottom: 20 }}>Data dasar + info bank/e-wallet (opsional)</div>
            <form onSubmit={handleAdd}>
              <div style={fieldGroup}>
                <label style={label}>Nama Lengkap *</label>
                <input style={inp} placeholder="Nama member" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div style={fieldGroup}>
                <label style={label}>Nomor WhatsApp *</label>
                <input style={inp} placeholder="08xxxxxxxxxx" value={form.wa} onChange={(e) => setForm({ ...form, wa: e.target.value })} required />
              </div>
              <div style={fieldGroup}>
                <label style={label}>NIK (opsional)</label>
                <input style={inp} placeholder="16 digit NIK" value={form.nik} onChange={(e) => setForm({ ...form, nik: e.target.value })} maxLength={16} />
              </div>
              <div style={{ borderTop: "1.5px solid var(--b)", margin: "16px 0 14px", paddingTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t2)", marginBottom: 12 }}>🏦 Info Bank / E-Wallet (opsional)</div>
                <div style={fieldGroup}>
                  <label style={label}>Bank / E-Wallet</label>
                  <input style={inp} placeholder="BCA / BRI / GoPay / OVO / dll" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
                </div>
                <div style={fieldGroup}>
                  <label style={label}>Nomor Rekening / Akun</label>
                  <input style={inp} placeholder="0123456789" value={form.bank_account_number} onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })} />
                </div>
                <div style={fieldGroup}>
                  <label style={label}>Nama Pemilik Rekening</label>
                  <input style={inp} placeholder="Sesuai buku tabungan" value={form.bank_account_name} onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })} />
                </div>
              </div>
              {formErr && <div style={{ fontSize: 12, color: "#ef4444", fontWeight: 600, marginBottom: 10 }}>⚠️ {formErr}</div>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" className="btn" style={{ padding: "8px 18px" }} onClick={() => setShowAdd(false)}>Batal</button>
                <button type="submit" className="btn primary" style={{ padding: "8px 20px" }} disabled={saving}>{saving ? "Menyimpan…" : "Simpan Member"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === MODAL: Edit Bank === */}
      {bankModal && (
        <div style={overlay} onClick={() => setBankModal(null)}>
          <div style={{ ...modal, maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>🏦 Info Bank — {bankModal.name}</div>
            <div style={{ fontSize: 12, color: "var(--t2)", marginBottom: 16 }}>Digunakan untuk transfer GET ke member ini</div>
            <div style={fieldGroup}>
              <label style={label}>Bank / E-Wallet</label>
              <input style={inp} placeholder="BCA / GoPay / OVO / dll" value={bankForm.bank_name} onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })} />
            </div>
            <div style={fieldGroup}>
              <label style={label}>Nomor Rekening / Akun</label>
              <input style={inp} placeholder="0123456789" value={bankForm.bank_account_number} onChange={(e) => setBankForm({ ...bankForm, bank_account_number: e.target.value })} />
            </div>
            <div style={fieldGroup}>
              <label style={label}>Nama Pemilik Rekening</label>
              <input style={inp} placeholder="Sesuai buku tabungan" value={bankForm.bank_account_name} onChange={(e) => setBankForm({ ...bankForm, bank_account_name: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn" style={{ padding: "8px 18px" }} onClick={() => setBankModal(null)}>Batal</button>
              <button className="btn primary" style={{ padding: "8px 20px" }} onClick={handleBankSave} disabled={bankSaving}>{bankSaving ? "Menyimpan…" : "Simpan"}</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

const th = { padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--t2)", textTransform: "uppercase", letterSpacing: ".04em" };
const td = { padding: "12px 14px", verticalAlign: "middle" };
const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 };
const modal = { background: "var(--s)", borderRadius: 20, padding: 28, maxWidth: 520, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,.25)", maxHeight: "90vh", overflowY: "auto" };
const fieldGroup = { marginBottom: 14 };
const label = { display: "block", fontSize: 12, fontWeight: 700, color: "var(--t2)", marginBottom: 5 };
const inp = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--b)", background: "var(--bg)", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", outline: "none" };
