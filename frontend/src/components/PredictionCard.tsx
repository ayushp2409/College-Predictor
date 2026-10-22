"use client";

import { useState } from "react";
import {
  TrendingUp, Bookmark, BookmarkCheck, BarChart2,
  ExternalLink, IndianRupee, MapPin, Building, Award, Info, ChevronDown, ChevronUp
} from "lucide-react";
import { PredictionItem } from "@/lib/api";

interface PredictionCardProps {
  item: PredictionItem;
  onOpenTrend: (item: PredictionItem) => void;
  onToggleCompare: (item: PredictionItem) => void;
  isCompared: boolean;
  onToggleShortlist: (item: PredictionItem) => void;
  isShortlisted: boolean;
}

export default function PredictionCard({
  item,
  onOpenTrend,
  onToggleCompare,
  isCompared,
  onToggleShortlist,
  isShortlisted,
}: PredictionCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Styling based on likelihood
  const likelihoodConfig = {
    Likely: {
      badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dotBg: "bg-emerald-500",
      probBar: "bg-emerald-500",
      label: "Likely (Safe)",
    },
    Borderline: {
      badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
      dotBg: "bg-amber-500",
      probBar: "bg-amber-500",
      label: "Borderline (Target)",
    },
    Reach: {
      badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
      dotBg: "bg-rose-500",
      probBar: "bg-rose-500",
      label: "Reach (Dream)",
    },
  }[item.likelihood] || {
    badgeBg: "bg-slate-50 text-slate-700 border-slate-200",
    dotBg: "bg-slate-500",
    probBar: "bg-slate-500",
    label: item.likelihood,
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between">
      <div className="p-5">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${likelihoodConfig.badgeBg}`}
            >
              <span className={`w-2 h-2 rounded-full ${likelihoodConfig.dotBg}`} />
              {likelihoodConfig.label}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
              Round {item.cap_round}
            </span>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-slate-900">
              {Math.round(item.probability * 100)}%
            </span>
            <span className="text-[10px] text-slate-400 block font-medium">Estimated Chance</span>
          </div>
        </div>

        {/* Probability Meter Bar */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full mb-3 overflow-hidden">
          <div
            className={`h-full ${likelihoodConfig.probBar} rounded-full transition-all duration-500`}
            style={{ width: `${Math.max(5, item.probability * 100)}%` }}
          />
        </div>

        {/* College Name & Details */}
        <div className="mb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-700 mb-0.5">
            <span>Code: {item.college_code}</span>
            <span>•</span>
            <span className="text-slate-500 font-medium">{item.autonomy_status}</span>
          </div>
          <h3 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-2">
            {item.college_name}
          </h3>
        </div>

        {/* Branch Name */}
        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 mb-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Admitted Branch
          </span>
          <p className="font-bold text-slate-800 text-sm">{item.branch_name}</p>
        </div>

        {/* Key Cutoff Stats Grid */}
        <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-center mb-3">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Cutoff</span>
            <span className="text-sm font-extrabold text-slate-900">
              {item.closing_percentile.toFixed(2)}%
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Margin</span>
            <span
              className={`text-sm font-extrabold ${
                item.margin >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {item.margin >= 0 ? `+${item.margin.toFixed(2)}` : item.margin.toFixed(2)}%
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Annual Fee</span>
            <span className="text-sm font-extrabold text-slate-900">
              {item.total_annual_fee ? `₹${(item.total_annual_fee / 1000).toFixed(0)}k` : "N/A"}
            </span>
          </div>
        </div>

        {/* Location & University Tags */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mb-2">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {item.city}
          </span>
          {item.nirf_ranking && (
            <span className="flex items-center gap-1 text-amber-600 font-semibold">
              <Award className="w-3.5 h-3.5" />
              NIRF #{item.nirf_ranking}
            </span>
          )}
          <span className="text-slate-400">•</span>
          <span className="truncate max-w-[150px]">{item.university}</span>
        </div>

        {/* Explanation text toggle */}
        {showDetails && (
          <div className="mt-3 p-3 bg-blue-50/70 border border-blue-100 rounded-lg text-xs text-slate-700 space-y-1.5 animate-fadeIn">
            <div className="flex items-start gap-1.5">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed font-medium">{item.explanation}</p>
            </div>
            {item.closing_rank && (
              <p className="text-[11px] text-slate-500 pl-5">
                Closing State Merit Rank: <b className="text-slate-800">#{item.closing_rank.toLocaleString()}</b>
              </p>
            )}
            <p className="text-[10px] text-slate-400 italic pl-5">{item.disclaimer}</p>
          </div>
        )}
      </div>

      {/* Card Actions Bottom Bar */}
      <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="text-slate-600 hover:text-blue-600 flex items-center gap-1 transition-colors"
        >
          {showDetails ? (
            <>
              <span>Less</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <span>Why?</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Trend Chart */}
          <button
            type="button"
            onClick={() => onOpenTrend(item)}
            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-200/60 transition-colors flex items-center gap-1"
            title="View Cutoff Trends"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Trends</span>
          </button>

          {/* Compare */}
          <button
            type="button"
            onClick={() => onToggleCompare(item)}
            className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
              isCompared
                ? "bg-indigo-600 text-white"
                : "text-slate-700 hover:bg-slate-200/60"
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>{isCompared ? "Compared" : "Compare"}</span>
          </button>

          {/* Shortlist */}
          <button
            type="button"
            onClick={() => onToggleShortlist(item)}
            className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
              isShortlisted
                ? "bg-emerald-600 text-white"
                : "text-slate-700 hover:bg-slate-200/60"
            }`}
          >
            {isShortlisted ? (
              <BookmarkCheck className="w-3.5 h-3.5" />
            ) : (
              <Bookmark className="w-3.5 h-3.5" />
            )}
            <span>{isShortlisted ? "Saved" : "Save"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
