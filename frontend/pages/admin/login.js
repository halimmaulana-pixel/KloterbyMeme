import { useState } from "react";
import { useRouter } from "next/router";
import api from "../../lib/api";
import { setSession } from "../../lib/auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/auth/login", { email, password });
      setSession({ token: response.data.access_token, role: response.data.role });
      router.push("/admin/dashboard");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Login gagal. Cek email dan password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-login-page">
      <div className="al-card">
        {/* Brand */}
        <div className="al-brand">
          <div className="al-brand-icon">🏦</div>
          <div className="al-brand-text">Kloterby<span>.</span></div>
        </div>

        <div className="al-title">Selamat datang</div>
        <div className="al-sub">Panel Admin · Masuk untuk kelola kloter</div>

        <form onSubmit={handleLogin}>
          <div className="al-field">
            <div className="al-label">Email</div>
            <input
              className={`al-input${error ? " err" : ""}`}
              type="email"
              placeholder="admin@meme.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="al-field">
            <div className="al-label">Password</div>
            <input
              className={`al-input${error ? " err" : ""}`}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="al-error">⚠️ {error}</div>
          )}

          <button className="al-btn" type="submit" disabled={loading}>
            {loading ? (
              <>⏳ Memproses…</>
            ) : (
              <>🚀 Masuk ke Dashboard</>
            )}
          </button>
        </form>

        <div className="al-footer">
          © 2025 Kloterby Meme · Admin Panel
        </div>
      </div>
    </main>
  );
}
