const getApiBase = (): string => {
  let url = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
  url = url.trim().replace(/\/+$/, "");
  if (!url.endsWith("/api")) {
    url = `${url}/api`;
  }
  return url;
};

export const API_BASE = getApiBase();

export interface CandidateInput {
  percentile: number;
  merit_rank?: number | null;
  category: string;
  gender?: string;
  home_university?: string | null;
  domicile?: string;
  preferred_branches?: string[];
  preferred_cities?: string[];
  preferred_colleges?: number[];
  max_fees?: number | null;
  institution_type?: string;
  cap_round?: string;
  target_year?: number;
}

export interface PredictionItem {
  college_id: number;
  college_code: string;
  college_name: string;
  short_name: string;
  city: string;
  university: string;
  institute_type: string;
  autonomy_status: string;
  rating: number;
  nirf_ranking?: number;
  website?: string;
  branch_id: number;
  branch_code: string;
  branch_name: string;
  choice_code?: string;
  category: string;
  seat_type: string;
  cap_round: string;
  year: number;
  closing_percentile: number;
  projected_cutoff?: number;
  projected_year?: number;
  projected_margin?: number;
  opening_percentile: number;
  closing_rank?: number;
  opening_rank?: number;
  margin: number;
  likelihood: "Likely" | "Borderline" | "Reach";
  probability: number;
  explanation: string;
  total_annual_fee?: number | null;
  hostel_fee_annual?: number | null;
  trend: Array<{
    year: number;
    cap_round: string;
    closing_percentile: number;
    closing_rank?: number;
  }>;
  disclaimer: string;
}

export interface ChoiceListItem {
  preference_no: number;
  choice_code: string;
  college_code: string;
  college_name: string;
  city: string;
  branch_code: string;
  branch_name: string;
  seat_type: string;
  likelihood: "Likely" | "Borderline" | "Reach";
  closing_percentile: number;
  closing_rank?: number | null;
  total_annual_fee?: number | null;
  autonomy_status?: string | null;
}

export interface CapOptionFormExportRequest {
  student_name?: string;
  application_id?: string;
  percentile: number;
  merit_rank?: number | null;
  category: string;
  gender?: string;
  home_university?: string | null;
  candidate_type?: string;
  cap_round?: string;
  choices: ChoiceListItem[];
}

export interface PredictionResponse {
  summary: {
    candidate_percentile: number;
    candidate_rank?: number | null;
    category_used: string;
    total_matches: number;
    likely_count: number;
    borderline_count: number;
    reach_count: number;
  };
  results: {
    likely: PredictionItem[];
    borderline: PredictionItem[];
    reach: PredictionItem[];
  };
  all_results: PredictionItem[];
  alternatives: {
    alternative_branches: Array<{
      college_id: number;
      college_name: string;
      city: string;
      branch_name: string;
      closing_percentile: number;
      reason: string;
    }>;
    alternative_colleges: any[];
  };
}

export async function fetchCategories(): Promise<Array<{ code: string; label: string; group: string }>> {
  const res = await fetch(`${API_BASE}/predict/categories`);
  if (!res.ok) throw new Error("Failed to load admission categories.");
  return res.json();
}

export async function fetchUniversities(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/predict/universities`);
  if (!res.ok) throw new Error("Failed to load universities.");
  return res.json();
}

export async function fetchBranches(): Promise<Array<{ id: number; branch_code: string; name: string }>> {
  const res = await fetch(`${API_BASE}/colleges/branches/list`);
  if (!res.ok) throw new Error("Failed to load branches.");
  return res.json();
}

export async function fetchCities(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/colleges/cities/list`);
  if (!res.ok) throw new Error("Failed to load cities.");
  return res.json();
}

export async function generatePredictions(payload: CandidateInput): Promise<PredictionResponse> {
  const res = await fetch(`${API_BASE}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Prediction request failed.");
  }
  return res.json();
}

export async function compareColleges(items: Array<{ college_id: number; branch_id: number }>, category: string = "GOPENS", candidatePercentile?: number) {
  const res = await fetch(`${API_BASE}/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items,
      category,
      candidate_percentile: candidatePercentile,
    }),
  });
  if (!res.ok) throw new Error("Comparison failed.");
  return res.json();
}

export async function saveToShortlist(item: {
  student_session_id: string;
  college_id: number;
  branch_id: number;
  likelihood: string;
  candidate_percentile?: number;
  notes?: string;
}) {
  const res = await fetch(`${API_BASE}/shortlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  return res.json();
}

export async function fetchShortlist(sessionId: string) {
  const res = await fetch(`${API_BASE}/shortlist?session_id=${sessionId}`);
  if (!res.ok) throw new Error("Failed to retrieve shortlist.");
  return res.json();
}

export async function removeFromShortlist(shortlistId: number) {
  const res = await fetch(`${API_BASE}/shortlist/${shortlistId}`, { method: "DELETE" });
  return res.json();
}

export async function exportCSV(exportData: any) {
  const res = await fetch(`${API_BASE}/shortlist/export/csv`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(exportData),
  });
  if (!res.ok) throw new Error("CSV export failed.");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mhtcet_predictions_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function exportPDF(exportData: any) {
  const res = await fetch(`${API_BASE}/shortlist/export/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(exportData),
  });
  if (!res.ok) throw new Error("PDF export failed.");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mhtcet_report_${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function exportCapOptionFormCSV(exportData: CapOptionFormExportRequest) {
  const res = await fetch(`${API_BASE}/shortlist/cap-option-form/export/csv`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(exportData),
  });
  if (!res.ok) throw new Error("CAP Choice List CSV export failed.");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mhtcet_cap_choice_list_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function exportCapOptionFormPDF(exportData: CapOptionFormExportRequest) {
  const res = await fetch(`${API_BASE}/shortlist/cap-option-form/export/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(exportData),
  });
  if (!res.ok) throw new Error("CAP Option Form PDF export failed.");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mhtcet_cap_option_form_${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ---------------- Admin API Functions ----------------

export async function adminLogin(username: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Invalid administrative credentials.");
  }
  return res.json();
}

export async function getAdminStats(token: string) {
  const res = await fetch(`${API_BASE}/admin/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Unauthorized or session expired.");
  return res.json();
}

export async function getAdminModels(token: string) {
  const res = await fetch(`${API_BASE}/admin/models`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function getActiveModel(token: string) {
  const res = await fetch(`${API_BASE}/admin/models/active`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function trainModel(token: string, payload: { algorithm: string; hyperparameters?: any }) {
  const res = await fetch(`${API_BASE}/admin/models/train`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Training job failed.");
  }
  return res.json();
}

export async function activateModel(token: string, modelId: number) {
  const res = await fetch(`${API_BASE}/admin/models/${modelId}/activate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Model activation failed.");
  }
  return res.json();
}

export async function rollbackModel(token: string) {
  const res = await fetch(`${API_BASE}/admin/models/rollback`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Model rollback failed.");
  }
  return res.json();
}

export async function getAdminJobs(token: string) {
  const res = await fetch(`${API_BASE}/admin/jobs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function getAuditLogs(token: string) {
  const res = await fetch(`${API_BASE}/admin/audit-logs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function uploadAndValidateDataset(token: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/admin/datasets/upload-validate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Dataset validation failed.");
  }
  return res.json();
}

export async function publishDataset(token: string, payload: any) {
  const res = await fetch(`${API_BASE}/admin/datasets/publish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Publishing dataset failed.");
  }
  return res.json();
}

export async function getDatasetVersions(token: string) {
  const res = await fetch(`${API_BASE}/admin/datasets/versions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}
