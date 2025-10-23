import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../utils/supabase";
import { BACKEND_URL } from "../../utils/constants";
import { Navbar } from "../../components/Navbar/Navbar";
import * as pdfjsLib from "pdfjs-dist";
import "./PDFSigningAdvanced.scss";

// Set worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface Certificate {
  credentialId: string;
  isDefault: boolean;
}

interface SignatureCoordinate {
  id: string;
  PageNumber: number;
  Left: number;
  Top: number;
  Width: number;
  Height: number;
  SignType: "TextOnly" | "ImageOnly" | "ImageNameDateComment" | "ImageAndText";
  SignText?: string;
  SignFontSize: number;
}

interface PageRect {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  signType: "TextOnly" | "ImageOnly" | "ImageNameDateComment" | "ImageAndText";
  signText?: string;
  fontSize: number;
}

export function PDFSigningAdvanced() {
  const navigate = useNavigate();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [rectangles, setRectangles] = useState<PageRect[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [selectedRectId, setSelectedRectId] = useState<string | null>(null);
  
  // Form fields
  const [reason, setReason] = useState("Phê duyệt");
  const [location, setLocation] = useState("Hà Nội");
  const [signTransactionTitle, setSignTransactionTitle] = useState("");
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [selectedCertificateId, setSelectedCertificateId] = useState("");
  const [loading, setLoading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkCertificates();
  }, []);

  useEffect(() => {
    if (pdfDoc && currentPage > 0) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, scale, rectangles]);

  async function checkCertificates() {
    try {
      const token = await supabase.auth.getSession().then(({ data }) => data.session?.access_token);
      if (!token) {
        alert("Vui lòng đăng nhập trước");
        return;
      }

      const res = await fetch(`${BACKEND_URL}/api/my-sign/certificates`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          setCertificates(data.data);
          const defaultCert = data.data.find((cert: Certificate) => cert.isDefault);
          if (defaultCert) {
            setSelectedCertificateId(defaultCert.credentialId);
          } else if (data.data.length === 1) {
            setSelectedCertificateId(data.data[0].credentialId);
          }
        } else {
          alert("Bạn chưa có chứng chỉ nào. Vui lòng thiết lập chứng chỉ trước.");
          navigate("/settings");
        }
      } else {
        alert("Không thể lấy danh sách chứng chỉ. Vui lòng thiết lập tại trang Cài đặt.");
        navigate("/settings");
      }
    } catch (error) {
      console.error("Error checking certificates:", error);
      alert("Lỗi khi kiểm tra chứng chỉ. Vui lòng thử lại.");
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Vui lòng chọn file PDF");
      return;
    }

    setPdfFile(file);
    setSignTransactionTitle(file.name.replace(".pdf", ""));
    
    // Load PDF
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    setPdfDoc(pdf);
    setNumPages(pdf.numPages);
    setCurrentPage(1);
    setRectangles([]);
  }

  async function renderPage(pageNum: number) {
    if (!pdfDoc || !canvasRef.current) return;

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;

    // Draw rectangles for current page
    const pageRects = rectangles.filter((r) => r.pageNumber === pageNum);
    if (context) {
      pageRects.forEach((rect) => {
        context.strokeStyle = rect.id === selectedRectId ? "#ff0000" : "#0066ff";
        context.lineWidth = 2;
        context.strokeRect(rect.x, rect.y, rect.width, rect.height);
        
        // Draw label
        context.fillStyle = rect.id === selectedRectId ? "#ff0000" : "#0066ff";
        context.font = "12px Arial";
        context.fillText(`${rect.signType}`, rect.x, rect.y - 5);
      });
    }
  }

  function handleCanvasMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on existing rectangle
    const clickedRect = rectangles.find(
      (r) =>
        r.pageNumber === currentPage &&
        x >= r.x &&
        x <= r.x + r.width &&
        y >= r.y &&
        y <= r.y + r.height
    );

    if (clickedRect) {
      setSelectedRectId(clickedRect.id);
      return;
    }

    // Start drawing new rectangle
    setIsDrawing(true);
    setStartPoint({ x, y });
    setSelectedRectId(null);
  }

  function handleCanvasMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Render page again to clear previous drawings
    renderPage(currentPage);

    // Draw current rectangle
    const context = canvasRef.current.getContext("2d");
    if (context) {
      context.strokeStyle = "#00ff00";
      context.lineWidth = 2;
      context.setLineDash([5, 5]);
      context.strokeRect(startPoint.x, startPoint.y, x - startPoint.x, y - startPoint.y);
      context.setLineDash([]);
    }
  }

  function handleCanvasMouseUp(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const width = Math.abs(x - startPoint.x);
    const height = Math.abs(y - startPoint.y);

    if (width > 10 && height > 10) {
      const newRect: PageRect = {
        id: Date.now().toString(),
        pageNumber: currentPage,
        x: Math.min(startPoint.x, x),
        y: Math.min(startPoint.y, y),
        width,
        height,
        signType: "ImageNameDateComment",
        fontSize: 12,
      };

      setRectangles([...rectangles, newRect]);
      setSelectedRectId(newRect.id);
    }

    setIsDrawing(false);
  }

  function deleteSelectedRect() {
    if (selectedRectId) {
      setRectangles(rectangles.filter((r) => r.id !== selectedRectId));
      setSelectedRectId(null);
    }
  }

  function updateSelectedRect(updates: Partial<PageRect>) {
    if (!selectedRectId) return;

    setRectangles(
      rectangles.map((r) => (r.id === selectedRectId ? { ...r, ...updates } : r))
    );
  }

  function convertToApiFormat(): SignatureCoordinate[] {
    return rectangles.map((rect) => {
      // Convert canvas coordinates to PDF coordinates
      // PDF coordinates: (0,0) is bottom-left, canvas: (0,0) is top-left
      const pdfHeight = canvasRef.current?.height || 842;
      
      return {
        id: rect.id,
        PageNumber: rect.pageNumber,
        Left: rect.x / scale,
        Top: (pdfHeight - rect.y - rect.height) / scale,
        Width: rect.width / scale,
        Height: rect.height / scale,
        SignType: rect.signType,
        SignText: rect.signText,
        SignFontSize: rect.fontSize,
      };
    });
  }

  async function handleSign() {
    if (!pdfFile) {
      alert("Vui lòng chọn file PDF");
      return;
    }

    if (rectangles.length === 0) {
      alert("Vui lòng thêm ít nhất một vị trí ký");
      return;
    }

    if (!selectedCertificateId) {
      alert("Vui lòng chọn chứng chỉ");
      return;
    }

    try {
      setLoading(true);

      const token = await supabase.auth.getSession().then(({ data }) => data.session?.access_token);
      if (!token) {
        alert("Vui lòng đăng nhập trước");
        return;
      }

      const formData = new FormData();
      formData.append("FileUpload", pdfFile);
      formData.append("Reason", reason);
      formData.append("Location", location);
      formData.append("SignatureCoordinates", JSON.stringify(convertToApiFormat()));
      formData.append("CertificateId", selectedCertificateId);
      
      if (signTransactionTitle) {
        formData.append("SignTransactionTitle", signTransactionTitle);
      }

      const res = await fetch(`${BACKEND_URL}/api/my-sign/sign-pdf-advanced`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/pdf, application/json",
        },
        body: formData,
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `signed_${pdfFile.name}`;
        a.click();
        window.URL.revokeObjectURL(url);
        alert("Ký PDF thành công!");
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || "Lỗi khi ký PDF");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      alert("Lỗi: " + errorMessage);
    } finally {
      setLoading(false);
    }
  }

  const selectedRect = rectangles.find((r) => r.id === selectedRectId);

  return (
    <div className="pdf-signing-advanced">
      <Navbar />
      <div className="pdf-content">
        <div className="pdf-container">
        {!pdfFile ? (
          <div className="upload-area">
            <div className="upload-content">
              <h2>📄 Chọn file PDF để ký</h2>
              <p>Hỗ trợ file PDF, kích thước tối đa 50MB</p>
              <input
                type="file"
                id="pdfFileInput"
                accept="application/pdf"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <label htmlFor="pdfFileInput" className="btn-upload">
                Chọn file PDF
              </label>
            </div>
          </div>
        ) : (
          <div className="pdf-viewer">
            <div className="pdf-controls">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                ◀ Trang trước
              </button>
              <span>
                Trang {currentPage} / {numPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
                disabled={currentPage === numPages}
              >
                Trang sau ▶
              </button>
              <select value={scale} onChange={(e) => setScale(Number(e.target.value))}>
                <option value="1">100%</option>
                <option value="1.5">150%</option>
                <option value="2">200%</option>
              </select>
            </div>

            <div className="canvas-container" ref={containerRef}>
              <canvas
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
              />
            </div>

            <div className="instructions">
              <p>
                💡 <strong>Hướng dẫn:</strong> Nhấp và kéo chuột trên PDF để tạo vùng chữ ký.
                Nhấp vào vùng chữ ký đã tạo để chỉnh sửa.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="sidebar">
        <h3>⚙️ Cài đặt chữ ký</h3>

        <div className="form-group">
          <label>Lý do giao dịch *</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ví dụ: Phê duyệt, Xác nhận..."
          />
        </div>

        <div className="form-group">
          <label>Tiêu đề giao dịch</label>
          <input
            type="text"
            value={signTransactionTitle}
            onChange={(e) => setSignTransactionTitle(e.target.value)}
            placeholder="Tự động từ tên file"
          />
        </div>

        <div className="form-group">
          <label>Vị trí giao dịch *</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ví dụ: Hà Nội"
          />
        </div>

        <div className="form-group">
          <label>Chứng chỉ *</label>
          <select
            value={selectedCertificateId}
            onChange={(e) => setSelectedCertificateId(e.target.value)}
          >
            <option value="">-- Chọn chứng chỉ --</option>
            {certificates.map((cert) => (
              <option key={cert.credentialId} value={cert.credentialId}>
                {cert.credentialId} {cert.isDefault ? "(Mặc định)" : ""}
              </option>
            ))}
          </select>
        </div>

        <hr />

        <h4>📝 Danh sách vùng ký ({rectangles.length})</h4>
        <div className="rectangles-list">
          {rectangles.map((rect) => (
            <div
              key={rect.id}
              className={`rect-item ${rect.id === selectedRectId ? "selected" : ""}`}
              onClick={() => setSelectedRectId(rect.id)}
            >
              <strong>Trang {rect.pageNumber}</strong> - {rect.signType}
            </div>
          ))}
        </div>

        {selectedRect && (
          <div className="selected-rect-editor">
            <h4>✏️ Chỉnh sửa vùng ký</h4>

            <div className="form-group">
              <label>Loại chữ ký</label>
              <select
                value={selectedRect.signType}
                onChange={(e) =>
                  updateSelectedRect({
                    signType: e.target.value as any,
                  })
                }
              >
                <option value="ImageNameDateComment">Ảnh + Tên + Ngày + Lý do</option>
                <option value="ImageOnly">Chỉ ảnh</option>
                <option value="TextOnly">Chỉ văn bản</option>
                <option value="ImageAndText">Ảnh + Văn bản tùy chỉnh</option>
              </select>
            </div>

            {(selectedRect.signType === "TextOnly" ||
              selectedRect.signType === "ImageAndText") && (
              <div className="form-group">
                <label>Văn bản *</label>
                <input
                  type="text"
                  value={selectedRect.signText || ""}
                  onChange={(e) => updateSelectedRect({ signText: e.target.value })}
                  placeholder="Nhập văn bản..."
                />
              </div>
            )}

            <div className="form-group">
              <label>Cỡ chữ</label>
              <input
                type="number"
                value={selectedRect.fontSize}
                onChange={(e) => updateSelectedRect({ fontSize: Number(e.target.value) })}
                min="8"
                max="24"
              />
            </div>

            <button className="btn-delete" onClick={deleteSelectedRect}>
              🗑️ Xóa vùng ký này
            </button>
          </div>
        )}

        <button
          className="btn-sign"
          onClick={handleSign}
          disabled={loading || !pdfFile || rectangles.length === 0}
        >
          {loading ? "Đang ký..." : "✍️ Ký PDF"}
        </button>
      </div>
      </div>
    </div>
  );
}

