/**
 * =============================================================================
 * TEST FUNCTIONS FOR SESSION-BASED PDF SIGNING (KÝ LƯU PHIÊN)
 * =============================================================================
 * 
 * File này chứa các functions để test API ký PDF lưu phiên - cho phép ký nhiều
 * tài liệu liên tiếp mà chỉ cần xác thực trên ứng dụng MySign MỘT LẦN DUY NHẤT.
 * 
 * Backend APIs:
 * - start-transaction: Bắt đầu phiên ký (lần đầu cần xác thực trên điện thoại)
 * - continue-transaction: Tiếp tục ký trong phiên (KHÔNG cần xác thực trên điện thoại)
 * 
 * Kế thừa toàn bộ tính năng từ sign-pdf-advanced:
 * - Hỗ trợ 4 loại chữ ký: TextOnly, ImageOnly, ImageAndText, ImageNameDateComment
 * - Ký nhiều vị trí khác nhau trên cùng tài liệu
 * - Ký trên nhiều trang khác nhau
 */

// ==================== TYPE DEFINITIONS ====================

/** 
 * Các loại chữ ký được hỗ trợ
 * - TextOnly: Chỉ text, không có ảnh
 * - ImageOnly: Chỉ ảnh chữ ký, không có text
 * - ImageAndText: Ảnh + text tùy chỉnh
 * - ImageNameDateComment: Ảnh + tên người ký + ngày ký + lý do
 */
export type SignType = 'TextOnly' | 'ImageOnly' | 'ImageAndText' | 'ImageNameDateComment';

/** 
 * Tọa độ và thông tin cho một chữ ký trên PDF
 * Hệ tọa độ: Gốc (0,0) ở góc TRÊN TRÁI, X tăng sang phải, Y tăng xuống dưới
 */
export interface SignatureCoordinate {
    PageNumber: number;    // Số trang (bắt đầu từ 1)
    Left: number;          // Khoảng cách từ lề trái (pixels)
    Top: number;           // Khoảng cách từ lề trên (pixels)
    Width: number;         // Chiều rộng khung chữ ký (pixels)
    Height: number;        // Chiều cao khung chữ ký (pixels)
    SignType: SignType;    // Loại chữ ký
    SignText?: string;     // Text tùy chỉnh (cho TextOnly và ImageAndText)
    SignFontSize?: number; // Kích thước font chữ (optional)
}

/** Tùy chọn cho việc ký PDF */
export interface SignPdfOptions {
    token?: string;                  // Bearer token để xác thực
    certificateId?: string;          // ID của chứng thư số
    signTransactionTitle?: string;   // Tiêu đề giao dịch ký
    reason?: string;                 // Lý do ký
    location?: string;               // Địa điểm ký
}

/** Tùy chọn riêng cho start-transaction */
export interface StartTransactionOptions extends SignPdfOptions {
    transactionSignatureNumber: number; // Số lượng chữ ký tối đa trong phiên
}

/** Tùy chọn riêng cho continue-transaction */
export interface ContinueTransactionOptions extends SignPdfOptions {
    firstTimeSAD: string;       // Token SAD từ lần ký trước
    durationInMinute?: number;  // Thời gian gia hạn phiên (phút) - tùy chọn
}

/** Response từ start-transaction và continue-transaction */
export interface SessionSignResponse {
    blob: Blob;           // File PDF đã ký
    sad: string | null;   // Token SAD để dùng cho lần ký tiếp theo
    expireDate: string | null; // Thời gian hết hạn của phiên
}

// ==================== CONSTANTS ====================

// const BASE_URL = 'http://171.244.49.4';
const BASE_URL = 'http://localhost:5000';
const START_TRANSACTION_ENDPOINT = '/api/my-sign/sign-pdf/start-transaction';
const CONTINUE_TRANSACTION_ENDPOINT = '/api/my-sign/sign-pdf/continue-transaction';

// ==================== HELPER FOR DEBUGGING ====================

/**
 * Helper: Log FormData contents for debugging
 */
function logFormData(formData: FormData, prefix: string = 'FormData'): void {
    console.log(`📦 [${prefix}] Contents:`);
    // @ts-ignore - FormData.entries() is available in modern browsers
    for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
            console.log(`  ${key}: [File] ${value.name} (${value.size} bytes)`);
        } else {
            const strValue = String(value);
            const displayValue = strValue.length > 100 ? strValue.substring(0, 100) + '...' : strValue;
            console.log(`  ${key}: ${displayValue}`);
        }
    }
}

// ==================== CORE FUNCTIONS ====================

/**
 * ============================================================================
 * FUNCTION 1: Bắt đầu phiên ký (start-transaction)
 * ============================================================================
 * 
 * Ký PDF lần đầu tiên và tạo phiên ký có thời hạn.
 * YÊU CẦU xác thực bằng ứng dụng MySign trên điện thoại.
 * Trả về SAD token để sử dụng cho các lần ký tiếp theo.
 * 
 * @param pdfFile - File PDF cần ký
 * @param signatureCoordinates - Mảng tọa độ chữ ký, hoặc null để ký ẩn
 * @param options - Các tùy chọn bổ sung (bao gồm transactionSignatureNumber)
 * @returns Promise<SessionSignResponse> - Blob của file PDF đã ký + SAD token + expireDate
 * 
 * @example
 * // Bắt đầu phiên ký với tối đa 10 lần ký
 * const result = await startTransaction(pdfFile, coordinates, {
 *   token: 'YOUR_TOKEN',
 *   transactionSignatureNumber: 10,
 *   reason: 'Phê duyệt hợp đồng',
 *   location: 'Hà Nội'
 * });
 * 
 * console.log('SAD Token:', result.sad);
 * console.log('Hết hạn lúc:', result.expireDate);
 */
export async function startTransaction(
    pdfFile: File,
    signatureCoordinates: SignatureCoordinate[] | null,
    options: StartTransactionOptions
): Promise<SessionSignResponse> {
    console.log('🔧 [startTransaction] Bắt đầu phiên ký (lần đầu - cần xác thực trên điện thoại):', {
        fileName: pdfFile.name,
        fileSize: pdfFile.size,
        hasCoordinates: !!signatureCoordinates,
        coordinatesCount: signatureCoordinates?.length || 0,
        transactionSignatureNumber: options.transactionSignatureNumber,
        options
    });
    
    // Bước 1: Tạo FormData
    const formData = new FormData();
    formData.append('FileUpload', pdfFile);
    
    // Bước 2: Thêm tọa độ chữ ký (nếu có)
    if (signatureCoordinates) {
        formData.append('SignatureCoordinates', JSON.stringify(signatureCoordinates));
    }
    
    // Bước 3: Thêm tham số bắt buộc cho start-transaction
    formData.append('TransactionSignatureNumber', options.transactionSignatureNumber.toString());
    
    // Bước 4: Thêm các tùy chọn khác
    if (options.certificateId) {
        formData.append('CertificateId', options.certificateId);
    }
    
    if (options.signTransactionTitle) {
        formData.append('SignTransactionTitle', options.signTransactionTitle);
    }
    
    formData.append('Reason', options.reason || 'Phê duyệt hợp đồng');
    formData.append('Location', options.location || 'Hà Nội');
    
    const token = options.token || 'YOUR_BEARER_TOKEN';
    
    console.log('📡 [startTransaction] Gửi request đến:', `${BASE_URL}${START_TRANSACTION_ENDPOINT}`);
    
    try {
        // Bước 5: Gọi API
        const response = await fetch(`${BASE_URL}${START_TRANSACTION_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        // Bước 6: Kiểm tra response
        if (!response.ok) {
            // Clone response để có thể đọc nhiều lần nếu cần
            const responseClone = response.clone();
            
            try {
                const json = await response.json();
                const errorDetail = JSON.stringify(json, null, 2);
                console.error('❌ [startTransaction] Error response from server:', errorDetail);
                
                if (json.errors) {
                    console.error('📋 [startTransaction] Validation errors:', json.errors);
                }
                
                throw new Error(`HTTP ${response.status}: ${json.message || JSON.stringify(json.errors)}`);
            } catch (parseError) {
                // Nếu không parse được JSON, đọc dạng text từ clone
                try {
                    const textError = await responseClone.text();
                    console.error('❌ [startTransaction] Error response (text):', textError);
                    throw new Error(`HTTP ${response.status}: ${textError}`);
                } catch (textError) {
                    console.error('❌ [startTransaction] Cannot read response body');
                    throw new Error(`HTTP ${response.status}: Unknown error`);
                }
            }
        }
        
        // Bước 7: Lấy SAD token và expireDate từ response headers
        const sad = response.headers.get('X-MySign-Transaction-SAD');
        const expireDate = response.headers.get('X-MySign-Transaction-ExpireDate');
        
        console.log('🔑 [startTransaction] SAD Token nhận được:', sad);
        console.log('⏰ [startTransaction] Hết hạn lúc:', expireDate);
        
        // Debug: Log tất cả response headers
        console.log('📋 [startTransaction] All response headers:');
        response.headers.forEach((value, key) => {
            console.log(`  ${key}: ${value}`);
        });
        
        // Kiểm tra SAD có hợp lệ không
        if (!sad || sad.trim() === '') {
            console.warn('⚠️ [startTransaction] CẢNH BÁO: Không nhận được SAD token từ response headers!');
            console.warn('⚠️ Kiểm tra xem backend có trả về header "X-MySign-Transaction-SAD" không.');
        } else {
            console.log('✅ [startTransaction] SAD token hợp lệ, length:', sad.length);
        }
        
        // Bước 8: Nhận file PDF đã ký
        const blob = await response.blob();
        
        console.log('✅ [startTransaction] Ký thành công! Blob size:', blob.size);
        console.log('💾 [startTransaction] Lưu SAD để dùng cho các lần ký tiếp theo!');
        
        return {
            blob,
            sad,
            expireDate
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ [startTransaction] Error:', errorMessage);
        throw error;
    }
}

/**
 * ============================================================================
 * FUNCTION 2: Tiếp tục ký trong phiên (continue-transaction)
 * ============================================================================
 * 
 * Ký PDF trong phiên đã được tạo bởi start-transaction.
 * KHÔNG CẦN xác thực bằng ứng dụng MySign trên điện thoại.
 * Sử dụng SAD token từ lần ký trước.
 * 
 * @param pdfFile - File PDF cần ký
 * @param signatureCoordinates - Mảng tọa độ chữ ký, hoặc null để ký ẩn
 * @param options - Các tùy chọn bổ sung (bao gồm firstTimeSAD và durationInMinute tùy chọn)
 * @returns Promise<SessionSignResponse> - Blob của file PDF đã ký + SAD token mới
 * 
 * @example
 * // Tiếp tục ký với SAD từ lần trước
 * const result = await continueTransaction(pdfFile2, coordinates, {
 *   token: 'YOUR_TOKEN',
 *   firstTimeSAD: previousSAD,
 *   reason: 'Phê duyệt hợp đồng',
 *   location: 'Hà Nội'
 * });
 * 
 * // Hoặc gia hạn phiên thêm 60 phút:
 * const result = await continueTransaction(pdfFile2, coordinates, {
 *   token: 'YOUR_TOKEN',
 *   firstTimeSAD: previousSAD,
 *   durationInMinute: 60,
 *   reason: 'Phê duyệt hợp đồng',
 *   location: 'Hà Nội'
 * });
 * 
 * console.log('Ký thành công mà không cần xác thực trên điện thoại!');
 */
export async function continueTransaction(
    pdfFile: File,
    signatureCoordinates: SignatureCoordinate[] | null,
    options: ContinueTransactionOptions
): Promise<SessionSignResponse> {
    console.log('🔧 [continueTransaction] Tiếp tục ký trong phiên (KHÔNG cần xác thực trên điện thoại):', {
        fileName: pdfFile.name,
        fileSize: pdfFile.size,
        hasCoordinates: !!signatureCoordinates,
        coordinatesCount: signatureCoordinates?.length || 0,
        usingSAD: options.firstTimeSAD ? options.firstTimeSAD.substring(0, 30) + '...' : 'NULL/UNDEFINED',
        fullSAD: options.firstTimeSAD, // Log đầy đủ để debug
        options
    });
    
    // Kiểm tra SAD token trước khi gửi
    if (!options.firstTimeSAD || options.firstTimeSAD.trim() === '') {
        console.error('❌ [continueTransaction] FirstTimeSAD bị null, undefined hoặc rỗng!');
        throw new Error('FirstTimeSAD không hợp lệ! Vui lòng kiểm tra lại SAD token từ lần ký trước.');
    }
    
    console.log('✅ [continueTransaction] FirstTimeSAD hợp lệ, length:', options.firstTimeSAD.length);
    
    // Bước 1: Tạo FormData
    const formData = new FormData();
    formData.append('FileUpload', pdfFile);
    
    // Bước 2: Thêm tọa độ chữ ký (nếu có)
    if (signatureCoordinates) {
        formData.append('SignatureCoordinates', JSON.stringify(signatureCoordinates));
    }
    
    // Bước 3: Thêm SAD token (QUAN TRỌNG!)
    formData.append('FirstTimeSAD', options.firstTimeSAD);
    console.log('📤 [continueTransaction] Đã append FirstTimeSAD vào FormData:', options.firstTimeSAD.substring(0, 50));
    
    // Bước 3.5: Thêm DurationInMinute nếu được cung cấp (để gia hạn phiên)
    if (options.durationInMinute !== undefined) {
        formData.append('DurationInMinute', options.durationInMinute.toString());
        console.log('⏰ [continueTransaction] Gia hạn phiên thêm:', options.durationInMinute, 'phút');
    }
    
    // Bước 4: Thêm các tùy chọn khác
    if (options.certificateId) {
        formData.append('CertificateId', options.certificateId);
    }
    
    if (options.signTransactionTitle) {
        formData.append('SignTransactionTitle', options.signTransactionTitle);
    }
    
    formData.append('Reason', options.reason || 'Phê duyệt hợp đồng');
    formData.append('Location', options.location || 'Hà Nội');
    
    // Debug: Log toàn bộ FormData trước khi gửi
    logFormData(formData, 'continueTransaction');
    
    const token = options.token || 'YOUR_BEARER_TOKEN';
    
    console.log('📡 [continueTransaction] Gửi request đến:', `${BASE_URL}${CONTINUE_TRANSACTION_ENDPOINT}`);
    
    try {
        // Bước 5: Gọi API
        const response = await fetch(`${BASE_URL}${CONTINUE_TRANSACTION_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        // Bước 6: Kiểm tra response
        if (!response.ok) {
            // Clone response để có thể đọc nhiều lần nếu cần
            const responseClone = response.clone();
            
            try {
                const json = await response.json();
                const errorDetail = JSON.stringify(json, null, 2);
                console.error('❌ [continueTransaction] Error response from server:', errorDetail);
                
                // Nếu có validation errors, log chi tiết
                if (json.errors) {
                    console.error('📋 [continueTransaction] Validation errors:', json.errors);
                }
                
                throw new Error(`HTTP ${response.status}: ${json.message || JSON.stringify(json.errors)}`);
            } catch (parseError) {
                // Nếu không parse được JSON, đọc dạng text từ clone
                try {
                    const textError = await responseClone.text();
                    console.error('❌ [continueTransaction] Error response (text):', textError);
                    throw new Error(`HTTP ${response.status}: ${textError}`);
                } catch (textError) {
                    console.error('❌ [continueTransaction] Cannot read response body');
                    throw new Error(`HTTP ${response.status}: Unknown error`);
                }
            }
        }
        
        // Bước 7: Lấy SAD token mới và expireDate
        const newSad = response.headers.get('X-MySign-Transaction-SAD');
        const expireDate = response.headers.get('X-MySign-Transaction-ExpireDate');
        
        console.log('🔑 [continueTransaction] SAD Token mới:', newSad);
        console.log('⏰ [continueTransaction] Hết hạn lúc:', expireDate);
        
        // Bước 8: Nhận file PDF đã ký
        const blob = await response.blob();
        
        console.log('✅ [continueTransaction] Ký thành công mà KHÔNG CẦN xác thực trên điện thoại! Blob size:', blob.size);
        
        return {
            blob,
            sad: newSad,
            expireDate
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ [continueTransaction] Error:', errorMessage);
        console.error('💡 Tip: SAD có thể đã hết hạn hoặc hết lượt ký. Cần bắt đầu phiên mới với startTransaction.');
        throw error;
    }
}

/**
 * ============================================================================
 * HELPER: Download blob to file
 * ============================================================================
 */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    console.log(`📥 Downloaded: ${filename}`);
}

// ==================== TEST CASES ====================

/**
 * TEST 1: Ký lưu phiên cơ bản với 3 tài liệu
 * - Ký tài liệu 1 với start-transaction (cần xác thực trên điện thoại)
 * - Ký tài liệu 2 với continue-transaction (KHÔNG cần xác thực)
 * - Ký tài liệu 3 với continue-transaction (KHÔNG cần xác thực)
 */
export async function testBasicSession(pdfFiles: File[], token: string): Promise<void> {
    console.log('\n🧪 TEST 1: Ký lưu phiên cơ bản với 3 tài liệu');
    console.log('========================================');
    
    if (pdfFiles.length < 3) {
        throw new Error('Cần ít nhất 3 file PDF để test!');
    }
    
    const coordinates: SignatureCoordinate[] = [
        {
            PageNumber: 1,
            Left: 350,
            Top: 200,
            Width: 200,
            Height: 100,
            SignType: 'ImageNameDateComment',
            SignFontSize: 12
        }
    ];
    
    // BƯỚC 1: Start transaction với file đầu tiên
    console.log('\n📝 BƯỚC 1/3: Ký tài liệu đầu tiên (CẦN xác thực trên điện thoại)...');
    const result1 = await startTransaction(pdfFiles[0], coordinates, {
        token,
        transactionSignatureNumber: 5,
        reason: 'Test session signing - Doc 1',
        location: 'Hà Nội',
        signTransactionTitle: 'Test Session #1'
    });
    
    downloadBlob(result1.blob, 'session_signed_doc1.pdf');
    
    if (!result1.sad) {
        throw new Error('Không nhận được SAD token từ start-transaction!');
    }
    
    // BƯỚC 2: Continue transaction với file thứ 2
    console.log('\n📝 BƯỚC 2/3: Ký tài liệu thứ 2 (KHÔNG cần xác thực trên điện thoại)...');
    const result2 = await continueTransaction(pdfFiles[1], coordinates, {
        token,
        firstTimeSAD: result1.sad,
        reason: 'Test session signing - Doc 2',
        location: 'Hà Nội',
        signTransactionTitle: 'Test Session #2'
    });
    
    downloadBlob(result2.blob, 'session_signed_doc2.pdf');
    
    if (!result2.sad) {
        throw new Error('Không nhận được SAD token mới từ continue-transaction!');
    }
    
    // BƯỚC 3: Continue transaction với file thứ 3
    console.log('\n📝 BƯỚC 3/3: Ký tài liệu thứ 3 (KHÔNG cần xác thực trên điện thoại)...');
    const result3 = await continueTransaction(pdfFiles[2], coordinates, {
        token,
        firstTimeSAD: result2.sad,
        reason: 'Test session signing - Doc 3',
        location: 'Hà Nội',
        signTransactionTitle: 'Test Session #3'
    });
    
    downloadBlob(result3.blob, 'session_signed_doc3.pdf');
    
    console.log('\n✅ Test hoàn thành! Đã ký 3 tài liệu với chỉ 1 lần xác thực trên điện thoại!');
    console.log('========================================\n');
}

/**
 * TEST 2: Ký nhiều tài liệu với các loại chữ ký khác nhau
 */
export async function testSessionWithDifferentSignTypes(pdfFiles: File[], token: string): Promise<void> {
    console.log('\n🧪 TEST 2: Ký nhiều tài liệu với các loại chữ ký khác nhau');
    console.log('========================================');
    
    if (pdfFiles.length < 4) {
        throw new Error('Cần ít nhất 4 file PDF để test!');
    }
    
    // File 1: TextOnly
    console.log('\n📝 File 1: TextOnly signature...');
    const coords1: SignatureCoordinate[] = [{
        PageNumber: 1,
        Left: 50, Top: 50,
        Width: 250, Height: 60,
        SignType: 'TextOnly',
        SignText: 'Đã ký bởi: Nguyễn Văn A',
        SignFontSize: 14
    }];
    
    const result1 = await startTransaction(pdfFiles[0], coords1, {
        token,
        transactionSignatureNumber: 10,
        reason: 'Test TextOnly',
        location: 'Hà Nội'
    });
    downloadBlob(result1.blob, 'session_textonly.pdf');
    
    // File 2: ImageOnly
    console.log('\n📝 File 2: ImageOnly signature...');
    const coords2: SignatureCoordinate[] = [{
        PageNumber: 1,
        Left: 300, Top: 50,
        Width: 150, Height: 100,
        SignType: 'ImageOnly'
    }];
    
    const result2 = await continueTransaction(pdfFiles[1], coords2, {
        token,
        firstTimeSAD: result1.sad!,
        reason: 'Test ImageOnly',
        location: 'Hà Nội'
    });
    downloadBlob(result2.blob, 'session_imageonly.pdf');
    
    // File 3: ImageAndText
    console.log('\n📝 File 3: ImageAndText signature...');
    const coords3: SignatureCoordinate[] = [{
        PageNumber: 1,
        Left: 50, Top: 200,
        Width: 250, Height: 120,
        SignType: 'ImageAndText',
        SignText: 'Giám đốc công ty - Đã kiểm tra và phê duyệt',
        SignFontSize: 14
    }];
    
    const result3 = await continueTransaction(pdfFiles[2], coords3, {
        token,
        firstTimeSAD: result2.sad!,
        reason: 'Test ImageAndText',
        location: 'Hà Nội'
    });
    downloadBlob(result3.blob, 'session_imageandtext.pdf');
    
    // File 4: ImageNameDateComment
    console.log('\n📝 File 4: ImageNameDateComment signature...');
    const coords4: SignatureCoordinate[] = [{
        PageNumber: 1,
        Left: 350, Top: 200,
        Width: 200, Height: 100,
        SignType: 'ImageNameDateComment',
        SignFontSize: 12
    }];
    
    const result4 = await continueTransaction(pdfFiles[3], coords4, {
        token,
        firstTimeSAD: result3.sad!,
        reason: 'Test ImageNameDateComment',
        location: 'Hà Nội'
    });
    downloadBlob(result4.blob, 'session_fullinfo.pdf');
    
    console.log('\n✅ Test hoàn thành! Đã ký 4 tài liệu với 4 loại chữ ký khác nhau!');
    console.log('========================================\n');
}

/**
 * TEST 3: Ký nhiều chữ ký trên cùng tài liệu trong phiên
 */
export async function testSessionWithMultipleSignatures(pdfFiles: File[], token: string): Promise<void> {
    console.log('\n🧪 TEST 3: Ký nhiều chữ ký trên cùng tài liệu trong phiên');
    console.log('========================================');
    
    if (pdfFiles.length < 2) {
        throw new Error('Cần ít nhất 2 file PDF để test!');
    }
    
    // File 1: 2 chữ ký
    console.log('\n📝 File 1: 2 chữ ký...');
    const coords1: SignatureCoordinate[] = [
        {
            PageNumber: 1,
            Left: 50, Top: 50,
            Width: 180, Height: 60,
            SignType: 'TextOnly',
            SignText: 'Người duyệt: Nguyễn Văn A'
        },
        {
            PageNumber: 1,
            Left: 400, Top: 50,
            Width: 150, Height: 80,
            SignType: 'ImageOnly'
        }
    ];
    
    const result1 = await startTransaction(pdfFiles[0], coords1, {
        token,
        transactionSignatureNumber: 5,
        reason: 'Test multiple signatures in session',
        location: 'Hà Nội'
    });
    downloadBlob(result1.blob, 'session_multiple1.pdf');
    
    // File 2: 4 chữ ký
    console.log('\n📝 File 2: 4 chữ ký...');
    const coords2: SignatureCoordinate[] = [
        {
            PageNumber: 1,
            Left: 50, Top: 50,
            Width: 180, Height: 60,
            SignType: 'TextOnly',
            SignText: 'Người duyệt 1'
        },
        {
            PageNumber: 1,
            Left: 300, Top: 50,
            Width: 120, Height: 80,
            SignType: 'ImageOnly'
        },
        {
            PageNumber: 1,
            Left: 50, Top: 300,
            Width: 220, Height: 100,
            SignType: 'ImageAndText',
            SignText: 'Đã kiểm tra và phê duyệt'
        },
        {
            PageNumber: 1,
            Left: 350, Top: 300,
            Width: 180, Height: 90,
            SignType: 'ImageNameDateComment'
        }
    ];
    
    const result2 = await continueTransaction(pdfFiles[1], coords2, {
        token,
        firstTimeSAD: result1.sad!,
        reason: 'Test multiple signatures in session',
        location: 'Hà Nội'
    });
    downloadBlob(result2.blob, 'session_multiple2.pdf');
    
    console.log('\n✅ Test hoàn thành! Đã ký 2 tài liệu với nhiều chữ ký trên mỗi tài liệu!');
    console.log('========================================\n');
}

/**
 * TEST 4: Ký ẩn trong phiên
 */
export async function testSessionWithHiddenSignatures(pdfFiles: File[], token: string): Promise<void> {
    console.log('\n🧪 TEST 4: Ký ẩn trong phiên');
    console.log('========================================');
    
    if (pdfFiles.length < 2) {
        throw new Error('Cần ít nhất 2 file PDF để test!');
    }
    
    // File 1: Ký ẩn
    console.log('\n📝 File 1: Hidden signature...');
    const result1 = await startTransaction(pdfFiles[0], null, {
        token,
        transactionSignatureNumber: 5,
        reason: 'Test hidden signature in session',
        location: 'Hà Nội'
    });
    downloadBlob(result1.blob, 'session_hidden1.pdf');
    
    // File 2: Ký ẩn
    console.log('\n📝 File 2: Hidden signature...');
    const result2 = await continueTransaction(pdfFiles[1], null, {
        token,
        firstTimeSAD: result1.sad!,
        reason: 'Test hidden signature in session',
        location: 'Hà Nội'
    });
    downloadBlob(result2.blob, 'session_hidden2.pdf');
    
    console.log('\n✅ Test hoàn thành! Đã ký ẩn 2 tài liệu trong phiên!');
    console.log('========================================\n');
}

/**
 * TEST 5: Stress test - Ký nhiều tài liệu liên tiếp (5-10 files)
 */
export async function testSessionStressTest(pdfFiles: File[], token: string, maxFiles: number = 5): Promise<void> {
    console.log(`\n🧪 TEST 5: Stress test - Ký ${maxFiles} tài liệu liên tiếp`);
    console.log('========================================');
    
    if (pdfFiles.length < maxFiles) {
        throw new Error(`Cần ít nhất ${maxFiles} file PDF để test!`);
    }
    
    const coordinates: SignatureCoordinate[] = [{
        PageNumber: 1,
        Left: 350,
        Top: 200,
        Width: 200,
        Height: 100,
        SignType: 'ImageNameDateComment'
    }];
    
    const startTime = Date.now();
    
    // File đầu tiên
    console.log(`\n📝 [1/${maxFiles}] Ký file đầu tiên (CẦN xác thực)...`);
    let result = await startTransaction(pdfFiles[0], coordinates, {
        token,
        transactionSignatureNumber: maxFiles,
        reason: `Stress test - Document 1/${maxFiles}`,
        location: 'Hà Nội'
    });
    downloadBlob(result.blob, `stress_test_doc1.pdf`);
    
    // Các file tiếp theo
    for (let i = 1; i < maxFiles; i++) {
        console.log(`\n📝 [${i + 1}/${maxFiles}] Ký file thứ ${i + 1} (KHÔNG cần xác thực)...`);
        result = await continueTransaction(pdfFiles[i], coordinates, {
            token,
            firstTimeSAD: result.sad!,
            reason: `Stress test - Document ${i + 1}/${maxFiles}`,
            location: 'Hà Nội'
        });
        downloadBlob(result.blob, `stress_test_doc${i + 1}.pdf`);
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const avgTime = (parseFloat(duration) / maxFiles).toFixed(2);
    
    console.log('\n✅ Stress test hoàn thành!');
    console.log(`⏱️ Tổng thời gian: ${duration}s`);
    console.log(`⏱️ Thời gian trung bình mỗi file: ${avgTime}s`);
    console.log(`📝 Đã ký ${maxFiles} tài liệu với chỉ 1 lần xác thực trên điện thoại!`);
    console.log('========================================\n');
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Helper: Lấy nhiều file PDF từ input element
 */
export function getPdfFilesFromInput(fileInputId: string = 'pdfFile'): File[] {
    const fileInput = document.getElementById(fileInputId) as HTMLInputElement | null;
    
    if (!fileInput) {
        throw new Error(`Không tìm thấy input element với id="${fileInputId}"`);
    }
    
    if (!fileInput.files || fileInput.files.length === 0) {
        throw new Error('Vui lòng chọn ít nhất 1 file PDF trước!');
    }
    
    return Array.from(fileInput.files);
}

/**
 * Helper: Lấy 1 file PDF từ input element
 */
export function getSinglePdfFileFromInput(fileInputId: string = 'pdfFile'): File {
    const files = getPdfFilesFromInput(fileInputId);
    return files[0];
}

// ==================== RUN ALL TESTS ====================

/**
 * Chạy tất cả 5 test cases cho ký lưu phiên
 * 
 * Yêu cầu:
 * - Có input element với id='pdfFile' trong DOM
 * - File PDF đã được chọn (khuyến nghị: chọn nhiều file, ít nhất 5 files)
 * 
 * @param token - Bearer token để xác thực
 * @param fileInputId - ID của input element (default: 'pdfFile')
 * 
 * @example
 * // Trong browser console:
 * await runAllSessionTests('YOUR_TOKEN');
 */
export async function runAllSessionTests(token: string, fileInputId: string = 'pdfFileSession'): Promise<void> {
    console.log('\n========================================');
    console.log('🚀 Bắt đầu chạy TẤT CẢ 5 test cases cho KÝ LƯU PHIÊN');
    console.log('========================================\n');
    
    try {
        const pdfFiles = getPdfFilesFromInput(fileInputId);
        
        console.log('📄 Số lượng files:', pdfFiles.length);
        console.log('📊 Tổng kích thước:', (pdfFiles.reduce((sum, f) => sum + f.size, 0) / 1024).toFixed(2), 'KB');
        console.log('🔑 Token:', token.substring(0, 20) + '...\n');
        
        if (pdfFiles.length < 5) {
            console.warn('⚠️ Cảnh báo: Nên chọn ít nhất 5 files để test đầy đủ. Một số test có thể bị bỏ qua.');
        }
        
        const startTime = Date.now();
        
        // Test 1: Basic session
        if (pdfFiles.length >= 3) {
            console.log('⏱️ Chạy Test 1/5: Basic Session...');
            await testBasicSession(pdfFiles, token);
        } else {
            console.log('⏭️ Bỏ qua Test 1: Không đủ file (cần 3)');
        }
        
        // Test 2: Different sign types
        if (pdfFiles.length >= 4) {
            console.log('⏱️ Chạy Test 2/5: Different Sign Types...');
            await testSessionWithDifferentSignTypes(pdfFiles, token);
        } else {
            console.log('⏭️ Bỏ qua Test 2: Không đủ file (cần 4)');
        }
        
        // Test 3: Multiple signatures
        if (pdfFiles.length >= 2) {
            console.log('⏱️ Chạy Test 3/5: Multiple Signatures...');
            await testSessionWithMultipleSignatures(pdfFiles, token);
        } else {
            console.log('⏭️ Bỏ qua Test 3: Không đủ file (cần 2)');
        }
        
        // Test 4: Hidden signatures
        if (pdfFiles.length >= 2) {
            console.log('⏱️ Chạy Test 4/5: Hidden Signatures...');
            await testSessionWithHiddenSignatures(pdfFiles, token);
        } else {
            console.log('⏭️ Bỏ qua Test 4: Không đủ file (cần 2)');
        }
        
        // Test 5: Stress test
        if (pdfFiles.length >= 5) {
            console.log('⏱️ Chạy Test 5/5: Stress Test...');
            await testSessionStressTest(pdfFiles, token, Math.min(pdfFiles.length, 10));
        } else {
            console.log('⏭️ Bỏ qua Test 5: Không đủ file (cần 5)');
        }
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log('\n========================================');
        console.log('✅ TẤT CẢ TESTS HOÀN THÀNH!');
        console.log(`⏱️ Tổng thời gian: ${duration}s`);
        console.log('🎉 Ký lưu phiên hoạt động hoàn hảo!');
        console.log('========================================\n');
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('\n========================================');
        console.error('❌ TEST FAILED:', errorMessage);
        console.error('========================================\n');
        throw error;
    }
}

/**
 * Quick test - Chỉ test cơ bản với 3 files
 */
export async function quickSessionTest(token: string, fileInputId: string = 'pdfFileSession'): Promise<void> {
    console.log('\n========================================');
    console.log('🚀 QUICK TEST: Ký lưu phiên cơ bản (3 files)');
    console.log('========================================\n');
    
    const pdfFiles = getPdfFilesFromInput(fileInputId);
    
    if (pdfFiles.length < 3) {
        throw new Error('Quick test cần ít nhất 3 file PDF!');
    }
    
    await testBasicSession(pdfFiles, token);
}

// ==================== MODULE INFO ====================

console.log('\n========================================');
console.log('✅ SESSION-BASED PDF SIGNING TEST FUNCTIONS LOADED!');
console.log('========================================');
console.log('\n📦 Exported Core Functions:');
console.log('  1. startTransaction(pdfFile, coordinates, options) - Bắt đầu phiên ký');
console.log('  2. continueTransaction(pdfFile, coordinates, options) - Tiếp tục ký trong phiên');
console.log('  3. downloadBlob(blob, filename) - Download file đã ký');
console.log('\n📦 Exported Test Functions:');
console.log('  1. testBasicSession(pdfFiles, token) - Test cơ bản với 3 files');
console.log('  2. testSessionWithDifferentSignTypes(pdfFiles, token) - Test 4 loại chữ ký');
console.log('  3. testSessionWithMultipleSignatures(pdfFiles, token) - Test nhiều chữ ký');
console.log('  4. testSessionWithHiddenSignatures(pdfFiles, token) - Test ký ẩn');
console.log('  5. testSessionStressTest(pdfFiles, token, maxFiles) - Stress test');
console.log('\n📦 Exported Helper Functions:');
console.log('  1. getPdfFilesFromInput(fileInputId) - Lấy nhiều files từ input');
console.log('  2. getSinglePdfFileFromInput(fileInputId) - Lấy 1 file từ input');
console.log('  3. runAllSessionTests(token, fileInputId) - Chạy tất cả 5 tests');
console.log('  4. quickSessionTest(token, fileInputId) - Quick test với 3 files');
console.log('\n🚀 Quick Start:');
console.log('  const token = "YOUR_TOKEN";');
console.log('  ');
console.log('  // Chạy quick test (cần 3 files):');
console.log('  await quickSessionTest(token);');
console.log('  ');
console.log('  // Hoặc chạy tất cả tests (khuyến nghị 5-10 files):');
console.log('  await runAllSessionTests(token);');
console.log('  ');
console.log('  // Hoặc chạy từng test riêng lẻ:');
console.log('  const files = getPdfFilesFromInput("pdfFile");');
console.log('  await testBasicSession(files, token);');
console.log('\n💡 Tips:');
console.log('  - Chọn nhiều file PDF trong input (multiple files)');
console.log('  - Khuyến nghị chọn 5-10 files để test đầy đủ');
console.log('  - Chỉ cần xác thực trên điện thoại 1 LẦN DUY NHẤT cho file đầu tiên');
console.log('  - Các file tiếp theo sẽ ký tự động mà không cần xác thực!');
console.log('========================================\n');

