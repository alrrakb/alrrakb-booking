"use client";

import Image from "next/image";
import { useState } from "react";

export default function BookingHeader() {
    const [logoError, setLogoError] = useState(false);

    return (
        <header className="bg-white/10 backdrop-blur-md border-b border-white/10 py-3 px-6 md:px-12 sticky top-0 z-50">
            <div className="max-w-5xl mx-auto flex items-center justify-center gap-3">
                {/* Square logo */}
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/20 shadow-sm flex items-center justify-center bg-white/10 backdrop-blur-sm">
                    {!logoError ? (
                        <Image
                            src="/logo.png"
                            alt="طلائع الركب"
                            width={48}
                            height={48}
                            className="object-contain w-full h-full"
                            onError={() => setLogoError(true)}
                        />
                    ) : (
                        <span className="text-[#4c1d95] font-bold text-sm">TR</span>
                    )}
                </div>
                <span className="font-bold text-white text-lg leading-tight">
                    مؤسسة طلائع الركب
                </span>
            </div>
        </header>
    );
}
