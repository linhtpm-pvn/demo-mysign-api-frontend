import { useState } from "react";
import type { JSX } from "react";
import { runAllTests } from "./test-sign-pdf-advanced.ts";
import { runAllSessionTests, quickSessionTest } from "./test-sign-pdf-session.ts";

// ==================== TYPES ====================

interface SignatureImageInput {
    id: string;
    type: 'file' | 'url';
    // For file type:
    file?: File;
    base64Url?: string;
    // For url type:
    url?: string;
    authType?: 'None' | 'Bearer';
    authToken?: string;
}

// ==================== MAIN COMPONENT ====================

export function Home(): JSX.Element {
    // State for signature images
    const [signatureImages, setSignatureImages] = useState<SignatureImageInput[]>([]);
    const [sessionSignatureImages, setSessionSignatureImages] = useState<SignatureImageInput[]>([]);

    // ==================== HELPERS ====================

    function getInputValue(id: string): string {
        const input = document.getElementById(id) as HTMLInputElement;
        return input?.value?.trim() || '';
    }

    async function fileToBase64DataUrl(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // ==================== SIGNATURE IMAGE MANAGEMENT ====================

    function addSignatureImage(isSession: boolean = false) {
        const newImage: SignatureImageInput = {
            id: Date.now().toString(),
            type: 'file'
        };

        if (isSession) {
            setSessionSignatureImages([...sessionSignatureImages, newImage]);
        } else {
            setSignatureImages([...signatureImages, newImage]);
        }
    }

    function removeSignatureImage(id: string, isSession: boolean = false) {
        if (isSession) {
            setSessionSignatureImages(sessionSignatureImages.filter(img => img.id !== id));
        } else {
            setSignatureImages(signatureImages.filter(img => img.id !== id));
        }
    }

    function updateSignatureImage(id: string, updates: Partial<SignatureImageInput>, isSession: boolean = false) {
        const updateList = (images: SignatureImageInput[]) =>
            images.map(img => img.id === id ? { ...img, ...updates } : img);

        if (isSession) {
            setSessionSignatureImages(updateList(sessionSignatureImages));
        } else {
            setSignatureImages(updateList(signatureImages));
        }
    }

    async function handleFileChange(id: string, file: File | null, isSession: boolean = false) {
        if (!file) return;

        try {
            const base64Url = await fileToBase64DataUrl(file);
            updateSignatureImage(id, { file, base64Url }, isSession);
        } catch (error) {
            console.error('Error converting file to base64:', error);
            alert('Lỗi khi convert file sang base64!');
        }
    }

    // Convert SignatureImageInput[] to API format
    async function prepareSignatureImagesForAPI(images: SignatureImageInput[]): Promise<Array<{
        SignImageId: string;
        ImageBase64Url?: string;
        ImageUrl?: string;
        ImageUrlAuthType?: 'None' | 'Bearer';
        ImageUrlAuthToken?: string;
    }>> {
        const apiImages = [];
        let index = 1;

        for (const img of images) {
            if (img.type === 'file' && img.base64Url) {
                apiImages.push({
                    SignImageId: `img-${index}`,
                    ImageBase64Url: img.base64Url
                });
                index++;
            } else if (img.type === 'url' && img.url) {
                apiImages.push({
                    SignImageId: `img-${index}`,
                    ImageUrl: img.url,
                    ImageUrlAuthType: img.authType || 'None',
                    ...(img.authType === 'Bearer' && img.authToken ? { ImageUrlAuthToken: img.authToken } : {})
                });
                index++;
            }
        }

        return apiImages;
    }

    // ==================== TEST FUNCTIONS ====================

    async function esignWithImgUpload() {
        try {
            const apiKey = getInputValue('apiKey');
            const mySignUserId = getInputValue('mySignUserId');
            const certificateId = getInputValue('certificateId');

            if (!apiKey || !mySignUserId || !certificateId) {
                alert('Vui lòng điền đầy đủ: API Key, MySign User ID, và Certificate ID');
                return;
            }

            console.log('🚀 Starting advanced PDF signing tests...');
            console.log('🔑 API Key:', apiKey.substring(0, 20) + '...');
            console.log('👤 MySign User ID:', mySignUserId);
            console.log('📜 Certificate ID:', certificateId);

            // Prepare signature images
            const apiImages = await prepareSignatureImagesForAPI(signatureImages);
            console.log('🖼️  Total signature images:', apiImages.length);

            await runAllTests(apiKey, mySignUserId, certificateId, 'pdfFile', apiImages);

            alert('✅ Hoàn thành test ký PDF!');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert('❌ Lỗi ký PDF: ' + errorMessage);
            console.error('Error:', error);
        }
    }

    async function testSessionSigning() {
        try {
            const apiKey = getInputValue('apiKey');
            const mySignUserId = getInputValue('mySignUserId');
            const certificateId = getInputValue('certificateId');

            if (!apiKey || !mySignUserId || !certificateId) {
                alert('Vui lòng điền đầy đủ: API Key, MySign User ID, và Certificate ID');
                return;
            }

            console.log('🚀 Starting session signing tests...');

            const apiImages = await prepareSignatureImagesForAPI(sessionSignatureImages);
            console.log('🖼️  Total signature images:', apiImages.length);

            await runAllSessionTests(apiKey, mySignUserId, certificateId, 'pdfFileSession', apiImages);

            alert('✅ Hoàn thành test ký lưu phiên!');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert('❌ Lỗi ký lưu phiên: ' + errorMessage);
            console.error('Error:', error);
        }
    }

    async function quickTestSessionSigning() {
        try {
            const apiKey = getInputValue('apiKey');
            const mySignUserId = getInputValue('mySignUserId');
            const certificateId = getInputValue('certificateId');

            if (!apiKey || !mySignUserId || !certificateId) {
                alert('Vui lòng điền đầy đủ: API Key, MySign User ID, và Certificate ID');
                return;
            }

            console.log('🚀 Starting quick session test...');

            const apiImages = await prepareSignatureImagesForAPI(sessionSignatureImages);
            console.log('🖼️  Total signature images:', apiImages.length);

            await quickSessionTest(apiKey, mySignUserId, certificateId, 'pdfFileSession', apiImages);

            alert('✅ Hoàn thành quick test ký lưu phiên!');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert('❌ Lỗi quick test ký lưu phiên: ' + errorMessage);
            console.error('Error:', error);
        }
    }

    // ==================== RENDER SIGNATURE IMAGE INPUT ====================

    function renderSignatureImageInput(img: SignatureImageInput, isSession: boolean = false) {
        return (
            <div key={img.id} style={{
                padding: '15px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                marginBottom: '15px',
                backgroundColor: '#fafafa'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <strong style={{ color: '#333' }}>🖼️  Signature Image #{signatureImages.indexOf(img) + 1 || sessionSignatureImages.indexOf(img) + 1}</strong>
                    <button
                        onClick={() => removeSignatureImage(img.id, isSession)}
                        style={{
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            padding: '5px 15px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        ❌ Remove
                    </button>
                </div>

                {/* Type selector */}
                <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontWeight: 'bold', marginRight: '10px' }}>Type:</label>
                    <select
                        value={img.type}
                        onChange={(e) => updateSignatureImage(img.id, { type: e.target.value as 'file' | 'url' }, isSession)}
                        style={{ padding: '5px', fontSize: '14px', marginRight: '10px' }}
                    >
                        <option value="file">📁 Upload File (Base64)</option>
                        <option value="url">🔗 From URL</option>
                    </select>
                </div>

                {/* File upload */}
                {img.type === 'file' && (
                    <div>
                        <input
                            type="file"
                            accept="image/png,image/jpg,image/jpeg"
                            onChange={(e) => handleFileChange(img.id, e.target.files?.[0] || null, isSession)}
                            style={{ fontSize: '14px' }}
                        />
                        {img.base64Url && (
                            <div style={{ marginTop: '5px', color: 'green', fontSize: '13px' }}>
                                ✅ File converted to Base64 ({(img.base64Url.length / 1024).toFixed(2)} KB)
                            </div>
                        )}
                    </div>
                )}

                {/* URL input */}
                {img.type === 'url' && (
                    <div>
                        <input
                            type="text"
                            placeholder="https://example.com/signature.png"
                            value={img.url || ''}
                            onChange={(e) => updateSignatureImage(img.id, { url: e.target.value }, isSession)}
                            style={{ width: '100%', padding: '8px', fontSize: '14px', marginBottom: '10px' }}
                        />

                        <div style={{ marginBottom: '10px' }}>
                            <label style={{ fontSize: '14px', marginRight: '10px' }}>
                                <input
                                    type="radio"
                                    checked={img.authType === 'None' || !img.authType}
                                    onChange={() => updateSignatureImage(img.id, { authType: 'None' }, isSession)}
                                />
                                {' '}None (Public URL)
                            </label>
                            <label style={{ fontSize: '14px' }}>
                                <input
                                    type="radio"
                                    checked={img.authType === 'Bearer'}
                                    onChange={() => updateSignatureImage(img.id, { authType: 'Bearer' }, isSession)}
                                />
                                {' '}Bearer Token
                            </label>
                        </div>

                        {img.authType === 'Bearer' && (
                            <input
                                type="text"
                                placeholder="Bearer token (without 'Bearer ' prefix)"
                                value={img.authToken || ''}
                                onChange={(e) => updateSignatureImage(img.id, { authToken: e.target.value }, isSession)}
                                style={{ width: '100%', padding: '8px', fontSize: '14px' }}
                            />
                        )}
                    </div>
                )}
            </div>
        );
    }

    // ==================== RENDER ====================

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
            <h1 style={{ textAlign: 'center', color: '#333' }}>🔐 MySign API Test Tool (v3.0.0)</h1>
            <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>
                Test các API ký PDF của TaskstreamForge MySign Backend
            </p>

            <hr style={{ margin: '30px 0' }} />

            {/* Configuration Section */}
            <h2>🔧 Cấu hình (v3.0.0)</h2>
            <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="apiKey" style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                        API Key: <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                        type="text"
                        id="apiKey"
                        placeholder="Nhập API Key từ appsettings.json"
                        style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                    <small style={{ color: '#666' }}>Lấy từ appsettings.json → Auth.ApiKey</small>
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="mySignUserId" style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                        MySign User ID: <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                        type="text"
                        id="mySignUserId"
                        placeholder="Nhập MySign User ID (được MySign cấp)"
                        style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                    <small style={{ color: '#666' }}>Mã người dùng MySign/Viettel-CA</small>
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="certificateId" style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                        Certificate ID: <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                        type="text"
                        id="certificateId"
                        placeholder="Nhập Certificate ID"
                        style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                    <small style={{ color: '#666' }}>ID của chứng thư số bạn muốn sử dụng</small>
                </div>
            </div>

            <hr style={{ margin: '30px 0' }} />

            {/* Test Sign PDF Advanced */}
            <h2>📝 Test Ký PDF Thông Thường (sign-pdf-advanced)</h2>
            <div style={{ backgroundColor: '#f0f8ff', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="pdfFile" style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                        File PDF:
                    </label>
                    <input type="file" id="pdfFile" accept=".pdf" style={{ fontSize: '14px' }} />
                </div>

                {/* Signature Images Section */}
                <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ margin: 0 }}>🖼️  Signature Images ({signatureImages.length})</h3>
                        <button
                            onClick={() => addSignatureImage(false)}
                            style={{
                                backgroundColor: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold'
                            }}
                        >
                            ➕ Add Signature Image
                        </button>
                    </div>

                    {signatureImages.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#999', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                            <p>No signature images added yet.</p>
                            <p style={{ fontSize: '13px' }}>Click "Add Signature Image" to add images for signing</p>
                        </div>
                    )}

                    {signatureImages.map(img => renderSignatureImageInput(img, false))}
                </div>

                <button
                    onClick={esignWithImgUpload}
                    style={{
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        padding: '12px 30px',
                        fontSize: '16px',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        width: '100%'
                    }}
                >
                    🚀 Run All Tests
                </button>

                <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#fffacd', borderRadius: '5px' }}>
                    <strong>💡 Thông tin:</strong>
                    <ul style={{ margin: '10px 0', paddingLeft: '20px', fontSize: '14px' }}>
                        <li>Có thể thêm nhiều ảnh chữ ký khác nhau (Base64 hoặc URL)</li>
                        <li>SignImageId sẽ tự động đặt từ img-1, img-2, ..., img-n</li>
                        <li>Tests sẽ sử dụng các ảnh này để ký với các SignType khác nhau</li>
                        <li>Mở Console (F12) để xem log chi tiết</li>
                    </ul>
                    <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #ddd' }} />
                    <strong>📋 Yêu cầu số ảnh cho tests:</strong>
                    <ul style={{ margin: '10px 0', paddingLeft: '20px', fontSize: '14px' }}>
                        <li><strong>Test 1-2:</strong> Không cần ảnh (TextOnly, Hidden)</li>
                        <li><strong>Test 3-5:</strong> Tối thiểu <span style={{ color: '#ff6b00', fontWeight: 'bold' }}>1 ảnh</span></li>
                        <li><strong>Test 6-7:</strong> Tối thiểu <span style={{ color: '#ff0000', fontWeight: 'bold' }}>3 ảnh</span> (Multiple Images, Mixed)</li>
                        <li><strong>Test 8:</strong> Tối thiểu <span style={{ color: '#ff6b00', fontWeight: 'bold' }}>1 ảnh</span></li>
                    </ul>
                    <div style={{ 
                        marginTop: '10px', 
                        padding: '10px', 
                        backgroundColor: signatureImages.length >= 3 ? '#d4edda' : signatureImages.length >= 1 ? '#fff3cd' : '#f8d7da',
                        border: `1px solid ${signatureImages.length >= 3 ? '#c3e6cb' : signatureImages.length >= 1 ? '#ffeaa7' : '#f5c6cb'}`,
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        color: signatureImages.length >= 3 ? '#155724' : signatureImages.length >= 1 ? '#856404' : '#721c24'
                    }}>
                        {signatureImages.length === 0 && '⚠️ Chưa thêm ảnh nào - Chỉ chạy được Test 1-2'}
                        {signatureImages.length === 1 && '⚠️ Có 1 ảnh - Chạy được Test 1-5, 8 (bỏ qua Test 6-7)'}
                        {signatureImages.length === 2 && '⚠️ Có 2 ảnh - Chạy được Test 1-5, 8 (bỏ qua Test 6-7)'}
                        {signatureImages.length >= 3 && `✅ Có ${signatureImages.length} ảnh - Chạy được TẤT CẢ 8 tests!`}
                    </div>
                </div>
            </div>

            <hr style={{ margin: '30px 0' }} />

            {/* Test Session Signing */}
            <h2>🔄 Test Ký Lưu Phiên (Session-based Signing)</h2>
            <div style={{ backgroundColor: '#fff0f5', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
                <div style={{ marginBottom: '15px' }}>
                    <label htmlFor="pdfFileSession" style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
                        File PDF (Multiple):
                    </label>
                    <input type="file" id="pdfFileSession" multiple accept=".pdf" style={{ fontSize: '14px' }} />
                    <small style={{ color: '#666' }}>⚠️ Chọn nhiều file PDF (khuyến nghị 3-5 files)</small>
                </div>

                {/* Signature Images Section for Session */}
                <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ margin: 0 }}>🖼️  Signature Images ({sessionSignatureImages.length})</h3>
                        <button
                            onClick={() => addSignatureImage(true)}
                            style={{
                                backgroundColor: '#2196F3',
                                color: 'white',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold'
                            }}
                        >
                            ➕ Add Signature Image
                        </button>
                    </div>

                    {sessionSignatureImages.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#999', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                            <p>No signature images added yet.</p>
                            <p style={{ fontSize: '13px' }}>Click "Add Signature Image" to add images for session signing</p>
                        </div>
                    )}

                    {sessionSignatureImages.map(img => renderSignatureImageInput(img, true))}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <button
                        onClick={quickTestSessionSigning}
                        style={{
                            backgroundColor: '#2196F3',
                            color: 'white',
                            padding: '12px 30px',
                            fontSize: '16px',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            flex: 1
                        }}
                    >
                        ⚡ Quick Test (3 files)
                    </button>

                    <button
                        onClick={testSessionSigning}
                        style={{
                            backgroundColor: '#FF9800',
                            color: 'white',
                            padding: '12px 30px',
                            fontSize: '16px',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            flex: 1
                        }}
                    >
                        🔥 Run All Tests
                    </button>
                </div>

                <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#e8f5e9', borderRadius: '5px' }}>
                    <strong>✨ Ưu điểm:</strong>
                    <ul style={{ margin: '10px 0', paddingLeft: '20px', fontSize: '14px' }}>
                        <li>Chỉ cần xác thực trên điện thoại <strong>1 LẦN DUY NHẤT</strong></li>
                        <li>Các file tiếp theo ký tự động (không cần xác thực lại)</li>
                        <li>Tốc độ nhanh gấp 10-20 lần so với ký thông thường</li>
                    </ul>
                    <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #a5d6a7' }} />
                    <strong>📋 Yêu cầu số ảnh cho session tests:</strong>
                    <ul style={{ margin: '10px 0', paddingLeft: '20px', fontSize: '14px' }}>
                        <li><strong>Quick Test:</strong> Tối thiểu <span style={{ color: '#ff6b00', fontWeight: 'bold' }}>2 ảnh</span></li>
                        <li><strong>Test 1 (Basic):</strong> Tối thiểu <span style={{ color: '#ff6b00', fontWeight: 'bold' }}>2 ảnh</span></li>
                        <li><strong>Test 2 (Advanced):</strong> Tối thiểu <span style={{ color: '#ff0000', fontWeight: 'bold' }}>3 ảnh</span></li>
                    </ul>
                    <div style={{ 
                        marginTop: '10px', 
                        padding: '10px', 
                        backgroundColor: sessionSignatureImages.length >= 3 ? '#d4edda' : sessionSignatureImages.length >= 2 ? '#fff3cd' : '#f8d7da',
                        border: `1px solid ${sessionSignatureImages.length >= 3 ? '#c3e6cb' : sessionSignatureImages.length >= 2 ? '#ffeaa7' : '#f5c6cb'}`,
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        color: sessionSignatureImages.length >= 3 ? '#155724' : sessionSignatureImages.length >= 2 ? '#856404' : '#721c24'
                    }}>
                        {sessionSignatureImages.length === 0 && '⚠️ Chưa thêm ảnh nào - Không chạy được test nào!'}
                        {sessionSignatureImages.length === 1 && '⚠️ Có 1 ảnh - Chưa đủ để chạy test (cần ít nhất 2)'}
                        {sessionSignatureImages.length === 2 && '⚠️ Có 2 ảnh - Chạy được Quick Test & Test 1 (bỏ qua Test 2)'}
                        {sessionSignatureImages.length >= 3 && `✅ Có ${sessionSignatureImages.length} ảnh - Chạy được TẤT CẢ tests!`}
                    </div>
                </div>
            </div>
        </div>
    );
}
