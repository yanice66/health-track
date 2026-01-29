"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";

export default function HeroCard() {
  return (
    <div className="relative group overflow-hidden rounded-3xl aspect-[4/5] md:aspect-auto md:h-full w-full min-h-[500px]">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80"
          alt="Health and wellness"
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-end">
        <div className="space-y-6 max-w-md">
          <div className="inline-block bg-[#14F1C9] text-zinc-900 text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-sm">
            Premium Coaching
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-[1.1]">
            Beyond numbers: Personalize your health journey.
          </h2>
          
          <p className="text-zinc-300 text-sm md:text-base leading-relaxed">
            A healthy BMI is just the beginning. Our expert coaches help you optimize your metabolism, build muscle, and feel your best.
          </p>

          <button className="bg-white text-zinc-900 px-8 py-4 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-zinc-100 transition-all group/btn w-fit">
            Book a Discovery Call
            <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
