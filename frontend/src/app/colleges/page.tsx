"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import {
  Search, MapPin, Building, Award, ExternalLink, IndianRupee,
  Layers, X, GraduationCap, ArrowDownWideNarrow, CheckCircle
} from "lucide-react";

export default function CollegesPage() {
  const [colleges, setColleges] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState<number | null>(null);
  const [collegeDetails, setCollegeDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

  useEffect(() => {
    fetch(`${API_BASE}/colleges/cities/list`)
      .then((res) => res.json())
      .then(setCities)
      .catch(() => {});
  }, [API_BASE]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.append("search", search.trim());
    if (cityFilter !== "All") params.append("city", cityFilter);
    if (typeFilter !== "All") params.append("institute_type", typeFilter);
    params.append("limit", "50");

    fetch(`${API_BASE}/colleges?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setColleges(data.items || []))
      .catch(() => setColleges([]))
      .finally(() => setLoading(false));
  }, [search, cityFilter, typeFilter]);

  const handleOpenCollege = async (id: number) => {
    setSelectedCollegeId(id);
    setDetailsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/colleges/${id}`);
      const data = await res.json();
      setCollegeDetails(data);
    } catch {
      setCollegeDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Maharashtra Engineering College Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Explore autonomous universities, government institutes, and accredited colleges participating in CAP rounds.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search college name, code, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          <div>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium bg-white"
            >
              <option value="All">All Cities in Maharashtra</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium bg-white"
            >
              <option value="All">All Institute Types</option>
              <option value="Government">Government Institutes</option>
              <option value="Autonomous">Autonomous Institutes</option>
              <option value="Un-Aided">Un-Aided / Private Institutes</option>
            </select>
          </div>
        </div>

        {/* Colleges Grid */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-500">Loading colleges...</p>
          </div>
        ) : colleges.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {colleges.map((col) => (
              <div
                key={col.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-blue-700 mb-1">
                    <span>Code: {col.college_code}</span>
                    <span className="text-slate-500">{col.autonomy_status}</span>
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                    {col.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">{col.university}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">LOCATION</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {col.city}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">ANNUAL FEE</span>
                    <span className="font-extrabold text-slate-900">
                      {col.total_annual_fee ? `₹${col.total_annual_fee.toLocaleString()}` : "CAP Matrix"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenCollege(col.id)}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>View Courses ({col.branches_count})</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-600">★ {col.rating}</span>
                    {col.website && (
                      <a
                        href={col.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-blue-600 p-1 transition-colors"
                        title="Official Website"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center bg-white rounded-xl border border-slate-200">
            <Building className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-slate-800">No colleges match your filter</h4>
            <p className="text-xs text-slate-500 mt-1">Try resetting the search keyword or city filter.</p>
          </div>
        )}

        {/* College Details & Courses Modal (Sorted Descending by Cutoff) */}
        {selectedCollegeId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-scaleUp">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-start justify-between">
                <div>
                  <span className="text-xs text-blue-400 font-bold block mb-1">
                    Code: {collegeDetails?.college_code} • {collegeDetails?.autonomy_status}
                  </span>
                  <h3 className="font-extrabold text-base sm:text-lg leading-tight">
                    {collegeDetails?.name || "Loading College Details..."}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">{collegeDetails?.university}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedCollegeId(null);
                    setCollegeDetails(null);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-4">
                {detailsLoading ? (
                  <div className="py-12 text-center space-y-2">
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-slate-500 font-medium">Loading verified branch offerings...</p>
                  </div>
                ) : collegeDetails ? (
                  <>
                    {/* Notice bar on descending order */}
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
                      <ArrowDownWideNarrow className="w-4 h-4 text-blue-700 shrink-0" />
                      <span className="font-semibold">
                        Courses displayed in descending order of historical closing cutoff percentile (General Merit).
                      </span>
                    </div>

                    {/* Courses List */}
                    <div className="space-y-2">
                      {collegeDetails.branches && collegeDetails.branches.length > 0 ? (
                        collegeDetails.branches.map((b: any, idx: number) => (
                          <div
                            key={b.branch_id}
                            className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white shadow-2xs flex items-center justify-between gap-3"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                                  {idx + 1}. {b.branch_name}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                  {b.course_code}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500">
                                Intake: {b.sanctioned_intake} seats • {b.accreditation_status}
                              </p>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-[10px] text-slate-400 font-bold block uppercase">Closing Cutoff</span>
                              <span className="font-extrabold text-blue-700 text-sm">
                                {b.closing_percentile > 0 ? `${b.closing_percentile.toFixed(2)}%` : "CAP Matrix"}
                              </span>
                              {b.closing_rank && (
                                <span className="text-[10px] text-slate-500 block">
                                  Rank ~{b.closing_rank.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500 py-4 text-center">No branch cutoffs on record.</p>
                      )}
                    </div>
                  </>
                ) : null}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => {
                    setSelectedCollegeId(null);
                    setCollegeDetails(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
