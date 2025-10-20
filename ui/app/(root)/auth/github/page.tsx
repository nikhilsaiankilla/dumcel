// app/auth/github/page.tsx
"use client";

import GithubAuthClient from "@/components/GithubAuthClient";
import { Loader } from "lucide-react";
import { Suspense } from "react";

export default function GithubAuthPage() {
    return (
        <Suspense fallback={<p className="flex items-center gap-2"><Loader className="animate-spin"/> Authenticating</p>}>
            <GithubAuthClient />
        </Suspense>
    );
}
