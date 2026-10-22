"use client";

import { X, TrendingUp, Calendar, Award } from "lucide-react";
import { PredictionItem } from "@/lib/api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

interface TrendModalProps {
  item: PredictionItem | null;
  onClose: () => void;
}

export default function TrendModal({ item, onClose }: TrendModalProps) {
  if (!item) return null;

  // Prepare chart data from trend array
  const chartData = item.trend.map((t) => ({
    label: `${t.year} R${t.cap_round}`,
    cutoff: t.closing_percentile,
    rank: t.closing_rank,
  }));

  // Min and max for Y-axis domain
  const cutoffs = item.trend.map((t) => t.closing_percentile);
  const minVal = cutoffs.length > 0 ? Math.floor(Math.min(...cutoffs) - 2) : 50;
  const maxVal = cutoffs.length > 0 ? Math.min(100, Math.ceil(Math.max(...cutoffs) + 1)) : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-700 to-indigo-700 text-white">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="font-extrabold text-lg leading-tight">Historical Cutoff Trends</h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Multi-year CAP Round Cutoffs for {item.category}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* College & Branch Meta */}
        <div className="p-6 pb-2 space-y-2">
          <div>
            <span className="text-xs font-bold text-blue-700">{item.college_code} • {item.city}</span>
            <h4 className="text-base font-extrabold text-slate-900">{item.college_name}</h4>
            <p className="text-sm font-semibold text-slate-700 mt-0.5">{item.branch_name}</p>
          </div>

          <div className="flex flex-wrap gap-2 pt-1 text-xs">
            <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200">
              Category: {item.category}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
              Latest Cutoff: {item.closing_percentile.toFixed(2)}%
            </span>
            {item.total_annual_fee && (
              <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                Annual Fee: ₹{item.total_annual_fee.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Chart View */}
        <div className="px-6 py-4 flex-1">
          <div className="h-64 w-full bg-slate-50/70 p-3 rounded-xl border border-slate-100">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                  <YAxis domain={[minVal, maxVal]} stroke="#64748b" fontSize={11} unit="%" />
                  <Tooltip
                    formatter={(value: any) => [`${parseFloat(value).toFixed(2)}%`, "Closing Cutoff"]}
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "12px",
                      border: "none",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cutoff"
                    name="Closing Cutoff"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ fill: "#2563eb", r: 4 }}
                    activeDot={{ r: 6, fill: "#4f46e5" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No historical trend points recorded for this combination.
              </div>
            )}
          </div>

          {/* Historical Table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                  <th className="py-2 px-3">Year</th>
                  <th className="py-2 px-3">CAP Round</th>
                  <th className="py-2 px-3">Closing Percentile</th>
                  <th className="py-2 px-3">Closing State Rank</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {item.trend.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold">{t.year}</td>
                    <td className="py-2 px-3">Round {t.cap_round}</td>
                    <td className="py-2 px-3 font-bold text-blue-600">
                      {t.closing_percentile.toFixed(2)}%
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      {t.closing_rank ? `#${t.closing_rank.toLocaleString()}` : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition-colors"
          >
            Close Trends
          </button>
        </div>
      </div>
    </div>
  );
}
