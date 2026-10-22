"use client";

import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import CandidateForm from "@/components/CandidateForm";
import PredictionCard from "@/components/PredictionCard";
import TrendModal from "@/components/TrendModal";
import CompareModal from "@/components/CompareModal";
import ShortlistDrawer from "@/components/ShortlistDrawer";
import CapOptionFormModal from "@/components/CapOptionFormModal";
import {
  generatePredictions, saveToShortlist, removeFromShortlist,
  PredictionItem, PredictionResponse, CandidateInput
} from "@/lib/api";
import {
  Sparkles, CheckCircle2, ShieldCheck, BarChart2, Bookmark,
  Layers, ArrowUpDown, Filter, Search, AlertCircle, HelpCircle,
  ListOrdered
} from "lucide-react";

export default function HomePage() {
  const [predictions, setPredictions] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active student session & category
  const [sessionId] = useState(() => "mhtcet_session_" + Math.random().toString(36).substring(2, 9));
  const [currentInput, setCurrentInput] = useState<CandidateInput>({
    percentile: 96.85,
    category: "GOPENS"
  });

  // Shortlist & Compare State
  const [shortlist, setShortlist] = useState<PredictionItem[]>([]);
  const [shortlistDrawerOpen, setShortlistDrawerOpen] = useState(false);
  const [comparedItems, setComparedItems] = useState<PredictionItem[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [activeTrendItem, setActiveTrendItem] = useState<PredictionItem | null>(null);
  const [choiceListModalOpen, setChoiceListModalOpen] = useState(false);

  // Result Filtering & Sorting State
  const [activeTab, setActiveTab] = useState<"All" | "Likely" | "Borderline" | "Reach">("All");
  const [sortBy, setSortBy] = useState<"probability" | "cutoff_desc" | "cutoff_asc" | "fee_asc">("probability");
  const [searchQuery, setSearchQuery] = useState("");

  const handlePredict = async (input: CandidateInput) => {
    try {
      setLoading(true);
      setError(null);
      setCurrentInput(input);
      const data = await generatePredictions(input);
      setPredictions(data);

      // Scroll smoothly to results
      setTimeout(() => {
        const el = document.getElementById("results-section");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err: any) {
      setError(err.message || "Failed to generate predictions. Please check server connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleShortlist = (item: PredictionItem) => {
    const isAlready = shortlist.some(
      (s) => s.college_id === item.college_id && s.branch_id === item.branch_id
    );

    if (isAlready) {
      setShortlist((prev) =>
        prev.filter((s) => !(s.college_id === item.college_id && s.branch_id === item.branch_id))
      );
    } else {
      setShortlist((prev) => [...prev, item]);
      // Optional async sync to backend
      saveToShortlist({
        student_session_id: sessionId,
        college_id: item.college_id,
        branch_id: item.branch_id,
        likelihood: item.likelihood,
        candidate_percentile: currentInput.percentile,
      }).catch(() => {});
    }
  };

  const handleToggleCompare = (item: PredictionItem) => {
    const isAlready = comparedItems.some(
      (c) => c.college_id === item.college_id && c.branch_id === item.branch_id
    );

    if (isAlready) {
      setComparedItems((prev) =>
        prev.filter((c) => !(c.college_id === item.college_id && c.branch_id === item.branch_id))
      );
    } else {
      if (comparedItems.length >= 4) {
        alert("You can compare a maximum of 4 colleges at a time.");
        return;
      }
      setComparedItems((prev) => [...prev, item]);
    }
  };

  const handleRemoveCompareItem = (collegeId: number, branchId: number) => {
    setComparedItems((prev) =>
      prev.filter((c) => !(c.college_id === collegeId && c.branch_id === branchId))
    );
  };

  // Filtered and sorted predictions
  const displayedItems = useMemo(() => {
    if (!predictions) return [];
    let list = predictions.all_results;

    if (activeTab !== "All") {
      list = list.filter((i) => i.likelihood === activeTab);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.college_name.toLowerCase().includes(q) ||
          i.city.toLowerCase().includes(q) ||
          i.branch_name.toLowerCase().includes(q)
      );
    }

    // Sort
    return [...list].sort((a, b) => {
      if (sortBy === "probability") return b.probability - a.probability;
      if (sortBy === "cutoff_desc") return b.closing_percentile - a.closing_percentile;
      if (sortBy === "cutoff_asc") return a.closing_percentile - b.closing_percentile;
      if (sortBy === "fee_asc") {
        return (a.total_annual_fee || 999999) - (b.total_annual_fee || 999999);
      }
      return 0;
    });
  }, [predictions, activeTab, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        shortlistCount={shortlist.length}
        onOpenShortlist={() => setShortlistDrawerOpen(true)}
        compareCount={comparedItems.length}
        onOpenCompare={() => setCompareModalOpen(true)}
        onOpenChoiceList={() => setChoiceListModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-3 pt-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 text-blue-800 text-xs font-bold border border-blue-200 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Verified Directorate of Technical Education CAP Cutoff Engine</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Predict Your Dream Engineering College in Maharashtra
          </h1>
          <p className="text-base text-slate-600">
            Enter your MHT CET percentile to discover safe, borderline, and dream college options
            based on official historical CAP admission rounds.
          </p>
        </div>

        {/* Candidate Form */}
        <CandidateForm onPredict={handlePredict} isLoading={loading} />

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {/* Prediction Results Section */}
        {predictions && (
          <div id="results-section" className="space-y-6 pt-4">
            {/* Results KPI Summary Banner */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">
                    Predictions for {predictions.summary.candidate_percentile}% ({predictions.summary.category_used})
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Found {predictions.summary.total_matches} total college & branch combinations matching your criteria.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setChoiceListModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                    title="Generate official 9-digit choice codes preference list for CAP Round submission"
                  >
                    <ListOrdered className="w-4 h-4" />
                    <span>Create CAP Choice List</span>
                  </button>

                  <button
                    onClick={() => setShortlistDrawerOpen(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 flex items-center gap-1.5 transition-colors"
                  >
                    <Bookmark className="w-4 h-4" />
                    <span>View Shortlist ({shortlist.length})</span>
                  </button>

                  {comparedItems.length >= 2 && (
                    <button
                      onClick={() => setCompareModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <BarChart2 className="w-4 h-4" />
                      <span>Compare ({comparedItems.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Likelihood KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === "Likely" ? "All" : "Likely")}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    activeTab === "Likely"
                      ? "bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-400/20"
                      : "bg-emerald-50/30 border-emerald-200 hover:bg-emerald-50/60"
                  }`}
                >
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                    Likely (Safe Options)
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-emerald-700">
                      {predictions.summary.likely_count}
                    </span>
                    <span className="text-xs text-emerald-600 font-semibold">≥ 75% Chance</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Comfortably above recent cutoffs</p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === "Borderline" ? "All" : "Borderline")}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    activeTab === "Borderline"
                      ? "bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/20"
                      : "bg-amber-50/30 border-amber-200 hover:bg-amber-50/60"
                  }`}
                >
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                    Borderline (Target)
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-amber-700">
                      {predictions.summary.borderline_count}
                    </span>
                    <span className="text-xs text-amber-600 font-semibold">45% - 74% Chance</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Within 1.5% cutoff margin</p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === "Reach" ? "All" : "Reach")}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    activeTab === "Reach"
                      ? "bg-rose-50/80 border-rose-400 ring-2 ring-rose-400/20"
                      : "bg-rose-50/30 border-rose-200 hover:bg-rose-50/60"
                  }`}
                >
                  <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">
                    Reach (Dream Options)
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-rose-700">
                      {predictions.summary.reach_count}
                    </span>
                    <span className="text-xs text-rose-600 font-semibold">15% - 44% Chance</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Below recent closing cutoffs</p>
                </button>
              </div>
            </div>

            {/* Alternative Recommendations if available */}
            {predictions.alternatives.alternative_branches.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-blue-700" />
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Alternative Branch Recommendations for Top Colleges
                  </h3>
                </div>
                <p className="text-xs text-slate-600 mb-3">
                  If your preferred branch is a "Reach", you comfortably qualify for these aligned engineering branches at premier institutions:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {predictions.alternatives.alternative_branches.map((alt: any, idx: number) => (
                    <div key={idx} className="p-3 bg-white rounded-xl border border-blue-100 shadow-2xs text-xs space-y-1">
                      <span className="font-extrabold text-slate-900 block">{alt.college_name}</span>
                      <div className="flex items-center justify-between text-blue-700 font-bold">
                        <span>{alt.branch_name}</span>
                        <span>Cutoff: {alt.closing_percentile.toFixed(2)}%</span>
                      </div>
                      {alt.projected_cutoff && (
                        <div className="text-[11px] font-semibold text-indigo-700">
                          Projected {alt.projected_year || 2025}: {alt.projected_cutoff.toFixed(2)}%
                        </div>
                      )}
                      <p className="text-[11px] text-slate-500">{alt.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filter, Sort & Search Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
              {/* Category Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                {(["All", "Likely", "Borderline", "Reach"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTab === tab
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {tab === "All" ? `All (${predictions.summary.total_matches})` : tab}
                  </button>
                ))}
              </div>

              {/* Search & Sort Dropdowns */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter by college/city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>

                <div className="flex items-center gap-1 text-xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
                  >
                    <option value="probability">Sort: Best Match Chance</option>
                    <option value="cutoff_desc">Sort: Highest Cutoff</option>
                    <option value="cutoff_asc">Sort: Lowest Cutoff</option>
                    <option value="fee_asc">Sort: Lowest Annual Fee</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Prediction Cards Grid */}
            {displayedItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {displayedItems.map((item) => {
                  const isShortlisted = shortlist.some(
                    (s) => s.college_id === item.college_id && s.branch_id === item.branch_id
                  );
                  const isCompared = comparedItems.some(
                    (c) => c.college_id === item.college_id && c.branch_id === item.branch_id
                  );

                  return (
                    <PredictionCard
                      key={`${item.college_id}-${item.branch_id}`}
                      item={item}
                      onOpenTrend={(it) => setActiveTrendItem(it)}
                      onToggleCompare={handleToggleCompare}
                      isCompared={isCompared}
                      onToggleShortlist={handleToggleShortlist}
                      isShortlisted={isShortlisted}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
                <HelpCircle className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="font-extrabold text-slate-800 text-base">No matches found for current filters</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try clearing the search query or selecting "All" to view all predicted colleges.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("All");
                    setSearchQuery("");
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-xs"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Compare Bottom Bar */}
      {comparedItems.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-slate-700 animate-slideUp">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-400" />
            <span className="text-xs font-bold">
              {comparedItems.length} {comparedItems.length === 1 ? "college" : "colleges"} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setComparedItems([])}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => setCompareModalOpen(true)}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold transition-colors"
            >
              Compare Side-by-Side
            </button>
          </div>
        </div>
      )}

      {/* Modals & Drawers */}
      <TrendModal item={activeTrendItem} onClose={() => setActiveTrendItem(null)} />
      
      {compareModalOpen && (
        <CompareModal
          items={comparedItems}
          category={currentInput.category}
          candidatePercentile={currentInput.percentile}
          onClose={() => setCompareModalOpen(false)}
          onRemoveItem={handleRemoveCompareItem}
        />
      )}

      <ShortlistDrawer
        isOpen={shortlistDrawerOpen}
        onClose={() => setShortlistDrawerOpen(false)}
        shortlistItems={shortlist}
        candidatePercentile={currentInput.percentile}
        category={currentInput.category}
        onRemove={(colId, brId) => {
          setShortlist((prev) =>
            prev.filter((s) => !(s.college_id === colId && s.branch_id === brId))
          );
        }}
        onOpenChoiceList={() => {
          setShortlistDrawerOpen(false);
          setChoiceListModalOpen(true);
        }}
      />

      <CapOptionFormModal
        isOpen={choiceListModalOpen}
        onClose={() => setChoiceListModalOpen(false)}
        candidatePercentile={currentInput.percentile}
        category={currentInput.category}
        meritRank={currentInput.merit_rank}
        initialItems={shortlist.length > 0 ? shortlist : (predictions?.all_results || [])}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p className="font-semibold text-slate-700">
            MHT CET Engineering College Predictor • Developed for Maharashtra State Engineering Aspirants
          </p>
          <p className="max-w-3xl mx-auto text-[11px] leading-relaxed text-slate-400">
            Admission prediction models utilize verified multi-year historical CAP Round cutoffs published by the State Common Entrance Test Cell, Maharashtra State. Final seat allotment is governed solely by State CET Cell rules, seat matrices, and applicant merit.
          </p>
        </div>
      </footer>
    </div>
  );
}
