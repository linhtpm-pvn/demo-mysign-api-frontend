import { useEffect, useState, type JSX } from "react";
import { supabase } from "../../utils/supabase";
import type { User } from "@supabase/supabase-js";
import { BACKEND_URL } from "../../utils/constants";
import { runAllTests } from "./test-sign-pdf-advanced.ts";

type FileItem = {
    id: string;
    filename: string;
    created_at: string;
}

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