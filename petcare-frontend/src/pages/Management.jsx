import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import { authHeaders, getCurrentUser } from '../utils/auth';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const TABS = ['Staff accounts', 'Member accounts', 'Clinic settings', 'Reports & activity'];

const card = 'bg-white p-6 rounded-3xl border border-stone-100 shadow-sm';
const labelCls = 'block text-[10px] font-bold text-stone-400 uppercase mb-1';
const inputCls = 'w-full p-2.5 bg-[#f9f9f8] border border-stone-200 rounded-lg text-xs outline-none focus:border-[#48634e]';
const primaryBtn = 'px-4 py-2.5 bg-[#48634e] hover:bg-[#3b5240] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:bg-stone-300 disabled:cursor-not-allowed';

const errText = (err, fallback) =>
  err.response?.data?.message || (err.response ? `${fallback} (error ${err.response.status})` : 'Cannot reach the server. Is the backend running?');

const fmt12 = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// ---------------------------------------------------------------- Staff accounts
function StaffTab() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null); // staff member pending removal
  const me = getCurrentUser();

  const load = useCallback(() => {
    axios.get(`${API_URL}/api/staff`, { headers: authHeaders() })
      .then((res) => { setStaff(res.data); setLoading(false); })
      .catch((err) => { setLoading(false); toast.error(errText(err, 'Could not load staff')); });
  }, []);
  useEffect(load, [load]);

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post(`${API_URL}/api/staff`, form, { headers: authHeaders() });
      toast.success(`${form.name.trim()} can now sign in as Veterinary Staff`);
      setForm({ name: '', email: '', password: '' });
      load();
    } catch (err) {
      toast.error(errText(err, 'Could not create the account'));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (member) => {
    try {
      await axios.patch(`${API_URL}/api/staff/${member._id}/active`, { active: !member.active }, { headers: authHeaders() });
      toast.success(`${member.name} ${member.active ? 'disabled' : 'enabled'}`);
      load();
    } catch (err) {
      toast.error(errText(err, 'Could not change the account'));
    }
  };

  const remove = async () => {
    const member = confirm;
    setConfirm(null);
    try {
      await axios.delete(`${API_URL}/api/staff/${member._id}`, { headers: authHeaders() });
      toast.success(`${member.name} was removed`);
      load();
    } catch (err) {
      toast.error(errText(err, 'Could not remove the account'));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className={`${card} lg:col-span-7`}>
        <h2 className="text-lg font-bold text-stone-900 mb-4">Clinic staff</h2>
        {loading ? (
          <p className="text-xs text-stone-400">Loading...</p>
        ) : (
          <div className="space-y-3">
            {staff.map((m) => {
              const isAdminRow = m.role === 'Clinic Admin';
              return (
                <div key={m._id} className="flex items-center justify-between gap-3 p-3.5 bg-[#f9f9f8] rounded-2xl border border-stone-100">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-stone-900 truncate">
                      {m.name}{String(m._id) === String(me?.id || me?._id) ? ' (you)' : ''}
                    </div>
                    <div className="text-xs text-stone-400 truncate">{m.email}</div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isAdminRow ? 'bg-[#ebf0eb] text-[#48634e]' : 'bg-sky-50 text-sky-700'}`}>
                        {isAdminRow ? 'Clinic Admin' : 'Veterinary Staff'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${m.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                        {m.active ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  {!isAdminRow && (
                    <div className="flex items-center gap-3 text-xs font-semibold whitespace-nowrap">
                      <button onClick={() => toggle(m)} className="text-stone-500 hover:text-stone-800 cursor-pointer">
                        {m.active ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => setConfirm(m)} className="text-red-500 hover:text-red-700 cursor-pointer">Remove</button>
                    </div>
                  )}
                </div>
              );
            })}
            {staff.length === 0 && <p className="text-xs text-stone-400">No staff accounts yet.</p>}
          </div>
        )}
      </div>

      <form onSubmit={create} className={`${card} lg:col-span-5`}>
        <h2 className="text-lg font-bold text-stone-900 mb-1">Add Veterinary Staff</h2>
        <p className="text-xs text-stone-400 mb-4">They can approve appointments and manage records, but can&apos;t change services, settings or accounts, or delete anything.</p>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Full name</label>
            <input value={form.name} maxLength={40} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Starting password</label>
            <div className="relative flex items-center">
              <input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value.replace(/\s/g, '') })}
                className={`${inputCls} pr-14`}
                required
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 text-[10px] font-bold text-[#48634e] uppercase cursor-pointer">
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-[10px] text-stone-400 mt-1">At least 8 characters with a number, no spaces. Give it to them privately; they can change it on their Profile.</p>
          </div>
        </div>
        <button type="submit" disabled={saving} className={`${primaryBtn} w-full mt-5`}>
          {saving ? 'Creating...' : 'Create account'}
        </button>
      </form>

      {confirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-stone-900">Remove {confirm.name}?</h3>
            <p className="text-xs text-stone-500 mt-2">Their account is deleted and they can no longer sign in. To keep it, use Disable instead.</p>
            <div className="flex gap-3 mt-5">
              <button onClick={remove} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer">Remove</button>
              <button onClick={() => setConfirm(null)} className="flex-1 py-2.5 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer">Keep</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Clinic settings
function SettingsTab() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/api/clinic/settings`)
      .then((res) => setForm(res.data))
      .catch((err) => toast.error(errText(err, 'Could not load settings')));
  }, []);

  if (!form) return <p className="text-xs text-stone-400">Loading...</p>;

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const hourOptions = [];
  for (let h = 5; h <= 22; h++) hourOptions.push(`${String(h).padStart(2, '0')}:00`);

  const save = async (e) => {
    e.preventDefault();
    if (form.openTime >= form.closeTime) {
      toast.warning('Closing time must be later than opening time.');
      return;
    }
    setSaving(true);
    try {
      const res = await axios.put(`${API_URL}/api/clinic/settings`, {
        clinicName: form.clinicName,
        openTime: form.openTime,
        closeTime: form.closeTime,
        slotMinutes: Number(form.slotMinutes),
        bookingLimit: Number(form.bookingLimit)
      }, { headers: authHeaders() });
      setForm(res.data);
      toast.success('Clinic settings saved');
    } catch (err) {
      toast.error(errText(err, 'Could not save the settings'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className={`${card} max-w-2xl`}>
      <h2 className="text-lg font-bold text-stone-900 mb-1">Clinic settings</h2>
      <p className="text-xs text-stone-400 mb-5">These apply to the owners&apos; booking form right away.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={labelCls}>Clinic name</label>
          <input value={form.clinicName} maxLength={60} onChange={(e) => set({ clinicName: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Opens</label>
          <select value={form.openTime} onChange={(e) => set({ openTime: e.target.value })} className={inputCls}>
            {hourOptions.map((t) => <option key={t} value={t}>{fmt12(t)}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Closes (last bookable time)</label>
          <select value={form.closeTime} onChange={(e) => set({ closeTime: e.target.value })} className={inputCls}>
            {hourOptions.map((t) => <option key={t} value={t}>{fmt12(t)}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Appointment slot length</label>
          <select value={form.slotMinutes} onChange={(e) => set({ slotMinutes: e.target.value })} className={inputCls}>
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={60}>60 minutes</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Booking requests per owner / 24 hours</label>
          <input type="number" min="1" max="20" value={form.bookingLimit} onChange={(e) => set({ bookingLimit: e.target.value })} className={inputCls} />
        </div>
      </div>

      <button type="submit" disabled={saving} className={`${primaryBtn} mt-6`}>{saving ? 'Saving...' : 'Save settings'}</button>
    </form>
  );
}

// ---------------------------------------------------------------- Reports & activity
const ACTION_FILTERS = [
  { value: '', label: 'Everything' },
  { value: 'appointment', label: 'Appointments' },
  { value: 'record', label: 'Medical records' },
  { value: 'pet', label: 'Pets' },
  { value: 'service', label: 'Services' },
  { value: 'staff', label: 'Staff accounts' },
  { value: 'account', label: 'Member accounts' },
  { value: 'settings', label: 'Settings' }
];

function ReportsTab() {
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    axios.get(`${API_URL}/api/reports/summary?days=${days}`, { headers: authHeaders() })
      .then((res) => setSummary(res.data))
      .catch((err) => toast.error(errText(err, 'Could not load the report')));
  }, [days]);

  useEffect(() => {
    axios.get(`${API_URL}/api/reports/activity?limit=100${filter ? `&action=${filter}` : ''}`, { headers: authHeaders() })
      .then((res) => setLogs(res.data))
      .catch((err) => toast.error(errText(err, 'Could not load the activity log')));
  }, [filter]);

  const maxDay = summary ? Math.max(1, ...summary.perDay.map((d) => d.total)) : 1;
  const stat = (label, value, tone = '') => (
    <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm" key={label}>
      <div className={`text-2xl font-extrabold leading-none ${tone || 'text-stone-900'}`}>{value}</div>
      <div className="text-xs text-stone-400 font-medium mt-1.5">{label}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-900">Reports</h2>
        <div className="flex gap-1.5">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold cursor-pointer ${days === d ? 'bg-[#48634e] text-white' : 'bg-white border border-stone-200 text-stone-500 hover:text-stone-800'}`}
            >
              Last {d} days
            </button>
          ))}
        </div>
      </div>

      {!summary ? (
        <p className="text-xs text-stone-400">Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {stat('Appointment requests', summary.appointments.total)}
            {stat('Approved', summary.appointments.approved, 'text-emerald-700')}
            {stat('Declined', summary.appointments.declined, 'text-red-600')}
            {stat('Completed visits', summary.appointments.completed)}
            {stat('Approval rate', summary.appointments.approvalRate === null ? '—' : `${summary.appointments.approvalRate}%`)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className={`${card} lg:col-span-8`}>
              <h3 className="text-sm font-bold text-stone-900 mb-4">Requests per day</h3>
              <div className="flex items-end gap-[3px] h-32">
                {summary.perDay.map((d) => (
                  <div
                    key={d.date}
                    title={`${d.date}: ${d.total}`}
                    className="flex-1 bg-[#48634e]/80 hover:bg-[#48634e] rounded-t"
                    style={{ height: `${Math.max(d.total ? 8 : 2, (d.total / maxDay) * 100)}%`, opacity: d.total ? 1 : 0.25 }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-stone-400 mt-2">
                <span>{summary.perDay[0]?.date}</span>
                <span>{summary.perDay[summary.perDay.length - 1]?.date}</span>
              </div>
            </div>

            <div className={`${card} lg:col-span-4`}>
              <h3 className="text-sm font-bold text-stone-900 mb-4">Busiest services</h3>
              {summary.byService.length === 0 ? (
                <p className="text-xs text-stone-400">No requests in this period.</p>
              ) : (
                <ul className="space-y-2.5">
                  {summary.byService.slice(0, 6).map((s) => (
                    <li key={s.service} className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-stone-700 truncate mr-2">{s.service}</span>
                      <span className="font-bold text-stone-900">{s.total}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stat('Registered pets', summary.totals.pets)}
            {stat('Pet owners', summary.totals.owners)}
            {stat(`New owners (${days}d)`, summary.totals.newOwners)}
            {stat(`New records (${days}d)`, summary.totals.newRecords)}
          </div>
        </>
      )}

      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-bold text-stone-900">Activity log</h3>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="p-2 bg-[#f9f9f8] border border-stone-200 rounded-lg text-xs outline-none">
            {ACTION_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        {logs.length === 0 ? (
          <p className="text-xs text-stone-400 text-center py-6">Nothing recorded yet. Approvals, deletions, setting changes and staff changes show up here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-stone-400 uppercase tracking-wider border-b border-stone-100">
                <tr>
                  <th className="p-3 font-semibold">When</th>
                  <th className="p-3 font-semibold">Who</th>
                  <th className="p-3 font-semibold">What happened</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {logs.map((l) => (
                  <tr key={l._id}>
                    <td className="p-3 whitespace-nowrap text-stone-500">{fmtDateTime(l.createdAt)}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="font-bold text-stone-900">{l.actorName || 'Unknown'}</span>
                      <span className="block text-[10px] text-stone-400">{l.actorRole === 'Moderator' ? 'Veterinary Staff' : l.actorRole}</span>
                    </td>
                    <td className="p-3">{l.details || l.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


// ---------------------------------------------------------------- Member accounts (freeze / delete)
const RULES = [
  'Spam or fake appointment bookings',
  'Abusive or harassing behavior',
  'Fake information or impersonation',
  'Misuse of the platform',
  'Other'
];

const fmtDay = (iso) => new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });

function AccountsTab() {
  const [accounts, setAccounts] = useState([]);
  const [freezeDays, setFreezeDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [rule, setRule] = useState(RULES[0]);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const load = useCallback(() => {
    axios.get(`${API_URL}/api/accounts`, { headers: authHeaders() })
      .then((res) => { setAccounts(res.data.accounts); setFreezeDays(res.data.freezeDays); setLoading(false); })
      .catch((err) => { setLoading(false); toast.error(errText(err, 'Could not load accounts')); });
  }, []);
  useEffect(load, [load]);

  const selected = accounts.find((a) => a._id === selectedId) || null;
  const frozenCount = accounts.filter((a) => a.frozen).length;

  const q = search.trim().toLowerCase();
  const visible = accounts.filter((a) => {
    if (filter === 'Frozen' && !a.frozen) return false;
    if (filter === 'Active' && a.frozen) return false;
    return !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
  });

  const reason = rule === 'Other' ? details.trim() : `${rule}${details.trim() ? `: ${details.trim()}` : ''}`;
  const reasonOk = reason.length >= 5 && reason.length <= 200;

  const freeze = async () => {
    if (!selected || !reasonOk) return;
    setBusy(true);
    try {
      await axios.post(`${API_URL}/api/accounts/${selected._id}/freeze`, { reason }, { headers: authHeaders() });
      toast.success(`${selected.name} is frozen for ${freezeDays} days`);
      setDetails('');
      load();
    } catch (err) {
      toast.error(errText(err, 'Could not freeze the account'));
    } finally { setBusy(false); }
  };

  const unfreeze = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await axios.post(`${API_URL}/api/accounts/${selected._id}/unfreeze`, {}, { headers: authHeaders() });
      toast.success(`${selected.name} can sign in again`);
      load();
    } catch (err) {
      toast.error(errText(err, 'Could not lift the freeze'));
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await axios.delete(`${API_URL}/api/accounts/${selected._id}`, { headers: authHeaders() });
      toast.success(`${selected.name}'s account was deleted`);
      setConfirmDelete(false);
      setSelectedId('');
      load();
    } catch (err) {
      toast.error(errText(err, 'Could not delete the account'));
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      {/* The tool */}
      <div className={card}>
        <h2 className="text-lg font-bold text-stone-900 mb-1">Account enforcement</h2>
        <p className="text-xs text-stone-400 mb-5">
          For pet owners who break the website rules. <b>Freeze</b> blocks sign-in for {freezeDays} days, then the account works again automatically.
          <b> Delete</b> removes the account and its pets, records, reminders and appointments for good.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-4">
            <label className={labelCls}>Account</label>
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className={inputCls}>
              <option value="">Choose an account…</option>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>{a.name} — {a.email}{a.frozen ? ' (frozen)' : ''}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <label className={labelCls}>Rule broken</label>
            <select value={rule} onChange={(e) => setRule(e.target.value)} className={inputCls}>
              {RULES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="md:col-span-5">
            <label className={labelCls}>Details {rule === 'Other' ? '(required)' : '(optional)'}</label>
            <input value={details} maxLength={120} onChange={(e) => setDetails(e.target.value)} placeholder="What happened?" className={inputCls} />
          </div>
        </div>

        {selected?.frozen && (
          <p className="mt-4 text-xs bg-amber-50 border border-amber-100 text-amber-800 rounded-xl p-3">
            {selected.name} is already frozen until <b>{fmtDay(selected.frozenUntil)}</b> ({selected.daysLeft} day{selected.daysLeft === 1 ? '' : 's'} left). Reason: {selected.freezeReason}
          </p>
        )}

        <div className="flex flex-wrap gap-3 mt-5">
          <button onClick={freeze} disabled={busy || !selected || selected.frozen || !reasonOk} className={primaryBtn}>
            Freeze for {freezeDays} days
          </button>
          {selected?.frozen && (
            <button onClick={unfreeze} disabled={busy} className="px-4 py-2.5 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer disabled:opacity-50">
              Lift freeze
            </button>
          )}
          <button onClick={() => setConfirmDelete(true)} disabled={busy || !selected} className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer disabled:bg-stone-300 disabled:cursor-not-allowed">
            Delete account
          </button>
        </div>
      </div>

      {/* The list */}
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-stone-900">
            Pet owner accounts <span className="text-xs font-semibold text-stone-400">({accounts.length} total · {frozenCount} frozen)</span>
          </h2>
          <div className="flex items-center gap-2">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" className={`${inputCls} w-52`} />
            {['All', 'Active', 'Frozen'].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${filter === f ? 'bg-[#48634e] text-white' : 'bg-[#f9f9f8] border border-stone-200 text-stone-500 hover:bg-stone-50'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-stone-400">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-stone-400 border-b border-stone-100">
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Pets</th>
                  <th className="p-3">Joined</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Past freezes</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => (
                  <tr key={a._id} onClick={() => { setSelectedId(a._id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className={`border-b border-stone-50 cursor-pointer hover:bg-[#f9f9f8] ${a._id === selectedId ? 'bg-[#e2ebe2]/50' : ''}`}>
                    <td className="p-3 font-bold text-stone-900">{a.name}</td>
                    <td className="p-3 text-stone-500">{a.email}</td>
                    <td className="p-3">{a.petCount}</td>
                    <td className="p-3 text-stone-500">{fmtDay(a.createdAt)}</td>
                    <td className="p-3">
                      {a.frozen ? (
                        <span title={a.freezeReason} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
                          Frozen · until {fmtDay(a.frozenUntil)} ({a.daysLeft}d)
                        </span>
                      ) : a.disabled ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600">Disabled</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">Active</span>
                      )}
                    </td>
                    <td className="p-3 text-stone-500">{a.freezeCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visible.length === 0 && <p className="text-xs text-stone-400 text-center py-6">No accounts match.</p>}
          </div>
        )}
        <p className="text-[10px] text-stone-400 mt-3">Click a row to select that account in the tool above. Staff accounts are managed under Staff accounts.</p>
      </div>

      {confirmDelete && selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-stone-900">Delete {selected.name}?</h3>
            <p className="text-xs text-stone-500 mt-2">
              This permanently deletes the account ({selected.email}) and its {selected.petCount} pet{selected.petCount === 1 ? '' : 's'}, medical records, reminders and appointments. It can&apos;t be undone. To keep the account, freeze it instead.
            </p>
            <div className="flex gap-3 mt-5">
              <button onClick={remove} disabled={busy} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer disabled:opacity-50">Delete</button>
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- page
function Management() {
  const [tab, setTab] = useState(TABS[0]);

  return (
    <div className="p-6 md:p-8 bg-[#f8f7f4] min-h-screen font-sans text-stone-800">
      <ToastContainer position="top-right" autoClose={3500} />
      <h1 className="text-2xl font-bold text-stone-900 mb-1">Admin Tools</h1>
      <p className="text-xs text-stone-400 mb-6">Only the Clinic Admin can see this page.</p>

      <div className="flex space-x-6 border-b border-stone-200 mb-6 text-xs font-semibold">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 transition-all cursor-pointer ${tab === t ? 'text-[#48634e] border-b-2 border-[#48634e] font-bold' : 'text-stone-400 hover:text-stone-600'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === TABS[0] && <StaffTab />}
      {tab === TABS[1] && <AccountsTab />}
      {tab === TABS[2] && <SettingsTab />}
      {tab === TABS[3] && <ReportsTab />}
    </div>
  );
}

export default Management;
