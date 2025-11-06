/**
 * =============================================================================
 * TEST FUNCTIONS FOR SIGN-PDF-ADVANCED API ENDPOINT (Version 3.0.0)
 * =============================================================================
 * 
 * File này chứa các functions để test API ký PDF nâng cao với nhiều loại chữ ký
 * và hỗ trợ NHIỀU ẢNH CHỮ KÝ KHÁC NHAU trong cùng một request.
 * 
 * Backend: TaskstreamForge_MySignBackend v3.0.0
 * API Endpoint: POST /api/my-sign/v3/sign-pdf-advanced
 * 
 * API hỗ trợ 4 loại chữ ký:
 * 1. TextOnly: Chỉ hiển thị text
 * 2. ImageOnly: Chỉ hiển thị ảnh chữ ký
 * 3. ImageAndText: Kết hợp ảnh + text tùy chỉnh
 * 4. ImageNameDateComment: Hiển thị đầy đủ (ảnh + tên + ngày + comment)
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

// ==================== CONSTANTS ====================

const BASE_URL = 'http://localhost:5243';
const API_ENDPOINT = '/api/my-sign/v3/sign-pdf-advanced';

// ==================== CORE FUNCTION ====================

export async function signPdfAdvanced(
    pdfFile: File,
    signatureCoordinates: SignatureCoordinate[] | null,
    options: SignPdfOptions
): Promise<Blob> {
    console.log('🔧 [signPdfAdvanced] Bắt đầu ký PDF (v3.0.0):', {
        fileName: pdfFile.name,
        fileSize: pdfFile.size,
        hasCoordinates: !!signatureCoordinates,
        coordinatesCount: signatureCoordinates?.length || 0,
        hasSignatureImages: !!options.signatureImages,
        signatureImagesCount: options.signatureImages?.length || 0
    });
    
    const formData = new FormData();
    formData.append('FileUpload', pdfFile);
    formData.append('MySignUserId', options.mySignUserId);
    formData.append('CertificateId', options.certificateId);
    formData.append('Reason', options.reason);
    formData.append('Location', options.location);
    
    if (options.signatureImages && options.signatureImages.length > 0) {
        formData.append('SignatureImages', JSON.stringify(options.signatureImages));
        console.log('🖼️  [signPdfAdvanced] Đã thêm', options.signatureImages.length, 'ảnh chữ ký');
    }
    
    if (signatureCoordinates) {
        formData.append('SignatureCoordinates', JSON.stringify(signatureCoordinates));
        console.log('📍 [signPdfAdvanced] Đã thêm', signatureCoordinates.length, 'tọa độ chữ ký');
    } else {
        console.log('🔒 [signPdfAdvanced] Ký ẩn (không có tọa độ)');
    }
    
    if (options.signTransactionTitle) {
        formData.append('SignTransactionTitle', options.signTransactionTitle);
    }
    
    const apiKey = options.apiKey || 'YOUR_API_KEY';
    
    console.log('📡 [signPdfAdvanced] Gửi request đến:', `${BASE_URL}${API_ENDPOINT}`);
    
    try {
        const response = await fetch(`${BASE_URL}${API_ENDPOINT}`, {
            method: 'POST',
            headers: {
                'X-Key': apiKey,
                'Accept': 'application/pdf, application/json'
            },
            body: formData
        });
        
        if (!response.ok) {
            const json = await response.json();
            throw new Error(`HTTP ${response.status}: ${json.message || JSON.stringify(json)}`);
        }
        
        const blob = await response.blob();
        
        // Auto download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `signed_${pdfFile.name}`;
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
 * TEST 1: Hidden Signature (Ký ẩn)
 */
export async function testHiddenSignature(
    pdfFile: File,
    apiKey: string,
    mySignUserId: string,
    certificateId: string
): Promise<Blob> {
    console.log('\n🧪 TEST 1: Hidden Signature');
    console.log('========================================');
    
    return await signPdfAdvanced(pdfFile, null, {
        apiKey,
        mySignUserId,
        certificateId,
        reason: 'Ký ẩn - Test 1',
        location: 'Hà Nội',
        signTransactionTitle: 'Test 1: Hidden Signature'
    });
}

/**
 * TEST 2: TextOnly - Multiple text signatures
 */
export async function testTextOnlySignatures(
    pdfFile: File,
    apiKey: string,
    mySignUserId: string,
    certificateId: string
): Promise<Blob> {
    console.log('\n🧪 TEST 2: Multiple TextOnly Signatures');
    console.log('========================================');
    
    const coordinates: SignatureCoordinate[] = [
        {
            PageNumber: 1,
            Left: 50,
            Top: 50,
            Width: 200,
            Height: 60,
            SignType: 'TextOnly',
            SignText: 'Số văn bản: PVN-9033',
            SignFontSize: 14
        },
        {
            PageNumber: 1,
            Left: 350,
            Top: 50,
            Width: 200,
            Height: 60,
            SignType: 'TextOnly',
            SignText: 'Ngày 06 tháng 11 năm 2025',
            SignFontSize: 12
        },
        {
            PageNumber: 1,
            Left: 50,
            Top: 150,
            Width: 250,
            Height: 40,
            SignType: 'TextOnly',
            SignText: 'Đã kiểm tra và phê duyệt',
            SignFontSize: 16
        }
    ];
    
    return await signPdfAdvanced(pdfFile, coordinates, {
        apiKey,
        mySignUserId,
        certificateId,
        reason: 'Test TextOnly - Test 2',
        location: 'Hà Nội',
        signTransactionTitle: 'Test 2: Multiple TextOnly'
    });
}

/**
 * TEST 3: ImageOnly - Single image
 */
export async function testImageOnlySignature(
    pdfFile: File,
    apiKey: string,
    mySignUserId: string,
    certificateId: string,
    signatureImages: SignatureImage[]
): Promise<Blob> {
    console.log('\n🧪 TEST 3: ImageOnly Signature');
    console.log('========================================');
    
    if (signatureImages.length === 0) {
        throw new Error('Cần ít nhất 1 ảnh để test ImageOnly!');
    }
    
    const coordinates: SignatureCoordinate[] = [
        {
            PageNumber: 1,
            Left: 300,
            Top: 200,
            Width: 150,
            Height: 100,
            SignType: 'ImageOnly',
            SignImageId: signatureImages[0].SignImageId
        }
    ];
    
    return await signPdfAdvanced(pdfFile, coordinates, {
        apiKey,
        mySignUserId,
        certificateId,
        reason: 'Test ImageOnly - Test 3',
        location: 'Hà Nội',
        signatureImages,
        signTransactionTitle: 'Test 3: ImageOnly'
    });
}

/**
 * TEST 4: ImageAndText - Single image với text
 */
export async function testImageAndTextSignature(
    pdfFile: File,
    apiKey: string,
    mySignUserId: string,
    certificateId: string,
    signatureImages: SignatureImage[]
): Promise<Blob> {
    console.log('\n🧪 TEST 4: ImageAndText Signature');
    console.log('========================================');
    
    if (signatureImages.length === 0) {
        throw new Error('Cần ít nhất 1 ảnh để test ImageAndText!');
    }
    
    const coordinates: SignatureCoordinate[] = [
        {
            PageNumber: 1,
            Left: 50,
            Top: 300,
            Width: 250,
            Height: 120,
            SignType: 'ImageAndText',
            SignImageId: signatureImages[0].SignImageId,
            SignText: 'Tôi xác nhận đã đọc và đồng ý với nội dung trên',
            SignFontSize: 12
        }
    ];
    
    return await signPdfAdvanced(pdfFile, coordinates, {
        apiKey,
        mySignUserId,
        certificateId,
        reason: 'Test ImageAndText - Test 4',
        location: 'Hà Nội',
        signatureImages,
        signTransactionTitle: 'Test 4: ImageAndText'
    });
}

/**
 * TEST 5: ImageNameDateComment - Single image
 */
export async function testImageNameDateCommentSignature(
    pdfFile: File,
    apiKey: string,
    mySignUserId: string,
    certificateId: string,
    signatureImages: SignatureImage[]
): Promise<Blob> {
    console.log('\n🧪 TEST 5: ImageNameDateComment Signature');
    console.log('========================================');
    
    if (signatureImages.length === 0) {
        throw new Error('Cần ít nhất 1 ảnh để test ImageNameDateComment!');
    }
    
    const coordinates: SignatureCoordinate[] = [
        {
            PageNumber: 1,
            Left: 350,
            Top: 400,
            Width: 200,
            Height: 100,
            SignType: 'ImageNameDateComment',
            SignImageId: signatureImages[0].SignImageId,
            SignFontSize: 11
        }
    ];
    
    return await signPdfAdvanced(pdfFile, coordinates, {
        apiKey,
        mySignUserId,
        certificateId,
        reason: 'Test ImageNameDateComment - Test 5',
        location: 'Hà Nội',
        signatureImages,
        signTransactionTitle: 'Test 5: ImageNameDateComment'
    });
}

/**
 * TEST 6: Multiple Images - Sử dụng nhiều ảnh khác nhau
 * CẦN TỐI THIỂU: 3 ảnh
 */
export async function testMultipleImages(
    pdfFile: File,
    apiKey: string,
    mySignUserId: string,
    certificateId: string,
    signatureImages: SignatureImage[]
): Promise<Blob> {
    console.log('\n🧪 TEST 6: Multiple Different Images');
    console.log('========================================');
    
    if (signatureImages.length < 3) {
        throw new Error('❌ Test này CẦN TỐI THIỂU 3 ảnh chữ ký khác nhau! Hiện tại chỉ có ' + signatureImages.length + ' ảnh.');
    }
    
    const coordinates: SignatureCoordinate[] = [
        // Chữ ký 1: ImageOnly với ảnh 1
        {
            PageNumber: 1,
            Left: 50,
            Top: 500,
            Width: 120,
            Height: 80,
            SignType: 'ImageOnly',
            SignImageId: signatureImages[0].SignImageId
        },
        // Chữ ký 2: ImageNameDateComment với ảnh 2
        {
            PageNumber: 1,
            Left: 200,
            Top: 500,
            Width: 180,
            Height: 90,
            SignType: 'ImageNameDateComment',
            SignImageId: signatureImages[1].SignImageId,
            SignFontSize: 10
        },
        // Chữ ký 3: ImageAndText với ảnh 3
        {
            PageNumber: 1,
            Left: 400,
            Top: 500,
            Width: 150,
            Height: 90,
            SignType: 'ImageAndText',
            SignImageId: signatureImages[2].SignImageId,
            SignText: 'Giám đốc',
            SignFontSize: 11
        }
    ];
    
    console.log('✅ Sử dụng 3 ảnh khác nhau:', 
        signatureImages[0].SignImageId, 
        signatureImages[1].SignImageId, 
        signatureImages[2].SignImageId
    );
    
    return await signPdfAdvanced(pdfFile, coordinates, {
        apiKey,
        mySignUserId,
        certificateId,
        reason: 'Test Multiple Images - Test 6',
        location: 'Hà Nội',
        signatureImages,
        signTransactionTitle: 'Test 6: Multiple Different Images'
    });
}

/**
 * TEST 7: Mixed Signatures - Kết hợp tất cả loại
 * CẦN TỐI THIỂU: 3 ảnh
 */
export async function testMixedSignatures(
    pdfFile: File,
    apiKey: string,
    mySignUserId: string,
    certificateId: string,
    signatureImages: SignatureImage[]
): Promise<Blob> {
    console.log('\n🧪 TEST 7: Mixed Signatures (All Types)');
    console.log('========================================');
    
    if (signatureImages.length < 3) {
        throw new Error('❌ Test này CẦN TỐI THIỂU 3 ảnh chữ ký khác nhau! Hiện tại chỉ có ' + signatureImages.length + ' ảnh.');
    }
    
    const coordinates: SignatureCoordinate[] = [
        // TextOnly - Số văn bản (không cần ảnh)
        {
            PageNumber: 1,
            Left: 50,
            Top: 600,
            Width: 150,
            Height: 50,
            SignType: 'TextOnly',
            SignText: 'Số: 123/HD',
            SignFontSize: 12
        },
        // ImageOnly - Ảnh 1
        {
            PageNumber: 1,
            Left: 220,
            Top: 600,
            Width: 100,
            Height: 60,
            SignType: 'ImageOnly',
            SignImageId: signatureImages[0].SignImageId
        },
        // ImageAndText - Ảnh 2
        {
            PageNumber: 1,
            Left: 340,
            Top: 600,
            Width: 120,
            Height: 70,
            SignType: 'ImageAndText',
            SignImageId: signatureImages[1].SignImageId,
            SignText: 'Phó giám đốc',
            SignFontSize: 10
        },
        // ImageNameDateComment - Ảnh 3
        {
            PageNumber: 1,
            Left: 50,
            Top: 680,
            Width: 180,
            Height: 90,
            SignType: 'ImageNameDateComment',
            SignImageId: signatureImages[2].SignImageId,
            SignFontSize: 10
        }
    ];
    
    console.log('✅ Sử dụng 3 ảnh khác nhau cho 3 loại chữ ký có ảnh');
    
    return await signPdfAdvanced(pdfFile, coordinates, {
        apiKey,
        mySignUserId,
        certificateId,
        reason: 'Test Mixed Signatures - Test 7',
        location: 'Hà Nội',
        signatureImages,
        signTransactionTitle: 'Test 7: Mixed All Types'
    });
}

/**
 * TEST 8: Multiple Pages - Ký trên nhiều trang khác nhau
 */
export async function testMultiplePages(
    pdfFile: File,
    apiKey: string,
    mySignUserId: string,
    certificateId: string,
    signatureImages: SignatureImage[]
): Promise<Blob> {
    console.log('\n🧪 TEST 8: Multiple Pages');
    console.log('========================================');
    
    if (signatureImages.length === 0) {
        throw new Error('Cần ít nhất 1 ảnh để test Multiple Pages!');
    }
    
    const coordinates: SignatureCoordinate[] = [
        // Page 1
        {
            PageNumber: 1,
            Left: 400,
            Top: 50,
            Width: 150,
            Height: 80,
            SignType: 'ImageNameDateComment',
            SignImageId: signatureImages[0].SignImageId,
            SignFontSize: 10
        },
        // Page 2
        {
            PageNumber: 2,
            Left: 50,
            Top: 50,
            Width: 180,
            Height: 90,
            SignType: 'ImageNameDateComment',
            SignImageId: signatureImages[1].SignImageId,
            SignFontSize: 11
        },
        // Page 3 (if exists)
        {
            PageNumber: 3,
            Left: 350,
            Top: 700,
            Width: 200,
            Height: 100,
            SignType: 'ImageNameDateComment',
            SignImageId: signatureImages[2].SignImageId,
            SignFontSize: 12
        }
    ];
    
    return await signPdfAdvanced(pdfFile, coordinates, {
        apiKey,
        mySignUserId,
        certificateId,
        reason: 'Test Multiple Pages - Test 8',
        location: 'Hà Nội',
        signatureImages,
        signTransactionTitle: 'Test 8: Multiple Pages'
    });
}

// ==================== HELPER FUNCTIONS ====================

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

// ==================== RUN ALL TESTS ====================

export async function runAllTests(
    apiKey: string,
    mySignUserId: string,
    certificateId: string,
    pdfFileInputId: string = 'pdfFile',
    signatureImages: SignatureImage[] = []
): Promise<void> {
    console.log('\n========================================');
    console.log('🚀 Bắt đầu chạy TẤT CẢ 8 test cases (v3.0.0)');
    console.log('========================================\n');
    
    try {
        const pdfFile = getPdfFileFromInput(pdfFileInputId);
        
        console.log('📄 PDF File:', pdfFile.name);
        console.log('📊 PDF Size:', (pdfFile.size / 1024).toFixed(2), 'KB');
        console.log('🔑 API Key:', apiKey.substring(0, 20) + '...');
        console.log('👤 MySign User ID:', mySignUserId);
        console.log('📜 Certificate ID:', certificateId);
        console.log('🖼️  Total Signature Images:', signatureImages.length);
        
        // Log signature images info
        signatureImages.forEach((img, index) => {
            console.log(`  📷 Image ${index + 1}:`, {
                SignImageId: img.SignImageId,
                Type: img.ImageBase64Url ? 'Base64' : 'URL',
                Source: img.ImageBase64Url 
                    ? `Base64 (${(img.ImageBase64Url.length / 1024).toFixed(2)} KB)`
                    : img.ImageUrl,
                AuthType: img.ImageUrlAuthType || 'N/A'
            });
        });
        
        const startTime = Date.now();
        
        // Test 1: Hidden (không cần ảnh)
        console.log('\n⏱️  Test 1/8: Hidden Signature...');
        await testHiddenSignature(pdfFile, apiKey, mySignUserId, certificateId);
        
        // Test 2: TextOnly (không cần ảnh)
        console.log('\n⏱️  Test 2/8: Multiple TextOnly...');
        await testTextOnlySignatures(pdfFile, apiKey, mySignUserId, certificateId);
        
        // Các test còn lại cần ảnh
        if (signatureImages.length > 0) {
            console.log('\n⏱️  Test 3/8: ImageOnly (cần 1 ảnh)...');
            await testImageOnlySignature(pdfFile, apiKey, mySignUserId, certificateId, signatureImages);
            
            console.log('\n⏱️  Test 4/8: ImageAndText (cần 1 ảnh)...');
            await testImageAndTextSignature(pdfFile, apiKey, mySignUserId, certificateId, signatureImages);
            
            console.log('\n⏱️  Test 5/8: ImageNameDateComment (cần 1 ảnh)...');
            await testImageNameDateCommentSignature(pdfFile, apiKey, mySignUserId, certificateId, signatureImages);
            
            if (signatureImages.length >= 3) {
                console.log('\n⏱️  Test 6/8: Multiple Different Images (cần 3 ảnh)...');
                await testMultipleImages(pdfFile, apiKey, mySignUserId, certificateId, signatureImages);
                
                console.log('\n⏱️  Test 7/8: Mixed Signatures (cần 3 ảnh)...');
                await testMixedSignatures(pdfFile, apiKey, mySignUserId, certificateId, signatureImages);
            
                console.log('\n⏱️  Test 8/8: Multiple Pages (cần 3 ảnh)...');
                await testMultiplePages(pdfFile, apiKey, mySignUserId, certificateId, signatureImages);
            } else {
                console.log('\n⏭️  Bỏ qua Test 6-8 (cần ít nhất 3 ảnh, hiện có ' + signatureImages.length + ' ảnh)');
            }
        } else {
            console.log('\n⏭️  Bỏ qua Test 3-8 (cần ít nhất 1 ảnh chữ ký)');
            console.warn('⚠️  Vui lòng thêm ít nhất 1 ảnh để chạy đầy đủ tất cả tests!');
        }
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log('\n========================================');
        console.log('✅ TESTS HOÀN THÀNH!');
        console.log(`⏱️  Thời gian: ${duration}s`);
        console.log(`📦 Đã test với ${signatureImages.length} ảnh chữ ký`);
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
console.log('✅ TEST FUNCTIONS LOADED (v3.0.0)!');
console.log('========================================');
console.log('\n📦 Exported Core Functions:');
console.log('  1. signPdfAdvanced(pdfFile, coordinates, options)');
console.log('  2. getPdfFileFromInput(fileInputId)');
console.log('\n📦 Exported Test Functions:');
console.log('  1. testHiddenSignature() - Ký ẩn');
console.log('  2. testTextOnlySignatures() - Multiple TextOnly');
console.log('  3. testImageOnlySignature() - ImageOnly single');
console.log('  4. testImageAndTextSignature() - ImageAndText');
console.log('  5. testImageNameDateCommentSignature() - Full info');
console.log('  6. testMultipleImages() - Nhiều ảnh khác nhau');
console.log('  7. testMixedSignatures() - Mix tất cả loại');
console.log('  8. testMultiplePages() - Ký nhiều trang');
console.log('  9. runAllTests() - Chạy tất cả tests');
console.log('\n💡 Tính năng mới v3.0.0:');
console.log('  - Hỗ trợ nhiều ảnh chữ ký khác nhau trong 1 request');
console.log('  - SignImageId tự động từ img-1, img-2, ..., img-n');
console.log('  - Mix Base64 và URL trong cùng request');
console.log('  - Test coverage cho tất cả SignType');
console.log('========================================\n');
