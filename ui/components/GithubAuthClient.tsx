// app/auth/github/GithubAuthClient.tsx
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader } from "lucide-react";

export default function GithubAuthClient() {
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const token = searchParams.get("token");

        if (token) {
            localStorage.setItem("token", token);
            router.replace("/dashboard");
        } else {
            router.replace("/login?error=missing_token");
        }
    }, [searchParams, router]);

    return (
        <div className="flex items-center justify-center h-screen bg-background">
            <p className="flex items-center gap-2"><Loader className="animate-spin"/> Authenticating</p>
        </div>
    );
}
