"use client";

import Link from "next/link";
import { Diamond } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-white border-b border-zinc-100 max-w-7xl mx-auto w-full">
      <div className="flex items-center gap-2">
        <div className="bg-[#14F1C9] p-1.5 rounded-md">
          <Diamond className="w-5 h-5 text-white fill-current" />
        </div>
        <span className="text-xl font-bold text-zinc-900 tracking-tight">HealthTrack</span>
      </div>
      
      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-600">
        <Link href="#" className="hover:text-zinc-900 transition-colors">Calculators</Link>
        <Link href="#" className="hover:text-zinc-900 transition-colors">Coaching</Link>
        <Link href="#" className="hover:text-zinc-900 transition-colors">Programs</Link>
        <Link href="#" className="hover:text-zinc-900 transition-colors">About Us</Link>
      </div>

      <button className="bg-[#14F1C9] text-zinc-900 px-6 py-2 rounded-full text-sm font-semibold hover:bg-[#12d8b4] transition-all shadow-sm">
        Login
      </button>
    </nav>
  );
}
