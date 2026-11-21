// Thin fetch client for the CivicFix Express API (backend/, default http://localhost:5000/api/v1).
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/+$/, '');
export const API_ORIGIN = API_BASE.replace(/\/api\/v1$/, '');

const TOKEN_KEY = 'civicfix_token';
export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = (t) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ }
};

export class ApiError extends Error {
  constructor(status, body) {
    super((body && (body.message || body.error)) || `Request failed (${status})`);
    this.status = status;
    this.body = body || {};
    this.code = this.body.code || null;
  }
}

export async function request(path, { method = 'GET', json, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (form) body = form; // browser sets multipart boundary
  else if (json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json); }
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { method, headers, body });
  } catch {
    throw new ApiError(0, { message: 'Cannot reach the CivicFix server. Is the backend running on port 5000?' });
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

const qs = (params) => Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
export const assetUrl = (u) => (!u ? null : /^https?:/i.test(u) ? u : `${API_ORIGIN}${u}`);

// The CSV export needs the auth header, so it is fetched as a blob and saved from the browser
export async function downloadReportsCsv() {
  const res = await fetch(`${API_BASE}/admin/export/reports.csv`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new ApiError(res.status, null);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url; a.download = 'civicfix-reports.csv';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', json: { email, password } }),
  register: (payload) => request('/auth/register', { method: 'POST', json: payload }),
  me: () => request('/auth/me'),
  listReports: () => request('/reports?limit=100'),
  myReports: () => request('/reports/my?limit=100'),
  civicCreds: () => request('/users/civic-creds'),
  leaderboard: () => request('/users/leaderboard'),
  precheckImage: (file) => {
    const form = new FormData();
    form.append('image', file);
    return request('/ai/analyze-upload', { method: 'POST', form });
  },
  uploadImages: (files) => {
    const form = new FormData();
    files.forEach((f) => form.append('images', f));
    return request('/upload/images', { method: 'POST', form });
  },
  createReport: (payload) => request('/reports', { method: 'POST', json: payload }),
  setReportStatus: (id, status) => request(`/reports/${id}/status`, { method: 'PATCH', json: { status } }),
  deleteReport: (id) => request(`/reports/${id}`, { method: 'DELETE' }),
  confirmReport: (id) => request(`/reports/${id}/confirm`, { method: 'POST', json: {} }),
  // ── admin portal ──
  adminAnalytics: () => request('/admin/analytics'),
  adminReports: (params = {}) => request(`/admin/reports?${qs(params)}`),
  adminReport: (id) => request(`/admin/reports/${id}`),
  adminVerify: (id) => request(`/admin/reports/${id}/verify`, { method: 'POST', json: {} }),
  adminReject: (id, reason) => request(`/admin/reports/${id}/reject`, { method: 'POST', json: { reason } }),
  adminAssign: (id, payload) => request(`/admin/reports/${id}/assign`, { method: 'POST', json: payload }),
  adminResolve: (id, note) => request(`/admin/reports/${id}/resolve`, { method: 'POST', json: { note } }),
  adminWorkOrders: (params = {}) => request(`/admin/workorders?${qs(params)}`),
  adminContractors: () => request('/admin/contractors'),
  adminCreateContractor: (payload) => request('/admin/contractors', { method: 'POST', json: payload }),
  adminUsers: (params = {}) => request(`/admin/users?${qs(params)}`),
  adminUserCreds: (id) => request(`/admin/users/${id}/creds`),
  adminAdjustCreds: (id, amount, reason) => request(`/admin/users/${id}/creds`, { method: 'POST', json: { amount, reason } }),
  adminSetActive: (id, isActive) => request(`/admin/users/${id}/active`, { method: 'PATCH', json: { isActive } }),
  adminActivity: (params = {}) => request(`/admin/activity?${qs(params)}`),
  adminClusters: () => request('/admin/clusters'),
  adminSetSeverity: (id, priority) => request(`/admin/reports/${id}/severity`, { method: 'POST', json: { priority } }),
  adminSetPriorityZone: (id, zone) => request(`/admin/reports/${id}/priority-zone`, { method: 'POST', json: { zone } }),
  // notifications (every signed-in role)
  notifications: () => request('/notifications?limit=15'),
  unreadCount: () => request('/notifications/unread-count'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH', json: {} }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PATCH', json: {} }),
  // work orders (admin: any status move; contractor: start / finish own jobs)
  myJobs: () => request('/workorders?limit=100'),
  setJobStatus: (id, status, note) => request(`/workorders/${id}/status`, { method: 'PATCH', json: { status, note } }),
  uploadJobEvidence: (id, files) => {
    const form = new FormData();
    files.forEach((f) => form.append('images', f));
    return request(`/workorders/${id}/evidence`, { method: 'POST', form });
  },
  chat: (message, language, history) => request('/ai/chat', { method: 'POST', json: { message, language, history } }),
};

// ── backend report  ->  shape the existing pages already render ────────────────
const CATEGORY_LABEL = {
  pothole: 'Pothole', waterlogging: 'Waterlogging', drainage: 'Broken Drain', road_damage: 'Road Damage',
  garbage: 'Garbage', streetlight: 'Streetlight', other: 'Other',
};
export const CATEGORY_TO_API = Object.fromEntries(Object.entries(CATEGORY_LABEL).map(([k, v]) => [v, k]));
const STATUS_LABEL = { pending: 'Pending', assigned: 'Assigned', in_progress: 'In Progress', resolved: 'Completed', closed: 'Completed' };
export const STATUS_TO_API = { Pending: 'pending', Assigned: 'assigned', 'In Progress': 'in_progress', Completed: 'resolved' };
const SEVERITY_LABEL = { critical: 'CRITICAL', high: 'High', medium: 'Medium', low: 'Low' };

const timeAgo = (iso) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 90) return 'Just now';
  if (s < 5400) return `${Math.round(s / 60)} mins ago`;
  if (s < 129600) return `${Math.round(s / 3600)} hrs ago`;
  return `${Math.round(s / 86400)} days ago`;
};

export function toIncident(r) {
  const [lng, lat] = (r.location && r.location.coordinates) || [0, 0];
  const img = r.images && r.images[0];
  const ai = r.aiAnalysis || {};
  return {
    id: r._id,
    category: CATEGORY_LABEL[r.category] || 'Other',
    title: r.title,
    description: r.description,
    lat, lng,
    roadName: r.address || 'Location pinned on map',
    locality: r.address || '',
    isRural: false,
    reportedAt: timeAgo(r.createdAt),
    timestamp: r.createdAt,
    reporter: (r.submittedBy && r.submittedBy.name) || 'Citizen',
    reporterCount: r.confirmationCount || 1,
    status: STATUS_LABEL[r.status] || r.status,
    rewardPending: Boolean(r.rewardPending),
    rewardGranted: Boolean(r.rewardGranted),
    confirmations: r.confirmationCount || 0,
    createdAt: r.createdAt,
    imageUrl: img ? (/^https?:/i.test(img) ? img : `${API_ORIGIN}${img}`) : null,
    aiData: {
      severity: SEVERITY_LABEL[r.priority] || 'Medium',
      confidence: ai.confidence != null ? Math.round(ai.confidence * 100) : null,
      outcome: ai.outcome || null,
      manualReview: Boolean(ai.manualReviewRequired),
      relevanceStatus: ai.relevanceStatus || null,
      rerouteTriggered: false,
    },
  };
}
