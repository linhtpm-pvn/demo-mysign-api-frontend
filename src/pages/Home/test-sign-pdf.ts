/**
 * Test function for SignPdf API
 * Backend: TaskstreamForge_MySignBackend\Controllers\MySignController.SignPdf.cs
 * 
 * API nhận:
 * - Type: 1 = ký với coordinates, khác 1 = ký ẩn
 * - SignatureCoordinates: JSON string array của SignatureCoordinatesModel
 */

// ==================== TYPE DEFINITIONS ====================

/** 
 * Position constants cho chữ ký
 * Theo backend C#: TOP_LEFT=1, TOP_RIGHT=2, BOTTOM_LEFT=3, BOTTOM_RIGHT=4
 */
export const SignaturePosition = {
    TOP_LEFT: 1,
    TOP_RIGHT: 2,
    BOTTOM_LEFT: 3,
    BOTTOM_RIGHT: 4
} as const;

export type SignaturePositionType = typeof SignaturePosition[keyof typeof SignaturePosition];

/** 
 * Model tọa độ chữ ký - match với C# backend
 * C# Model:
 * public class SignatureCoordinatesModel {
 *   public int position { get; set; }
 *   public float width { get; set; }
 *   public float height { get; set; }
 *   public string reason { get; set; }
 * }
 */
export interface SignatureCoordinatesModel {
    /** Vị trí góc: 1=TOP_LEFT, 2=TOP_RIGHT, 3=BOTTOM_LEFT, 4=BOTTOM_RIGHT */
    position: SignaturePositionType | number;
    /** Chiều rộng khung chữ ký */
    width: number;
    /** Chiều cao khung chữ ký */
    height: number;
    /** Lý do ký */
    reason: string;
}

export interface TestSignPdfOptions {
    /** Bearer token để xác thực */
    token: string;
    /** Base URL của backend API */
    baseUrl?: string;
    /** Type: 1 = ký với coordinates, khác 1 = ký ẩn (default: 0 = hidden) */
    type?: number;
    /** Tọa độ chữ ký (array, chỉ dùng khi type = 1) */
    signatureCoordinates?: SignatureCoordinatesModel[];
    /** ID của chứng thư số (optional) */
    certificateId?: string;
    /** Tiêu đề giao dịch ký (optional) */
    signTransactionTitle?: string;
}

// ==================== TEST FUNCTION ====================

/**
 * Test API SignPdf
 * @param pdfFile - File PDF cần ký
 * @param options - Các tùy chọn
 * @returns Blob của file PDF đã ký
 */
export async function testSignPdfApi(
    pdfFile: File,
    options: TestSignPdfOptions
): Promise<Blob> {
    const {
        token,
        baseUrl = 'http://localhost:5000',
        type = 0, // Default = hidden signature
        signatureCoordinates = [],
        certificateId,
        signTransactionTitle = 'Test Sign PDF'
    } = options;

    console.log('🧪 [testSignPdfApi] Starting API test...');
    console.log('📋 Parameters:', {
        fileName: pdfFile.name,
        fileSize: `${(pdfFile.size / 1024).toFixed(2)} KB`,
        baseUrl,
        type: type === 1 ? 'Custom coordinates' : 'Hidden signature',
        coordinatesCount: signatureCoordinates.length,
        hasCertificateId: !!certificateId,
        signTransactionTitle
    });

    try {
        // Create FormData
        const formData = new FormData();
        formData.append('FileUpload', pdfFile);
        formData.append('Type', type.toString());
        
        // Add signature coordinates if type = 1
        if (type === 1 && signatureCoordinates.length > 0) {
            const coordsJson = JSON.stringify(signatureCoordinates);
            formData.append('SignatureCoordinates', coordsJson);
            console.log('📍 [testSignPdfApi] Signature coordinates:', signatureCoordinates);
            console.log('📦 [testSignPdfApi] JSON:', coordsJson);
        } else {
            console.log('👻 [testSignPdfApi] Hidden signature (no coordinates)');
        }
        
        if (certificateId) {
            formData.append('CertificateId', certificateId);
        }
        
        if (signTransactionTitle) {
            formData.append('SignTransactionTitle', signTransactionTitle);
        }

        const apiUrl = `${baseUrl}/api/my-sign/sign-pdf`;
        console.log('📡 [testSignPdfApi] Sending request to:', apiUrl);
        console.log('🔑 [testSignPdfApi] Token:', token.substring(0, 20) + '...');

        const startTime = Date.now();

        // Call API
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log('📊 [testSignPdfApi] Response status:', response.status);
        console.log('⏱️ [testSignPdfApi] Request duration:', `${duration}ms`);

        // Check response
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (e) {
                // If response is not JSON, use default error message
            }
            throw new Error(errorMessage);
        }

        // Get signed PDF as blob
        const blob = await response.blob();
        console.log('✅ [testSignPdfApi] SUCCESS! Signed PDF received');
        console.log('📦 [testSignPdfApi] Blob size:', `${(blob.size / 1024).toFixed(2)} KB`);

        // Auto download the signed PDF
        downloadBlob(blob, `signed_${pdfFile.name}`);

        return blob;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ [testSignPdfApi] FAILED:', errorMessage);
        throw error;
    }
}

/**
 * Helper function to download blob as file
 */
function downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    console.log('💾 [downloadBlob] File downloaded:', filename);
}

/**
 * Quick test - Type 1 với coordinates
 * @param token - Bearer token
 * @param fileInputId - ID của input element (default: 'pdfFile')
 * @param baseUrl - Base URL của API (default: 'http://localhost:5000')
 * @param position - Vị trí chữ ký (1=TOP_LEFT, 2=TOP_RIGHT, 3=BOTTOM_LEFT, 4=BOTTOM_RIGHT)
 */
export async function quickTestSignPdfWithCoordinates(
    token: string,
    fileInputId: string = 'pdfFile',
    baseUrl: string = 'http://localhost:5000',
    position: SignaturePositionType = SignaturePosition.TOP_LEFT
): Promise<void> {
    const positionName = position === 1 ? 'TOP_LEFT' : position === 2 ? 'TOP_RIGHT' : position === 3 ? 'BOTTOM_LEFT' : 'BOTTOM_RIGHT';
    
    console.log('\n========================================');
    console.log('🚀 [quickTestSignPdf] Quick Test Started');
    console.log(`📌 Type: 1 (Custom coordinates)`);
    console.log(`📍 Position: ${positionName} (${position})`);
    console.log('========================================\n');

    // Get file from input
    const fileInput = document.getElementById(fileInputId) as HTMLInputElement | null;
    
    if (!fileInput) {
        const error = `File input element with id="${fileInputId}" not found`;
        console.error('❌ [quickTestSignPdf]', error);
        alert(error);
        return;
    }

    if (!fileInput.files || !fileInput.files[0]) {
        const error = 'Please select a PDF file first';
        console.error('❌ [quickTestSignPdf]', error);
        alert(error);
        return;
    }

    const pdfFile = fileInput.files[0];

    // Tạo coordinates - ví dụ 1 chữ ký
    const coordinates: SignatureCoordinatesModel[] = [
        {
            position: position,
            width: 200,
            height: 80,
            reason: `Test signature at ${positionName}`
        }
    ];

    try {
        await testSignPdfApi(pdfFile, {
            token,
            baseUrl,
            type: 1, // Type 1 = custom coordinates
            signatureCoordinates: coordinates,
            signTransactionTitle: `Test Type=1 at ${positionName}`
        });

        console.log('\n========================================');
        console.log('✅ [quickTestSignPdf] Test PASSED!');
        console.log('========================================\n');
        
        alert(`✅ Test thành công!\nType: 1 (Custom coordinates)\nVị trí: ${positionName}`);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        console.log('\n========================================');
        console.error('❌ [quickTestSignPdf] Test FAILED!');
        console.error('Error:', errorMessage);
        console.log('========================================\n');
        
        alert(`❌ Test thất bại!\n\nLỗi: ${errorMessage}`);
    }
}

/**
 * Quick test - Hidden signature (Type != 1)
 * @param token - Bearer token
 * @param fileInputId - ID của input element (default: 'pdfFile')
 * @param baseUrl - Base URL của API (default: 'http://localhost:5000')
 */
export async function quickTestSignPdfHidden(
    token: string,
    fileInputId: string = 'pdfFile',
    baseUrl: string = 'http://localhost:5000'
): Promise<void> {
    console.log('\n========================================');
    console.log('🚀 [quickTestSignPdfHidden] Quick Test Started');
    console.log('👻 Type: 0 (Hidden signature)');
    console.log('========================================\n');

    // Get file from input
    const fileInput = document.getElementById(fileInputId) as HTMLInputElement | null;
    
    if (!fileInput) {
        const error = `File input element with id="${fileInputId}" not found`;
        console.error('❌ [quickTestSignPdfHidden]', error);
        alert(error);
        return;
    }

    if (!fileInput.files || !fileInput.files[0]) {
        const error = 'Please select a PDF file first';
        console.error('❌ [quickTestSignPdfHidden]', error);
        alert(error);
        return;
    }

    const pdfFile = fileInput.files[0];

    try {
        await testSignPdfApi(pdfFile, {
            token,
            baseUrl,
            type: 0, // Type 0 = hidden signature
            signTransactionTitle: 'Test Hidden Signature'
        });

        console.log('\n========================================');
        console.log('✅ [quickTestSignPdfHidden] Test PASSED!');
        console.log('========================================\n');
        
        alert('✅ Test thành công!\nType: 0 (Hidden signature)');

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        console.log('\n========================================');
        console.error('❌ [quickTestSignPdfHidden] Test FAILED!');
        console.error('Error:', errorMessage);
        console.log('========================================\n');
        
        alert(`❌ Test thất bại!\n\nLỗi: ${errorMessage}`);
    }
}

// ==================== EXPORT ====================

console.log('\n========================================');
console.log('✅ SignPdf Test functions loaded!');
console.log('========================================');
console.log('\n📦 Exported Functions:');
console.log('  - testSignPdfApi(pdfFile, options)');
console.log('  - quickTestSignPdfWithCoordinates(token, fileInputId?, baseUrl?, position?)');
console.log('  - quickTestSignPdfHidden(token, fileInputId?, baseUrl?)');
console.log('\n🚀 Quick start (in browser console):');
console.log('  // Test Type 1 với coordinates');
console.log('  await quickTestSignPdfWithCoordinates("TOKEN", "pdfFile", "http://localhost:5000", 1)');
console.log('');
console.log('  // Test Hidden signature');
console.log('  await quickTestSignPdfHidden("TOKEN", "pdfFile", "http://localhost:5000")');
console.log('\n📌 Position values:');
console.log('  1 = TOP_LEFT');
console.log('  2 = TOP_RIGHT');
console.log('  3 = BOTTOM_LEFT');
console.log('  4 = BOTTOM_RIGHT');
console.log('========================================\n');
