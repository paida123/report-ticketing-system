import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import TicketService from '../../services/ticket.service';
import UserService from '../../services/user.service';

/* -- Icons ------------------------------------------------------------------ */
const TicketIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="3" stroke="white" strokeWidth="1.8" />
    <path d="M3 9h18" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M7 13h5M7 16h3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const AlertIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
    <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2" />
    <path d="M12 8v4M12 16h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const ClockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/* -- Input styling ---------------------------------------------------------- */
const ctmInput = (hasErr) => ({
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: `1.5px solid ${hasErr ? '#fca5a5' : '#e5e7eb'}`,
  fontSize: 14, outline: 'none', background: hasErr ? '#fff7f7' : '#ffffff',
  transition: 'border-color .18s, box-shadow .18s', boxSizing: 'border-box',
  fontFamily: 'inherit', color: '#111827',
});

/* -- CreateTicketModal Component -------------------------------------------- */
const CreateTicketModal = ({ typesList, departments, onClose, onCreated }) => {
  const [form, setForm] = useState({ title: '', description: '', department_id: '', ticket_type_id: '', assigned_to: '' });
  const [touched, setTouch] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [focus, setFocus] = useState('');
  const [officers, setOfficers] = useState([]);
  const [officersLoading, setOfficersLoading] = useState(true);

  const normalizeUsers = (response) => {
    const data = response?.data?.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.users)) return data.users;
    return [];
  };

  const matchesDepartment = (user, departmentId) => {
    const userDepartmentId = user?.department_id || user?.departments?.id || user?.department?.id;
    return String(userDepartmentId || '') === String(departmentId || '');
  };

  const isOfficer = (user) => {
    const roleName = String(user?.role?.role || user?.role?.role_name || user?.role_name || user?.role || '').toUpperCase();
    return !roleName || roleName === 'OFFICER';
  };

  useEffect(() => {
    if (!form.department_id) {
      setOfficers([]);
      setOfficersLoading(false);
      return;
    }

    let cancelled = false;
    setOfficersLoading(true);

    const loadDepartmentOfficers = async () => {
      try {
        const byDepartment = await UserService.getUsersByDepartment(form.department_id, { status: 'ACTIVE' });
        let users = normalizeUsers(byDepartment);

        if (!users.length) {
          const allUsers = await UserService.getAllUsers({ limit: 300, status: 'ACTIVE' });
          users = normalizeUsers(allUsers).filter(u => matchesDepartment(u, form.department_id));
        }

        const officersOnly = users.filter(isOfficer);
        if (!cancelled) {
          setOfficers(officersOnly.length ? officersOnly : users);
        }
      } catch {
        if (!cancelled) setOfficers([]);
      } finally {
        if (!cancelled) setOfficersLoading(false);
      }
    };

    loadDepartmentOfficers();
    return () => { cancelled = true; };
  }, [form.department_id]);

  const set = (k, v) => {
    setForm(f => {
      if (k === 'department_id') return { ...f, department_id: v, ticket_type_id: '', assigned_to: '' };
      if (k === 'ticket_type_id') return { ...f, ticket_type_id: v, assigned_to: '' };
      return { ...f, [k]: v };
    });
    setTouch(t => ({ ...t, [k]: true }));
  };
  const touch = (k) => setTouch(t => ({ ...t, [k]: true }));

  const filteredTicketTypes = typesList.filter(t => {
    if (!form.department_id) return false;
    const typeDepartmentId = t.department_id || t.departments?.id || t.departmental?.id;
    return String(typeDepartmentId || '') === String(form.department_id);
  });

  const selectedType = filteredTicketTypes.find(t => String(t.id) === String(form.ticket_type_id)) || null;

  const fieldErr = (k) => {
    if (!touched[k]) return '';
    if (k === 'department_id' && !form.department_id) return 'Please select a department.';
    if (k === 'title' && !form.title.trim()) return 'Title is required.';
    if (k === 'description' && !form.description.trim()) return 'Description is required.';
    if (k === 'ticket_type_id' && !form.ticket_type_id) return 'Please select a ticket type.';
    return '';
  };

  const submit = async () => {
    setTouch({ title: true, description: true, department_id: true, ticket_type_id: true });
    if (!form.title.trim() || !form.description.trim() || !form.department_id || !form.ticket_type_id) {
      setErr('Please fill in all required fields.');
      return;
    }
    setBusy(true); setErr('');
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        ticket_type_id: Number(form.ticket_type_id),
      };
      if (form.assigned_to) payload.assigned_to = Number(form.assigned_to);
      await TicketService.createTicket(payload);
      onCreated();
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to create ticket. Please try again.');
    } finally { setBusy(false); }
  };

  const onKey = (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(); };

  const descLen = form.description.length;
  const descMax = 1000;

  return createPortal(
    <div
      role="dialog" aria-modal="true" aria-label="Create new ticket"
      style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, background: 'rgba(2,6,23,0.45)', backdropFilter: 'blur(3px)' }}
      onKeyDown={onKey}
    >
      {/* Modal card */}
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 560, boxShadow: '0 32px 64px rgba(2,6,23,0.22), 0 4px 16px rgba(2,6,23,0.1)', display: 'flex', flexDirection: 'column', maxHeight: '92vh', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)', padding: '22px 28px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TicketIcon />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>New Ticket</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2 }}>Submit a new support request</div>
          </div>
          <button
            onClick={onClose} disabled={busy}
            style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.18)', color: '#fff', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}
            aria-label="Close"
          >×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>

          {/* Global error */}
          {err && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 10, padding: '11px 14px', marginBottom: 20, fontSize: 13, color: '#b91c1c' }}>
              <AlertIcon />
              <span>{err}</span>
            </div>
          )}

          {/* Title */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>
              <span>Title <span style={{ color: '#ef4444' }}>*</span></span>
              {form.title && <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: 12 }}>{form.title.length} chars</span>}
            </label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              onBlur={() => touch('title')}
              onFocus={() => setFocus('title')}
              placeholder="Brief, descriptive title for the issue"
              maxLength={200}
              style={{ ...ctmInput(!!fieldErr('title')), boxShadow: focus === 'title' ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none', borderColor: focus === 'title' && !fieldErr('title') ? '#93c5fd' : fieldErr('title') ? '#fca5a5' : '#e5e7eb' }}
              onBlurCapture={() => setFocus('')}
            />
            {fieldErr('title') && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 5 }}>{fieldErr('title')}</div>}
          </div>

          {/* Description */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 7 }}>
              <span>Description <span style={{ color: '#ef4444' }}>*</span></span>
              <span style={{ fontWeight: 400, color: descLen > descMax * 0.9 ? '#f59e0b' : '#9ca3af', fontSize: 12 }}>{descLen} / {descMax}</span>
            </label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              onBlur={() => touch('description')}
              onFocus={() => setFocus('description')}
              rows={5}
              maxLength={descMax}
              placeholder="Describe the issue in detail "
              style={{ ...ctmInput(!!fieldErr('description')), resize: 'vertical', lineHeight: 1.65, boxShadow: focus === 'description' ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none', borderColor: focus === 'description' && !fieldErr('description') ? '#93c5fd' : fieldErr('description') ? '#fca5a5' : '#e5e7eb' }}
              onBlurCapture={() => setFocus('')}
            />
            {fieldErr('description') && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 5 }}>{fieldErr('description')}</div>}
          </div>

          {/* Department */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 7 }}>
              Department <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={form.department_id}
              onChange={e => set('department_id', e.target.value)}
              onBlur={() => touch('department_id')}
              onFocus={() => setFocus('department')}
              style={{ ...ctmInput(!!fieldErr('department_id')), boxShadow: focus === 'department' ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none', borderColor: focus === 'department' && !fieldErr('department_id') ? '#93c5fd' : fieldErr('department_id') ? '#fca5a5' : '#e5e7eb', cursor: 'pointer' }}
              onBlurCapture={() => setFocus('')}
            >
              <option value="">— Select a department —</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.department}</option>
              ))}
            </select>
            {fieldErr('department_id') && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 5 }}>{fieldErr('department_id')}</div>}
          </div>

          {/* Ticket Type */}
          <div style={{ marginBottom: 4 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 7 }}>
              Ticket Type <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={form.ticket_type_id}
              onChange={e => set('ticket_type_id', e.target.value)}
              onBlur={() => touch('ticket_type_id')}
              onFocus={() => setFocus('type')}
              style={{ ...ctmInput(!!fieldErr('ticket_type_id')), boxShadow: focus === 'type' ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none', borderColor: focus === 'type' && !fieldErr('ticket_type_id') ? '#93c5fd' : fieldErr('ticket_type_id') ? '#fca5a5' : '#e5e7eb', cursor: 'pointer' }}
              onBlurCapture={() => setFocus('')}
            >
              <option value="">{form.department_id ? '— Select a ticket type —' : 'Select department first'}</option>
              {filteredTicketTypes.map(t => (
                <option key={t.id} value={t.id}>{t.title}{t.approval_required ? ' (Requires Approval)' : ''}</option>
              ))}
            </select>
            {fieldErr('ticket_type_id') && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 5 }}>{fieldErr('ticket_type_id')}</div>}

            {/* Selected type preview pill */}
            {selectedType && (
              <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: 'linear-gradient(135deg, #eff6ff, #eef2ff)', border: '1.5px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#1e40af', fontSize: 13 }}>{selectedType.title}</div>
                  <div style={{ color: '#4b5563', fontSize: 12, marginTop: 3 }}>
                    {selectedType.departmental?.department && <span style={{ marginRight: 10 }}>Dept: <strong>{selectedType.departmental.department}</strong></span>}
                    {selectedType.approval_required
                      ? <span style={{ color: '#92400e' }}>Requires <strong>{selectedType.approval_count}</strong> approval{selectedType.approval_count !== 1 ? 's' : ''}</span>
                      : <span style={{ color: '#065f46' }}>No approval needed</span>}
                  </div>
                </div>
                {selectedType.expected_sla_duration && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#dbeafe', color: '#1d4ed8', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>
                    <ClockIcon />{selectedType.expected_sla_duration}h SLA
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Assign To (optional) */}
          <div style={{ marginTop: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
              <span>Assign To <span style={{ fontWeight: 400, color: '#6b7280', fontSize: 12 }}>(optional)</span></span>
              {form.assigned_to && (
                <button type="button" onClick={() => set('assigned_to', '')} style={{ fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Clear</button>
              )}
            </label>
            <select
              value={form.assigned_to}
              onChange={e => set('assigned_to', e.target.value)}
              onFocus={() => setFocus('assigned_to')}
              disabled={!form.department_id || officersLoading}
              style={{ ...ctmInput(false), boxShadow: focus === 'assigned_to' ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none', borderColor: focus === 'assigned_to' ? '#93c5fd' : '#e5e7eb', cursor: 'pointer', color: form.assigned_to ? '#111827' : '#9ca3af' }}
              onBlurCapture={() => setFocus('')}
            >
              <option value="">{!form.department_id ? 'Select department first' : officersLoading ? 'Loading officers…' : '— Auto-assign (recommended) —'}</option>
              {officers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.first_name} {u.last_name}
                </option>
              ))}
            </select>
            <div style={{ marginTop: 7, fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#9ca3af" strokeWidth="2"/><path d="M12 8v4M12 16h.01" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/></svg>
              If left blank, the system will auto-assign to an available officer.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: '#fafafa', borderBottomLeftRadius: 18, borderBottomRightRadius: 18 }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Ctrl+Enter to submit</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onClose} disabled={busy}
              style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1 }}
            >Cancel</button>
            <button
              onClick={submit} disabled={busy}
              style={{ padding: '9px 22px', borderRadius: 10, border: 'none', background: busy ? '#93c5fd' : 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: busy ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'opacity .15s', boxShadow: busy ? 'none' : '0 4px 14px rgba(99,102,241,0.35)' }}
            >
              {busy && (
                <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              )}
              {busy ? 'Submitting…' : 'Submit Ticket'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CreateTicketModal;
