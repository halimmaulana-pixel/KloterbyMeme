import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { getToken, getRole } from "../../lib/auth";
import MemberSidebar from "./MemberSidebar";
import MemberTopbar from "./MemberTopbar";
import "../../styles/member.css";

export default function MemberLayout({ children, title, subtitle }) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = getToken();
    const role = getRole();
    if (!token || role !== "member") {
      router.push("/login");
    } else {
      setIsLoggedIn(true);
    }
  }, [router]);

  if (!isLoggedIn) return null;

  return (
    <div className="member-app">
      <MemberSidebar />
      <MemberTopbar title={title} subtitle={subtitle} />
      <main className="main">
        <div className="page active">
          {children}
        </div>
      </main>
    </div>
  );
}
