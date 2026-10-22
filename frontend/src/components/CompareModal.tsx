"use client";

import { useEffect, useState } from "react";
import { X, BarChart2, Check, IndianRupee, MapPin, Award, Trash2 } from "lucide-react";
import { compareColleges, PredictionItem } from "@/lib/api";

interface CompareModalProps {
  items: PredictionItem[];
  category: string;
  candidatePercentile?: number;
  onClose: () => void;
  onRemoveItem: (collegeId: number, branchId: number) => void;
}

export default function CompareModal({
  items,
  category,
  candidatePercentile,
  onClose,
  onRemoveItem,
}: CompareModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (items.length < 2) {
      setLoading(false);
      return;
    }

    const payload = items.map((i) => ({
      college_id: i.college_id,
      branch_id: i.branch_id,
    }));

    setLoading(true);
    compareColleges(payload, category, candidatePercentile)
      .then(setData)
      .catch((err) => console.error("Compare error", err))
      .finally(() => setLoading(false));
  }, [items, category, candidatePercentile]);

  if (items.length < 2) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center space-y-4">
          <BarChart2 className="w-12 h-12 text-indigo-600 mx-auto" />
          <h3 className="font-extrabold text-slate-900 text-lg">Compare 2 to 4 Colleges</h3>
          <p className="text-sm text-slate-600">
            Please select at least 2 colleges from your prediction results using the "Compare" button on each card.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700"
          >
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  const options = data?.options || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-700 to-blue-700 text-white">
          <div className="flex items-center gap-2.5">
            <BarChart2 className="w-5 h-5 text-indigo-200" />
            <div>
              <h3 className="font-extrabold text-lg leading-tight">Side-by-Side Comparison</h3>
              <p className="text-xs text-indigo-100 mt-0.5">
                Comparing {items.length} options for {category}
                {candidatePercentile && ` (${candidatePercentile}% CET)`}
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

        {/* Content Table */}
        <div className="p-6 overflow-x-auto flex-1">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-500 font-medium">Loading comparative metrics...</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b-2 border-slate-200 bg-slate-50">
                  <th className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider w-1/4">
                    Comparison Metric
                  </th>
                  {options.map((opt: any, idx: number) => (
                    <th key={idx} className="py-3 px-4 font-bold text-slate-900 text-center">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[11px] font-bold text-blue-600">Option {idx + 1}</span>
                        <button
                          onClick={() => onRemoveItem(opt.college_id, opt.branch_id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                          title="Remove from comparison"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="font-extrabold text-sm line-clamp-2">{opt.college_name}</p>
                      <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                        {opt.branch_name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {/* Likelihood */}
                {candidatePercentile && (
                  <tr className="bg-blue-50/50">
                    <td className="py-3 px-4 font-bold text-slate-900">Admission Likelihood</td>
                    {options.map((opt: any, idx: number) => {
                      const lhood = opt.likelihood_eval?.likelihood || "N/A";
                      const margin = opt.likelihood_eval?.margin;
                      const badgeClass =
                        lhood === "Likely"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : lhood === "Borderline"
                          ? "bg-amber-100 text-amber-800 border-amber-300"
                          : "bg-rose-100 text-rose-800 border-rose-300";
                      return (
                        <td key={idx} className="py-3 px-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full font-bold border text-xs ${badgeClass}`}>
                            {lhood}
                          </span>
                          {margin !== undefined && (
                            <span className="block text-[11px] font-bold text-slate-600 mt-1">
                              {margin >= 0 ? `+${margin}` : margin}% margin
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )}

                {/* 2024 Cutoff */}
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">2024 Closing Cutoff (R3)</td>
                  {options.map((opt: any, idx: number) => {
                    const c2024 = opt.cutoffs_2024?.[opt.cutoffs_2024.length - 1];
                    return (
                      <td key={idx} className="py-3 px-4 text-center font-extrabold text-blue-700 text-sm">
                        {c2024 ? `${c2024.closing_percentile.toFixed(2)}%` : "N/A"}
                      </td>
                    );
                  })}
                </tr>

                {/* 2023 Cutoff */}
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">2023 Closing Cutoff (R3)</td>
                  {options.map((opt: any, idx: number) => {
                    const c2023 = opt.cutoffs_2023?.[opt.cutoffs_2023.length - 1];
                    return (
                      <td key={idx} className="py-3 px-4 text-center font-semibold text-slate-700">
                        {c2023 ? `${c2023.closing_percentile.toFixed(2)}%` : "N/A"}
                      </td>
                    );
                  })}
                </tr>

                {/* City & University */}
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">Location & University</td>
                  {options.map((opt: any, idx: number) => (
                    <td key={idx} className="py-3 px-4 text-center">
                      <span className="font-bold text-slate-900 block">{opt.city}</span>
                      <span className="text-[11px] text-slate-500 block">{opt.university}</span>
                    </td>
                  ))}
                </tr>

                {/* Institute Type */}
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">Institution & Autonomy</td>
                  {options.map((opt: any, idx: number) => (
                    <td key={idx} className="py-3 px-4 text-center font-semibold text-slate-800">
                      {opt.institute_type} ({opt.autonomy_status})
                    </td>
                  ))}
                </tr>

                {/* Rating & NIRF */}
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">Rating & NIRF Ranking</td>
                  {options.map((opt: any, idx: number) => (
                    <td key={idx} className="py-3 px-4 text-center">
                      <span className="font-extrabold text-amber-600 block">★ {opt.rating} / 5.0</span>
                      {opt.nirf_ranking && (
                        <span className="text-[11px] font-semibold text-slate-600">
                          NIRF #{opt.nirf_ranking}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Annual Fee */}
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">Annual Tuition & College Fee</td>
                  {options.map((opt: any, idx: number) => (
                    <td key={idx} className="py-3 px-4 text-center font-extrabold text-slate-900 text-sm">
                      {opt.fees?.total_annual_fee
                        ? `₹${opt.fees.total_annual_fee.toLocaleString()}`
                        : "Verified on CAP portal"}
                    </td>
                  ))}
                </tr>

                {/* Hostel Fee */}
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">Annual Hostel Fee</td>
                  {options.map((opt: any, idx: number) => (
                    <td key={idx} className="py-3 px-4 text-center text-slate-600">
                      {opt.fees?.hostel_fee_annual
                        ? `₹${opt.fees.hostel_fee_annual.toLocaleString()}`
                        : "Hostel not verified"}
                    </td>
                  ))}
                </tr>

                {/* Sanctioned Intake */}
                <tr>
                  <td className="py-3 px-4 font-bold text-slate-900">Branch Sanctioned Intake</td>
                  {options.map((opt: any, idx: number) => (
                    <td key={idx} className="py-3 px-4 text-center font-medium text-slate-700">
                      {opt.sanctioned_intake} seats ({opt.accreditation_status})
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Cutoffs derived from official CAP admission data across recent rounds.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-900 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
