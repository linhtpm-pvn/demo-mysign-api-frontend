/**
 * TypeScript functions to test sign-pdf-advanced endpoint
 * Base URL: http://localhost:5000 (adjust as needed)
 * Requires: Bearer token for authorization
 */

// ==================== TYPE DEFINITIONS ====================

/** Các loại chữ ký có thể sử dụng */
export type SignType = 'TextOnly' | 'ImageOnly' | 'ImageAndText' | 'ImageNameDateComment';

/** Tọa độ và thông tin cho một chữ ký */
export interface SignatureCoordinate {
    /** Số trang (bắt đầu từ 1) */
    PageNumber: number;
    /** Tọa độ X từ trái (pixels) */
    Left: number;
    /** Tọa độ Y từ trên (pixels) */
    Top: number;
    /** Chiều rộng của chữ ký (pixels) */
    Width: number;
    /** Chiều cao của chữ ký (pixels) */
    Height: number;
    /** Loại chữ ký */
    SignType: SignType;
    /** Text hiển thị (optional, dùng cho TextOnly và ImageAndText) */
    SignText?: string;
}

/** Tùy chọn cho việc ký PDF */
export interface SignPdfOptions {
    /** Bearer token để xác thực */
    token?: string;
    /** ID của chứng thư số */
    certificateId?: string;
    /** Tiêu đề giao dịch ký */
    signTransactionTitle?: string;
    /** Lý do ký */
    reason?: string;
    /** Địa điểm ký */
    location?: string;
}

// ==================== CONSTANTS ====================

const BASE_URL = 'http://localhost:5000'; // Adjust this to your API URL
const API_ENDPOINT = '/api/my-sign/sign-pdf-advanced';

// ==================== FUNCTIONS ====================

/**
 * Helper function to create FormData and make request to sign PDF
 * @param pdfFile - File PDF cần ký
 * @param signatureCoordinates - Mảng tọa độ chữ ký hoặc null nếu ký ẩn
 * @param options - Các tùy chọn bổ sung
 * @returns Blob của file PDF đã ký
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
    
    const formData = new FormData();
    formData.append('FileUpload', pdfFile);
    
    if (signatureCoordinates) {
        formData.append('SignatureCoordinates', JSON.stringify(signatureCoordinates));
    }
    
    if (options.certificateId) {
        formData.append('CertificateId', options.certificateId);
    }
    
    if (options.signTransactionTitle) {
        formData.append('SignTransactionTitle', options.signTransactionTitle);
    }
    
    formData.append('Reason', options.reason || 'Test signing');
    formData.append('Location', options.location || 'Hà Nội');
    
    const token = options.token || 'YOUR_BEARER_TOKEN'; // Replace with actual token
    
    console.log('📡 [signPdfAdvanced] Gửi request đến:', `${BASE_URL}${API_ENDPOINT}`);
    
    try {
        const response = await fetch(`${BASE_URL}${API_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const json = await response.json();
            throw new Error(`HTTP ${response.status}: ${json.message}`);
        }
        
        // Get the signed PDF as blob
        const blob = await response.blob();
        
        // Download the file
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

/**
 * Test Case 1: Empty coordinates (hidden signature)
 * Ký ẩn - không hiển thị chữ ký trên PDF
 * @param pdfFile - File PDF cần ký
 * @param token - Bearer token để xác thực
 * @returns Blob của file PDF đã ký
 */
export async function testEmptyCoordinates(pdfFile: File, token: string): Promise<Blob> {
    console.log('🧪 [testEmptyCoordinates] Test 1: Empty Coordinates (Hidden Signature)');
    console.log('📋 [testEmptyCoordinates] Tham số:', { fileName: pdfFile.name, hasToken: !!token });
    
    const result = await signPdfAdvanced(pdfFile, null, {
        token,
        reason: 'Ký ẩn - không hiển thị',
        location: 'Hà Nội',
        signTransactionTitle: 'Test Hidden Signature'
    });
    console.log('✅ [testEmptyCoordinates] Hoàn thành!');
    return result;
}

/**
 * Test Case 2: Text Only signature
 * Chỉ có text, không có hình ảnh
 * @param pdfFile - File PDF cần ký
 * @param token - Bearer token để xác thực
 * @returns Blob của file PDF đã ký
 */
export async function testTextOnlySignature(pdfFile: File, token: string): Promise<Blob> {
    console.log('🧪 [testTextOnlySignature] Test 2: TextOnly Signature');
    console.log('📋 [testTextOnlySignature] Tham số:', { fileName: pdfFile.name, hasToken: !!token });
    
    const coordinates: SignatureCoordinate[] = [
        {
            PageNumber: 1,
            Left: 50,
            Top: 50,
            Width: 200,
            Height: 80,
            SignType: 'TextOnly' as const,
            SignText: 'Đã ký bởi: Nguyễn Văn A\nNgày: 17/10/2025'
        }
    ];
    console.log('📍 [testTextOnlySignature] Tọa độ:', coordinates);
    
    const result = await signPdfAdvanced(pdfFile, coordinates, {
        token,
        reason: 'Kiểm tra chữ ký text only',
        location: 'Hà Nội',
        signTransactionTitle: 'Test TextOnly'
    });
    console.log('✅ [testTextOnlySignature] Hoàn thành!');
    return result;
}

/**
 * Test Case 3: Image Only signature
 * Chỉ có hình ảnh chữ ký, không có text
 * @param pdfFile - File PDF cần ký
 * @param token - Bearer token để xác thực
 * @returns Blob của file PDF đã ký
 */
export async function testImageOnlySignature(pdfFile: File, token: string): Promise<Blob> {
    console.log('🧪 [testImageOnlySignature] Test 3: ImageOnly Signature');
    console.log('📋 [testImageOnlySignature] Tham số:', { fileName: pdfFile.name, hasToken: !!token });
    
    const coordinates: SignatureCoordinate[] = [
        {
            PageNumber: 1,
            Left: 300,
            Top: 50,
            Width: 150,
            Height: 100,
            SignType: 'ImageOnly' as const
        }
    ];
    console.log('📍 [testImageOnlySignature] Tọa độ:', coordinates);
    
    const result = await signPdfAdvanced(pdfFile, coordinates, {
        token,
        reason: 'Kiểm tra chữ ký image only',
        location: 'Hà Nội',
        signTransactionTitle: 'Test ImageOnly'
    });
    console.log('✅ [testImageOnlySignature] Hoàn thành!');
    return result;
}

/**
 * Test Case 4: Image and Text signature
 * Có cả hình ảnh và text
 * @param pdfFile - File PDF cần ký
 * @param token - Bearer token để xác thực
 * @returns Blob của file PDF đã ký
 */
export async function testImageAndTextSignature(pdfFile: File, token: string): Promise<Blob> {
    console.log('🧪 [testImageAndTextSignature] Test 4: ImageAndText Signature');
    console.log('📋 [testImageAndTextSignature] Tham số:', { fileName: pdfFile.name, hasToken: !!token });
    
    const coordinates: SignatureCoordinate[] = [
        {
            PageNumber: 1,
            Left: 50,
            Top: 200,
            Width: 250,
            Height: 120,
            SignType: 'ImageAndText' as const,
            SignText: 'Tôi xác nhận đã đọc và đồng ý'
        }
    ];
    console.log('📍 [testImageAndTextSignature] Tọa độ:', coordinates);
    
    const result = await signPdfAdvanced(pdfFile, coordinates, {
        token,
        reason: 'Kiểm tra chữ ký image + text',
        location: 'Hà Nội',
        signTransactionTitle: 'Test ImageAndText'
    });
    console.log('✅ [testImageAndTextSignature] Hoàn thành!');
    return result;
}

/**
 * Test Case 5: Image + Name + Date + Comment signature
 * Hiển thị đầy đủ thông tin: Ảnh + Tên + Ngày + Comment
 * @param pdfFile - File PDF cần ký
 * @param token - Bearer token để xác thực
 * @returns Blob của file PDF đã ký
 */
export async function testImageNameDateCommentSignature(pdfFile: File, token: string): Promise<Blob> {
    console.log('🧪 [testImageNameDateCommentSignature] Test 5: ImageNameDateComment Signature');
    console.log('📋 [testImageNameDateCommentSignature] Tham số:', { fileName: pdfFile.name, hasToken: !!token });
    
    const coordinates: SignatureCoordinate[] = [
        {
            PageNumber: 1,
            Left: 350,
            Top: 200,
            Width: 200,
            Height: 100,
            SignType: 'ImageNameDateComment' as const
        }
    ];
    console.log('📍 [testImageNameDateCommentSignature] Tọa độ:', coordinates);
    
    const result = await signPdfAdvanced(pdfFile, coordinates, {
        token,
        reason: 'Kiểm tra đầy đủ',
        location: 'Hà Nội',
        signTransactionTitle: 'Test Full Info'
    });
    console.log('✅ [testImageNameDateCommentSignature] Hoàn thành!');
    return result;
}

/**
 * Test Case 6: Multiple signatures with different types
 * Nhiều chữ ký với nhiều loại khác nhau trên cùng tài liệu
 * @param pdfFile - File PDF cần ký
 * @param token - Bearer token để xác thực
 * @returns Blob của file PDF đã ký
 */
export async function testMultipleSignatures(pdfFile: File, token: string): Promise<Blob> {
    console.log('🧪 [testMultipleSignatures] Test 6: Multiple Signatures (Mixed Types)');
    console.log('📋 [testMultipleSignatures] Tham số:', { fileName: pdfFile.name, hasToken: !!token });
    
    const coordinates: SignatureCoordinate[] = [
        // TextOnly ở góc trên trái
        {
            PageNumber: 1,
            Left: 50,
            Top: 50,
            Width: 180,
            Height: 60,
            SignType: 'TextOnly' as const,
            SignText: 'Người duyệt: Nguyễn Văn A'
        },
        // ImageOnly ở góc trên phải
        {
            PageNumber: 1,
            Left: 400,
            Top: 50,
            Width: 120,
            Height: 80,
            SignType: 'ImageOnly' as const
        },
        // ImageAndText ở giữa
        {
            PageNumber: 1,
            Left: 200,
            Top: 300,
            Width: 220,
            Height: 100,
            SignType: 'ImageAndText' as const,
            SignText: 'Đã kiểm tra và phê duyệt'
        },
        // ImageNameDateComment ở góc dưới phải
        {
            PageNumber: 1,
            Left: 400,
            Top: 600,
            Width: 180,
            Height: 90,
            SignType: 'ImageNameDateComment' as const
        }
    ];
    console.log('📍 [testMultipleSignatures] Tọa độ (4 chữ ký):', coordinates);
    
    const result = await signPdfAdvanced(pdfFile, coordinates, {
        token,
        reason: 'Kiểm tra nhiều chữ ký',
        location: 'Hà Nội',
        signTransactionTitle: 'Test Multiple Signatures'
    });
    console.log('✅ [testMultipleSignatures] Hoàn thành!');
    return result;
}

/**
 * Test Case 7: Multiple signatures on different pages
 * Nhiều chữ ký trên các trang khác nhau
 * @param pdfFile - File PDF cần ký
 * @param token - Bearer token để xác thực
 * @returns Blob của file PDF đã ký
 */
export async function testMultiplePages(pdfFile: File, token: string): Promise<Blob> {
    console.log('🧪 [testMultiplePages] Test 7: Multiple Pages');
    console.log('📋 [testMultiplePages] Tham số:', { fileName: pdfFile.name, hasToken: !!token });
    
    const coordinates: SignatureCoordinate[] = [
        {
            PageNumber: 1,
            Left: 50,
            Top: 100,
            Width: 200,
            Height: 80,
            SignType: 'ImageOnly' as const,
            SignText: 'Trang 1 - Đã ký'
        },
        {
            PageNumber: 3,
            Left: 50,
            Top: 100,
            Width: 200,
            Height: 80,
            SignType: 'ImageOnly' as const,
            SignText: 'Trang 1 - Đã ký'
        },
        {
            PageNumber: 2,
            Left: 50,
            Top: 100,
            Width: 200,
            Height: 80,
            SignType: 'ImageNameDateComment' as const
        },
        {
            PageNumber: 3,
            Left: 100,
            Top: 50,
            Width: 150,
            Height: 70,
            SignType: 'TextOnly' as const,
            SignText: 'XXX10XXXX'
        },
        {
            PageNumber: 1,
            Left: 100,
            Top: 50,
            Width: 150,
            Height: 70,
            SignType: 'TextOnly' as const,
            SignText: 'XXX10XXXX'
        }
    ];
    console.log('📍 [testMultiplePages] Tọa độ (3 trang):', coordinates);
    
    const result = await signPdfAdvanced(pdfFile, coordinates, {
        token,
        reason: 'Ký nhiều trang',
        location: 'Hà Nội',
        signTransactionTitle: 'Test Multiple Pages'
    });
    console.log('✅ [testMultiplePages] Hoàn thành!');
    return result;
}

/**
 * Chạy tất cả các test case lần lượt
 * Yêu cầu có input element với id='pdfFile' và 'authToken' trong DOM
 * @returns Promise<void>
 * @example
 * // Trong browser console:
 * await runAllTests();
 */
export async function runAllTests(token: string): Promise<void> {
    console.log('\n========================================');
    console.log('🚀 [runAllTests] Bắt đầu chạy tất cả test cases');
    console.log('========================================\n');
    // Get file input element
    const fileInput = document.getElementById('pdfFile') as HTMLInputElement | null;
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        console.error('❌ [runAllTests] Vui lòng chọn file PDF trước!');
        return;
    }
    
    const pdfFile: File = fileInput.files[0];
    
    console.log('📄 [runAllTests] File được chọn:', pdfFile.name);
    console.log('📊 [runAllTests] Kích thước:', (pdfFile.size / 1024).toFixed(2), 'KB');
    console.log('🔑 [runAllTests] Token:', token.substring(0, 20) + '...');
    console.log('');
    
    const startTime = Date.now();
    let passedTests = 0;
    let failedTests = 0;
    
    try {
        // Run each test
        console.log('⏱️ [runAllTests] Test 1/7...');
        await testEmptyCoordinates(pdfFile, token);
        passedTests++;
        console.log('---\n');
        
        console.log('⏱️ [runAllTests] Test 2/7...');
        await testTextOnlySignature(pdfFile, token);
        passedTests++;
        console.log('---\n');
        
        console.log('⏱️ [runAllTests] Test 3/7...');
        await testImageOnlySignature(pdfFile, token);
        passedTests++;
        console.log('---\n');
        
        console.log('⏱️ [runAllTests] Test 4/7...');
        await testImageAndTextSignature(pdfFile, token);
        passedTests++;
        console.log('---\n');
        
        console.log('⏱️ [runAllTests] Test 5/7...');
        await testImageNameDateCommentSignature(pdfFile, token);
        passedTests++;
        console.log('---\n');
        
        console.log('⏱️ [runAllTests] Test 6/7...');
        await testMultipleSignatures(pdfFile, token);
        passedTests++;
        console.log('---\n');
        
        // await testMultiplePages(pdfFile, token); // Uncomment if PDF has multiple pages
        
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        console.log('\n========================================');
        console.log('✅ [runAllTests] Tất cả test cases hoàn thành!');
        console.log(`⏱️ [runAllTests] Thời gian: ${duration}s`);
        console.log(`📊 [runAllTests] Kết quả: ${passedTests} passed, ${failedTests} failed`);
        console.log('========================================\n');
    } catch (error) {
        failedTests++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('\n========================================');
        console.error('❌ [runAllTests] Test failed:', errorMessage);
        console.error('📊 [runAllTests] Kết quả: ', passedTests, 'passed,', failedTests, 'failed');
        console.error('========================================\n');
        throw error;
    }
}

// ==================== MODULE INITIALIZATION ====================

console.log('\n========================================');
console.log('✅ Test functions loaded & exported!');
console.log('========================================');
console.log('\n📦 Exported Functions:');
console.log('  - signPdfAdvanced(pdfFile, coordinates, options)');
console.log('  - testEmptyCoordinates(pdfFile, token)');
console.log('  - testTextOnlySignature(pdfFile, token)');
console.log('  - testImageOnlySignature(pdfFile, token)');
console.log('  - testImageAndTextSignature(pdfFile, token)');
console.log('  - testImageNameDateCommentSignature(pdfFile, token)');
console.log('  - testMultipleSignatures(pdfFile, token)');
console.log('  - testMultiplePages(pdfFile, token)');
console.log('  - runAllTests()');
console.log('\n🚀 Quick start:');
console.log('  await runAllTests()');
console.log('========================================\n');
