"use client";

import { Loader } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

const AuthLoader = ({ code }: { code: string }) => {
    const [status, setStatus] = useState("Processing authorization...");
    const router = useRouter();

    useEffect(() => {
        if (!code) return;
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

        (async () => {
            try {
                const res = await fetch(`${baseUrl}/auth/github/callback?code=${code}`);
                if (!res.ok) throw new Error(`Server responded ${res} `);
                setStatus("Authorization successful! Redirecting...");
                // TODO: redirect to dashboard or home after success

                const json = await res.json();
                if (!json?.success) {
                    setStatus("Something went wrong...");
                    return
                }

                localStorage.setItem('token', json.token)
                router.push('/dashboard');
            } catch (err: unknown) {
                console.error("Error sending code:", err);
                console.log(err instanceof Error ? err.message : "something went wrong");
                setStatus("Authorization failed. Please try again.");
            }
        })();
    }, [code]);

    return (
        <div className="w-full h-screen bg-background flex items-center justify-center px-5">
            <p className="flex items-center gap-3 text-sm font-semibold">
                <Loader className="animate-spin" />
                {status}
            </p>
        </div>
    );
};

export default AuthLoader;
