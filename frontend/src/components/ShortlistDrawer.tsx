"use client";

import { useState } from "react";
import { X, Bookmark, FileSpreadsheet, FileText, Trash2, ExternalLink, ListOrdered } from "lucide-react";
import { exportCSV, exportPDF, removeFromShortlist, PredictionItem } from "@/lib/api";

interface ShortlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  shortlistItems: PredictionItem[];
  candidatePercentile: number;
  category: string;
  onRemove: (collegeId: number, branchId: number) => void;
  onOpenChoiceList?: () => void;
}

export default function ShortlistDrawer({
  isOpen,
  onClose,
  shortlistItems,
  candidatePercentile,
  category,
  onRemove,
  onOpenChoiceList,
}: ShortlistDrawerProps) {
  const [exporting, setExporting] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportCSV = async () => {
    try {
      setExporting("csv");
      const payload = {
        student_name: "Candidate Aspirant",
        percentile: candidatePercentile,
        category,
        items: shortlistItems.map((i) => ({
          college_name: i.college_name,
          city: i.city,
          branch_name: i.branch_name,
          likelihood: i.likelihood,
          closing_percentile: i.closing_percentile,
          margin: i.margin,
          total_annual_fee: i.total_annual_fee,
        })),
      };
      await exportCSV(payload);
    } catch (err) {
      alert("CSV export failed: " + err);
    } finally {
      setExporting(null);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExporting("pdf");
      const payload = {
        student_name: "Candidate Aspirant",
        percentile: candidatePercentile,
        category,
        items: shortlistItems.map((i) => ({
          college_name: i.college_name,
          city: i.city,
          branch_name: i.branch_name,
          likelihood: i.likelihood,
          closing_percentile: i.closing_percentile,
          margin: i.margin,
          total_annual_fee: i.total_annual_fee,
        })),
      };
      await exportPDF(payload);
    } catch (err) {
      alert("PDF export failed: " + err);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col border-l border-slate-200 animate-slideLeft">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-emerald-600" />
            <h3 className="font-extrabold text-slate-900 text-lg">My Shortlist</h3>
            <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold">
              {shortlistItems.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortlist Content List */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {shortlistItems.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <Bookmark className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700 text-base">Your shortlist is empty</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Click the "Save" button on any predicted college card to add it to your CAP preference shortlist.
              </p>
            </div>
          ) : (
            shortlistItems.map((item, idx) => (
              <div
                key={`${item.college_id}-${item.branch_id}`}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 transition-all bg-white shadow-2xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-blue-700 block">
                      Code: {item.college_code} • {item.city}
                    </span>
                    <h5 className="font-bold text-slate-900 text-sm leading-tight line-clamp-1">
                      {item.college_name}
                    </h5>
                    <p className="text-xs text-slate-600 font-medium">{item.branch_name}</p>
                  </div>
                  <button
                    onClick={() => onRemove(item.college_id, item.branch_id)}
                    className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                    title="Remove from shortlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <span
                    className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                      item.likelihood === "Likely"
                        ? "bg-emerald-50 text-emerald-700"
                        : item.likelihood === "Borderline"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {item.likelihood}
                  </span>
                  <div className="text-slate-700">
                    Cutoff: <b className="text-slate-900">{item.closing_percentile.toFixed(2)}%</b>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Export Buttons Footer */}
        {shortlistItems.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2.5">
            {onOpenChoiceList && (
              <button
                onClick={onOpenChoiceList}
                className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <ListOrdered className="w-4 h-4 text-indigo-200" />
                <span>Create Official CAP Option Form</span>
              </button>
            )}

            <div className="text-xs text-slate-500 font-medium pt-1">
              Quick exports:
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportPDF}
                disabled={exporting !== null}
                className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <FileText className="w-4 h-4" />
                <span>{exporting === "pdf" ? "Exporting..." : "Download PDF"}</span>
              </button>

              <button
                onClick={handleExportCSV}
                disabled={exporting !== null}
                className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-300 flex items-center justify-center gap-1.5 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>{exporting === "csv" ? "Exporting..." : "Export CSV"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
