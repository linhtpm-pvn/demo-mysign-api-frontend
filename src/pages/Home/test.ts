interface SignPdfParams {
    pdfFile: File;
    targetString: string;
    coordinatesRelativeX: number;
    coordinatesRelativeY: number;
    signatureFrameWidth: number;
    signatureFrameHeight: number;
    certificateId?: string | null;
    title?: string | null;
}

interface ErrorResponse {
    message?: string;
}

/**
 * Sign PDF with image at string position (Plus version)
 * @param pdfFile - PDF file to sign
 * @param targetString - Target string to locate signature position
 * @param coordinatesRelativeX - X coordinate relative to target string
 * @param coordinatesRelativeY - Y coordinate relative to target string
 * @param signatureFrameWidth - Width of signature frame
 * @param signatureFrameHeight - Height of signature frame
 * @param certificateId - Certificate ID (optional)
 * @param title - Transaction title (optional)
 * @returns Signed PDF file
 */
async function signPdfWithImgUploadStringPositionPlus(
    token: string,
    pdfFile: File,
    targetString: string,
    coordinatesRelativeX: number,
    coordinatesRelativeY: number,
    signatureFrameWidth: number,
    signatureFrameHeight: number,
    certificateId: string | null = null,
    title: string | null = null
): Promise<Blob> {
    try {
        // Create FormData
        const formData = new FormData();
        formData.append('FileUpload', pdfFile);
        formData.append('TargetString', targetString);
        formData.append('CoordinatesRelativeX', coordinatesRelativeX.toString());
        formData.append('CoordinatesRelativeY', coordinatesRelativeY.toString());
        formData.append('SignatureFrameWidth', signatureFrameWidth.toString());
        formData.append('SignatureFrameHeight', signatureFrameHeight.toString());
        
        // Optional parameters
        if (certificateId) {
            formData.append('CertificateId', certificateId);
        }
        if (title) {
            formData.append('Title', title);
        }

        // Call API
        const response = await fetch('/api/my-sign/sign-pdf-with-img-upload-string-position-plus', {
            method: 'POST',
            headers: {
                // Authorization header nếu cần
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const error: ErrorResponse = await response.json();
            throw new Error(error.message || 'Failed to sign PDF');
        }

        // Return PDF blob
        const blob = await response.blob();
        return blob;

    } catch (error) {
        console.error('Error signing PDF:', error);
        throw error;
    }
}

export { signPdfWithImgUploadStringPositionPlus };
export type { SignPdfParams, ErrorResponse };

// ====================================
// CÁCH SỬ DỤNG MẪU
// ====================================

// Example 1: Đơn giản nhất
async function example1(): Promise<void> {
    const fileInput = document.getElementById('pdfInput') as HTMLInputElement;
    if (!fileInput || !fileInput.files) {
        throw new Error('File input not found');
    }
    const pdfFile = fileInput.files[0];

    try {
        const signedPdfBlob = await signPdfWithImgUploadStringPositionPlus(
            "",
            pdfFile,
            'Ký tại đây',  // Target string
            10,             // X offset from target string
            50,            // Y offset from target string
            400,            // Signature width
            200              // Signature height
        );

        // Download file
        const url = URL.createObjectURL(signedPdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'signed-document.pdf';
        a.click();
        URL.revokeObjectURL(url);

        console.log('✅ PDF signed successfully!');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error:', errorMessage);
    }
}

// Example 2: Với Certificate ID và Title
async function example2(): Promise<void> {
    const fileInput = document.getElementById('pdfInput') as HTMLInputElement;
    if (!fileInput || !fileInput.files) {
        throw new Error('File input not found');
    }
    const pdfFile = fileInput.files[0];

    try {
        const signedPdfBlob = await signPdfWithImgUploadStringPositionPlus(
            "",
            pdfFile,
            'Người ký',
            15,
            -60,
            200,
            60,
            'certificate-id-123',  // Certificate ID
            'Hợp đồng mua bán'     // Title
        );

        // Display in iframe
        const url = URL.createObjectURL(signedPdfBlob);
        const pdfPreview = document.getElementById('pdfPreview') as HTMLIFrameElement;
        if (pdfPreview) {
            pdfPreview.src = url;
        }

        console.log('✅ PDF signed and displayed!');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        alert('Lỗi ký PDF: ' + errorMessage);
    }
}

// Example 3: Với UI hoàn chỉnh
async function signPdfWithUI(): Promise<void> {
    const fileInput = document.getElementById('pdfInput') as HTMLInputElement;
    const targetStringInput = document.getElementById('targetString') as HTMLInputElement;
    const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;
    
    if (!fileInput || !targetStringInput || !submitBtn) {
        throw new Error('Required DOM elements not found');
    }

    // Disable button during processing
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang ký...';

    try {
        const pdfFile = fileInput.files?.[0];
        const targetString = targetStringInput.value;

        if (!pdfFile) {
            throw new Error('Vui lòng chọn file PDF');
        }

        if (!targetString) {
            throw new Error('Vui lòng nhập chuỗi định vị');
        }

        const signedPdfBlob = await signPdfWithImgUploadStringPositionPlus(
            "",
            pdfFile,
            targetString,
            10,   // X offset
            -50,  // Y offset
            190,  // Width
            50    // Height
        );

        // Download file
        const url = URL.createObjectURL(signedPdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${pdfFile.name.replace('.pdf', '')}_signed.pdf`;
        a.click();
        URL.revokeObjectURL(url);

        // Show success message
        alert('✅ Ký PDF thành công!');

    } catch (error) {
        console.error('Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        alert('❌ Lỗi: ' + errorMessage);
    } finally {
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Ký PDF';
    }
}