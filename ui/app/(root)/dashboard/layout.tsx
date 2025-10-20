"use client";

import ProfileDropdown from "@/components/profile-dropdown";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

interface User {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    isGitConnected: boolean;
    // add any other fields you need
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [githubLoading, setGithubLoading] = useState(false);
    const [githubError, setGithubError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/get-user`, {
                headers: {
                    Authorization: "Bearer " + token,
                },
                credentials: "include",
            });

            if (!res.ok) {
                throw new Error("Failed to fetch user data");
            }

            const data = await res.json();
            if (!data.success) {
                throw new Error(data.message || "Failed to fetch user");
            }

            setUser(data.data);
        } catch (err: unknown) {
            console.error("Error fetching user:", err);
            setError(err instanceof Error ? err.message : "Somwthing went wrong");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    /**
     * Redirect user to GitHub for repo access authorization
     */
    const connectToGithub = async (): Promise<void> => {
        try {
            setGithubLoading(true);
            const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID!;
            const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/github/callback`;
            const scope = "repo";

            // Encode current user as JWT for safe state tracking
            const token = localStorage.getItem("token");
            if (!token) throw new Error("Missing user token");

            const state = token; // we use token as 'state' to verify identity

            const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
                redirectUri
            )}&scope=${scope}&state=${state}`;

            window.location.href = authUrl;
        } catch (error: unknown) {
            setGithubError(error instanceof Error ? error.message : "Something went wrong");
        } finally {
            setGithubLoading(false);
        }
    };

    return (
        <section className="w-full min-h-screen">
            <nav className="w-full flex items-center justify-between px-5 py-5 md:px-20">
                <Link href="/dashboard" className="flex items-end gap-2">
                    <Image src="/logo.png" alt="logo" width={30} height={30} className="cursor-pointer" />
                    <span className="text-white text-xl hidden md:block">Dumcel</span>
                </Link>

                <div className="flex gap-3 items-center">
                    {user?.isGitConnected ? (
                        <Button
                            variant={"outline"}
                            className="cursor-pointer px-3 py-1"
                            onClick={connectToGithub}
                            disabled={githubLoading}
                        >
                            {githubLoading ? "Connecting..." : "Connect to GitHub"}
                        </Button>
                    ) : (
                        <Button className="px-3 py-1 flex items-center gap-2 disabled:opacity-100 cursor-not-allowed" variant={'outline'} disabled>
                            <Github size={12} />
                            Connected
                        </Button>
                    )}
                    <ProfileDropdown user={user} loading={loading} error={error} />
                </div>
            </nav>

            <div className="w-full max-w-7xl mx-auto mt-5 px-5">
                {loading && <p>Loading...</p>}
                {error && <p className="text-red-500">{error}</p>}
                {!loading && !error && children}
            </div>
        </section>
    );
}
