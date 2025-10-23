import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase";
import { BACKEND_URL } from "../../utils/constants";
import { Navbar } from "../../components/Navbar/Navbar";
import "./MySignSettings.scss";

interface Certificate {
  credentialId: string;
  isDefault: boolean;
}

export function MySignSettings() {
  const [mySignUserId, setMySignUserId] = useState("");
  const [signatureImage, setSignatureImage] = useState<File | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [defaultCertificateId, setDefaultCertificateId] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentSignatureImageUrl, setCurrentSignatureImageUrl] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    loadUserSettings();
  }, []);
  
  // Cleanup object URLs when component unmounts
  useEffect(() => {
    return () => {
      if (currentSignatureImageUrl) {
        URL.revokeObjectURL(currentSignatureImageUrl);
      }
      if (previewImage) {
        URL.revokeObjectURL(previewImage);
      }
    };
  }, [currentSignatureImageUrl, previewImage]);

  async function loadUserSettings() {
    try {
      const token = await supabase.auth.getSession().then(({ data }) => data.session?.access_token);
      if (!token) return;

      // Load MySign User ID
      try {
        const userIdRes = await fetch(`${BACKEND_URL}/api/my-sign/user-id`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (userIdRes.ok) {
          const userData = await userIdRes.json();
          if (userData.data?.mySignUserId) {
            setMySignUserId(userData.data.mySignUserId);
          }
        }
      } catch (error) {
        console.error("Error loading user ID:", error);
      }

      // Load current signature image from server
      try {
        // Cleanup old URL if exists
        if (currentSignatureImageUrl) {
          URL.revokeObjectURL(currentSignatureImageUrl);
        }
        
        const imageRes = await fetch(`${BACKEND_URL}/api/my-sign/signature-image`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (imageRes.ok) {
          // API returns redirect or image blob
          const blob = await imageRes.blob();
          const imageUrl = URL.createObjectURL(blob);
          setCurrentSignatureImageUrl(imageUrl);
          console.log("✅ Đã load ảnh chữ ký hiện tại từ server");
        } else {
          setCurrentSignatureImageUrl(null);
          console.log("ℹ️ Chưa có ảnh chữ ký trên server");
        }
      } catch (error) {
        console.error("Error loading signature image:", error);
        setCurrentSignatureImageUrl(null);
      }

      // Load certificates
      await loadCertificates();
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  }

  async function loadCertificates() {
    try {
      const token = await supabase.auth.getSession().then(({ data }) => data.session?.access_token);
      if (!token) return;

      const res = await fetch(`${BACKEND_URL}/api/my-sign/certificates`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.data && Array.isArray(data.data)) {
          setCertificates(data.data);
          const defaultCert = data.data.find((cert: Certificate) => cert.isDefault);
          if (defaultCert) {
            setDefaultCertificateId(defaultCert.credentialId);
          }
        }
      } else {
        const errorData = await res.json();
        console.error("Error loading certificates:", errorData.message);
      }
    } catch (error) {
      console.error("Error loading certificates:", error);
    }
  }

  async function handleSaveSettings() {
    try {
      const token = await supabase.auth.getSession().then(({ data }) => data.session?.access_token);
      if (!token) {
        alert("Vui lòng đăng nhập trước");
        return;
      }

      // Reload certificates to check if user has any
      await loadCertificates();

      if (certificates.length === 0) {
        alert("Bạn chưa có chứng chỉ nào. Vui lòng tạo chứng chỉ trên hệ thống MySign hoặc nhập đúng MySign ID.");
        return;
      }

      setLoading(true);

      // Step 1: Update MySign User ID and Signature Image
      if (mySignUserId || signatureImage) {
        const formData = new FormData();
        if (mySignUserId) {
          formData.append("MySignUserId", mySignUserId);
        }
        if (signatureImage) {
          formData.append("SignatureImage", signatureImage);
        }

        const res = await fetch(`${BACKEND_URL}/api/my-sign`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Lỗi khi cập nhật thông tin MySign");
        }

        const result = await res.json();
        alert(result.message || "Thông tin MySign đã được cập nhật thành công");
      }

      // Step 2: Set default certificate if selected
      if (defaultCertificateId) {
        const certFormData = new FormData();
        certFormData.append("certificateId", defaultCertificateId);

        const certRes = await fetch(`${BACKEND_URL}/api/my-sign/set-default-certificate`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: certFormData,
        });

        if (!certRes.ok) {
          const errorData = await certRes.json();
          throw new Error(errorData.message || "Lỗi khi đặt chứng thư mặc định");
        }

        const certResult = await certRes.json();
        alert(certResult.message || "Chứng thư mặc định đã được cập nhật thành công");
      }

      // Reload settings
      await loadUserSettings();
      
      // Reset preview and file input
      setPreviewImage(null);
      setSignatureImage(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      alert("Lỗi: " + errorMessage);
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSignatureImage(file);
      
      // Cleanup old preview if exists
      if (previewImage) {
        URL.revokeObjectURL(previewImage);
      }
      
      // Create preview URL for the selected image
      const imageUrl = URL.createObjectURL(file);
      setPreviewImage(imageUrl);
      console.log("👁️ Preview ảnh mới đã được tạo");
    }
  }

  return (
    <div className="mysign-settings">
      <Navbar />
      <div className="settings-container">
        <h1>Thiết lập MySign</h1>
        <p className="description">
          Cấu hình thông tin MySign ID, ảnh chữ ký và chứng chỉ mặc định
        </p>

        <div className="form-group">
          <label htmlFor="mySignUserId">
            MySign User ID <span className="required">*</span>
          </label>
          <input
            type="text"
            id="mySignUserId"
            value={mySignUserId}
            onChange={(e) => setMySignUserId(e.target.value)}
            placeholder="Nhập MySign User ID của bạn"
          />
          <small>Mã người dùng do hệ thống MySign cấp</small>
        </div>

        <div className="form-group">
          <label htmlFor="signatureImage">
            Ảnh chữ ký <span className="required">*</span>
          </label>
          
          <div className="signature-upload-section">
            <input
              type="file"
              id="signatureImage"
              accept="image/png"
              onChange={handleFileChange}
              className="file-input"
            />
            <label htmlFor="signatureImage" className="file-label">
              <span className="upload-icon">📁</span>
              <span className="upload-text">
                {signatureImage ? signatureImage.name : "Chọn ảnh chữ ký (.png)"}
              </span>
            </label>
          </div>
          
          <small>Định dạng PNG, kích thước khuyến nghị: 400x200 pixels, nền trong suốt</small>
          
          {(currentSignatureImageUrl || previewImage) && (
            <div className="signature-previews">
              {currentSignatureImageUrl && (
                <div className="preview-box">
                  <p className="preview-title">
                    <span className="icon">🖼️</span>
                    <strong>Ảnh chữ ký hiện tại trên server</strong>
                  </p>
                  <div className="preview-image-container">
                    <img 
                      src={currentSignatureImageUrl} 
                      alt="Current signature"
                      onError={() => setCurrentSignatureImageUrl(null)}
                    />
                  </div>
                  <p className="preview-note">Đây là ảnh đang được sử dụng cho các lần ký PDF</p>
                </div>
              )}
              
              {previewImage && (
                <div className="preview-box new-preview">
                  <p className="preview-title">
                    <span className="icon">👁️</span>
                    <strong>Xem trước ảnh mới</strong>
                  </p>
                  <div className="preview-image-container">
                    <img 
                      src={previewImage} 
                      alt="Preview signature"
                    />
                  </div>
                  <p className="preview-note highlight">
                    ⚠️ Nhấn "Lưu thiết lập" để thay thế ảnh hiện tại
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Danh sách chứng chỉ</label>
          <button
            type="button"
            className="btn-secondary"
            onClick={loadCertificates}
            disabled={loading}
          >
            🔄 Tải lại danh sách chứng chỉ
          </button>
          
          {certificates.length === 0 ? (
            <div className="no-certificates">
              <p>Chưa có chứng chỉ nào. Vui lòng kiểm tra MySign ID hoặc tạo chứng chỉ trên hệ thống MySign.</p>
            </div>
          ) : (
            <div className="certificates-list">
              <p>Tìm thấy {certificates.length} chứng chỉ</p>
              {certificates.map((cert) => (
                <div key={cert.credentialId} className="certificate-item">
                  <input
                    type="radio"
                    id={cert.credentialId}
                    name="defaultCertificate"
                    value={cert.credentialId}
                    checked={defaultCertificateId === cert.credentialId}
                    onChange={(e) => setDefaultCertificateId(e.target.value)}
                  />
                  <label htmlFor={cert.credentialId}>
                    {cert.credentialId}
                    {cert.isDefault && <span className="badge">Mặc định</span>}
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="defaultCertificate">
            Chứng chỉ mặc định <span className="required">*</span>
          </label>
          <select
            id="defaultCertificate"
            value={defaultCertificateId}
            onChange={(e) => setDefaultCertificateId(e.target.value)}
            disabled={certificates.length === 0}
          >
            <option value="">-- Chọn chứng chỉ mặc định --</option>
            {certificates.map((cert) => (
              <option key={cert.credentialId} value={cert.credentialId}>
                {cert.credentialId} {cert.isDefault ? "(Hiện tại)" : ""}
              </option>
            ))}
          </select>
          <small>Chứng chỉ này sẽ được sử dụng mặc định cho các lần ký PDF</small>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={handleSaveSettings}
            disabled={loading || certificates.length === 0}
          >
            {loading ? "Đang lưu..." : "💾 Lưu thiết lập"}
          </button>
        </div>

        {certificates.length === 0 && (
          <div className="warning-box">
            <strong>⚠️ Lưu ý:</strong> Bạn cần có ít nhất một chứng chỉ để sử dụng tính năng ký PDF.
            Vui lòng tạo chứng chỉ trên hệ thống MySign hoặc kiểm tra lại MySign ID.
          </div>
        )}
      </div>
    </div>
  );
}

