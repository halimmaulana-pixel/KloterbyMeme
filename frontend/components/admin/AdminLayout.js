import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { getToken, getRole } from "../../lib/auth";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import "../../styles/admin.css";

export default function AdminLayout({ title, subtitle, children }) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = getToken();
    const role = getRole();
    if (!token || role !== "admin") {
      router.push("/login");
    } else {
      setIsLoggedIn(true);
    }
  }, [router]);

  // Lock scroll on body for admin fixed-height layout
  useEffect(() => {
    document.body.classList.add("admin-body");
    return () => document.body.classList.remove("admin-body");
  }, []);

  if (!isLoggedIn) return null;

  return (
    <div className="admin-app">
      <AdminTopbar title={title} />
      <div className="main-layout">
        <AdminSidebar />
        <div className="content">
          <div className="page">{children}</div>
        </div>
      </div>
    </div>
  );
}
