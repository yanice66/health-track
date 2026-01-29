"use client";

import { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { Info } from "lucide-react";

export default function BMICalculator() {
  const [unit, setUnit] = useState("metric");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [bmi, setBmi] = useState(null);
  const [category, setCategory] = useState("");

  const calculateBMI = () => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (!h || !w) return;

    let result = 0;
    if (unit === "metric") {
      result = w / ((h / 100) * (h / 100));
    } else {
      result = (w / (h * h)) * 703;
    }

    setBmi(parseFloat(result.toFixed(1)));
    
    if (result < 18.5) setCategory("Underweight");
    else if (result < 25) setCategory("Healthy Weight");
    else if (result < 30) setCategory("Overweight");
    else setCategory("Obese");
  };

  return (
    <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-100 w-full max-w-lg">
      <div className="space-y-6">
        <div>
          <label className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase mb-4 block">
            Select Measurement System
          </label>
          <Tabs.Root value={unit} onValueChange={setUnit} className="w-full">
            <Tabs.List className="flex bg-zinc-50 rounded-xl p-1 gap-1">
              <Tabs.Trigger
                value="metric"
                className="flex-1 py-3 px-4 text-sm font-semibold rounded-lg transition-all data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-zinc-400"
              >
                Metric (cm/kg)
              </Tabs.Trigger>
              <Tabs.Trigger
                value="imperial"
                className="flex-1 py-3 px-4 text-sm font-semibold rounded-lg transition-all data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-zinc-400"
              >
                Imperial (ft/in/lbs)
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-900">
              Height ({unit === "metric" ? "cm" : "in"})
            </label>
            <div className="relative">
              <input
                type="number"
                placeholder={unit === "metric" ? "e.g. 180" : "e.g. 70"}
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full bg-zinc-50 border-none rounded-xl py-4 px-4 text-zinc-900 placeholder:text-zinc-300 focus:ring-2 focus:ring-[#14F1C9] outline-none transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-400">
                {unit === "metric" ? "cm" : "in"}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-900">
              Weight ({unit === "metric" ? "kg" : "lbs"})
            </label>
            <div className="relative">
              <input
                type="number"
                placeholder={unit === "metric" ? "e.g. 75" : "e.g. 165"}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full bg-zinc-50 border-none rounded-xl py-4 px-4 text-zinc-900 placeholder:text-zinc-300 focus:ring-2 focus:ring-[#14F1C9] outline-none transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-400">
                {unit === "metric" ? "kg" : "lbs"}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={calculateBMI}
          className="w-full bg-[#14F1C9] text-zinc-900 py-4 rounded-xl font-bold text-sm hover:bg-[#12d8b4] transition-all shadow-sm"
        >
          Calculate My BMI
        </button>

        {bmi !== null && (
          <div className="bg-[#14F1C9]/5 border-l-4 border-[#14F1C9] rounded-r-xl p-6 mt-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-bold text-[#14F1C9] tracking-widest uppercase">
                Your Result
              </span>
              <div className="bg-[#14F1C9]/20 p-1.5 rounded-lg">
                <Info className="w-4 h-4 text-[#14F1C9]" />
              </div>
            </div>
            <div className="flex items-baseline gap-4 mb-2">
              <span className="text-4xl font-bold text-zinc-900">{bmi}</span>
              <span className="text-lg font-bold text-[#14F1C9] italic">
                {category}
              </span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Based on your measurements, your BMI is within the {category.toLowerCase()} range. Keep up the great work with your nutrition and exercise!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
