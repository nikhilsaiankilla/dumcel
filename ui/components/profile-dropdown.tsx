"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProfileDropdownProps {
    user?: {
        name?: string;
        photo?: string;
    } | null;
    loading?: boolean;
    error?: string | null;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ user, loading }) => {
    const router = useRouter();

    const handleLogout = async () => {
        try {
            const res = await fetch("/auth/logout", { method: "POST", credentials: "include" });
            if (res.ok) {
                router.push("/login");
            } else {
                console.error("Failed to logout");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteAccount = async () => {
        if (!confirm("Are you sure you want to delete your account? This cannot be undone.")) return;

        try {
            const res = await fetch("/auth/delete/account", { method: "DELETE", credentials: "include" });
            if (res.ok) {
                router.push("/signup");
            } else {
                console.error("Failed to delete account");
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger>
                <Avatar className="cursor-pointer">
                    {user?.photo ? (
                        <AvatarImage src={user.photo} />
                    ) : (
                        <AvatarFallback>{user?.name?.[0] ?? "U"}</AvatarFallback>
                    )}
                </Avatar>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="mt-2 w-56">
                <DropdownMenuLabel>{user?.name ?? "User"}</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => router.push("/profile")}>Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/billing")}>Billing</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/team")}>Team</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/subscription")}>Subscription</DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
                <DropdownMenuItem className="text-red-600" onClick={handleDeleteAccount}>
                    Delete Account
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default ProfileDropdown;
