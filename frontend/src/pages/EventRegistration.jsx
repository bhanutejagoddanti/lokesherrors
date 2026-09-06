import React, { useState } from 'react';
import {
  MapPin, Clock, Calendar, Users, CheckCircle2, ChevronRight,
  X, Sparkles, LogOut, AlertCircle, Ticket, Loader2, RefreshCw, Download,
} from 'lucide-react';
import { registerForEventApi } from '../api/eventApi';
import KubernetesStatusBar from '../components/KubernetesStatusBar';

const CATEGORY_COLORS = {
  Technology: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  Design: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Engineering: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Leadership: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Business: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

/* ── Helpers ── */
function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function formatEventDate(event) {
  if (!event?.eventDate) return event?.date ?? '—';
  return new Date(event.eventDate).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

function formatEventTime(event) {
  if (!event) return '—';
  const fmt = (hhmm) => {
    if (!hhmm) return null;
    const [hh, mm] = hhmm.split(':').map(Number);
    const ampm = hh >= 12 ? 'PM' : 'AM';
    const hour = hh % 12 || 12;
    return `${hour}:${String(mm).padStart(2, '0')} ${ampm}`;
  };
  const parts = [fmt(event.startTime), fmt(event.endTime)].filter(Boolean);
  return parts.join(' – ') || '—';
}

/* ── Event Card ── */
function EventCard({ event, onSelect, isSelected, alreadyRegistered }) {
  const catCls = CATEGORY_COLORS[event.category] ?? 'bg-slate-700/30 text-slate-400 border-slate-700';
  const isFull = event.availableSeats <= 0;
  const isDisabled = !event.available || isFull || alreadyRegistered;

  return (
    <div className={`bg-slate-900/80 backdrop-blur-sm border rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200 ${
      isSelected
        ? 'border-indigo-500 shadow-lg shadow-indigo-500/20'
        : 'border-slate-800/80 hover:border-slate-700 hover:shadow-md hover:shadow-indigo-950/40'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${catCls}`}>
          {event.category}
        </span>
        <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
          alreadyRegistered
            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            : event.available && !isFull
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-slate-700/30 text-slate-500 border-slate-700/30'
        }`}>
          {alreadyRegistered
            ? 'Registered'
            : event.available && !isFull
            ? `${event.availableSeats} seats left`
            : isFull
            ? 'Full'
            : 'Unavailable'}
        </span>
      </div>

      <h3 className="text-sm font-bold text-slate-100 leading-snug">{event.title}</h3>

      <div className="flex flex-col gap-1.5 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          {formatEventDate(event)}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          {formatEventTime(event)}
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          {event.location}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          {event.capacity - event.availableSeats}/{event.capacity} registered
        </span>
      </div>

      <button
        onClick={() => !isDisabled && onSelect(event)}
        disabled={isDisabled}
        className={`mt-1 w-full py-2 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center justify-center gap-1.5 ${
          alreadyRegistered
            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 cursor-not-allowed'
            : isDisabled
            ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
            : isSelected
            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 cursor-pointer'
            : 'bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:text-white hover:border-transparent cursor-pointer'
        }`}
      >
        {alreadyRegistered
          ? <><CheckCircle2 className="w-3.5 h-3.5" /> Already Registered</>
          : isDisabled
          ? isFull ? 'Fully Booked' : 'Not Available'
          : isSelected
          ? <><CheckCircle2 className="w-3.5 h-3.5" /> Selected</>
          : <><ChevronRight className="w-3.5 h-3.5" /> Register</>
        }
      </button>
    </div>
  );
}

/* ── Main Page ── */
export default function EventRegistration({ user, onLogout, events = [], eventsLoading, eventsError, onRefreshEvents }) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [submitError, setSubmitError] = useState('');
  // Track which event IDs the user has registered for this session
  const [registeredEventIds, setRegisteredEventIds] = useState(new Set());

  function handleSelectEvent(event) {
    setSelectedEvent(event);
    setSubmitError('');
    setTimeout(() => {
      document.getElementById('registration-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  function handleClearSelection() {
    setSelectedEvent(null);
    setSubmitError('');
    setSuccess(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedEvent) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const result = await registerForEventApi(selectedEvent.id);
      // Mark event as registered in this session
      setRegisteredEventIds(prev => new Set([...prev, selectedEvent.id]));
      setSuccess({
        name: user?.name ?? 'there',
        event: selectedEvent.title,
        date: formatEventDate(selectedEvent),
        location: selectedEvent.location,
        availableSeats: result.availableSeats,
      });
      // Refresh event list to show updated seat count
      await onRefreshEvents();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Registration failed. Please try again.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  /* Background decoration */
  const Bg = () => (
    <>
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse-glow" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-600/8 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed inset-0 opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
    </>
  );

  /* Success Screen */
  if (success) {
    return (
      <div className="min-h-screen bg-[#070b14] text-slate-100 relative overflow-hidden">
        <Bg />
        <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-indigo-950/40 text-center space-y-5 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-2">
                <Ticket className="w-3.5 h-3.5" />
                Registration Confirmed
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight mt-2">You're all set, {success.name}!</h2>
              <p className="text-slate-400 text-sm mt-2">You've been successfully registered.</p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-left space-y-2.5">
              <p className="text-sm font-semibold text-slate-100">{success.event}</p>
              <div className="flex flex-col gap-1.5 text-xs text-slate-400">
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-indigo-400" />{success.date}</span>
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-indigo-400" />{success.location}</span>
                {success.availableSeats !== undefined && (
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    {success.availableSeats} seats remaining after your registration
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => downloadCalendarInvite(success)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-indigo-500/50 text-indigo-300 hover:text-white text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Add to Calendar (.ics)</span>
              </button>

              <button
                onClick={() => { setSuccess(null); handleClearSelection(); }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white text-sm font-semibold transition-all duration-200 shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                Browse More Events
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function downloadCalendarInvite(successData) {
    const title = successData.event || 'SurgeShield Event';
    const location = successData.location || 'Online';
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SurgeShield//Registration//EN',
      'BEGIN:VEVENT',
      `SUMMARY:${title}`,
      `DESCRIPTION:Your spot is confirmed for ${title}.`,
      `LOCATION:${location}`,
      `DTSTART:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTEND:${new Date(Date.now() + 7200000).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_invite.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      <Bg />

      {/* Navbar */}
      <header className="relative z-10 border-b border-slate-800/80 backdrop-blur-md bg-slate-950/60 sticky top-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 p-0.5 shadow-lg shadow-indigo-500/25 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white">SurgeShield</span>
              <span className="ml-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Events</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user?.email && (
              <span className="hidden sm:block text-xs text-slate-400 truncate max-w-[200px]">{user.name || user.email}</span>
            )}
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/40 rounded-xl px-3 py-2 transition-colors duration-150 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Kubernetes Cluster Status Telemetry Bar */}
      <KubernetesStatusBar onRefreshTriggered={onRefreshEvents} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* Page Header */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-3">
            <Calendar className="w-3.5 h-3.5" />
            Upcoming Events
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Register for an Event
          </h1>
          <p className="text-slate-400 text-sm mt-1.5">
            Browse available events and secure your spot instantly.
          </p>
        </div>

        {/* Event Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Available Events <span className="text-slate-600 font-normal">({events.filter(e => e.available).length})</span>
            </h2>
            <div className="flex items-center gap-2">
              {selectedEvent && (
                <button
                  onClick={handleClearSelection}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-600 rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Clear selection
                </button>
              )}
              <button
                onClick={onRefreshEvents}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-600 rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>
          </div>

          {eventsLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                <p className="text-sm text-slate-400">Loading events…</p>
              </div>
            </div>
          ) : eventsError ? (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-10 text-center">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
              <p className="text-rose-400 font-medium">{eventsError}</p>
              <button onClick={onRefreshEvents} className="mt-3 text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer">Retry</button>
            </div>
          ) : events.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-16 text-center">
              <Calendar className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No events available right now</p>
              <p className="text-slate-600 text-sm mt-1">Check back soon for upcoming events.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((ev) => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  onSelect={handleSelectEvent}
                  isSelected={selectedEvent?.id === ev.id}
                  alreadyRegistered={registeredEventIds.has(ev.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Registration Panel */}
        {selectedEvent && (
          <section id="registration-panel">
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl shadow-2xl shadow-indigo-950/30 overflow-hidden">
              {/* Header bar */}
              <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-5">
                <p className="text-xs font-semibold text-indigo-200 uppercase tracking-widest mb-0.5">Registering for</p>
                <h2 className="text-white text-xl font-bold">{selectedEvent.title}</h2>
              </div>

              <div className="p-6 space-y-6">
                {/* Event Details */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Event Details</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { icon: Calendar, label: 'Date', value: formatEventDate(selectedEvent) },
                      { icon: Clock, label: 'Time', value: formatEventTime(selectedEvent) },
                      { icon: MapPin, label: 'Location', value: selectedEvent.location },
                      { icon: Users, label: 'Seats Left', value: `${selectedEvent.availableSeats} / ${selectedEvent.capacity}` },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 uppercase tracking-wider mb-1">
                          <Icon className="w-3 h-3" /> {label}
                        </p>
                        <p className="text-sm font-medium text-slate-200">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Your Info (pre-filled from user account, read-only) */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Your Information</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Full Name</p>
                      <p className="text-sm font-medium text-slate-200">{user?.name || '—'}</p>
                    </div>
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Email Address</p>
                      <p className="text-sm font-medium text-slate-200">{user?.email || '—'}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 mt-2">Registration will be linked to your account.</p>
                </div>

                {/* Error banner */}
                {submitError && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Submit */}
                <form onSubmit={handleSubmit}>
                  <div className="pt-2 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center gap-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`sm:w-auto w-full px-8 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                        isSubmitting
                          ? 'bg-slate-800/60 text-slate-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 cursor-pointer active:scale-[0.99]'
                      }`}
                    >
                      {isSubmitting ? <><Spinner /> Confirming...</> : <><Ticket className="w-4 h-4" /> Confirm Registration</>}
                    </button>
                    <p className="text-xs text-slate-500">
                      You cannot register for the same event twice.
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-slate-600">
        &copy; {new Date().getFullYear()} SurgeShield. All rights reserved.
      </footer>
    </div>
  );
}
