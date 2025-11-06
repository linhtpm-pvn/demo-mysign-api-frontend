/**
 * =============================================================================
 * TEST FUNCTIONS FOR SESSION-BASED PDF SIGNING (KÝ LƯU PHIÊN) - Version 3.0.0
 * =============================================================================
 * 
 * File này chứa các functions để test API ký PDF lưu phiên - cho phép ký nhiều
 * tài liệu liên tiếp mà chỉ cần xác thực trên ứng dụng MySign MỘT LẦN DUY NHẤT.
 * 
 * Backend APIs (v3.0.0):
 * - POST /api/my-sign/v3/sign-pdf/start-transaction: Bắt đầu phiên ký
 * - POST /api/my-sign/v3/sign-pdf/continue-transaction: Tiếp tục ký trong phiên
 * 
 * Hỗ trợ NHIỀU ẢNH CHỮ KÝ KHÁC NHAU trong cùng một request.
 */

// ==================== TYPE DEFINITIONS ====================

export type SignType = 'TextOnly' | 'ImageOnly' | 'ImageAndText' | 'ImageNameDateComment';

export interface SignatureImage {
    SignImageId: string;
    ImageBase64Url?: string;
    ImageUrl?: string;
    ImageUrlAuthType?: 'None' | 'Bearer';
    ImageUrlAuthToken?: string;
}

export interface SignatureCoordinate {
    PageNumber: number;
    Left: number;
    Top: number;
    Width: number;
    Height: number;
    SignType: SignType;
    SignImageId?: string;
    SignText?: string;
    SignFontSize?: number;
}

export interface SignPdfOptions {
    apiKey?: string;
    mySignUserId: string;
    certificateId: string;
    reason: string;
    location: string;
    signatureImages?: SignatureImage[];
    signTransactionTitle?: string;
}

export interface StartTransactionOptions extends SignPdfOptions {
    transactionSignatureNumber: number;
}

export interface ContinueTransactionOptions extends SignPdfOptions {
    firstTimeSAD: string;
    durationInMinute?: number;
}

export interface SessionSignResponse {
    blob: Blob;
    sad: string | null;
}

// ==================== CONSTANTS ====================

const BASE_URL = 'http://localhost:5243';
const START_TRANSACTION_ENDPOINT = '/api/my-sign/v3/sign-pdf/start-transaction';
const CONTINUE_TRANSACTION_ENDPOINT = '/api/my-sign/v3/sign-pdf/continue-transaction';

// ==================== CORE FUNCTIONS ====================

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
        signatureImagesCount: options.signatureImages?.length || 0
    });
    
    const formData = new FormData();
    formData.append('FileUpload', pdfFile);
    formData.append('MySignUserId', options.mySignUserId);
    formData.append('CertificateId', options.certificateId);
    formData.append('Reason', options.reason);
    formData.append('Location', options.location);
    formData.append('TransactionSignatureNumber', options.transactionSignatureNumber.toString());
    
    if (options.signatureImages && options.signatureImages.length > 0) {
        formData.append('SignatureImages', JSON.stringify(options.signatureImages));
        console.log('🖼️  [startTransaction] Đã thêm', options.signatureImages.length, 'ảnh chữ ký');
    }
    
    if (signatureCoordinates) {
        formData.append('SignatureCoordinates', JSON.stringify(signatureCoordinates));
        console.log('📍 [startTransaction] Đã thêm', signatureCoordinates.length, 'tọa độ chữ ký');
    }
    
    if (options.signTransactionTitle) {
        formData.append('SignTransactionTitle', options.signTransactionTitle);
    }
    
    const apiKey = options.apiKey || 'YOUR_API_KEY';
    
    console.log('📡 [startTransaction] Gửi request đến:', `${BASE_URL}${START_TRANSACTION_ENDPOINT}`);
    
    try {
        const response = await fetch(`${BASE_URL}${START_TRANSACTION_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'X-Key': apiKey,
                'Accept': 'application/pdf, application/json'
            },
            body: formData
        });
        
        if (!response.ok) {
            try {
                const json = await response.json();
                const errorDetail = JSON.stringify(json, null, 2);
                console.error('❌ [startTransaction] Error response:', errorDetail);
                throw new Error(`HTTP ${response.status}: ${json.message || JSON.stringify(json.errors)}`);
            } catch (parseError) {
                throw new Error(`HTTP ${response.status}: Unknown error`);
            }
        }
        
        const sad = response.headers.get('X-MySign-Transaction-SAD');
        console.log('🔑 [abc]:', Array.from(response.headers.entries()));
        
        console.log('🔑 [startTransaction] SAD Token:', sad);
        
        if (!sad || sad.trim() === '') {
            console.warn('⚠️  [startTransaction] CẢNH BÁO: Không nhận được SAD token!');
        }
        
        const blob = await response.blob();
        
        console.log('✅ [startTransaction] Ký thành công! Blob size:', blob.size);
        console.log('💾 [startTransaction] Lưu SAD để dùng cho các lần ký tiếp theo!');
        
        return {
            blob,
            sad
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ [startTransaction] Error:', errorMessage);
        throw error;
    }
}

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
        usingSAD: options.firstTimeSAD ? options.firstTimeSAD.substring(0, 30) + '...' : 'NULL',
        signatureImagesCount: options.signatureImages?.length || 0
    });
    
    if (!options.firstTimeSAD || options.firstTimeSAD.trim() === '') {
        console.error('❌ [continueTransaction] FirstTimeSAD bị null hoặc rỗng!');
        throw new Error('FirstTimeSAD không hợp lệ!');
    }
    
    console.log('✅ [continueTransaction] FirstTimeSAD hợp lệ, length:', options.firstTimeSAD.length);
    
    const formData = new FormData();
    formData.append('FileUpload', pdfFile);
    formData.append('MySignUserId', options.mySignUserId);
    formData.append('CertificateId', options.certificateId);
    formData.append('Reason', options.reason);
    formData.append('Location', options.location);
    formData.append('FirstTimeSAD', options.firstTimeSAD);
    
    if (options.durationInMinute !== undefined) {
        formData.append('DurationInMinute', options.durationInMinute.toString());
        console.log('⏰ [continueTransaction] Gia hạn phiên:', options.durationInMinute, 'phút');
    }
    
    if (options.signatureImages && options.signatureImages.length > 0) {
        formData.append('SignatureImages', JSON.stringify(options.signatureImages));
        console.log('🖼️  [continueTransaction] Đã thêm', options.signatureImages.length, 'ảnh chữ ký');
    }
    
    if (signatureCoordinates) {
        formData.append('SignatureCoordinates', JSON.stringify(signatureCoordinates));
        console.log('📍 [continueTransaction] Đã thêm', signatureCoordinates.length, 'tọa độ chữ ký');
    }
    
    if (options.signTransactionTitle) {
        formData.append('SignTransactionTitle', options.signTransactionTitle);
    }
    
    const apiKey = options.apiKey || 'YOUR_API_KEY';
    
    console.log('📡 [continueTransaction] Gửi request đến:', `${BASE_URL}${CONTINUE_TRANSACTION_ENDPOINT}`);
    
    try {
        const response = await fetch(`${BASE_URL}${CONTINUE_TRANSACTION_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'X-Key': apiKey,
                'Accept': 'application/pdf, application/json'
            },
            body: formData
        });
        
        if (!response.ok) {
            try {
                const json = await response.json();
                const errorDetail = JSON.stringify(json, null, 2);
                console.error('❌ [continueTransaction] Error response:', errorDetail);
                throw new Error(`HTTP ${response.status}: ${json.message || JSON.stringify(json.errors)}`);
            } catch (parseError) {
                throw new Error(`HTTP ${response.status}: Unknown error`);
            }
        }
        
        const newSad = response.headers.get('X-MySign-Transaction-SAD');
        
        console.log('🔑 [continueTransaction] SAD Token mới:', newSad);
        
        const blob = await response.blob();
        
        console.log('✅ [continueTransaction] Ký thành công KHÔNG CẦN xác thực! Blob size:', blob.size);
        
        return {
            blob,
            sad: newSad
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ [continueTransaction] Error:', errorMessage);
        console.error('💡 Tip: SAD có thể đã hết hạn hoặc hết lượt ký.');
        throw error;
    }
}

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
 * TEST 1: Basic Session - Ký 3 files với nhiều ảnh
 * CẦN TỐI THIỂU: 2 ảnh
 */
export async function testBasicSession(
    pdfFiles: File[],
    apiKey: string,
    mySignUserId: string,
    certificateId: string,
    signatureImages: SignatureImage[]
): Promise<void> {
    console.log('\n🧪 TEST 1: Ký lưu phiên cơ bản với', pdfFiles.length, 'tài liệu');
    console.log('========================================');
    
    if (pdfFiles.length < 3) {
        throw new Error('❌ Cần ít nhất 3 file PDF để test!');
    }
    
    if (signatureImages.length < 2) {
        throw new Error('❌ Test này CẦN TỐI THIỂU 2 ảnh chữ ký khác nhau! Hiện tại chỉ có ' + signatureImages.length + ' ảnh.');
    }
    
    // Tạo coordinates sử dụng 2 ảnh khác nhau
    const coordinates: SignatureCoordinate[] = [
        {
            PageNumber: 1,
            Left: 50,
            Top: 200,
            Width: 180,
            Height: 90,
            SignType: 'ImageNameDateComment',
            SignImageId: signatureImages[0].SignImageId,
            SignFontSize: 12
        },
        {
            PageNumber: 1,
            Left: 300,
            Top: 200,
            Width: 150,
            Height: 80,
            SignType: 'ImageOnly',
            SignImageId: signatureImages[1].SignImageId
        }
    ];
    
    console.log('✅ Sử dụng 2 ảnh khác nhau:', signatureImages[0].SignImageId, signatureImages[1].SignImageId);
    
    // BƯỚC 1: Start transaction với file đầu tiên
    console.log('\n📝 BƯỚC 1/3: Ký tài liệu đầu tiên (CẦN xác thực trên điện thoại)...');
    const result1 = await startTransaction(pdfFiles[0], coordinates, {
        apiKey,
        mySignUserId,
        certificateId,
        transactionSignatureNumber: 10,
        reason: 'Test session signing - Doc 1',
        location: 'Hà Nội',
        signatureImages,
        signTransactionTitle: 'Session Test #1'
    });
    
    downloadBlob(result1.blob, `session_signed_${pdfFiles[0].name}`);
    
    if (!result1.sad) {
        throw new Error('Không nhận được SAD token từ start-transaction!');
    }
    
    // BƯỚC 2: Continue transaction với file thứ 2
    console.log('\n📝 BƯỚC 2/3: Ký tài liệu thứ 2 (KHÔNG cần xác thực)...');
    const result2 = await continueTransaction(pdfFiles[1], coordinates, {
        apiKey,
        mySignUserId,
        certificateId,
        firstTimeSAD: result1.sad,
        reason: 'Test session signing - Doc 2',
        location: 'Hà Nội',
        signatureImages,
        signTransactionTitle: 'Session Test #2'
    });
    
    downloadBlob(result2.blob, `session_signed_${pdfFiles[1].name}`);
    
    if (!result2.sad) {
        throw new Error('Không nhận được SAD token mới!');
    }
    
    // BƯỚC 3: Continue transaction với file thứ 3
    console.log('\n📝 BƯỚC 3/3: Ký tài liệu thứ 3 (KHÔNG cần xác thực)...');
    const result3 = await continueTransaction(pdfFiles[2], coordinates, {
        apiKey,
        mySignUserId,
        certificateId,
        firstTimeSAD: result2.sad,
        reason: 'Test session signing - Doc 3',
        location: 'Hà Nội',
        signatureImages,
        signTransactionTitle: 'Session Test #3'
    });
    
    downloadBlob(result3.blob, `session_signed_${pdfFiles[2].name}`);
    
    console.log('\n✅ Test hoàn thành! Đã ký 3 tài liệu với chỉ 1 lần xác thực!');
    console.log('========================================\n');
}

/**
 * TEST 2: Advanced Session - Test với nhiều loại chữ ký và nhiều ảnh
 * CẦN TỐI THIỂU: 3 ảnh
 */
export async function testAdvancedSession(
    pdfFiles: File[],
    apiKey: string,
    mySignUserId: string,
    certificateId: string,
    signatureImages: SignatureImage[]
): Promise<void> {
    console.log('\n🧪 TEST 2: Session nâng cao với nhiều loại chữ ký');
    console.log('========================================');
    
    if (pdfFiles.length < 3) {
        throw new Error('❌ Cần ít nhất 3 file PDF!');
    }
    
    if (signatureImages.length < 3) {
        throw new Error('❌ Test này CẦN TỐI THIỂU 3 ảnh chữ ký khác nhau! Hiện tại chỉ có ' + signatureImages.length + ' ảnh.');
    }
    
    // File 1: Mix các loại chữ ký với 2 ảnh khác nhau
    const coords1: SignatureCoordinate[] = [
        {
            PageNumber: 1,
            Left: 50,
            Top: 50,
            Width: 200,
            Height: 60,
            SignType: 'TextOnly',
            SignText: 'Số: 001/HD',
            SignFontSize: 14
        },
        {
            PageNumber: 1,
            Left: 50,
            Top: 150,
            Width: 150,
            Height: 80,
            SignType: 'ImageOnly',
            SignImageId: signatureImages[0].SignImageId  // Ảnh 1
        },
        {
            PageNumber: 1,
            Left: 250,
            Top: 150,
            Width: 200,
            Height: 100,
            SignType: 'ImageAndText',
            SignImageId: signatureImages[1].SignImageId,  // Ảnh 2
            SignText: 'Giám đốc',
            SignFontSize: 12
        }
    ];
    
    // File 2: Nhiều chữ ký cùng loại nhưng mỗi cái dùng 1 ảnh khác nhau
    const coords2: SignatureCoordinate[] = [
        {
            PageNumber: 1,
            Left: 50,
            Top: 300,
            Width: 150,
            Height: 90,
            SignType: 'ImageNameDateComment',
            SignImageId: signatureImages[0].SignImageId,  // Ảnh 1
            SignFontSize: 10
        },
        {
            PageNumber: 1,
            Left: 220,
            Top: 300,
            Width: 150,
            Height: 90,
            SignType: 'ImageNameDateComment',
            SignImageId: signatureImages[1].SignImageId,  // Ảnh 2
            SignFontSize: 10
        },
        {
            PageNumber: 1,
            Left: 390,
            Top: 300,
            Width: 150,
            Height: 90,
            SignType: 'ImageNameDateComment',
            SignImageId: signatureImages[2].SignImageId,  // Ảnh 3
            SignFontSize: 10
        }
    ];
    
    // File 3: Ký nhiều trang với 2 ảnh khác nhau
    const coords3: SignatureCoordinate[] = [
        {
            PageNumber: 1,
            Left: 400,
            Top: 50,
            Width: 180,
            Height: 90,
            SignType: 'ImageNameDateComment',
            SignImageId: signatureImages[0].SignImageId,  // Ảnh 1
            SignFontSize: 11
        },
        {
            PageNumber: 2,
            Left: 50,
            Top: 700,
            Width: 180,
            Height: 90,
            SignType: 'ImageNameDateComment',
            SignImageId: signatureImages[1].SignImageId,  // Ảnh 2
            SignFontSize: 11
        }
    ];
    
    console.log('✅ File 1: Sử dụng ảnh', signatureImages[0].SignImageId, 'và', signatureImages[1].SignImageId);
    console.log('✅ File 2: Sử dụng 3 ảnh khác nhau:', 
        signatureImages[0].SignImageId, 
        signatureImages[1].SignImageId, 
        signatureImages[2].SignImageId
    );
    console.log('✅ File 3: Sử dụng ảnh', signatureImages[0].SignImageId, 'và', signatureImages[1].SignImageId);
    
    // Start transaction
    console.log('\n📝 File 1: Mix các loại chữ ký (CẦN xác thực)...');
    const result1 = await startTransaction(pdfFiles[0], coords1, {
        apiKey,
        mySignUserId,
        certificateId,
        transactionSignatureNumber: 15,
        reason: 'Advanced session test - File 1',
        location: 'Hà Nội',
        signatureImages,
        signTransactionTitle: 'Advanced Session #1'
    });
    
    downloadBlob(result1.blob, `advanced_session_1_${pdfFiles[0].name}`);
    
    if (!result1.sad) {
        throw new Error('Không nhận được SAD token!');
    }
    
    // Continue transaction
    console.log('\n📝 File 2: Nhiều chữ ký cùng loại (KHÔNG cần xác thực)...');
    const result2 = await continueTransaction(pdfFiles[1], coords2, {
        apiKey,
        mySignUserId,
        certificateId,
        firstTimeSAD: result1.sad,
        reason: 'Advanced session test - File 2',
        location: 'Hà Nội',
        signatureImages,
        signTransactionTitle: 'Advanced Session #2'
    });
    
    downloadBlob(result2.blob, `advanced_session_2_${pdfFiles[1].name}`);
    
    if (!result2.sad) {
        throw new Error('Không nhận được SAD token mới!');
    }
    
    // Continue transaction
    console.log('\n📝 File 3: Ký nhiều trang (KHÔNG cần xác thực)...');
    const result3 = await continueTransaction(pdfFiles[2], coords3, {
        apiKey,
        mySignUserId,
        certificateId,
        firstTimeSAD: result2.sad,
        reason: 'Advanced session test - File 3',
        location: 'Hà Nội',
        signatureImages,
        signTransactionTitle: 'Advanced Session #3'
    });
    
    downloadBlob(result3.blob, `advanced_session_3_${pdfFiles[2].name}`);
    
    console.log('\n✅ Advanced test hoàn thành! Đã test với', signatureImages.length, 'ảnh và nhiều SignType!');
    console.log('========================================\n');
}

// ==================== HELPER FUNCTIONS ====================

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

// ==================== RUN ALL TESTS ====================

export async function runAllSessionTests(
    apiKey: string,
    mySignUserId: string,
    certificateId: string,
    pdfFileInputId: string = 'pdfFileSession',
    signatureImages: SignatureImage[] = []
): Promise<void> {
    console.log('\n========================================');
    console.log('🚀 Bắt đầu chạy TẤT CẢ test cases cho KÝ LƯU PHIÊN');
    console.log('========================================\n');
    
    try {
        const pdfFiles = getPdfFilesFromInput(pdfFileInputId);
        
        console.log('📄 Số lượng files:', pdfFiles.length);
        console.log('📊 Tổng kích thước:', (pdfFiles.reduce((sum, f) => sum + f.size, 0) / 1024).toFixed(2), 'KB');
        console.log('🔑 API Key:', apiKey.substring(0, 20) + '...');
        console.log('👤 MySign User ID:', mySignUserId);
        console.log('📜 Certificate ID:', certificateId);
        console.log('🖼️  Total Signature Images:', signatureImages.length);
        
        signatureImages.forEach((img, index) => {
            console.log(`  📷 Image ${index + 1}:`, {
                SignImageId: img.SignImageId,
                Type: img.ImageBase64Url ? 'Base64' : 'URL'
            });
        });
        
        if (pdfFiles.length < 3) {
            throw new Error('Cần ít nhất 3 files để test!');
        }
        
        if (signatureImages.length === 0) {
            throw new Error('❌ Cần ít nhất 1 ảnh chữ ký để test session!');
        }
        
        const startTime = Date.now();
        
        // Test 1: Basic Session (cần 2 ảnh)
        if (signatureImages.length >= 2) {
            console.log('\n⏱️  Test 1/2: Basic Session (cần 2 ảnh)...');
            await testBasicSession(pdfFiles, apiKey, mySignUserId, certificateId, signatureImages);
        } else {
            console.log('\n⏭️  Bỏ qua Test 1: Basic Session (cần 2 ảnh, hiện có ' + signatureImages.length + ' ảnh)');
        }
        
        // Test 2: Advanced Session (cần 3 ảnh)
        if (signatureImages.length >= 3) {
            console.log('\n⏱️  Test 2/2: Advanced Session (cần 3 ảnh)...');
            await testAdvancedSession(pdfFiles, apiKey, mySignUserId, certificateId, signatureImages);
        } else {
            console.log('\n⏭️  Bỏ qua Test 2: Advanced Session (cần 3 ảnh, hiện có ' + signatureImages.length + ' ảnh)');
        }
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log('\n========================================');
        console.log('✅ TESTS HOÀN THÀNH!');
        console.log(`⏱️  Tổng thời gian: ${duration}s`);
        console.log(`📦 Đã test với ${signatureImages.length} ảnh chữ ký`);
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

export async function quickSessionTest(
    apiKey: string,
    mySignUserId: string,
    certificateId: string,
    pdfFileInputId: string = 'pdfFileSession',
    signatureImages: SignatureImage[] = []
): Promise<void> {
    console.log('\n========================================');
    console.log('🚀 QUICK TEST: Ký lưu phiên cơ bản (3 files) - v3.0.0');
    console.log('========================================\n');
    
    const pdfFiles = getPdfFilesFromInput(pdfFileInputId);
    
    if (pdfFiles.length < 3) {
        throw new Error('❌ Quick test cần ít nhất 3 file PDF!');
    }
    
    if (signatureImages.length < 2) {
        throw new Error('❌ Quick test CẦN TỐI THIỂU 2 ảnh chữ ký khác nhau! Hiện tại chỉ có ' + signatureImages.length + ' ảnh.');
    }
    
    console.log('🖼️  Using', signatureImages.length, 'signature images');
    
    await testBasicSession(pdfFiles, apiKey, mySignUserId, certificateId, signatureImages);
}

// ==================== MODULE INFO ====================

console.log('\n========================================');
console.log('✅ SESSION-BASED PDF SIGNING TEST FUNCTIONS LOADED (v3.0.0)!');
console.log('========================================');
console.log('\n📦 Exported Core Functions:');
console.log('  1. startTransaction() - Bắt đầu phiên ký');
console.log('  2. continueTransaction() - Tiếp tục ký trong phiên');
console.log('  3. downloadBlob() - Download file đã ký');
console.log('\n📦 Exported Test Functions:');
console.log('  1. testBasicSession() - Test cơ bản 3 files');
console.log('  2. testAdvancedSession() - Test nâng cao với nhiều SignType');
console.log('  3. runAllSessionTests() - Chạy tất cả tests');
console.log('  4. quickSessionTest() - Quick test');
console.log('\n📦 Exported Helper Functions:');
console.log('  1. getPdfFilesFromInput() - Lấy nhiều files');
console.log('\n💡 Tính năng mới v3.0.0:');
console.log('  - Hỗ trợ nhiều ảnh chữ ký trong session');
console.log('  - SignImageId tự động từ img-1, img-2, ..., img-n');
console.log('  - Mix Base64 và URL trong session');
console.log('  - Test coverage cho tất cả SignType trong session');
console.log('========================================\n');
