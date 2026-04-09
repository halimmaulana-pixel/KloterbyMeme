import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
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

    let wa = phone.replace(/\D/g, "");
    if (wa.startsWith("0")) wa = "62" + wa.slice(1);

    try {
      const res = await api.post("/auth/login", {
        email: wa, 
        password: password
      });

      setSession(res.data.access_token, res.data.role, res.data.tenant_id);
      
      if (res.data.role === "admin" || res.data.role === "owner") {
        router.push("/admin/dashboard");
      } else {
        router.push("/member/home");
      }
    } catch (err) {
      // Handle various error formats from FastAPI
      let msg = "Ups! Nomor HP atau password salah nih. Coba cek lagi ya! ✨";
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'string') {
          msg = detail;
        } else if (Array.isArray(detail)) {
          // Typically for 422 validation errors
          msg = detail[0]?.msg || JSON.stringify(detail[0]);
        } else if (typeof detail === 'object') {
          msg = detail.msg || JSON.stringify(detail);
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Head>
        <title>Masuk | Kloterby Meme ✨</title>
      </Head>

      <div className="blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <div className="login-box">
        <div className="login-header">
          <div className="logo-wrapper">
            <span className="logo-emoji">👋</span>
          </div>
          <h1>Halo Cantik/Ganteng!</h1>
          <p>Yuk, masuk ke akun Kloterby kamu!</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>Nomor WhatsApp</label>
            <div className="input-wrapper">
              <span className="input-icon">📱</span>
              <input
                type="tel"
                placeholder="0812xxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                type="password"
                placeholder="Password kamu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <p className="hint">Tips: Password awal adalah nomor HP kamu (format 628...)</p>
          </div>

          {error && (
            <div className="error-msg animate-shake">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-login">
            {loading ? (
              <span className="loading-spinner"></span>
            ) : (
              "Masuk Sekarang ✨"
            )}
          </button>
        </form>

        <div className="login-footer">
          Belum punya akun? <a href="/register">Daftar Yuk!</a>
        </div>
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap');

        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fdf2f8; /* Soft pinkish background */
          font-family: 'Quicksand', sans-serif;
          position: relative;
          overflow: hidden;
          padding: 1rem;
        }

        /* Cute Blobs Background */
        .blobs {
          position: absolute;
          width: 100%;
          height: 100%;
          z-index: 0;
        }
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.5;
          animation: move 20s infinite alternate;
        }
        .blob-1 {
          width: 300px;
          height: 300px;
          background: #fbcfe8;
          top: -100px;
          left: -100px;
        }
        .blob-2 {
          width: 400px;
          height: 400px;
          background: #dbeafe;
          bottom: -150px;
          right: -100px;
          animation-delay: -5s;
        }

        @keyframes move {
          from { transform: translate(0, 0) scale(1); }
          to { transform: translate(50px, 50px) scale(1.1); }
        }

        .login-box {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 2.5rem;
          border-radius: 2rem;
          box-shadow: 0 20px 40px rgba(0,0,0,0.03);
          width: 100%;
          max-width: 420px;
          z-index: 1;
          border: 1px solid rgba(255,255,255,0.5);
          animation: fadeIn 0.8s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .logo-wrapper {
          width: 70px;
          height: 70px;
          background: #3b82f6;
          background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 1.5rem;
          margin: 0 auto 1.5rem;
          box-shadow: 0 10px 20px rgba(59, 130, 246, 0.2);
          transform: rotate(-5deg);
        }
        .logo-emoji { font-size: 2rem; }

        h1 { font-size: 1.5rem; color: #1e293b; margin-bottom: 0.5rem; font-weight: 700; }
        p { color: #64748b; font-size: 0.95rem; font-weight: 500; }

        .form-group { margin-bottom: 1.5rem; }
        label { display: block; margin-bottom: 0.6rem; font-weight: 600; color: #475569; font-size: 0.9rem; margin-left: 0.5rem; }
        
        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-icon {
          position: absolute;
          left: 1rem;
          font-size: 1.2rem;
        }
        input {
          width: 100%;
          padding: 0.85rem 1rem 0.85rem 3rem;
          border: 2px solid #f1f5f9;
          border-radius: 1.2rem;
          font-size: 1rem;
          font-family: inherit;
          font-weight: 500;
          transition: all 0.3s;
          background: #f8fafc;
        }
        input:focus {
          outline: none;
          border-color: #3b82f6;
          background: white;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }

        .hint { font-size: 0.75rem; color: #94a3b8; margin-top: 0.5rem; margin-left: 0.5rem; line-height: 1.4; }
        
        .error-msg {
          background: #fff1f2;
          color: #e11d48;
          padding: 0.85rem;
          border-radius: 1rem;
          font-size: 0.85rem;
          margin-bottom: 1.5rem;
          text-align: center;
          font-weight: 600;
          border: 1px solid #ffe4e6;
        }

        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }

        .btn-login {
          width: 100%;
          padding: 1rem;
          background: #3b82f6;
          background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
          color: white;
          border: none;
          border-radius: 1.2rem;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 10px 20px rgba(59, 130, 246, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .btn-login:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 25px rgba(59, 130, 246, 0.3);
        }
        .btn-login:active { transform: translateY(0); }
        .btn-login:disabled { background: #cbd5e1; box-shadow: none; cursor: not-allowed; }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .login-footer {
          margin-top: 2rem;
          text-align: center;
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 500;
        }
        .login-footer a { color: #3b82f6; text-decoration: none; font-weight: 700; }
        .login-footer a:hover { text-decoration: underline; }

        @media (max-width: 480px) {
          .login-box { padding: 2rem 1.5rem; }
        }
      `}</style>
    </div>
  );
}
