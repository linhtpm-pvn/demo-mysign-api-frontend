import { useEffect, useState, type JSX } from "react";
import { supabase } from "../../utils/supabase";
import type { User } from "@supabase/supabase-js";
import { runAllTests } from "./test-sign-pdf-advanced.ts";
import { runAllSessionTests, quickSessionTest } from "./test-sign-pdf-session.ts";

export function Home(): JSX.Element {
    const [loginUser, setLoginUser] = useState<User | null>(null);
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

    async function testSessionSigning() {
        try {
            const token = await supabase.auth.getSession().then(({ data }) => data.session?.access_token);
            console.log('token', token);

            // Chạy tất cả 5 test cases cho ký lưu phiên
            await runAllSessionTests(token!);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert('Lỗi ký lưu phiên: ' + errorMessage);
        }
    }

    async function quickTestSessionSigning() {
        try {
            const token = await supabase.auth.getSession().then(({ data }) => data.session?.access_token);
            console.log('token', token);

            // Quick test với 3 files
            await quickSessionTest(token!);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert('Lỗi quick test ký lưu phiên: ' + errorMessage);
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
                    <h2>Test Ký PDF Thông Thường (sign-pdf-advanced)</h2>
                    <input type="file" id="pdfFile" />
                    <button onClick={esignWithImgUpload}>Sign All Tests (7 tests)</button>
                    
                    <br />
                    <br />
                    <h2>Test Ký Lưu Phiên (Session-based Signing)</h2>
                    <p>⚠️ Lưu ý: Chọn nhiều file PDF (multiple) để test đầy đủ (khuyến nghị 5-10 files)</p>
                    <input type="file" id="pdfFileSession" multiple accept=".pdf" />
                    <br />
                    <br />
                    <button onClick={quickTestSessionSigning}>Quick Test (3 files)</button>
                    {" "}
                    <button onClick={testSessionSigning}>Run All Session Tests (5 tests)</button>
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