import Navbar from "@/components/health-track/Navbar";
import BMICalculator from "@/components/health-track/BMICalculator";
import HeroCard from "@/components/health-track/HeroCard";

export default function Home() {
  return (
    <div className="min-h-screen bg-white selection:bg-[#14F1C9]/30">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-stretch">
          
          {/* Left Column & Calculator */}
          <div className="flex flex-col justify-center space-y-12">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-7xl font-extrabold text-zinc-900 leading-tight tracking-tighter">
                HealthTrack <br />
                <span className="text-zinc-400">BMI Index.</span>
              </h1>
              <p className="text-lg text-zinc-500 max-w-lg leading-relaxed">
                Better understand your weight in relation to your height using our precision BMI calculator. Modern, fast, and private.
              </p>
            </div>

            <BMICalculator />
          </div>

          {/* Right Column Image Card */}
          <div className="hidden lg:block">
            <HeroCard />
          </div>

        </div>

        {/* Mobile Hero Card (Visible only on small screens) */}
        <div className="mt-12 lg:hidden">
          <HeroCard />
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-zinc-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-zinc-400 text-xs">
          © 2026 HealthTrack Systems. All rights reserved.
        </p>
        <div className="flex gap-8 text-xs font-bold text-zinc-400 tracking-widest uppercase">
          <a href="#" className="hover:text-zinc-900 transition-colors">Privacy</a>
          <a href="#" className="hover:text-zinc-900 transition-colors">Terms</a>
          <a href="#" className="hover:text-zinc-900 transition-colors">Contact</a>
        </div>
      </footer>
    </div>
  );
}
