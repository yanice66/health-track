import Navbar from "@/components/health-track/Navbar";
import BMICalculator from "@/components/health-track/BMICalculator";
import HeroCard from "@/components/health-track/HeroCard";

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans selection:bg-[#14F1C9] selection:text-zinc-900">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Content Area */}
          <div className="lg:col-span-7 space-y-12">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-6xl font-bold text-zinc-900 tracking-tight leading-[1.1]">
                HealthTrack <span className="text-[#14F1C9]">BMI Calculator</span>
              </h1>
              <p className="text-zinc-500 text-lg md:text-xl max-w-2xl leading-relaxed">
                Calculate your Body Mass Index (BMI) to understand your health status and receive personalized wellness recommendations.
              </p>
            </div>

            <BMICalculator />
          </div>

          {/* Right Hero Card Area */}
          <div className="lg:col-span-5 h-full">
            <HeroCard />
          </div>
        </div>
      </main>

      {/* Background Decorative Element */}
      <div className="fixed top-0 right-0 -z-10 w-1/3 h-1/2 bg-[#14F1C9]/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 left-0 -z-10 w-1/4 h-1/3 bg-[#14F1C9]/3 blur-[100px] rounded-full pointer-events-none" />
    </div>
  );
}
