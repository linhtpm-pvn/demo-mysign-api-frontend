import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../utils/supabase";
import type { User } from "@supabase/supabase-js";
import "./Navbar.scss";

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching user:", error);
        return;
      }

      if (data.user && data.user.aud === "authenticated") {
        setUser(data.user);
      }
    }
    loadUser();
  }, []);

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert("Error signing out: " + error.message);
      return;
    }
    setUser(null);
    window.location.href = "/";
  }

  async function handleSignIn() {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: "linhtpm@pvn.vn",
      password: "123456",
    });
    
    if (error) {
      alert("Error signing in: " + error.message);
      return;
    }
    
    if (data.user) {
      setUser(data.user);
    }
  }

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-brand">
          <h2>📝 MySign Portal</h2>
        </Link>
        <div className="nav-links">
          <Link to="/">🏠 Trang chủ</Link>
          <Link to="/settings">⚙️ Cài đặt</Link>
          <Link to="/sign-pdf">✍️ Ký PDF</Link>
          <Link to="/test">🧪 Test</Link>
        </div>
        <div className="nav-user">
          {user ? (
            <div className="user-info">
              <span className="user-email">{user.email}</span>
              <button className="btn-signout" onClick={handleSignOut}>
                Đăng xuất
              </button>
            </div>
          ) : (
            <button className="btn-signin" onClick={handleSignIn}>
              Đăng nhập
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

