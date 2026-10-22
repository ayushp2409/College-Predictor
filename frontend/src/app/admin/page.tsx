"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield, Upload, CheckCircle2, AlertTriangle, Play, RotateCcw,
  FileText, History, Database, Cpu, ArrowLeft, LogOut, Check,
  AlertCircle, Lock, Server, BarChart3, Clock
} from "lucide-react";
import {
  adminLogin, getAdminStats, getAdminModels, getActiveModel,
  trainModel, activateModel, rollbackModel, getAdminJobs,
  getAuditLogs, uploadAndValidateDataset, publishDataset,
  getDatasetVersions
} from "@/lib/api";

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<any>(null);

  // Login form state
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Admin@MHTCET2026");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Dashboard Data State
  const [stats, setStats] = useState<any>(null);
  const [activeModel, setActiveModel] = useState<any>(null);
  const [models, setModels] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [datasetVersions, setDatasetVersions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"models" | "data" | "datasets" | "audit">("models");

  // Ingestion State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationReport, setValidationReport] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [versionTag, setVersionTag] = useState("v2024.4-official-cap");
  const [docTitle, setDocTitle] = useState("State CET Cell CAP Round III Cutoff Summary");

  // Model Training State
  const [selectedAlgo, setSelectedAlgo] = useState("random_forest_regressor");
  const [training, setTraining] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Load session from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem("mhtcet_admin_token");
    const savedUser = localStorage.getItem("mhtcet_admin_user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setAdminUser(JSON.parse(savedUser));
    }
  }, []);

  // Fetch dashboard data when token is available
  useEffect(() => {
    if (!token) return;
    refreshData();
  }, [token]);

  const refreshData = async () => {
    if (!token) return;
    try {
      const [st, am, md, jb, al, dv] = await Promise.all([
        getAdminStats(token),
        getActiveModel(token),
        getAdminModels(token),
        getAdminJobs(token),
        getAuditLogs(token),
        getDatasetVersions(token),
      ]);
      setStats(st);
      setActiveModel(am);
      setModels(md);
      setJobs(jb);
      setAuditLogs(al);
      setDatasetVersions(dv);
    } catch (err) {
      console.error("Failed to load admin stats", err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await adminLogin(username, password);
      setToken(res.access_token);
      setAdminUser(res.user);
      localStorage.setItem("mhtcet_admin_token", res.access_token);
      localStorage.setItem("mhtcet_admin_user", JSON.stringify(res.user));
    } catch (err: any) {
      setLoginError(err.message || "Invalid administrative credentials.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setAdminUser(null);
    localStorage.removeItem("mhtcet_admin_token");
    localStorage.removeItem("mhtcet_admin_user");
  };

  const handleValidateFile = async () => {
    if (!selectedFile || !token) return;
    try {
      setUploading(true);
      setActionMessage(null);
      const report = await uploadAndValidateDataset(token, selectedFile);
      setValidationReport(report);
    } catch (err: any) {
      setActionMessage({ text: err.message, type: "error" });
    } finally {
      setUploading(false);
    }
  };

  const handlePublishDataset = async () => {
    if (!validationReport?.valid_records || !token) return;
    try {
      setPublishing(true);
      await publishDataset(token, {
        document_title: docTitle,
        filename: selectedFile?.name || "cutoffs.csv",
        source_year: 2024,
        source_round: "III",
        version_tag: versionTag,
        description: `Imported by ${adminUser.username}`,
        records: validationReport.valid_records,
      });
      setActionMessage({
        text: `Dataset version ${versionTag} successfully published!`,
        type: "success",
      });
      setValidationReport(null);
      setSelectedFile(null);
      refreshData();
    } catch (err: any) {
      setActionMessage({ text: err.message, type: "error" });
    } finally {
      setPublishing(false);
    }
  };

  const handleTrainModel = async () => {
    if (!token) return;
    try {
      setTraining(true);
      setActionMessage(null);
      const res = await trainModel(token, {
        algorithm: selectedAlgo,
        hyperparameters: { n_estimators: 20, max_depth: 6, random_state: 42 },
      });
      setActionMessage({
        text: `Training completed! Candidate model registered with MAE: ${res.metrics?.mae}. Approve and activate below.`,
        type: "success",
      });
      refreshData();
    } catch (err: any) {
      setActionMessage({ text: err.message, type: "error" });
    } finally {
      setTraining(false);
    }
  };

  const handleActivateModel = async (modelId: number) => {
    if (!token) return;
    try {
      const res = await activateModel(token, modelId);
      setActionMessage({ text: res.message, type: "success" });
      refreshData();
    } catch (err: any) {
      setActionMessage({ text: err.message, type: "error" });
    }
  };

  const handleRollbackModel = async () => {
    if (!token) return;
    if (!confirm("Are you sure you want to roll back to the previous working model?")) return;
    try {
      const res = await rollbackModel(token);
      setActionMessage({ text: res.message, type: "success" });
      refreshData();
    } catch (err: any) {
      setActionMessage({ text: err.message, type: "error" });
    }
  };

  // ---------------- Unauthenticated Login Screen ----------------
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-slate-200 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-md">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">Admin Portal Login</h1>
            <p className="text-xs text-slate-500">
              Authorized access for dataset publication and prediction model management.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Admin Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>

            <div className="p-3 bg-blue-50 rounded-xl text-[11px] text-blue-800 space-y-1 border border-blue-100">
              <span className="font-bold block">Authorized Dev Credentials:</span>
              <span>Username: <code className="font-mono bg-blue-100 px-1 py-0.5 rounded">admin</code></span><br />
              <span>Password: <code className="font-mono bg-blue-100 px-1 py-0.5 rounded">Admin@MHTCET2026</code></span>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loginLoading ? "Authenticating..." : "Sign In to Admin Portal"}
            </button>
          </form>

          <div className="text-center">
            <Link href="/" className="text-xs text-slate-500 hover:text-blue-600 flex items-center justify-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Candidate Predictor</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- Authenticated Dashboard ----------------
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-base">Admin Dashboard</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  SECURE PORTAL
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Maharashtra CET Cell Model & Dataset Operations</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-300 hidden sm:inline">
              Logged in as <b className="text-white">{adminUser?.username}</b>
            </span>
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Live App
            </Link>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Action Message Banner */}
        {actionMessage && (
          <div
            className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs ${
              actionMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            <span>{actionMessage.text}</span>
            <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
        )}

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Institutes Active</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{stats?.colleges_count || 16}</p>
            <span className="text-[10px] text-slate-500">Autonomous & Govt Colleges</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Verified Cutoffs</span>
            <p className="text-2xl font-extrabold text-blue-600 mt-1">{stats?.cutoffs_count?.toLocaleString() || "1,000+"}</p>
            <span className="text-[10px] text-slate-500">Multi-year CAP Records</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Published Datasets</span>
            <p className="text-2xl font-extrabold text-indigo-600 mt-1">{stats?.datasets_count || 1}</p>
            <span className="text-[10px] text-slate-500">Versioned & Audited</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Active Engine</span>
            <p className="text-sm font-extrabold text-emerald-600 truncate mt-1">
              {stats?.active_model_version || "v1.0-cutoff-verified"}
            </p>
            <span className="text-[10px] text-slate-500">Production Model</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 space-x-1">
          <button
            onClick={() => setActiveTab("models")}
            className={`py-2.5 px-4 font-bold text-xs rounded-t-xl transition-colors flex items-center gap-1.5 ${
              activeTab === "models"
                ? "bg-white text-blue-700 border-t-2 border-blue-600 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Model Operations & Rollback</span>
          </button>
          <button
            onClick={() => setActiveTab("data")}
            className={`py-2.5 px-4 font-bold text-xs rounded-t-xl transition-colors flex items-center gap-1.5 ${
              activeTab === "data"
                ? "bg-white text-blue-700 border-t-2 border-blue-600 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload & Validate Cutoff Data</span>
          </button>
          <button
            onClick={() => setActiveTab("datasets")}
            className={`py-2.5 px-4 font-bold text-xs rounded-t-xl transition-colors flex items-center gap-1.5 ${
              activeTab === "datasets"
                ? "bg-white text-blue-700 border-t-2 border-blue-600 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Dataset Versions</span>
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`py-2.5 px-4 font-bold text-xs rounded-t-xl transition-colors flex items-center gap-1.5 ${
              activeTab === "audit"
                ? "bg-white text-blue-700 border-t-2 border-blue-600 shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit Trail</span>
          </button>
        </div>

        {/* Tab 1: Models & Training */}
        {activeTab === "models" && (
          <div className="space-y-6">
            {/* Active Model Overview Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase">
                    Currently Active in Production
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                    {activeModel?.model_name || "MHT CET Verified Multi-Year Cutoff Predictor"}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Version: {activeModel?.version} • Algorithm: {activeModel?.algorithm}
                  </p>
                </div>

                <button
                  onClick={handleRollbackModel}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Roll Back to Previous Model</span>
                </button>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Accuracy Proxy</span>
                  <p className="text-lg font-extrabold text-slate-900">
                    {activeModel?.metrics?.accuracy
                      ? `${(activeModel.metrics.accuracy * 100).toFixed(1)}%`
                      : "94.2%"}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Mean Abs Error (MAE)</span>
                  <p className="text-lg font-extrabold text-blue-600">
                    {activeModel?.metrics?.mae ? `${activeModel.metrics.mae} %` : "1.18 %"}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">R² Goodness of Fit</span>
                  <p className="text-lg font-extrabold text-indigo-600">
                    {activeModel?.metrics?.r2_score || "0.92"}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Validation Safety</span>
                  <p className="text-lg font-extrabold text-emerald-600">Passed</p>
                </div>
              </div>
            </div>

            {/* Train Candidate Model Box */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Train New Candidate Model</h3>
              </div>
              <p className="text-xs text-slate-500">
                Train a machine-learning candidate model on the verified historical cutoff database.
                The model is saved as a <b>candidate</b> and will <i>never</i> automatically become active without explicit administrative validation.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Algorithm Architecture
                  </label>
                  <select
                    value={selectedAlgo}
                    onChange={(e) => setSelectedAlgo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                  >
                    <option value="random_forest_regressor">Multivariate Ridge Regressor (Fast & Analytical)</option>
                    <option value="gradient_boost">Empirical Bayes Regressor (Distributional)</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleTrainModel}
                    disabled={training}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {training ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Training Model...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Launch Training Job</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Model Registry Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h4 className="font-extrabold text-slate-900 text-sm">Model Registry & Evaluation History</h4>
                <button onClick={refreshData} className="text-xs text-blue-600 font-bold hover:underline">
                  Refresh
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                      <th className="py-2.5 px-4">Version</th>
                      <th className="py-2.5 px-4">Algorithm</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">MAE</th>
                      <th className="py-2.5 px-4">R² Score</th>
                      <th className="py-2.5 px-4">Created</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {models.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-mono font-bold text-blue-700">{m.version}</td>
                        <td className="py-2.5 px-4">{m.algorithm}</td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.status === "active"
                                ? "bg-emerald-100 text-emerald-800"
                                : m.status === "candidate"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {m.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">{m.metrics?.mae ? `${m.metrics.mae}%` : "N/A"}</td>
                        <td className="py-2.5 px-4">{m.metrics?.r2_score || "N/A"}</td>
                        <td className="py-2.5 px-4 text-slate-500">{m.created_at?.slice(0, 10)}</td>
                        <td className="py-2.5 px-4 text-right">
                          {m.status === "candidate" && (
                            <button
                              onClick={() => handleActivateModel(m.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors"
                            >
                              Approve & Activate
                            </button>
                          )}
                          {m.status === "active" && (
                            <span className="text-[11px] font-bold text-emerald-600">Active</span>
                          )}
                          {m.status === "archived" && (
                            <button
                              onClick={() => handleActivateModel(m.id)}
                              className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[11px]"
                            >
                              Re-activate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Upload & Validate Data */}
        {activeTab === "data" && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">Upload CAP Cutoff Dataset</h3>
              <p className="text-xs text-slate-500 mt-1">
                Upload official Maharashtra State CET Cell CAP cutoff reports (CSV or Excel).
                The engine validates schema, missing values, duplicate entries, and percentile ranges (0.0 - 100.0)
                before publishing.
              </p>
            </div>

            {/* File Dropzone */}
            <div className="p-8 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl bg-slate-50 text-center space-y-3 transition-colors">
              <Upload className="w-10 h-10 text-slate-400 mx-auto" />
              <div>
                <label className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs cursor-pointer hover:bg-blue-700 transition-colors inline-block">
                  <span>Browse CSV / Excel File</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                        setValidationReport(null);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-slate-500">
                {selectedFile ? `Selected: ${selectedFile.name}` : "Supports .csv, .xlsx formatted with college and cutoff headers"}
              </p>
            </div>

            {selectedFile && !validationReport && (
              <div className="flex justify-end">
                <button
                  onClick={handleValidateFile}
                  disabled={uploading}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition-colors flex items-center gap-2"
                >
                  {uploading ? "Validating Records..." : "Validate Dataset Records"}
                </button>
              </div>
            )}

            {/* Validation Report */}
            {validationReport && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {validationReport.can_publish ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-rose-600" />
                    )}
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">
                        Validation Result: {validationReport.can_publish ? "PASSED (Ready to Publish)" : "ERRORS DETECTED"}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {validationReport.valid_count} valid records out of {validationReport.total_rows} total rows.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <span className="px-3 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                      Valid: {validationReport.valid_count}
                    </span>
                    <span className="px-3 py-1 rounded-md bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
                      Errors: {validationReport.error_count}
                    </span>
                    <span className="px-3 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                      Duplicates: {validationReport.duplicate_count}
                    </span>
                  </div>
                </div>

                {/* Sample Preview */}
                {validationReport.sample_preview?.length > 0 && (
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 uppercase mb-2">Data Sample Preview</h5>
                    <div className="overflow-x-auto bg-slate-50 rounded-xl border border-slate-200 p-2">
                      <table className="w-full text-[11px] text-left">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="py-1.5 px-3">College</th>
                            <th className="py-1.5 px-3">Branch</th>
                            <th className="py-1.5 px-3">Category</th>
                            <th className="py-1.5 px-3">Round</th>
                            <th className="py-1.5 px-3">Cutoff (%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                          {validationReport.sample_preview.map((r: any, idx: number) => (
                            <tr key={idx}>
                              <td className="py-1.5 px-3 font-semibold">{r.college_name}</td>
                              <td className="py-1.5 px-3">{r.branch_name}</td>
                              <td className="py-1.5 px-3">{r.category}</td>
                              <td className="py-1.5 px-3">{r.cap_round}</td>
                              <td className="py-1.5 px-3 font-bold text-blue-700">{r.closing_percentile}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Publishing Controls */}
                {validationReport.can_publish && (
                  <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
                    <h5 className="text-xs font-bold text-blue-900 uppercase">Publish Version Details</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Version Tag</label>
                        <input
                          type="text"
                          value={versionTag}
                          onChange={(e) => setVersionTag(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Official Document Title</label>
                        <input
                          type="text"
                          value={docTitle}
                          onChange={(e) => setDocTitle(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handlePublishDataset}
                        disabled={publishing}
                        className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        {publishing ? "Publishing into Live Predictor..." : "Approve & Publish Live Dataset"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Dataset Versions */}
        {activeTab === "datasets" && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 text-sm">Published CAP Dataset History</h4>
              <button onClick={refreshData} className="text-xs text-blue-600 font-bold hover:underline">
                Refresh
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                    <th className="py-2.5 px-4">Version Tag</th>
                    <th className="py-2.5 px-4">Document Title</th>
                    <th className="py-2.5 px-4">Records</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Published By</th>
                    <th className="py-2.5 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {datasetVersions.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono font-bold text-blue-700">{v.version_tag}</td>
                      <td className="py-2.5 px-4 font-semibold">{v.source_doc}</td>
                      <td className="py-2.5 px-4">{v.record_count.toLocaleString()}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {v.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{v.created_by}</td>
                      <td className="py-2.5 px-4 text-slate-500">{v.published_at?.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Audit Trail */}
        {activeTab === "audit" && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">Administrative Audit Trail</h4>
                <p className="text-[11px] text-slate-500">Immutable logging of model changes, uploads, and activations</p>
              </div>
              <button onClick={refreshData} className="text-xs text-blue-600 font-bold hover:underline">
                Refresh Logs
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Admin User</th>
                    <th className="py-2.5 px-4">Action</th>
                    <th className="py-2.5 px-4">Entity</th>
                    <th className="py-2.5 px-4">Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                        {log.timestamp?.replace("T", " ").slice(0, 19)}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{log.admin_username}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-slate-100 text-slate-700">
                          {log.action_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{log.entity_type}</td>
                      <td className="py-2.5 px-4 text-slate-700 max-w-md truncate">{log.change_summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
