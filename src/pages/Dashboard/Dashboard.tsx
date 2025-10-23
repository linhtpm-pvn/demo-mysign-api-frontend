import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../utils/supabase";
import type { User } from "@supabase/supabase-js";
import { Navbar } from "../../components/Navbar/Navbar";
import "./Dashboard.scss";

export function Dashboard() {
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
    <div className="dashboard">
      <Navbar />

      <div className="dashboard-content">
        <div className="hero-section">
          <h1>Chào mừng đến với MySign Portal</h1>
          <p>Hệ thống ký số PDF trực tuyến với công nghệ MySign/Viettel-CA</p>
        </div>

        {!user ? (
          <div className="login-prompt">
            <div className="prompt-card">
              <h2>🔐 Vui lòng đăng nhập</h2>
              <p>Bạn cần đăng nhập để sử dụng các tính năng ký số PDF</p>
              <button className="btn-primary" onClick={handleSignIn}>
                Đăng nhập ngay
              </button>
            </div>
          </div>
        ) : (
          <div className="features-grid">
            <Link to="/settings" className="feature-card">
              <div className="card-icon">⚙️</div>
              <h3>Thiết lập MySign</h3>
              <p>
                Cấu hình MySign ID, ảnh chữ ký và chứng chỉ mặc định. Đây là bước đầu tiên
                bạn cần thực hiện trước khi ký PDF.
              </p>
              <div className="card-footer">
                <span className="badge">Bắt buộc</span>
                <span className="arrow">→</span>
              </div>
            </Link>

            <Link to="/sign-pdf" className="feature-card primary">
              <div className="card-icon">✍️</div>
              <h3>Ký PDF nâng cao</h3>
              <p>
                Ký số PDF với nhiều vị trí, nhiều loại chữ ký. Kéo thả để chọn vùng ký
                trực tiếp trên PDF.
              </p>
              <div className="card-footer">
                <span className="badge success">Khuyên dùng</span>
                <span className="arrow">→</span>
              </div>
            </Link>

            <Link to="/test" className="feature-card">
              <div className="card-icon">🧪</div>
              <h3>Trang Test</h3>
              <p>
                Trang test chức năng cũ với các API đơn giản. Dùng để kiểm tra và phát
                triển.
              </p>
              <div className="card-footer">
                <span className="badge secondary">Phát triển</span>
                <span className="arrow">→</span>
              </div>
            </Link>
          </div>
        )}

        <div className="info-section">
          <h2>📚 Hướng dẫn sử dụng</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h4>Thiết lập thông tin MySign</h4>
                <p>
                  Truy cập trang <strong>Cài đặt</strong>, nhập MySign User ID, upload ảnh
                  chữ ký và chọn chứng chỉ mặc định.
                </p>
              </div>
            </div>

            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h4>Tải lên file PDF</h4>
                <p>
                  Vào trang <strong>Ký PDF nâng cao</strong>, chọn file PDF bạn muốn ký từ
                  máy tính.
                </p>
              </div>
            </div>

            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h4>Chọn vị trí ký</h4>
                <p>
                  Kéo thả chuột trên PDF để tạo vùng chữ ký. Bạn có thể thêm nhiều vùng ký
                  trên nhiều trang khác nhau.
                </p>
              </div>
            </div>

            <div className="step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h4>Cấu hình và ký</h4>
                <p>
                  Điền thông tin lý do, địa điểm, chọn loại chữ ký cho từng vùng và nhấn
                  <strong> Ký PDF</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="features-list">
          <h2>✨ Tính năng nổi bật</h2>
          <div className="features-row">
            <div className="feature-item">
              <span className="icon">🎨</span>
              <h4>4 loại chữ ký</h4>
              <p>TextOnly, ImageOnly, ImageNameDateComment, ImageAndText</p>
            </div>
            <div className="feature-item">
              <span className="icon">📍</span>
              <h4>Nhiều vị trí</h4>
              <p>Ký nhiều vị trí khác nhau trên cùng một tài liệu</p>
            </div>
            <div className="feature-item">
              <span className="icon">🖱️</span>
              <h4>Kéo thả trực quan</h4>
              <p>Giao diện kéo thả dễ sử dụng để chọn vùng ký</p>
            </div>
            <div className="feature-item">
              <span className="icon">🔒</span>
              <h4>An toàn bảo mật</h4>
              <p>Sử dụng chứng thư số MySign/Viettel-CA</p>
            </div>
          </div>
        </div>
      </div>

      <footer className="footer">
        <p>&copy; 2025 MySign Portal. Powered by MySign/Viettel-CA.</p>
      </footer>
    </div>
  );
}

