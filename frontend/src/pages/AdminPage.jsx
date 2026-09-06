import React, { useState } from 'react';
import {
  Sparkles, LogOut, Plus, Trash2,
  Calendar, Clock, MapPin, Users, Search, X, CheckCircle2,
  AlertCircle, LayoutGrid, ShieldCheck, ToggleLeft, ToggleRight,
  Eye, Loader2,
} from 'lucide-react';
import {
  createEventApi,
  deleteEventApi,
  getEventRegistrantsApi,
  toggleEventAvailabilityApi,
} from '../api/eventApi';
import SurgeMetricsDashboard from '../components/SurgeMetricsDashboard';
import KubernetesStatusBar from '../components/KubernetesStatusBar';
import { BarChart3, CalendarDays } from 'lucide-react';

const CATEGORIES = ['Technology', 'Design', 'Engineering', 'Leadership', 'Business', 'Other'];

const CATEGORY_COLORS = {
  Technology: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  Design: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Engineering: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Leadership: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Business: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Other: 'bg-slate-700/30 text-slate-400 border-slate-700',
};

/* ── Helpers ── */
function Spinner({ className = 'h-4 w-4' }) {
  return (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function formatDate(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime(hhmm) {
  if (!hhmm) return '';
  const [hh, mm] = hhmm.split(':').map(Number);
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const hour = hh % 12 || 12;
  return `${hour}:${String(mm).padStart(2, '0')} ${ampm}`;
}

function formatEventDate(event) {
  if (!event.eventDate) return '';
  const d = new Date(event.eventDate);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatEventTime(event) {
  const parts = [event.startTime && formatTime(event.startTime), event.endTime && formatTime(event.endTime)].filter(Boolean);
  return parts.join(' – ') || '—';
}

/* ── Stat Card ── */
function StatCard({ label, value, sub, color = 'text-indigo-400' }) {
  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
      <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

/* ── Event Row ── */
function EventRow({ event, onRemove, onToggle, onViewRegistrants, loadingId }) {
  const catCls = CATEGORY_COLORS[event.category] ?? CATEGORY_COLORS.Other;
  const isActing = loadingId === event.id;
  const registeredCount = event.capacity - event.availableSeats;

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-slate-700 transition-colors duration-150">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${catCls}`}>
            {event.category}
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            event.available
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            {event.available ? 'Active' : 'Disabled'}
          </span>
        </div>
        <p className="text-sm font-bold text-slate-100 truncate">{event.title}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-slate-500">
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatEventDate(event)}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatEventTime(event)}</span>
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {registeredCount}/{event.capacity} registered · {event.availableSeats} seats left
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* View registrants */}
        <button
          onClick={() => onViewRegistrants(event)}
          title="View registrants"
          className="p-2 rounded-xl border border-slate-800 text-slate-500 hover:border-indigo-500/40 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all duration-150 cursor-pointer"
        >
          <Eye className="w-4 h-4" />
        </button>

        {/* Toggle availability */}
        <button
          onClick={() => onToggle(event.id, !event.available)}
          disabled={isActing}
          title={event.available ? 'Disable event' : 'Enable event'}
          className="p-2 rounded-xl border border-slate-800 text-slate-500 hover:border-amber-500/40 hover:text-amber-400 hover:bg-amber-500/10 transition-all duration-150 cursor-pointer disabled:opacity-50"
        >
          {isActing ? <Spinner /> : event.available ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
        </button>

        {/* Delete */}
        <button
          onClick={() => onRemove(event.id)}
          title="Remove event"
          className="p-2 rounded-xl border border-slate-800 text-slate-500 hover:border-rose-500/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150 cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ── Add Event Form ── */
function AddEventForm({ onAdd, onClose }) {
  const empty = { title: '', date: '', startTime: '', endTime: '', location: '', seats: '', category: 'Technology', description: '' };
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [apiError, setApiError] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
    if (apiError) setApiError('');
  }

  function validate() {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Event name is required';
    if (!form.date) {
      errs.date = 'Date is required';
    } else {
      const picked = new Date(form.date);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (picked < today) errs.date = 'Date cannot be in the past';
    }
    if (!form.startTime) errs.startTime = 'Start time is required';
    if (!form.endTime) {
      errs.endTime = 'End time is required';
    } else if (form.startTime && form.endTime <= form.startTime) {
      errs.endTime = 'End time must be after start time';
    }
    if (!form.location.trim()) errs.location = 'Location is required';
    const s = Number(form.seats);
    if (!form.seats || isNaN(s) || s < 1) errs.seats = 'Enter a valid seat count (≥ 1)';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    setApiError('');
    try {
      const result = await createEventApi({
        title: form.title.trim(),
        description: form.description.trim() || null,
        location: form.location.trim(),
        eventDate: new Date(form.date).toISOString(),
        startTime: form.startTime,
        endTime: form.endTime,
        category: form.category,
        capacity: Number(form.seats),
      });
      setDone(true);
      setTimeout(() => { onAdd(result.event); onClose(); }, 900);
    } catch (err) {
      setApiError(err?.response?.data?.message || 'Failed to create event. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = (field) =>
    `w-full px-4 py-2.5 bg-slate-950/60 border ${
      errors[field] ? 'border-rose-500 focus:ring-rose-500/30' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/30'
    } rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-4 transition-all duration-200`;

  const todayISO = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl shadow-indigo-950/50 relative overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Add New Event</h3>
              <p className="text-xs text-slate-400 mt-0.5">Fill in the details to publish an event</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          {apiError && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          {done ? (
            <div className="text-center py-8 space-y-3">
              <div className="inline-flex p-4 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <p className="text-white font-semibold">Event added successfully!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Event Name <span className="text-rose-400">*</span>
                </label>
                <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. Annual Tech Summit" className={inputCls('title')} />
                {errors.title && <p className="flex items-center gap-1 text-xs text-rose-400 mt-1"><AlertCircle className="w-3.5 h-3.5" />{errors.title}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Description</label>
                <textarea name="description" value={form.description} onChange={handleChange} placeholder="Optional event description…" rows={2}
                  className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/30 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-4 transition-all duration-200 resize-none" />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Event Date <span className="text-rose-400">*</span>
                </label>
                <input type="date" name="date" min={todayISO} value={form.date} onChange={handleChange} className={`${inputCls('date')} [color-scheme:dark]`} />
                {errors.date && <p className="flex items-center gap-1 text-xs text-rose-400 mt-1"><AlertCircle className="w-3.5 h-3.5" />{errors.date}</p>}
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Start Time <span className="text-rose-400">*</span></label>
                  <input type="time" name="startTime" value={form.startTime} onChange={handleChange} className={`${inputCls('startTime')} [color-scheme:dark]`} />
                  {errors.startTime && <p className="flex items-center gap-1 text-xs text-rose-400 mt-1"><AlertCircle className="w-3.5 h-3.5" />{errors.startTime}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">End Time <span className="text-rose-400">*</span></label>
                  <input type="time" name="endTime" value={form.endTime} onChange={handleChange} className={`${inputCls('endTime')} [color-scheme:dark]`} />
                  {errors.endTime && <p className="flex items-center gap-1 text-xs text-rose-400 mt-1"><AlertCircle className="w-3.5 h-3.5" />{errors.endTime}</p>}
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Location <span className="text-rose-400">*</span></label>
                <input name="location" value={form.location} onChange={handleChange} placeholder="e.g. Hall B, Convention Center" className={inputCls('location')} />
                {errors.location && <p className="flex items-center gap-1 text-xs text-rose-400 mt-1"><AlertCircle className="w-3.5 h-3.5" />{errors.location}</p>}
              </div>

              {/* Seats + Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Seats <span className="text-rose-400">*</span></label>
                  <input name="seats" type="number" min="1" value={form.seats} onChange={handleChange} placeholder="e.g. 50" className={inputCls('seats')} />
                  {errors.seats && <p className="flex items-center gap-1 text-xs text-rose-400 mt-1"><AlertCircle className="w-3.5 h-3.5" />{errors.seats}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Category</label>
                  <select name="category" value={form.category} onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-950/60 border border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/30 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-4 transition-all duration-200 cursor-pointer [color-scheme:dark]">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-sm font-semibold transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
                  {saving ? <><Spinner /> Saving...</> : <><Plus className="w-4 h-4" /> Add Event</>}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Registrants Modal ── */
function RegistrantsModal({ event, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  React.useEffect(() => {
    (async () => {
      try {
        const result = await getEventRegistrantsApi(event.id);
        setData(result);
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load registrants.');
      } finally {
        setLoading(false);
      }
    })();
  }, [event.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">Registrants</h3>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{event.title}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-6 w-6 text-indigo-400" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-rose-400 text-sm">{error}</div>
          ) : data?.registrants?.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No one has registered yet.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4 text-xs text-slate-500">
                <span>{data.totalRegistered} registered</span>
                <span>{data.availableSeats} seats remaining</span>
              </div>
              <div className="space-y-2">
                {data.registrants.map((r) => (
                  <div key={r.registrationId} className="flex items-center gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
                      {r.userName?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-100 truncate">{r.userName}</p>
                      <p className="text-xs text-slate-500 truncate">{r.userEmail}</p>
                    </div>
                    <span className="text-[10px] text-slate-600 shrink-0">
                      {new Date(r.registeredAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Admin Page ── */
export default function AdminPage({ user, onLogout, events, eventsLoading, eventsError, onRefreshEvents }) {
  const [adminTab, setAdminTab] = useState('metrics');
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);
  const [viewRegistrantsEvent, setViewRegistrantsEvent] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [actionError, setActionError] = useState('');

  const filtered = events.filter(ev => {
    const q = search.toLowerCase();
    return (
      ev.title?.toLowerCase().includes(q) ||
      ev.location?.toLowerCase().includes(q) ||
      ev.category?.toLowerCase().includes(q)
    );
  });

  const total = events.length;
  const totalSeats = events.reduce((s, e) => s + (e.capacity ?? 0), 0);
  const categories = [...new Set(events.map(e => e.category))].filter(Boolean).length;

  async function handleToggle(id, newAvailable) {
    setTogglingId(id);
    setActionError('');
    try {
      await toggleEventAvailabilityApi(id, newAvailable);
      await onRefreshEvents();
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to toggle event.');
    } finally {
      setTogglingId(null);
    }
  }

  async function handleConfirmRemove(id) {
    setDeletingId(id);
    setActionError('');
    try {
      await deleteEventApi(id);
      setConfirmRemoveId(null);
      await onRefreshEvents();
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to delete event.');
    } finally {
      setDeletingId(null);
    }
  }

  const Bg = () => (
    <>
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse-glow" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-600/8 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed inset-0 opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
    </>
  );

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      <Bg />

      {/* Navbar */}
      <header className="relative z-10 border-b border-slate-800/80 backdrop-blur-md bg-slate-950/60 sticky top-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 p-0.5 shadow-lg shadow-indigo-500/25">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white">SurgeShield</span>
              <span className="ml-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">Admin</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-xl">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span className="truncate max-w-[180px]">{user?.email}</span>
            </div>
            <button onClick={onLogout}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/40 rounded-xl px-3 py-2 transition-colors duration-150 cursor-pointer">
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Kubernetes Cluster Status Telemetry Bar */}
      <KubernetesStatusBar onRefreshTriggered={onRefreshEvents} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
          <button
            onClick={() => setAdminTab('metrics')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              adminTab === 'metrics'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Surge & Cluster Metrics</span>
            <span className="relative flex h-2 w-2 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </button>

          <button
            onClick={() => setAdminTab('events')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              adminTab === 'events'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Event Management ({total})</span>
          </button>
        </div>

        {/* TAB 1: Surge & Cluster Metrics Dashboard */}
        {adminTab === 'metrics' && (
          <SurgeMetricsDashboard events={events} />
        )}

        {/* TAB 2: Event Management Content */}
        {adminTab === 'events' && (
          <div className="space-y-8">
            {/* Page Title */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium mb-3">
                  <ShieldCheck className="w-3.5 h-3.5" /> Admin Panel
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Event Management</h1>
                <p className="text-slate-400 text-sm mt-1.5">Create, manage, and monitor events visible to all registered users.</p>
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all duration-200 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" /> Add Event
              </button>
            </div>

            {/* Action error banner */}
            {actionError && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{actionError}</span>
                <button onClick={() => setActionError('')} className="ml-auto cursor-pointer text-rose-300 hover:text-white"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Total Events" value={total} sub="published to users" />
              <StatCard label="Total Seats" value={totalSeats} sub="across all events" color="text-blue-400" />
              <StatCard label="Categories" value={categories} sub="event types" color="text-purple-400" />
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, location, or category…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-900/60 border border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/30 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-4 transition-all duration-200"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Event List */}
            <section>
              <p className="text-xs text-slate-500 font-medium mb-3">
                Showing {filtered.length} of {total} event{total !== 1 ? 's' : ''}
                {search && <span className="text-indigo-400"> for "{search}"</span>}
              </p>

              {eventsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Spinner className="h-8 w-8 text-indigo-400" />
                </div>
              ) : eventsError ? (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-8 text-center">
                  <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
                  <p className="text-rose-400 font-medium">{eventsError}</p>
                  <button onClick={onRefreshEvents} className="mt-3 text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer">Retry</button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-12 text-center">
                  <LayoutGrid className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 font-medium">No events found</p>
                  <p className="text-slate-600 text-sm mt-1">Try adjusting your search or add a new event.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map(ev => (
                    <EventRow
                      key={ev.id}
                      event={ev}
                      onRemove={(id) => setConfirmRemoveId(id)}
                      onToggle={handleToggle}
                      onViewRegistrants={setViewRegistrantsEvent}
                      loadingId={togglingId}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-slate-600">
        &copy; {new Date().getFullYear()} SurgeShield · Admin Panel
      </footer>

      {/* Add Event Modal */}
      {showAddForm && (
        <AddEventForm
          onAdd={() => { onRefreshEvents(); setShowAddForm(false); }}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {/* Registrants Modal */}
      {viewRegistrantsEvent && (
        <RegistrantsModal
          event={viewRegistrantsEvent}
          onClose={() => setViewRegistrantsEvent(null)}
        />
      )}

      {/* Confirm Remove Modal */}
      {confirmRemoveId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl shadow-rose-950/30 text-center space-y-4">
            <div className="inline-flex p-3 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <Trash2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">Remove Event?</h3>
            <p className="text-slate-400 text-sm">
              This will permanently remove{' '}
              <span className="text-slate-200 font-semibold">
                {events.find(e => e.id === confirmRemoveId)?.title}
              </span>{' '}
              and all its registrations. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRemoveId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-sm font-semibold transition-colors cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => handleConfirmRemove(confirmRemoveId)}
                disabled={deletingId === confirmRemoveId}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors cursor-pointer shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 disabled:opacity-60">
                {deletingId === confirmRemoveId ? <><Spinner /> Deleting...</> : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
