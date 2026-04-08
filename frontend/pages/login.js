import { useState } from "react";
import { useRouter } from "next/router";
import api from "../lib/api";
import { setSession } from "../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Normalize phone to international format if it starts with 0
    let wa = phone.replace(/\D/g, "");
    if (wa.startsWith("0")) wa = "62" + wa.slice(1);

    try {
      const res = await api.post("/auth/login", {
        email: wa, // We use email field as WA/phone in our updated backend
        password: password
      });

      setSession(res.data.access_token, res.data.role, res.data.tenant_id);
      
      if (res.data.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/member/home");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Login gagal. Cek nomor HP dan password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <div className="logo-circle">M</div>
          <h1>Kloterby Meme</h1>
          <p>Masuk ke akun anggota</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>Nomor WhatsApp</label>
            <input
              type="tel"
              placeholder="0812xxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <p className="hint">Default: nomor HP Anda (contoh: 62812...)</p>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button type="submit" disabled={loading} className="btn-login">
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <div className="login-footer">
          Belum punya akun? <a href="/register">Daftar Sekarang</a>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          font-family: 'Inter', sans-serif;
        }
        .login-box {
          background: white;
          padding: 2.5rem;
          border-radius: 1rem;
          box-shadow: 0 10px 25px rgba(0,0,0,0.05);
          width: 100%;
          max-width: 400px;
        }
        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .logo-circle {
          width: 50px;
          height: 50px;
          background: #3b82f6;
          color: white;
          font-size: 1.5rem;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          margin: 0 auto 1rem;
        }
        h1 { font-size: 1.5rem; color: #1e293b; margin-bottom: 0.5rem; }
        p { color: #64748b; font-size: 0.9rem; }
        .form-group { margin-bottom: 1.5rem; }
        label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #334155; }
        input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          font-size: 1rem;
          transition: border-color 0.2s;
        }
        input:focus { outline: none; border-color: #3b82f6; }
        .hint { font-size: 0.75rem; color: #94a3b8; margin-top: 0.25rem; }
        .error-msg {
          background: #fef2f2;
          color: #b91c1c;
          padding: 0.75rem;
          border-radius: 0.5rem;
          font-size: 0.85rem;
          margin-bottom: 1.5rem;
          text-align: center;
        }
        .btn-login {
          width: 100%;
          padding: 0.75rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-login:hover { background: #2563eb; }
        .btn-login:disabled { background: #94a3b8; cursor: not-allowed; }
        .login-footer {
          margin-top: 2rem;
          text-align: center;
          font-size: 0.9rem;
          color: #64748b;
        }
        .login-footer a { color: #3b82f6; text-decoration: none; font-weight: 500; }
      `}</style>
    </div>
  );
}
