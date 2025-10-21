import { useEffect, useState, type JSX } from "react";
import { supabase } from "../../utils/supabase";
import type { User } from "@supabase/supabase-js";
import { BACKEND_URL } from "../../utils/constants";
import { runAllTests } from "./test-sign-pdf-advanced.ts";
import { quickTestSignPdfWithCoordinates, quickTestSignPdfHidden, SignaturePosition, type SignaturePositionType } from "./test-sign-pdf.ts";

type FileItem = {
    id: string;
    filename: string;
    created_at: string;
}

export function Home(): JSX.Element {
    const [loginUser, setLoginUser] = useState<User | null>(null);
    const [signPosition, setSignPosition] = useState<SignaturePositionType | 0>(SignaturePosition.TOP_LEFT);
    useEffect(() => {
        async function load() {
            const { data, error } = await supabase.auth.getUser();
            // console.log('data', data);
            // console.log('error', error);
            if (error) {
                alert('Error fetching user: ' + error.message);
                return;
            }

            if (data.user && data.user.aud === 'authenticated') {
                setLoginUser(data.user);
            }
        }
        load();
    }, [])

    async function signIn() {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: 'linhtpm@pvn.vn',
            password: '123456',
        });
        console.log('data', data);
        console.log('error', error);
    }

    async function signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) {
            alert('Error signing out: ' + error.message);
            return;
        }
        setLoginUser(null);
    }

    async function fetchCertificates() {
        if (!loginUser) {
            alert('Please login first');
            return;
        }
        const token = await supabase.auth.getSession().then(({ data }) => data.session?.access_token);
        console.log('token', token);

        const res = await fetch(`${BACKEND_URL}/api/my-sign/certificates`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        const data = await res.json();
        console.log('data', data);
    }

    // async function esignWithImgUpload() {
    //     const fileInput = document.getElementById('pdfInput') as HTMLInputElement;
    //     if (!fileInput || !fileInput.files) {
    //         throw new Error('File input not found');
    //     }
    //     if (fileInput.files.length === 0) {
    //         alert('Please select a file');
    //         return;
    //     }
    //     const pdfFile = fileInput.files[0];

    //     try {
    //         const token = await supabase.auth.getSession().then(({ data }) => data.session?.access_token);
    //         console.log('token', token);

    //         const signedPdfBlob = await runAllTests();

    //         // Create blob URL
    //         const url = URL.createObjectURL(signedPdfBlob);
            
    //         // Try to open in new window
    //         const newWindow = window.open(url, '_blank');
            
    //         // If popup was blocked, offer download instead
    //         if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
    //             console.warn('Popup blocked, downloading instead...');
    //             const link = document.createElement('a');
    //             link.href = url;
    //             link.download = `signed-${pdfFile.name}`;
    //             link.click();
    //             URL.revokeObjectURL(url);
    //         }

    //         console.log('✅ PDF signed and displayed!');
    //     } catch (error) {
    //         const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    //         alert('Lỗi ký PDF: ' + errorMessage);
    //     }
    // }

    async function esignWithImgUpload() {
        try {
            const token = await supabase.auth.getSession().then(({ data }) => data.session?.access_token);
            console.log('token', token);

            await runAllTests(token!);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert('Lỗi ký PDF: ' + errorMessage);
        }
    }

    async function testSignPdfApiClick() {
        try {
            const token = await supabase.auth.getSession().then(({ data }) => data.session?.access_token);
            if (!token) {
                alert('Please login first to get token');
                return;
            }

            // You can change the baseUrl here to your backend URL
            const baseUrl = 'http://localhost:5000';
            
            if (signPosition === 0) {
                // Hidden signature
                await quickTestSignPdfHidden(token, 'pdfFile', baseUrl);
            } else {
                // Custom coordinates
                await quickTestSignPdfWithCoordinates(token, 'pdfFile', baseUrl, signPosition);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Test failed:', errorMessage);
        }
    }


    return (
        <div>
            {loginUser ? (
                <div>
                    <h1>Welcome, {loginUser.email}</h1>
                    <p>User ID: {loginUser.id}</p>
                    <button onClick={signOut}>Sign Out</button>
                    {/* <br />
                    <br />
                    <button onClick={fetchSomthing}>Fetch something</button> */}
                    <br />
                    <br />
                    <input type="file" id="pdfFile" />
                    <button onClick={esignWithImgUpload}>Sign</button>
                    {/* <br />
                    <br />
                    <div>
                        <label htmlFor="signPositionSelect">Vị trí chữ ký: </label>
                        <select 
                            id="signPositionSelect" 
                            value={signPosition} 
                            onChange={(e) => setSignPosition(Number(e.target.value) as SignaturePositionType | 0)}
                        >
                            <option value="0">Hidden (Ký ẩn - Type=0)</option>
                            <option value={SignaturePosition.TOP_LEFT}>TOP_LEFT (Type=1, Position=1)</option>
                            <option value={SignaturePosition.TOP_RIGHT}>TOP_RIGHT (Type=1, Position=2)</option>
                            <option value={SignaturePosition.BOTTOM_LEFT}>BOTTOM_LEFT (Type=1, Position=3)</option>
                            <option value={SignaturePosition.BOTTOM_RIGHT}>BOTTOM_RIGHT (Type=1, Position=4)</option>
                        </select>
                    </div>
                    <br />
                    <button onClick={testSignPdfApiClick}>🧪 Test SignPdf API</button>
                    <br />
                    <br />
                    <button onClick={fetchCertificates}>Fetch certificates</button> */}
                </div>
            ) : (
                <div>
                    <h1>Please sign in</h1>
                    <button onClick={signIn}>Sign in</button>
                </div>
            )}
        </div>
    )
}