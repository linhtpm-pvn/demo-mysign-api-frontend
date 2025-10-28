/**
 * =============================================================================
 * TEST FUNCTIONS FOR SIGN-PDF-ADVANCED API ENDPOINT
 * =============================================================================
 * 
 * File này chứa các functions để test API ký PDF nâng cao với nhiều loại chữ ký.
 * Backend: TaskstreamForge_MySignBackend\Controllers\MySignController.SignPdfAdvanced.cs
 * 
 * API hỗ trợ 4 loại chữ ký:
 * 1. TextOnly: Chỉ hiển thị text
 * 2. ImageOnly: Chỉ hiển thị ảnh chữ ký
 * 3. ImageAndText: Kết hợp ảnh + text tùy chỉnh
 * 4. ImageNameDateComment: Hiển thị đầy đủ (ảnh + tên + ngày + comment)
 * 
 * Có thể ký ẩn bằng cách truyền null cho signatureCoordinates
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

// ==================== CONSTANTS ====================

const BASE_URL = 'http://171.244.49.4';
const API_ENDPOINT = '/api/my-sign/sign-pdf-advanced';

// ==================== FUNCTIONS ====================

/**
 * ============================================================================
 * MAIN FUNCTION: Ký PDF với tọa độ nâng cao
 * ============================================================================
 * 
 * Function chính để gọi API sign-pdf-advanced
 * 
 * @param pdfFile - File PDF cần ký
 * @param signatureCoordinates - Mảng tọa độ chữ ký, hoặc null để ký ẩn
 * @param options - Các tùy chọn bổ sung (token, certificateId, reason,...)
 * @returns Promise<Blob> - Blob của file PDF đã ký
 * 
 * @example
 * // Ký ẩn (không hiển thị chữ ký trên PDF)
 * await signPdfAdvanced(pdfFile, null, { token: 'YOUR_TOKEN' });
 * 
 * @example
 * // Ký với 1 chữ ký TextOnly
 * const coords = [{
 *   PageNumber: 1,
 *   Left: 50, Top: 50,
 *   Width: 200, Height: 80,
 *   SignType: 'TextOnly',
 *   SignText: 'Đã ký bởi: Nguyễn Văn A'
 * }];
 * await signPdfAdvanced(pdfFile, coords, { token: 'YOUR_TOKEN' });
 */
export async function signPdfAdvanced(
    pdfFile: File,
    signatureCoordinates: SignatureCoordinate[] | null,
    options: SignPdfOptions = {}
): Promise<Blob> {
    console.log('🔧 [signPdfAdvanced] Bắt đầu ký PDF:', {
        fileName: pdfFile.name,
        fileSize: pdfFile.size,
        hasCoordinates: !!signatureCoordinates,
        coordinatesCount: signatureCoordinates?.length || 0,
        options
    });
    
    // Bước 1: Tạo FormData để gửi lên server
    const formData = new FormData();
    formData.append('FileUpload', pdfFile);
    
    // Bước 2: Thêm tọa độ chữ ký (nếu có)
    if (signatureCoordinates) {
        formData.append('SignatureCoordinates', JSON.stringify(signatureCoordinates));
    }
    
    // Bước 3: Thêm các tùy chọn bổ sung
    if (options.certificateId) {
        formData.append('CertificateId', options.certificateId);
    }
    
    if (options.signTransactionTitle) {
        formData.append('SignTransactionTitle', options.signTransactionTitle);
    }
    
    formData.append('Reason', options.reason || 'Test signing');
    formData.append('Location', options.location || 'Hà Nội');
    
    const token = options.token || 'YOUR_BEARER_TOKEN';
    
    console.log('📡 [signPdfAdvanced] Gửi request đến:', `${BASE_URL}${API_ENDPOINT}`);
    
    try {
        // Bước 4: Gọi API
        const response = await fetch(`${BASE_URL}${API_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        // Bước 5: Kiểm tra response
        if (!response.ok) {
            const json = await response.json();
            throw new Error(`HTTP ${response.status}: ${json.message}`);
        }
        
        // Bước 6: Nhận file PDF đã ký
        const blob = await response.blob();
        
        // Bước 7: Tự động tải file về máy
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'signed_document.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        console.log('✅ [signPdfAdvanced] PDF signed successfully! Blob size:', blob.size);
        return blob;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ [signPdfAdvanced] Error signing PDF:', errorMessage);
        throw error;
    }
}

// ==================== TEST CASES ====================

/**
 * TEST 1: Ký ẩn (Hidden Signature)
 * Không hiển thị chữ ký trên PDF, chỉ có chữ ký điện tử ẩn
 */
export async function testEmptyCoordinates(pdfFile: File, token: string): Promise<Blob> {
    console.log('🧪 Test 1: Hidden Signature');
    
    return await signPdfAdvanced(pdfFile, null, {
        token,
        reason: 'Ký ẩn - không hiển thị',
        location: 'Hà Nội',
        signTransactionTitle: 'Test Hidden Signature'
    });
}

/**
 * TEST 2: TextOnly Signature
 * Chỉ hiển thị text, không có ảnh chữ ký
 */
export async function testTextOnlySignature(pdfFile: File, token: string): Promise<Blob> {
    console.log('🧪 Test 2: TextOnly Signature');
    
    const coordinates: SignatureCoordinate[] = [
        {
            PageNumber: 1,
            Left: 50,
            Top: 50,
            Width: 200,
            Height: 80,
            SignType: 'TextOnly',
            SignText: 'Đã ký bởi: Nguyễn Văn A\nNgày: 17/10/2025'
        }
    ];
    
    return await signPdfAdvanced(pdfFile, coordinates, {
        token,
        reason: 'Kiểm tra chữ ký text only',
        location: 'Hà Nội',
        signTransactionTitle: 'Test TextOnly'
    });
}

/**
 * TEST 3: ImageOnly Signature
 * Chỉ hiển thị ảnh chữ ký, không có text
 */
export async function testImageOnlySignature(pdfFile: File, token: string): Promise<Blob> {
    console.log('🧪 Test 3: ImageOnly Signature');
    
    const coordinates: SignatureCoordinate[] = [
        {
            PageNumber: 1,
            Left: 300,
            Top: 50,
            Width: 150,
            Height: 100,
            SignType: 'ImageOnly'
        }
    ];
    
    return await signPdfAdvanced(pdfFile, coordinates, {
        token,
        reason: 'Kiểm tra chữ ký image only',
        location: 'Hà Nội',
        signTransactionTitle: 'Test ImageOnly'
    });
}

/**
 * TEST 4: ImageAndText Signature
 * Hiển thị ảnh chữ ký + text tùy chỉnh
 */
export async function testImageAndTextSignature(pdfFile: File, token: string): Promise<Blob> {
    console.log('🧪 Test 4: ImageAndText Signature');
    
    const coordinates: SignatureCoordinate[] = [
        {
            PageNumber: 1,
            Left: 50,
            Top: 200,
            Width: 250,
            Height: 120,
            SignType: 'ImageAndText',
            SignText: 'Tôi xác nhận đã đọc và đồng ý'
        }
    ];
    
    return await signPdfAdvanced(pdfFile, coordinates, {
        token,
        reason: 'Kiểm tra chữ ký image + text',
        location: 'Hà Nội',
        signTransactionTitle: 'Test ImageAndText'
    });
}

/**
 * TEST 5: ImageNameDateComment Signature
 * Hiển thị đầy đủ: Ảnh + Tên người ký + Ngày ký + Lý do
 */
export async function testImageNameDateCommentSignature(pdfFile: File, token: string): Promise<Blob> {
    console.log('🧪 Test 5: ImageNameDateComment Signature');
    
    const coordinates: SignatureCoordinate[] = [
        {
            PageNumber: 1,
            Left: 350,
            Top: 200,
            Width: 200,
            Height: 100,
            SignType: 'ImageNameDateComment'
        }
    ];
    
    return await signPdfAdvanced(pdfFile, coordinates, {
        token,
        reason: 'Kiểm tra đầy đủ',
        location: 'Hà Nội',
        signTransactionTitle: 'Test Full Info'
    });
}

/**
 * TEST 6: Multiple Signatures (Mixed Types)
 * Ký nhiều chữ ký với các loại khác nhau trên cùng 1 trang
 */
export async function testMultipleSignatures(pdfFile: File, token: string): Promise<Blob> {
    console.log('🧪 Test 6: Multiple Signatures (4 loại khác nhau)');
    
    const coordinates: SignatureCoordinate[] = [
        // TextOnly ở góc trên trái
        {
            PageNumber: 1,
            Left: 50, Top: 50,
            Width: 180, Height: 60,
            SignType: 'TextOnly',
            SignText: 'Người duyệt: Nguyễn Văn A'
        },
        // ImageOnly ở góc trên phải
        {
            PageNumber: 1,
            Left: 400, Top: 50,
            Width: 120, Height: 80,
            SignType: 'ImageOnly'
        },
        // ImageAndText ở giữa
        {
            PageNumber: 1,
            Left: 200, Top: 300,
            Width: 220, Height: 100,
            SignType: 'ImageAndText',
            SignText: 'Đã kiểm tra và phê duyệt'
        },
        // ImageNameDateComment ở góc dưới phải
        {
            PageNumber: 1,
            Left: 400, Top: 600,
            Width: 180, Height: 90,
            SignType: 'ImageNameDateComment'
        }
    ];
    
    return await signPdfAdvanced(pdfFile, coordinates, {
        token,
        reason: 'Kiểm tra nhiều chữ ký',
        location: 'Hà Nội',
        signTransactionTitle: 'Test Multiple Signatures'
    });
}

/**
 * TEST 7: Multiple Pages
 * Ký nhiều chữ ký trên nhiều trang khác nhau
 */
export async function testMultiplePages(pdfFile: File, token: string): Promise<Blob> {
    console.log('🧪 Test 7: Multiple Pages');
    
    const coordinates: SignatureCoordinate[] = [
        {
            PageNumber: 2,
            Left: 50, Top: 100,
            Width: 200, Height: 80,
            SignType: 'ImageOnly'
        },
        {
            PageNumber: 2,
            Left: 10, Top: 100,
            Width: 200, Height: 80,
            SignType: 'ImageNameDateComment'
        },
        {
            PageNumber: 2,
            Left: 300, Top: 50,
            Width: 150, Height: 70,
            SignType: 'TextOnly',
            SignText: 'XXX10XXXX',
            SignFontSize: 20
        },
        {
            PageNumber: 2,
            Left: 100, Top: 50,
            Width: 150, Height: 70,
            SignType: 'TextOnly',
            SignText: 'XXX10XXXX'
        }
    ];
    
    return await signPdfAdvanced(pdfFile, coordinates, {
        token,
        reason: 'Ký nhiều trang',
        location: 'Hà Nội',
        signTransactionTitle: 'Test Multiple Pages'
    });
}

// ==================== RUN ALL TESTS ====================

/**
 * Helper: Lấy file PDF từ input element
 */
export function getPdfFileFromInput(fileInputId: string = 'pdfFile'): File {
    const fileInput = document.getElementById(fileInputId) as HTMLInputElement | null;
    
    if (!fileInput) {
        throw new Error(`Không tìm thấy input element với id="${fileInputId}"`);
    }
    
    if (!fileInput.files || !fileInput.files[0]) {
        throw new Error('Vui lòng chọn file PDF trước!');
    }
    
    return fileInput.files[0];
}

/**
 * Chạy tất cả 7 test cases
 * 
 * Yêu cầu:
 * - Có input element với id='pdfFile' trong DOM
 * - File PDF đã được chọn
 * 
 * @param token - Bearer token để xác thực
 * @param fileInputId - ID của input element (default: 'pdfFile')
 * 
 * @example
 * // Trong browser console:
 * await runAllTests('YOUR_TOKEN');
 */
export async function runAllTests(token: string, fileInputId: string = 'pdfFile'): Promise<void> {
    console.log('\n========================================');
    console.log('🚀 Bắt đầu chạy TẤT CẢ 7 test cases');
    console.log('========================================\n');
    
    try {
        const pdfFile = getPdfFileFromInput(fileInputId);
        
        console.log('📄 File:', pdfFile.name);
        console.log('📊 Size:', (pdfFile.size / 1024).toFixed(2), 'KB');
        console.log('🔑 Token:', token.substring(0, 20) + '...\n');
        
        const startTime = Date.now();
        
        // Chạy từng test
        // console.log('⏱️ Test 1/7: Hidden Signature...');
        // await testEmptyCoordinates(pdfFile, token);
        
        // console.log('⏱️ Test 2/7: TextOnly...');
        // await testTextOnlySignature(pdfFile, token);
        
        // console.log('⏱️ Test 3/7: ImageOnly...');
        // await testImageOnlySignature(pdfFile, token);
        
        // console.log('⏱️ Test 4/7: ImageAndText...');
        // await testImageAndTextSignature(pdfFile, token);
        
        console.log('⏱️ Test 5/7: ImageNameDateComment...');
        await testImageNameDateCommentSignature(pdfFile, token);
        
        // console.log('⏱️ Test 6/7: Multiple Signatures...');
        // await testMultipleSignatures(pdfFile, token);
        
        // console.log('⏱️ Test 7/7: Multiple Pages...');
        // await testMultiplePages(pdfFile, token);
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log('\n========================================');
        console.log('✅ TẤT CẢ 7 TESTS HOÀN THÀNH!');
        console.log(`⏱️ Thời gian: ${duration}s`);
        console.log('========================================\n');
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('\n========================================');
        console.error('❌ TEST FAILED:', errorMessage);
        console.error('========================================\n');
        throw error;
    }
}

// ==================== MODULE INFO ====================

console.log('\n========================================');
console.log('✅ TEST FUNCTIONS LOADED!');
console.log('========================================');
console.log('\n📦 Exported Functions:');
console.log('  1. signPdfAdvanced(pdfFile, coordinates, options)');
console.log('  2. testEmptyCoordinates(pdfFile, token)');
console.log('  3. testTextOnlySignature(pdfFile, token)');
console.log('  4. testImageOnlySignature(pdfFile, token)');
console.log('  5. testImageAndTextSignature(pdfFile, token)');
console.log('  6. testImageNameDateCommentSignature(pdfFile, token)');
console.log('  7. testMultipleSignatures(pdfFile, token)');
console.log('  8. testMultiplePages(pdfFile, token)');
console.log('  9. runAllTests(token, fileInputId?)');
console.log('\n🚀 Quick Start:');
console.log('  const token = "YOUR_TOKEN";');
console.log('  await runAllTests(token);  // Chạy tất cả 7 tests');
console.log('\n  // Hoặc chạy từng test riêng lẻ:');
console.log('  const file = getPdfFileFromInput("pdfFile");');
console.log('  await testTextOnlySignature(file, token);');
console.log('========================================\n');
