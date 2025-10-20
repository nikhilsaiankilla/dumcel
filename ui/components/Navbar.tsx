"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { Button } from "./ui/button";

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);

    // Array of main nav links
    const navLinks = [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/deploy", label: "Deploy" },
        { href: "/", label: "Home" },
        { href: "/pricing", label: "Pricing" },
    ];

    // Array of action buttons
    const actionLinks: { href: string; label: string; variant: "outline" | "default" | "link" | "destructive" | "secondary" | "ghost" }[] = [
        { href: "/login", label: "Log In", variant: "outline" },
        { href: "/contact", label: "Contact", variant: "outline" },
        { href: "/signup", label: "Sign up", variant: "default" },
    ];

    return (
        <nav className="w-full px-5 md:px-10 lg:px-20 py-4 flex items-center justify-between bg-background">
            <div className="w-full md:w-auto flex items-end justify-between gap-5">
                <Link href="/" className="flex items-end gap-2">
                    <Image src="/logo.png" alt="logo" width={40} height={40} className="cursor-pointer" />
                    <span className="text-white font-semibold text-xl hidden md:block">Dumcel</span>
                </Link>

                <ul className="hidden md:flex items-end gap-2">
                    {navLinks.map((link) => (
                        <li key={link.href}>
                            <Link
                                href={link.href}
                                className="text-gray-300 text-sm cursor-pointer px-3 py-1.5 rounded-2xl hover:bg-gray-900 transition-all duration-150 ease-linear"
                            >
                                {link.label}
                            </Link>
                        </li>
                    ))}
                </ul>

                {
                    isOpen
                        ?
                        <X size={25} onClick={() => setIsOpen(false)} className="block md:hidden cursor-pointer" />
                        :
                        <Menu size={25} onClick={() => setIsOpen(true)} className="block md:hidden cursor-pointer" />
                }
            </div>

            <div className="hidden md:flex items-center gap-4">
                {actionLinks.map((link) => (
                    <Link key={link.href} href={link.href} className="text-gray-300 text-sm cursor-pointer">
                        <Button variant={link.variant} className="cursor-pointer px-3 py-1">
                            {link.label}
                        </Button>
                    </Link>
                ))}
            </div>

            <div className={`w-full flex flex-col md:hidden absolute left-0 bg-background transition-all duration-300 ease-in-out overflow-hidden z-50 px-5 py-10 space-y-5 ${isOpen ? "top-16" : "-top-2/4"}`}>

                <ul className="flex items-center flex-col gap-3">
                    {navLinks.map((link) => (
                        <li key={link.href}>
                            <Link
                                href={link.href}
                                className="text-gray-300 text-sm cursor-pointer px-3 py-1.5 rounded-2xl hover:bg-gray-900 transition-all duration-150 ease-linear"
                            >
                                {link.label}
                            </Link>
                        </li>
                    ))}
                </ul>

                <div className="flex items-center flex-col gap-4">
                    {actionLinks.map((link) => (
                        <Link key={link.href} href={link.href} className="text-gray-300 text-sm cursor-pointer w-full">
                            <Button variant={link.variant} className="cursor-pointer px-3 py-1 w-full">
                                {link.label}
                            </Button>
                        </Link>
                    ))}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
