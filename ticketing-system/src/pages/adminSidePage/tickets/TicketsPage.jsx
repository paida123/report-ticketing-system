import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import TicketTypeService from '../../../services/ticketType.service';
import ApprovalStepsService from '../../../services/approvalSteps.service';
import DepartmentService from '../../../services/department.service';
import RoleService from '../../../services/role.service';
import TicketService from '../../../services/ticket.service';
import UserService from '../../../services/user.service';
import './TicketsPage.css';

/* -- Toast ----------------------------------------------------------------- */
const Toast = ({ msg, type, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 3400); return () => clearTimeout(t); }, [onDone]);
  const bg = { success: '#10b981', error: '#ef4444', info: '#3b82f6' }[type] || '#3b82f6';
  return createPortal(
    <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 9999, background: bg, color: '#fff', padding: '12px 20px', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', fontWeight: 700, fontSize: 14, maxWidth: 360 }}>
      {msg}
    </div>,
    document.body
  );
};

/* -- Icons ------------------------------------------------------------------ */
const EyeIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 5c5.5 0 10 4.5 11 7-1 2.5-5.5 7-11 7S2 14.5 1 12c1-2.5 5.5-7 11-7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" stroke="currentColor" strokeWidth="2" />
  </svg>
);
const EditIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor" /></svg>
);
const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

/* -- Spinner ---------------------------------------------------------------- */
const Spinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
    <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
  </div>
);

/* -- Chain rows helper ------------------------------------------------------- */
const ChainRows = ({ count, chain, roles, onChange }) => {
  if (!count) return null;
  return (
    <div className="row" style={{ flexDirection: 'column', gap: 8 }}>
      <label style={{ margin: 0 }}>
        Approval chain <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>first to last</span>
      </label>
      <div className="approval-chain">
        {Array.from({ length: count }).map((_, idx) => (
          <div className="approval-step" key={idx}>
            <div className="approval-step-badge">{idx + 1}</div>
            <div className="approval-step-select">
              <select value={chain[idx] || ''} onChange={e => onChange(idx, e.target.value)}>
                <option value="">Select role</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.role}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* -- AddTypeModal ----------------------------------------------------------- */
const AddTypeModal = ({ onClose, onSaved, departments, roles }) => {
  const [form, setForm] = useState({ title: '', department_id: '', sla: '', approvalCount: 0, chain: [] });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const setCount = (val) => {
    const c = Math.max(0, Math.min(10, Number(val) || 0));
    setForm(prev => ({ ...prev, approvalCount: c, chain: Array.from({ length: c }, (_, i) => prev.chain[i] || '') }));
  };
  const updateChain = (idx, val) => setForm(prev => {
    const next = [...prev.chain]; next[idx] = val; return { ...prev, chain: next };
  });

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const title = form.title.trim();
    const dept = Number(form.department_id);
    const sla = Number(form.sla);
    const cnt = Number(form.approvalCount) || 0;
    if (!title) return setErr('Type name is required.');
    if (!dept) return setErr('Department is required.');
    if (!sla || sla < 1) return setErr('SLA duration must be at least 1 hour.');
    if (cnt > 0 && form.chain.some(r => !r)) return setErr('Please select all approver roles.');
    setSaving(true);
    try {
      const res = await TicketTypeService.createTicketType({
        title, expected_sla_duration: sla, approval_required: cnt > 0, approval_count: cnt, department_id: dept,
      });
      const newType = res.data?.data;
      for (let i = 0; i < cnt; i++) {
        await ApprovalStepsService.createApprovalStep({
          ticket_type_id: newType.id, approval_step_number: i + 1,
          role_id: Number(form.chain[i]), department_id: dept, expected_sla_duration: sla,
        });
      }
      onSaved('Ticket type created successfully.', 'success');
      onClose();
    } catch (ex) {
      setErr(ex?.response?.data?.message || ex?.response?.data?.error || 'Failed to create ticket type.');
    } finally { setSaving(false); }
  };

  return createPortal(
    <div className="um-modal-overlay" role="dialog" aria-modal="true">
      <div className="um-modal">
        <h3>Add Ticket Type</h3>
        <form onSubmit={submit} className="um-form">
          <div className="row">
            <label>Type name
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Incident" />
            </label>
          </div>
          <div className="row">
            <label>Department
              <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}>
                <option value="">Select department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.department}</option>)}
              </select>
            </label>
          </div>
          <div className="row">
            <label>SLA (hours)
              <input type="number" min={1} value={form.sla} onChange={e => setForm(f => ({ ...f, sla: e.target.value }))} placeholder="e.g. 24" />
            </label>
            <label>Approval steps
              <input type="number" min={0} max={10} value={form.approvalCount} onChange={e => setCount(e.target.value)} />
            </label>
          </div>
          <ChainRows count={form.approvalCount} chain={form.chain} roles={roles} onChange={updateChain} />
          {err && <div className="err" style={{ marginTop: 6 }}>{err}</div>}
          <div className="row actions">
            <button type="button" className="btn-muted" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Add Type'}</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

/* -- EditTypeModal ---------------------------------------------------------- */
const EditTypeModal = ({ ticketType, existingSteps, onClose, onSaved, departments, roles }) => {
  const [form, setForm] = useState({
    title: ticketType.title || '',
    department_id: String(ticketType.department_id || ''),
    sla: String(ticketType.expected_sla_duration || ''),
    approvalCount: Number(ticketType.approval_count || 0),
    chain: existingSteps.map(s => String(s.role_id || '')),
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const setCount = (val) => {
    const c = Math.max(0, Math.min(10, Number(val) || 0));
    setForm(prev => ({ ...prev, approvalCount: c, chain: Array.from({ length: c }, (_, i) => prev.chain[i] || '') }));
  };
  const updateChain = (idx, val) => setForm(prev => {
    const next = [...prev.chain]; next[idx] = val; return { ...prev, chain: next };
  });

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const title = form.title.trim();
    const dept = Number(form.department_id);
    const sla = Number(form.sla);
    const cnt = Number(form.approvalCount) || 0;
    if (!title) return setErr('Type name is required.');
    if (!dept) return setErr('Department is required.');
    if (!sla || sla < 1) return setErr('SLA duration must be at least 1 hour.');
    if (cnt > 0 && form.chain.some(r => !r)) return setErr('Please select all approver roles.');
    setSaving(true);
    try {
      await TicketTypeService.updateTicketType(ticketType.id, {
        title, expected_sla_duration: sla, approval_required: cnt > 0, approval_count: cnt, department_id: dept,
      });
      for (const step of existingSteps) {
        try { await ApprovalStepsService.deleteApprovalStep(step.id); } catch (_) {}
      }
      for (let i = 0; i < cnt; i++) {
        await ApprovalStepsService.createApprovalStep({
          ticket_type_id: ticketType.id, approval_step_number: i + 1,
          role_id: Number(form.chain[i]), department_id: dept, expected_sla_duration: sla,
        });
      }
      onSaved('Ticket type updated successfully.', 'success');
      onClose();
    } catch (ex) {
      setErr(ex?.response?.data?.message || ex?.response?.data?.error || 'Failed to update ticket type.');
    } finally { setSaving(false); }
  };

  return createPortal(
    <div className="um-modal-overlay" role="dialog" aria-modal="true">
      <div className="um-modal">
        <h3>Edit Ticket Type</h3>
        <form onSubmit={submit} className="um-form">
          <div className="row">
            <label>Type name
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </label>
          </div>
          <div className="row">
            <label>Department
              <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}>
                <option value="">Select department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.department}</option>)}
              </select>
            </label>
          </div>
          <div className="row">
            <label>SLA (hours)
              <input type="number" min={1} value={form.sla} onChange={e => setForm(f => ({ ...f, sla: e.target.value }))} />
            </label>
            <label>Approval steps
              <input type="number" min={0} max={10} value={form.approvalCount} onChange={e => setCount(e.target.value)} />
            </label>
          </div>
          <ChainRows count={form.approvalCount} chain={form.chain} roles={roles} onChange={updateChain} />
          {err && <div className="err" style={{ marginTop: 6 }}>{err}</div>}
          <div className="row actions">
            <button type="button" className="btn-muted" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

/* -- ConfirmDeleteModal ----------------------------------------------------- */
const ConfirmDeleteModal = ({ ticketType, onClose, onDeleted }) => {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const confirm = async () => {
    setBusy(true); setErr('');
    try {
      try {
        const r = await ApprovalStepsService.getApprovalStepsByTicketType(ticketType.id);
        const steps = r?.data?.data || [];
        for (const s of steps) { try { await ApprovalStepsService.deleteApprovalStep(s.id); } catch (_) {} }
      } catch (_) {}
      await TicketTypeService.deleteTicketType(ticketType.id);
      onDeleted('Ticket type deleted.', 'success');
      onClose();
    } catch (ex) {
      setErr(ex?.response?.data?.message || 'Failed to delete ticket type.');
      setBusy(false);
    }
  };

  return createPortal(
    <div className="um-modal-overlay" role="dialog" aria-modal="true">
      <div className="um-modal">
        <h3>Delete Ticket Type</h3>
        <p className="muted">Are you sure you want to delete <strong>{ticketType.title}</strong>? This cannot be undone.</p>
        {err && <div className="err" style={{ marginTop: 6 }}>{err}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button className="btn-muted" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn-danger" onClick={confirm} disabled={busy}>{busy ? 'Deleting...' : 'Delete'}</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* -- ViewChainModal --------------------------------------------------------- */
const ViewChainModal = ({ ticketType, onClose }) => {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ApprovalStepsService.getApprovalStepsByTicketType(ticketType.id)
      .then(r => setSteps(r?.data?.data || []))
      .catch(() => setSteps([]))
      .finally(() => setLoading(false));
  }, [ticketType.id]);

  return createPortal(
    <div className="um-modal-overlay" role="dialog" aria-modal="true">
      <div className="um-modal" style={{ minWidth: 520, maxWidth: 720 }}>
        <div className="approval-chain-header">
          <div>
            <h3 className="approval-chain-title">Approval Chain</h3>
            <div className="approval-chain-subtitle">
              <strong>{ticketType.title}</strong> &bull; from first approver to last
            </div>
          </div>
          <button className="btn-muted" onClick={onClose}>Close</button>
        </div>
        <div className="approval-chain-stepper">
          {loading ? <Spinner /> : steps.length ? (
            <div className="approval-chain" style={{ marginTop: 4 }}>
              {steps.map((s, idx) => (
                <div className="approval-step" key={s.id || idx}>
                  <div className="approval-step-badge">{s.approval_step_number || idx + 1}</div>
                  <div className="approval-step-content">
                    <div className="approval-step-role">{s.Role?.role || ''}</div>
                    <div className="approval-step-meta">
                      <span className="approval-step-tag">Approver role</span>
                      <span className="approval-step-tag secondary">
                        {idx === 0 ? 'First approver' : idx === steps.length - 1 ? 'Final approver' : 'Next approver'}
                      </span>
                      {s.departments?.department && (
                        <span className="approval-step-tag">{s.departments.department}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="approval-chain-empty">No approval chain configured for this ticket type.</div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

/* -- CreateTicketModal ----------------------------------------------------- */
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

const ctmInput = (hasErr) => ({
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: `1.5px solid ${hasErr ? '#fca5a5' : '#e5e7eb'}`,
  fontSize: 14, outline: 'none', background: hasErr ? '#fff7f7' : '#ffffff',
  transition: 'border-color .18s, box-shadow .18s', boxSizing: 'border-box',
  fontFamily: 'inherit', color: '#111827',
});

const CreateTicketModal = ({ typesList, onClose, onCreated }) => {
  const [form, setForm] = useState({ title: '', description: '', ticket_type_id: '', assigned_to: '' });
  const [touched, setTouch] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [focus, setFocus] = useState('');
  const [officers, setOfficers] = useState([]);
  const [officersLoading, setOfficersLoading] = useState(true);

  useEffect(() => {
    UserService.getAllUsers({ role: 'OFFICER', limit: 200 })
      .then(r => {
        const users = r?.data?.data?.users || r?.data?.data || [];
        setOfficers(Array.isArray(users) ? users : []);
      })
      .catch(() => setOfficers([]))
      .finally(() => setOfficersLoading(false));
  }, []);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setTouch(t => ({ ...t, [k]: true })); };
  const touch = (k) => setTouch(t => ({ ...t, [k]: true }));

  const selectedType = typesList.find(t => String(t.id) === String(form.ticket_type_id)) || null;

  const fieldErr = (k) => {
    if (!touched[k]) return '';
    if (k === 'title' && !form.title.trim()) return 'Title is required.';
    if (k === 'description' && !form.description.trim()) return 'Description is required.';
    if (k === 'ticket_type_id' && !form.ticket_type_id) return 'Please select a ticket type.';
    return '';
  };

  const submit = async () => {
    setTouch({ title: true, description: true, ticket_type_id: true });
    if (!form.title.trim() || !form.description.trim() || !form.ticket_type_id) {
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
              <option value="">— Select a ticket type —</option>
              {typesList.map(t => (
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
              disabled={officersLoading}
              style={{ ...ctmInput(false), boxShadow: focus === 'assigned_to' ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none', borderColor: focus === 'assigned_to' ? '#93c5fd' : '#e5e7eb', cursor: 'pointer', color: form.assigned_to ? '#111827' : '#9ca3af' }}
              onBlurCapture={() => setFocus('')}
            >
              <option value="">{officersLoading ? 'Loading officers…' : '— Auto-assign (recommended) —'}</option>
              {officers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.first_name} {u.last_name}{u.department ? ` · ${u.department}` : ''}
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

/* -- ViewTicketModal ------------------------------------------------------- */
const statusMeta = s => ({
  PENDING_APPROVAL: { label: 'Pending Approval', cls: 'pending-approval' },
  QUEUED:           { label: 'In Queue',          cls: 'in-process' },
  CLOSED:           { label: 'Closed',             cls: 'done' },
  REJECTED:         { label: 'Rejected',           cls: 'overdue' },
  RESOLVED:         { label: 'Resolved',           cls: 'done' },
}[s] || { label: s, cls: '' });

const ViewTicketModal = ({ ticket, onClose, onClosed }) => {
  const [closing, setClosing] = useState(false);
  const [err, setErr] = useState('');
  const sm = statusMeta(ticket.status);
  const canClose = ticket.status === 'PENDING_APPROVAL' || ticket.status === 'QUEUED';
  const creator = ticket.created_by?.name || '-';
  const creatorDept = ticket.created_by?.department || '';
  const creatorEmail = ticket.created_by?.email || '';
  const officer = ticket.assignment?.officer?.name || 'Unassigned';
  const officerEmail = ticket.assignment?.officer?.email || '';
  const typeName = ticket.ticket_type?.title || '-';
  const sla = ticket.ticket_type?.expected_sla_duration;
  const createdAt = ticket.created_at ? new Date(ticket.created_at).toLocaleString() : '-';

  const doClose = async () => {
    setClosing(true); setErr('');
    try {
      await TicketService.closeTicket(ticket.id);
      onClosed();
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to close ticket.');
      setClosing(false);
    }
  };

  const avatarInitial = (name) => (name && name !== '-' ? name.charAt(0).toUpperCase() : '?');

  return createPortal(
    <div
      role="dialog" aria-modal="true" aria-label="Ticket details"
      style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, background: 'rgba(2,6,23,0.45)', backdropFilter: 'blur(3px)' }}
    >
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 620, boxShadow: '0 32px 64px rgba(2,6,23,0.22), 0 4px 16px rgba(2,6,23,0.1)', display: 'flex', flexDirection: 'column', maxHeight: '92vh', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', padding: '22px 28px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', padding: '3px 9px', borderRadius: 6, fontFamily: 'monospace' }}>
                  {ticket.id}
                </span>
                <span className={`chip ${sm.cls}`} style={{ fontSize: 11 }}>{sm.label}</span>
              </div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', lineHeight: 1.35 }}>{ticket.title}</div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 5 }}>Submitted {createdAt}</div>
            </div>
            <button
              onClick={onClose} disabled={closing}
              style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}
              aria-label="Close"
            >×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {err && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#b91c1c' }}>
              <AlertIcon />{err}
            </div>
          )}

          {/* Description */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: 8 }}>Description</div>
            <div style={{
              background: '#f8fafc', border: '1.5px solid #e5e7eb', borderRadius: 12,
              padding: '14px 16px', fontSize: 14, color: '#1f2937', lineHeight: 1.7,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word',
              maxHeight: 180, overflowY: 'auto', textIndent: '1em',
            }}>
              {ticket.description}
            </div>
          </div>

          {/* Meta grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

            {/* Type */}
            <div style={{ background: '#f8fafc', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: 6 }}>Ticket Type</div>
              <div style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>{typeName}</div>
              {sla && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, background: '#dbeafe', color: '#1d4ed8', borderRadius: 6, padding: '3px 9px', fontSize: 12, fontWeight: 700 }}>
                  <ClockIcon />{sla}h SLA
                </div>
              )}
            </div>

            {/* Status */}
            <div style={{ background: '#f8fafc', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: 6 }}>Status</div>
              <span className={`chip ${sm.cls}`}>{sm.label}</span>
              {ticket.ticket_type?.approval_required && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#92400e' }}>
                  Requires <strong>{ticket.ticket_type.approval_count}</strong> approval{ticket.ticket_type.approval_count !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Created By */}
            <div style={{ background: '#f8fafc', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#3b82f6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                {avatarInitial(creator)}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: 4 }}>Created By</div>
                <div style={{ fontWeight: 700, color: '#111827', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{creator}</div>
                {creatorDept && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{creatorDept}</div>}
                {creatorEmail && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{creatorEmail}</div>}
              </div>
            </div>

            {/* Assigned Officer */}
            <div style={{ background: '#f8fafc', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: officer === 'Unassigned' ? '#e5e7eb' : 'linear-gradient(135deg,#10b981,#059669)', color: officer === 'Unassigned' ? '#9ca3af' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                {officer === 'Unassigned' ? '–' : avatarInitial(officer)}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: 4 }}>Assigned Officer</div>
                <div style={{ fontWeight: 700, color: officer === 'Unassigned' ? '#9ca3af' : '#111827', fontSize: 14 }}>{officer}</div>
                {officerEmail && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{officerEmail}</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0, background: '#fafafa', borderBottomLeftRadius: 18, borderBottomRightRadius: 18 }}>
          {canClose && (
            <button
              onClick={doClose} disabled={closing}
              style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: closing ? '#fca5a5' : 'linear-gradient(135deg,#fb7185,#ef4444)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: closing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: closing ? 'none' : '0 4px 14px rgba(239,68,68,0.3)' }}
            >
              {closing && <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
              {closing ? 'Closing…' : 'Close Ticket'}
            </button>
          )}
          <button
            onClick={onClose} disabled={closing}
            style={{ padding: '9px 20px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 14, cursor: closing ? 'not-allowed' : 'pointer', opacity: closing ? 0.7 : 1 }}
          >Dismiss</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* -- TicketsPage ------------------------------------------------------------ */
const TicketsPage = () => {
  const [viewMode, setViewMode] = useState('types');

  /* ticket types */
  const [typesList, setTypesList] = useState([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [typeQuery, setTypeQuery] = useState('');

  /* lookups */
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);

  /* toast */
  const [toast, setToast] = useState(null);
  const showToast = useCallback((msg, type = 'info') => setToast({ msg, type, key: Date.now() }), []);

  /* modals */
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewChainTarget, setViewChainTarget] = useState(null);

  /* load ticket types */
  const loadTypes = useCallback(async () => {
    setTypesLoading(true);
    try {
      const res = await TicketTypeService.getAllTicketTypes();
      const data = res?.data?.data;
      setTypesList(Array.isArray(data?.ticket_types) ? data.ticket_types : []);
    } catch {
      showToast('Failed to load ticket types.', 'error');
    } finally { setTypesLoading(false); }
  }, [showToast]);

  useEffect(() => {
    loadTypes();
    DepartmentService.getAllDepartments()
      .then(r => setDepartments(r?.data?.data || [])).catch(() => {});
    RoleService.getAllRoles()
      .then(r => setRoles(r?.data?.data || [])).catch(() => {});
  }, [loadTypes]);

  const openEdit = useCallback(async (tt) => {
    try {
      const r = await ApprovalStepsService.getApprovalStepsByTicketType(tt.id);
      setEditTarget({ ticketType: tt, steps: r?.data?.data || [] });
    } catch {
      setEditTarget({ ticketType: tt, steps: [] });
    }
  }, []);

  const onSaved = useCallback((msg, type) => { showToast(msg, type); loadTypes(); }, [showToast, loadTypes]);

  const filteredTypes = useMemo(() => {
    const q = typeQuery.trim().toLowerCase();
    return q ? typesList.filter(t => (t.title || '').toLowerCase().includes(q)) : typesList;
  }, [typesList, typeQuery]);

  /* tickets tab */
  const [ticketsList, setTicketsList] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsPagination, setTicketsPagination] = useState(null);
  const [ticketsPage, setTicketsPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const loadTickets = useCallback(async (page = 1, status = 'All', search = '') => {
    setTicketsLoading(true);
    try {
      const params = { page, limit: 20 };
      if (status !== 'All') params.status = status;
      if (search.trim()) params.search = search.trim();
      const res = await TicketService.getAllTickets(params);
      const data = res?.data?.data;
      setTicketsList(Array.isArray(data?.tickets) ? data.tickets : []);
      setTicketsPagination(data?.pagination || null);
    } catch {
      showToast('Failed to load tickets.', 'error');
    } finally { setTicketsLoading(false); }
  }, [showToast]);

  useEffect(() => {
    if (viewMode === 'tickets') loadTickets(ticketsPage, statusFilter, query);
  }, [viewMode, ticketsPage, statusFilter, query, loadTickets]);

  const ticketStatuses = ['All', 'PENDING_APPROVAL', 'QUEUED', 'CLOSED', 'REJECTED', 'RESOLVED'];
  const ticketStatusLabel = s => ({ All: 'All', PENDING_APPROVAL: 'Pending Approval', QUEUED: 'In Queue', CLOSED: 'Closed', REJECTED: 'Rejected', RESOLVED: 'Resolved' }[s] || s);

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div className="external-actions">
        <button className={`external-btn ${viewMode === 'tickets' ? 'active' : ''}`} onClick={() => setViewMode('tickets')}>Tickets Created</button>
        <button className={`external-btn ${viewMode === 'types' ? 'active' : ''}`} onClick={() => setViewMode('types')}>Ticket Types</button>
      </div>

      <section className="panel tickets-panel">

        {/*  Ticket Types  */}
        {viewMode === 'types' && (
          <div className="types-list-panel">
            <div className="types-header">
              <h3>Configured Ticket Types</h3>
              <div className="types-header-actions">
                <div className="types-filter">
                  <input value={typeQuery} onChange={e => setTypeQuery(e.target.value)} placeholder="Search ticket type" />
                  {typeQuery && <button className="btn-muted" onClick={() => setTypeQuery('')}>Clear</button>}
                </div>
                <button className="btn-primary" onClick={() => setAddOpen(true)}>+ Add Type</button>
              </div>
            </div>

            <div className="types-table-wrap">
              <div className="table-wrap">
                {typesLoading ? <Spinner /> : (
                  <table className="user-tickets-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Department</th>
                        <th>SLA (hours)</th>
                        <th>Requires Approval</th>
                        <th>Approval Steps</th>
                        <th className="actions-col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTypes.map(t => (
                        <tr key={t.id}>
                          <td><strong>{t.title}</strong></td>
                          <td>{t.departments?.department || ''}</td>
                          <td>{t.expected_sla_duration ?? ''}</td>
                          <td>
                            <span className={`chip ${t.approval_required ? 'in-process' : 'done'}`}>
                              {t.approval_required ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td>
                            <div className="approval-count-cell">
                              <button
                                type="button"
                                className="approval-count-btn"
                                onClick={() => t.approval_count > 0 && setViewChainTarget(t)}
                                title={t.approval_count > 0 ? `View approval chain for ${t.title}` : 'No approval chain'}
                                style={{ cursor: t.approval_count > 0 ? 'pointer' : 'default', opacity: t.approval_count > 0 ? 1 : 0.5 }}
                              >
                                <span className="approval-count-badge">{t.approval_count ?? 0}</span>
                              </button>
                              <span className="muted">approver{t.approval_count === 1 ? '' : 's'}</span>
                            </div>
                          </td>
                          <td className="actions-col">
                            <button className="icon-btn" title={`Edit ${t.title}`} onClick={() => openEdit(t)}>
                              <EditIcon />
                            </button>
                            <button className="icon-btn" title={`Delete ${t.title}`} onClick={() => setDeleteTarget(t)} style={{ color: '#ef4444', marginLeft: 4 }}>
                              <TrashIcon />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!typesLoading && filteredTypes.length === 0 && (
                        <tr>
                          <td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 32 }}>
                            {typeQuery ? `No ticket types matching "${typeQuery}".` : 'No ticket types configured yet.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {!typesLoading && (
              <div className="muted" style={{ fontSize: 13, padding: '8px 4px' }}>
                {filteredTypes.length} ticket type{filteredTypes.length !== 1 ? 's' : ''}{typeQuery ? ` matching "${typeQuery}"` : ''}
              </div>
            )}
          </div>
        )}

        {/*  Tickets  */}
        {viewMode === 'tickets' && (
          <>
            <div className="tickets-controls">
              <div>
                <label><strong>Status</strong></label>
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setTicketsPage(1); }}>
                  {ticketStatuses.map(s => <option key={s} value={s}>{ticketStatusLabel(s)}</option>)}
                </select>
              </div>
              <div>
                <label><strong>Search</strong></label>
                <div className="tickets-search">
                  <input placeholder="Search title, creator or officer" value={query} onChange={e => { setQuery(e.target.value); setTicketsPage(1); }} />
                  {query && <button className="btn-muted" onClick={() => { setQuery(''); setTicketsPage(1); }}>Clear</button>}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
                <button className="btn-primary" onClick={() => setCreateOpen(true)}>+ Create Ticket</button>
              </div>
            </div>
            <div className="table-wrap tickets-table-wrap">
              {ticketsLoading ? <Spinner /> : (
                <table className="user-tickets-table">
                  <thead>
                    <tr>
                      <th>Ticket ID</th><th>Created By</th><th>Title</th><th>Assigned To</th>
                      <th className="status-col">Status</th><th>Created</th><th className="actions-col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ticketsList.map(t => {
                      const sm = statusMeta(t.status);
                      const creator = t.created_by?.name || '-';
                      const officer = t.assignment?.officer?.name || 'Unassigned';
                      return (
                        <tr key={t.id}>
                          <td><code style={{ fontSize: 12, background: '#f3f4f6', padding: '2px 7px', borderRadius: 6, letterSpacing: '0.04em', color: '#374151' }}>{t.id}</code></td>
                          <td>{creator}</td>
                          <td className="subject-col">{t.title}</td>
                          <td>{officer}</td>
                          <td><span className={`chip ${sm.cls}`}>{sm.label}</span></td>
                          <td>{t.created_at ? new Date(t.created_at).toLocaleDateString() : '-'}</td>
                          <td className="actions-col">
                            <button className="icon-btn" title="View details" onClick={() => setSelectedTicket(t)}>
                              <EyeIcon />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {!ticketsLoading && ticketsList.length === 0 && (
                      <tr><td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 32 }}>No tickets found.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
            {ticketsPagination && ticketsPagination.total_pages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', fontSize: 13 }}>
                <button className="btn-muted" disabled={ticketsPage <= 1} onClick={() => setTicketsPage(p => p - 1)}>&#8592; Prev</button>
                <span className="muted">Page {ticketsPagination.current_page} of {ticketsPagination.total_pages}</span>
                <button className="btn-muted" disabled={ticketsPage >= ticketsPagination.total_pages} onClick={() => setTicketsPage(p => p + 1)}>Next &#8594;</button>
              </div>
            )}
            {!ticketsLoading && (
              <div className="muted" style={{ fontSize: 13, padding: '4px 4px' }}>
                {ticketsPagination ? `${ticketsPagination.filtered_items ?? ticketsPagination.total_items ?? ticketsList.length} ticket${(ticketsPagination.total_items ?? ticketsList.length) !== 1 ? 's' : ''}` : `${ticketsList.length} ticket${ticketsList.length !== 1 ? 's' : ''}`}
              </div>
            )}
          </>
        )}
      </section>

      {/*  Modals  */}
      {addOpen && <AddTypeModal onClose={() => setAddOpen(false)} onSaved={onSaved} departments={departments} roles={roles} />}
      {editTarget && <EditTypeModal ticketType={editTarget.ticketType} existingSteps={editTarget.steps} onClose={() => setEditTarget(null)} onSaved={onSaved} departments={departments} roles={roles} />}
      {deleteTarget && <ConfirmDeleteModal ticketType={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={onSaved} />}
      {viewChainTarget && <ViewChainModal ticketType={viewChainTarget} onClose={() => setViewChainTarget(null)} />}

      {createOpen && (
        <CreateTicketModal
          typesList={typesList}
          onClose={() => setCreateOpen(false)}
          onCreated={() => { setCreateOpen(false); showToast('Ticket created successfully.', 'success'); loadTickets(ticketsPage, statusFilter, query); }}
        />
      )}

      {selectedTicket && (
        <ViewTicketModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onClosed={() => { setSelectedTicket(null); showToast('Ticket closed.', 'success'); loadTickets(ticketsPage, statusFilter, query); }}
        />
      )}

      {toast && <Toast key={toast.key} msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </>
  );
};

export default TicketsPage;
