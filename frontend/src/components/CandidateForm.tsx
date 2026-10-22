"use client";

import { useState, useEffect } from "react";
import { Sparkles, SlidersHorizontal, MapPin, Layers, IndianRupee, Info, CheckCircle2 } from "lucide-react";
import { fetchCategories, fetchCities, fetchBranches, CandidateInput } from "@/lib/api";

interface CandidateFormProps {
  onPredict: (input: CandidateInput) => void;
  isLoading: boolean;
}

export default function CandidateForm({ onPredict, isLoading }: CandidateFormProps) {
  const [percentile, setPercentile] = useState<string>("96.85");
  const [meritRank, setMeritRank] = useState<string>("");
  const [category, setCategory] = useState<string>("GOPENS");
  const [gender, setGender] = useState<string>("All");
  const [domicile, setDomicile] = useState<string>("Maharashtra");
  const [capRound, setCapRound] = useState<string>("III");
  const [targetYear, setTargetYear] = useState<number>(2024);
  const [institutionType, setInstitutionType] = useState<string>("All");
  const [maxFees, setMaxFees] = useState<number>(250000);
  const [anyFee, setAnyFee] = useState<boolean>(true);

  // Selected filters
  const [selectedBranches, setSelectedBranches] = useState<string[]>([
    "Computer Engineering",
    "Information Technology",
    "Artificial Intelligence and Data Science"
  ]);
  const [selectedCities, setSelectedCities] = useState<string[]>(["Pune", "Mumbai"]);

  // Metadata from API
  const [categories, setCategories] = useState<Array<{ code: string; label: string; group: string }>>([]);
  const [allCities, setAllCities] = useState<string[]>([]);
  const [allBranches, setAllBranches] = useState<Array<{ id: number; name: string }>>([]);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
    fetchCities().then(setAllCities).catch(() => {});
    fetchBranches().then(setAllBranches).catch(() => {});
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(percentile);
    if (isNaN(p) || p < 0 || p > 100) {
      alert("Please enter a valid percentile between 0 and 100.");
      return;
    }

    onPredict({
      percentile: p,
      merit_rank: meritRank ? parseInt(meritRank) : null,
      category,
      gender,
      domicile,
      cap_round: capRound,
      target_year: targetYear,
      institution_type: institutionType,
      preferred_branches: selectedBranches.length > 0 ? selectedBranches : undefined,
      preferred_cities: selectedCities.length > 0 ? selectedCities : undefined,
      max_fees: anyFee ? null : maxFees
    });
  };

  const toggleCity = (city: string) => {
    setSelectedCities(prev =>
      prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    );
  };

  const toggleBranch = (branch: string) => {
    setSelectedBranches(prev =>
      prev.includes(branch) ? prev.filter(b => b !== branch) : [...prev, branch]
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-md shadow-slate-100 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-200 bg-blue-900/50 px-2.5 py-1 rounded-full inline-block mb-2">
              Official CAP Algorithm
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">Enter Candidate Profile</h2>
            <p className="text-sm text-blue-100 mt-1">
              Data-backed predictions categorized into Likely, Borderline, and Reach options.
            </p>
          </div>
          <Sparkles className="w-8 h-8 text-amber-300 opacity-90 hidden sm:block" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Core Inputs Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Percentile */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              MHT CET Percentile *
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.0001"
                min="0"
                max="100"
                required
                value={percentile}
                onChange={(e) => setPercentile(e.target.value)}
                placeholder="e.g. 97.45"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900 font-bold text-base transition-all"
              />
              <span className="absolute right-3.5 top-2.5 font-bold text-slate-400 text-sm">%</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Exact percentile on CET scorecard</p>
          </div>

          {/* Merit Rank */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              State Merit Rank <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="number"
              min="1"
              value={meritRank}
              onChange={(e) => setMeritRank(e.target.value)}
              placeholder="e.g. 4850"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900 font-medium text-base transition-all"
            />
            <p className="text-[11px] text-slate-500 mt-1">Refines rank cutoff matching</p>
          </div>

          {/* Seat Category */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Category & Seat Quota *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900 text-sm font-medium bg-white transition-all"
            >
              {categories.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.label}
                </option>
              ))}
              {categories.length === 0 && (
                <>
                  <option value="GOPENS">GOPENS — General Open (State Level)</option>
                  <option value="LOPENS">LOPENS — Ladies Open</option>
                  <option value="TFWS">TFWS — Tuition Fee Waiver Scheme</option>
                  <option value="EWS">EWS — Economically Weaker Section</option>
                  <option value="GOBCS">GOBCS — General OBC</option>
                  <option value="GSCS">GSCS — General SC</option>
                </>
              )}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">Includes TFWS, EWS, and Caste quotas</p>
          </div>

          {/* CAP Round */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              CAP Round Evaluation
            </label>
            <select
              value={capRound}
              onChange={(e) => setCapRound(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-900 text-sm font-medium bg-white transition-all"
            >
              <option value="III">Round III (Final CAP Cutoff - Recommended)</option>
              <option value="II">Round II</option>
              <option value="I">Round I (Initial Highest Cutoff)</option>
              <option value="All">All Rounds</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">Round 3 reflects highest admission clearance</p>
          </div>
        </div>

        {/* Quick Preference Pills: Branches & Cities */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          {/* Preferred Branches */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Target Engineering Branches
              </label>
              <span className="text-[11px] text-slate-400">
                {selectedBranches.length === 0 ? "Showing All Branches" : `${selectedBranches.length} selected`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                "Computer Engineering",
                "Information Technology",
                "Artificial Intelligence and Data Science",
                "Computer Science and Engineering",
                "Electronics and Telecommunication Engg",
                "Mechanical Engineering",
                "Electrical Engineering",
                "Civil Engineering"
              ].map((b) => {
                const active = selectedBranches.includes(b);
                return (
                  <button
                    type="button"
                    key={b}
                    onClick={() => toggleBranch(b)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      active
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {b}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preferred Cities */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                Preferred Cities in Maharashtra
              </label>
              <span className="text-[11px] text-slate-400">
                {selectedCities.length === 0 ? "Showing All Cities" : `${selectedCities.length} selected`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Pune", "Mumbai", "Nagpur", "Nashik", "Amravati", "Sangli", "Kolhapur", "Raigad", "Chandrapur"].map((city) => {
                const active = selectedCities.includes(city);
                return (
                  <button
                    type="button"
                    key={city}
                    onClick={() => toggleCity(city)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      active
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {city}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Advanced Filters Accordion */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1.5 py-1"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{showAdvanced ? "Hide Advanced Filters" : "Show Advanced Options (Budget, Domicile, Gender, Institution Type)"}</span>
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-3 pt-3 border-t border-slate-100 bg-slate-50/70 p-4 rounded-xl">
              {/* Gender */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Gender Consideration</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium bg-white"
                >
                  <option value="All">All / Gender Neutral</option>
                  <option value="Female">Female (Applies Ladies Quota if beneficial)</option>
                  <option value="Male">Male</option>
                </select>
              </div>

              {/* Domicile */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Domicile & Seat Type</label>
                <select
                  value={domicile}
                  onChange={(e) => setDomicile(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium bg-white"
                >
                  <option value="Maharashtra">Maharashtra State Candidate (Type A-E)</option>
                  <option value="All India">All India Candidate (JEE / Non-MH)</option>
                </select>
              </div>

              {/* Institution Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Institution Type</label>
                <select
                  value={institutionType}
                  onChange={(e) => setInstitutionType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium bg-white"
                >
                  <option value="All">All Types (Govt & Private)</option>
                  <option value="Government">Government & Govt Autonomous</option>
                  <option value="Autonomous">All Autonomous Colleges</option>
                  <option value="Un-Aided">Un-Aided / Private Colleges</option>
                </select>
              </div>

              {/* Annual Fee Budget */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Max Annual Fee</label>
                  <label className="text-[11px] text-slate-500 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={anyFee}
                      onChange={(e) => setAnyFee(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    Any Fee
                  </label>
                </div>
                {!anyFee && (
                  <div>
                    <input
                      type="range"
                      min="25000"
                      max="300000"
                      step="10000"
                      value={maxFees}
                      onChange={(e) => setMaxFees(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="text-[11px] font-bold text-slate-700 text-right">
                      Up to ₹{maxFees.toLocaleString()} / year
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-extrabold text-base shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Evaluating Historical CAP Cutoffs...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-amber-300" />
                <span>Predict Colleges & Branches</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
