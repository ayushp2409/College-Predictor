"use client";

import { useState, useMemo, useEffect } from "react";
import {
  X, ListOrdered, ArrowUp, ArrowDown, Trash2, Download,
  FileSpreadsheet, FileText, Sparkles, Check, Copy, AlertCircle,
  HelpCircle, ArrowUpDown, Plus
} from "lucide-react";
import {
  ChoiceListItem, CapOptionFormExportRequest,
  exportCapOptionFormCSV, exportCapOptionFormPDF, PredictionItem
} from "@/lib/api";

interface CapOptionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidatePercentile: number;
  category: string;
  meritRank?: number | null;
  initialItems?: PredictionItem[];
}

export default function CapOptionFormModal({
  isOpen,
  onClose,
  candidatePercentile,
  category,
  meritRank,
  initialItems = [],
}: CapOptionFormModalProps) {
  const [studentName, setStudentName] = useState("Candidate Aspirant");
  const [appId, setAppId] = useState("EN24" + Math.floor(100000 + Math.random() * 900000));
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"pdf" | "csv" | null>(null);

  // Convert and sort initial PredictionItems in descending order according to projected cutoff
  const mapAndSortByProjectedCutoff = (items: PredictionItem[], seatCategory: string): ChoiceListItem[] => {
    const list: ChoiceListItem[] = (items || []).map((item) => ({
      preference_no: 1,
      choice_code: item.choice_code || `${item.college_code}${item.branch_code}`,
      college_code: item.college_code,
      college_name: item.college_name,
      city: item.city,
      branch_code: item.branch_code,
      branch_name: item.branch_name,
      seat_type: item.seat_type || seatCategory,
      likelihood: item.likelihood,
      closing_percentile: item.closing_percentile,
      projected_cutoff: item.projected_cutoff ?? item.closing_percentile,
      projected_year: item.projected_year || 2025,
      closing_rank: item.closing_rank,
      total_annual_fee: item.total_annual_fee,
      autonomy_status: item.autonomy_status,
    }));

    // Sort strictly in descending order of projected cutoff (falling back to closing_percentile)
    list.sort((a, b) => {
      const projA = a.projected_cutoff ?? a.closing_percentile;
      const projB = b.projected_cutoff ?? b.closing_percentile;
      return projB - projA;
    });

    list.forEach((c, idx) => {
      c.preference_no = idx + 1;
    });

    return list;
  };

  const [choices, setChoices] = useState<ChoiceListItem[]>(() =>
    mapAndSortByProjectedCutoff(initialItems, category)
  );

  // Keep choices synchronized and sorted descending when initialItems or category changes
  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setChoices(mapAndSortByProjectedCutoff(initialItems, category));
    }
  }, [initialItems, category]);

  if (!isOpen) return null;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newChoices = [...choices];
    const temp = newChoices[index];
    newChoices[index] = newChoices[index - 1];
    newChoices[index - 1] = temp;
    // Re-index preferences
    newChoices.forEach((c, idx) => (c.preference_no = idx + 1));
    setChoices(newChoices);
  };

  const handleMoveDown = (index: number) => {
    if (index === choices.length - 1) return;
    const newChoices = [...choices];
    const temp = newChoices[index];
    newChoices[index] = newChoices[index + 1];
    newChoices[index + 1] = temp;
    // Re-index preferences
    newChoices.forEach((c, idx) => (c.preference_no = idx + 1));
    setChoices(newChoices);
  };

  const handleRemove = (index: number) => {
    const newChoices = choices.filter((_, i) => i !== index);
    newChoices.forEach((c, idx) => (c.preference_no = idx + 1));
    setChoices(newChoices);
  };

  // Sort strictly in descending order of projected cutoff percentile
  const handleSortDescending = () => {
    const sorted = [...choices].sort((a, b) => {
      const projA = a.projected_cutoff ?? a.closing_percentile;
      const projB = b.projected_cutoff ?? b.closing_percentile;
      return projB - projA;
    });
    sorted.forEach((c, idx) => (c.preference_no = idx + 1));
    setChoices(sorted);
  };

  // Official CAP Strategy: Ambitious (Reach) descending by projected -> Target (Borderline) descending by projected -> Safe (Likely) descending by projected
  const handleAutoArrangeStrategy = () => {
    const getProj = (c: ChoiceListItem) => c.projected_cutoff ?? c.closing_percentile;
    const reach = choices
      .filter((c) => c.likelihood === "Reach")
      .sort((a, b) => getProj(b) - getProj(a));
    const borderline = choices
      .filter((c) => c.likelihood === "Borderline")
      .sort((a, b) => getProj(b) - getProj(a));
    const likely = choices
      .filter((c) => c.likelihood === "Likely")
      .sort((a, b) => getProj(b) - getProj(a));

    const reordered = [...reach, ...borderline, ...likely];
    reordered.forEach((c, idx) => (c.preference_no = idx + 1));
    setChoices(reordered);
  };

  const handleExportPDF = async () => {
    if (choices.length === 0) return;
    try {
      setExporting("pdf");
      const payload: CapOptionFormExportRequest = {
        student_name: studentName,
        application_id: appId,
        percentile: candidatePercentile,
        category,
        merit_rank: meritRank,
        choices,
      };
      await exportCapOptionFormPDF(payload);
    } catch (err: any) {
      alert("PDF Export failed: " + err.message);
    } finally {
      setExporting(null);
    }
  };

  const handleExportCSV = async () => {
    if (choices.length === 0) return;
    try {
      setExporting("csv");
      const payload: CapOptionFormExportRequest = {
        student_name: studentName,
        application_id: appId,
        percentile: candidatePercentile,
        category,
        merit_rank: meritRank,
        choices,
      };
      await exportCapOptionFormCSV(payload);
    } catch (err: any) {
      alert("CSV Export failed: " + err.message);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center">
              <ListOrdered className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Official CAP Round Option Form
                </span>
                <span className="text-xs text-slate-400">Maharashtra State CET Cell Format</span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white mt-0.5">
                Centralized Admission Choice List Generator
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Candidate Summary & Strategy Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] font-semibold uppercase">Candidate</span>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="font-bold text-slate-900 bg-transparent border-b border-dashed border-slate-400 focus:outline-hidden w-full"
            />
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] font-semibold uppercase">Application ID</span>
            <input
              type="text"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              className="font-mono font-bold text-blue-700 bg-transparent border-b border-dashed border-slate-400 focus:outline-hidden w-full"
            />
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] font-semibold uppercase">MHT CET Percentile</span>
            <span className="font-extrabold text-slate-900 text-sm">{candidatePercentile.toFixed(2)}%</span>
            <span className="text-[11px] text-slate-500 ml-1.5">({category})</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] font-semibold uppercase">Total Choices</span>
            <span className="font-extrabold text-emerald-700 text-sm">{choices.length} Options</span>
            <span className="text-[10px] text-slate-400 ml-1.5">(Max 300 allowed)</span>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="px-5 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleAutoArrangeStrategy}
              disabled={choices.length === 0}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Arrange according to official CAP strategy: Reach (Dream) -> Borderline (Target) -> Likely (Safe)"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Auto-Arrange (CAP Strategy)</span>
            </button>

            <button
              onClick={handleSortDescending}
              disabled={choices.length === 0}
              className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Sort all choices strictly in descending order of projected cutoff percentile"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sort Descending by Projected Cutoff</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              disabled={choices.length === 0 || exporting !== null}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{exporting === "pdf" ? "Exporting..." : "Download Official PDF"}</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={choices.length === 0 || exporting !== null}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>{exporting === "csv" ? "Exporting..." : "Export CSV"}</span>
            </button>
          </div>
        </div>

        {/* Option Form Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {choices.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <HelpCircle className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="font-extrabold text-slate-800 text-base">No choices added yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Generate predictions first or add items from your shortlisted colleges to formulate your CAP Round Choice List.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              {/* Descending Sort Notice Banner */}
              <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 flex items-center justify-between text-xs text-blue-900">
                <div className="flex items-center gap-2 font-semibold">
                  <Sparkles className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>
                    Choices sorted in <b>descending order</b> according to <b>Projected {choices[0]?.projected_year || 2025} Cutoff</b>.
                  </span>
                </div>
                <span className="text-[11px] text-blue-600 font-medium hidden sm:inline">
                  Highest cutoff options prioritized as top preferences
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="py-2.5 px-3 w-16 text-center">Pref #</th>
                      <th className="py-2.5 px-3 w-36">Choice Code (9-Digit)</th>
                      <th className="py-2.5 px-3">Institute & Location</th>
                      <th className="py-2.5 px-3">Course / Branch</th>
                      <th className="py-2.5 px-3 w-20">Quota</th>
                      <th className="py-2.5 px-3 w-28 text-right">Projected (%)</th>
                      <th className="py-2.5 px-3 w-24 text-right">2024 Cutoff</th>
                      <th className="py-2.5 px-3 w-24 text-center">Likelihood</th>
                      <th className="py-2.5 px-3 w-20 text-center">Reorder</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {choices.map((c, idx) => (
                      <tr
                        key={`${c.college_code}-${c.branch_code}-${idx}`}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        {/* Preference Number */}
                        <td className="py-2.5 px-3 text-center font-extrabold text-slate-900">
                          <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-300 inline-flex items-center justify-center text-xs">
                            {c.preference_no}
                          </span>
                        </td>

                        {/* 9-Digit Choice Code */}
                        <td className="py-2.5 px-3">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-900 font-mono font-extrabold text-xs">
                            <span>{c.choice_code}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(c.choice_code)}
                              className="text-blue-500 hover:text-blue-700 transition-colors"
                              title="Copy Choice Code"
                            >
                              {copiedCode === c.choice_code ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Institute Name */}
                        <td className="py-2.5 px-3">
                          <span className="font-extrabold text-slate-900 block leading-tight">
                            {c.college_name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold">
                            Code: {c.college_code} • {c.city} • {c.autonomy_status}
                          </span>
                        </td>

                        {/* Course Name */}
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-slate-800">{c.branch_name}</span>
                        </td>

                        {/* Seat Quota */}
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700 text-[10px]">
                            {c.seat_type}
                          </span>
                        </td>

                        {/* Projected Cutoff */}
                        <td className="py-2.5 px-3 text-right">
                          <span className="font-extrabold text-blue-700 font-mono text-xs">
                            {(c.projected_cutoff ?? c.closing_percentile).toFixed(2)}%
                          </span>
                          <span className="block text-[9px] text-indigo-500 font-bold uppercase">
                            {c.projected_year || 2025} Proj
                          </span>
                        </td>

                        {/* 2024 Historical Cutoff */}
                        <td className="py-2.5 px-3 text-right">
                          <span className="font-semibold text-slate-600">
                            {c.closing_percentile.toFixed(2)}%
                          </span>
                        </td>

                        {/* Likelihood */}
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] ${
                              c.likelihood === "Likely"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : c.likelihood === "Borderline"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {c.likelihood}
                          </span>
                        </td>

                        {/* Actions (Move Up / Down / Remove) */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleMoveUp(idx)}
                              disabled={idx === 0}
                              className="p-1 rounded text-slate-400 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100"
                              title="Move up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveDown(idx)}
                              disabled={idx === choices.length - 1}
                              className="p-1 rounded text-slate-400 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100"
                              title="Move down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemove(idx)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1"
                              title="Remove option"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Guidance Note */}
          <div className="mt-4 p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/60 text-xs text-blue-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <b>Option Form Direct Usage:</b> The 9-digit choice codes generated above match Maharashtra DTE specifications. During CAP Round Option Form filling on <code>cetcell.mahacet.org</code>, copy and submit these choice codes in this verified order to ensure maximum admission probability.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-semibold">
            Preference order can be customized by moving choices up or down.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors"
          >
            Done & Close
          </button>
        </div>
      </div>
    </div>
  );
}