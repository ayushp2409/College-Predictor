"use client";

import Link from "next/link";
import { useState } from "react";
import { GraduationCap, BarChart2, Bookmark, Shield, Search, Menu, X, ListOrdered } from "lucide-react";

interface NavbarProps {
  shortlistCount?: number;
  onOpenShortlist?: () => void;
  onOpenCompare?: () => void;
  compareCount?: number;
  onOpenChoiceList?: () => void;
}

export default function Navbar({
  shortlistCount = 0,
  onOpenShortlist,
  onOpenCompare,
  compareCount = 0,
  onOpenChoiceList,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-lg">MHT CET</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700">Predictor</span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block font-medium">Verified Historical CAP Admission Engine</p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2">
            <Link
              href="/"
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-colors"
            >
              Predictor
            </Link>
            <Link
              href="/colleges"
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              <Search className="w-4 h-4 text-slate-400" />
              Colleges
            </Link>

            {/* Compare pill */}
            <button
              onClick={onOpenCompare}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                compareCount > 0
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span>Compare</span>
              {compareCount > 0 && (
                <span className="bg-indigo-600 text-white text-xs px-1.5 py-0.2 rounded-full font-bold">
                  {compareCount}
                </span>
              )}
            </button>

            {/* Shortlist pill */}
            <button
              onClick={onOpenShortlist}
              className="relative px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              <Bookmark className="w-4 h-4 text-slate-500" />
              <span>Shortlist</span>
              {shortlistCount > 0 && (
                <span className="bg-emerald-600 text-white text-xs px-1.5 py-0.2 rounded-full font-bold">
                  {shortlistCount}
                </span>
              )}
            </button>

            {/* CAP Option Form / Choice List */}
            {onOpenChoiceList && (
              <button
                onClick={onOpenChoiceList}
                className="px-3 py-1.5 rounded-lg text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <ListOrdered className="w-4 h-4 text-blue-600" />
                <span>CAP Choice List</span>
              </button>
            )}

            {/* Admin Link */}
            <Link
              href="/admin"
              className="ml-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200/80"
            >
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              Admin Portal
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <div className="md:hidden flex items-center gap-2">
            {shortlistCount > 0 && (
              <button
                onClick={onOpenShortlist}
                className="p-2 text-slate-700 relative"
              >
                <Bookmark className="w-5 h-5 text-emerald-600" />
                <span className="absolute top-1 right-1 w-4 h-4 bg-emerald-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {shortlistCount}
                </span>
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-2">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100"
          >
            Predictor
          </Link>
          <Link
            href="/colleges"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100"
          >
            Colleges & Branches
          </Link>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenCompare && onOpenCompare();
            }}
            className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100 flex items-center justify-between"
          >
            <span>Compare Colleges</span>
            {compareCount > 0 && (
              <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                {compareCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenShortlist && onOpenShortlist();
            }}
            className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100 flex items-center justify-between"
          >
            <span>Saved Shortlist</span>
            {shortlistCount > 0 && (
              <span className="bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                {shortlistCount}
              </span>
            )}
          </button>
          <Link
            href="/admin"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-blue-600 bg-blue-50 hover:bg-blue-100"
          >
            Admin Dashboard
          </Link>
        </div>
      )}
    </header>
  );
}
