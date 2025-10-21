import { useEffect, type JSX } from "react";
import { supabase } from "../../utils/supabase";

export function Callback(): JSX.Element {
    useEffect(() => {
        async function checkAuth() {
            const {data, error} = await supabase.auth.getUser();
            if (error) {
                alert('Error fetching user: ' + error.message);
                return;
            }

            if (data.user && data.user.aud === 'authenticated') {
                alert('User authenticated: ' + data.user.email);
            } else {
                alert('No authenticated user found');
            }
        }
        checkAuth();
    }, [])
    return (
        <div>
            <h1>Callback Page</h1>
        </div>
    )
}
