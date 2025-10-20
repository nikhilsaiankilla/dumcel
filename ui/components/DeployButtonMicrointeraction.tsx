"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import Image from "next/image";
import { Hand, HandGrab } from "lucide-react";

export default function DeployButtonMicrointeraction() {
    const [loading, setLoading] = useState(false);
    const [browserVisible, setBrowserVisible] = useState(false);
    const [click, setClick] = useState(false);
    const [clicked, setClicked] = useState(false);
    const btnRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        const runLoop = () => {
            // Step 1: show button only
            setLoading(false);
            setBrowserVisible(false);
            setClick(true)

            setTimeout(() => {
                setClick(false);
                setClicked(true);
            }, 1400)

            // Step 2: after 1s, show "Deploying..."
            setTimeout(() => {
                // createRippleAuto();
                setClick(true)
                setClicked(false)
                setLoading(true);
            }, 1500);

            // Step 3: after 3s total, show browser
            setTimeout(() => {
                setLoading(false);
                setBrowserVisible(true);
            }, 3000);

            // Step 4: loop again after 6s
            setTimeout(runLoop, 10000);
        };

        runLoop();
    }, []);

    // const createRippleAuto = () => {
    //     const btn = btnRef.current;
    //     if (!btn) return;
    //     const rect = btn.getBoundingClientRect();
    //     const ripple = document.createElement("span");
    //     ripple.className =
    //         "absolute rounded-full bg-white/20 animate-[ripple_0.6s_cubic-bezier(0.2,0.8,0.2,1)] pointer-events-none";
    //     const size = Math.max(rect.width, rect.height);
    //     ripple.style.width = ripple.style.height = `${size}px`;
    //     ripple.style.left = `${rect.width / 2 - size / 2}px`;
    //     ripple.style.top = `${rect.height / 2 - size / 2}px`;
    //     btn.appendChild(ripple);
    //     setTimeout(() => ripple.remove(), 600);
    // };

    return (
        <main className="relative flex flex-col items-center justify-center w-full aspect-square p-8 text-center rounded-xl overflow-hidden">

            {/* Browser card */}
            <div
                className={`absolute z-40 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] bg-white rounded-sm shadow-[0_8px_30px_rgba(20,30,80,0.08)] aspect-[4/3] border border-black/5 overflow-hidden transform transition-all duration-700 ${browserVisible
                    ? "opacity-100 scale-100 translate-y-0 animate-browserIn"
                    : "opacity-0 scale-90 translate-y-4"
                    }`}
            >

                {/* Browser Top Bar */}
                <div className="flex items-center justify-between h-9 px-3 bg-gradient-to-b from-[#fafbfd] to-[#f5f7fb] border-b border-black/5">
                    <div className="flex gap-[6px]">
                        <div className="w-[10px] h-[10px] rounded-full bg-[#ff5f57]" />
                        <div className="w-[10px] h-[10px] rounded-full bg-[#ffbd2e]" />
                        <div className="w-[10px] h-[10px] rounded-full bg-[#28c840]" />
                    </div>
                    <div className="flex-1 mx-3 bg-[#eef2ff] text-[#7a869a] text-[13px] px-2 py-[4px] rounded-md truncate border border-[#dfe3f0]">
                        https://domain.dumcel.app
                    </div>
                    <div className="w-[14px] h-[14px] rounded bg-[#dfe3f0]" />
                </div>

                {/* Fake webpage content */}
                <div className="relative w-full h-full bg-[#f9fafc]">
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Image
                            src="/web.png"
                            alt="Web page"
                            unoptimized
                            width={800}
                            height={600}
                            className="w-full h-full object-contain rounded-b-xl"
                        />
                    </div>
                </div>
            </div>


            {/* Deploy button */}
            <Button
                ref={btnRef}
                disabled={loading}
                variant={'outline'}
                className={`absolute z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex items-center justify-center gap-3 rounded-xl text-white font-semibold text-[16px] py-3 px-5 select-none transition active:scale-[0.995] ${loading ? "opacity-90 px-7" : ""
                    }`}
            >
                <span className="min-w-[86px] text-center">{loading ? "Deploying" : "Deploy"}</span>
                {loading && (
                    <span className="w-[18px] h-[18px] rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                )}
            </Button>

            <div className="absolute z-10 top-[53%] left-[57%] -translate-x-[50%] -translate-y-[70%]">
                {
                    click && !clicked && <Hand />
                }
                {
                    !click && clicked && <HandGrab />
                }
            </div>

            <style jsx>{`
  @keyframes ripple {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }

  @keyframes browserIn {
    0% {
      transform: translateY(30px) scale(0.95);
      translate-y: 0%;
      opacity: 0;
    }
    40% {
      transform: translateY(-6px) scale(1.02);
      opacity: 1;
      translate-y: 30%;
    }
    70% {
      transform: translateY(2px) scale(0.99);
      translate-y: 60%;
    }
    100% {
      transform: translateY(0) scale(1);
      translate-y: 100%;
    }
  }

  .animate-browserIn {
    animation: browserIn 1.5s cubic-bezier(0.25, 0.9, 0.3, 1.2);
  }
`}</style>
        </main>
    );
}
