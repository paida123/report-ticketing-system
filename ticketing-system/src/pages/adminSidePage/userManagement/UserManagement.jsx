import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import UserService from '../../../services/user.service';
import DepartmentService from '../../../services/department.service';
import RoleService from '../../../services/role.service';
import './userManagement.css';


/* â”€â”€â”€ Toast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const Toast = ({ msg, type, onDone }) => {
	useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, [onDone]);
	const bg = { success: '#10b981', error: '#ef4444', info: '#3b82f6' };
	return createPortal(
		<div style={{ position:'fixed', bottom:28, right:28, zIndex:9999, background: bg[type]||bg.info, color:'#fff', padding:'12px 20px', borderRadius:12, boxShadow:'0 8px 24px rgba(0,0,0,0.18)', fontWeight:700, fontSize:14, maxWidth:340, wordBreak:'break-word', animation:'umSlideUp .22s ease' }}>
			{msg}
		</div>, document.body
	);
};

/* â”€â”€â”€ Status Badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const STATUS_META = {
	ACTIVE:      { label: 'Active',      bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', color: '#065f46' },
	DEACTIVATED: { label: 'Deactivated', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)', color: '#334155' },
	LOCKED:      { label: 'Locked',      bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.3)',  color: '#7f1d1d' },
	DELETED:     { label: 'Deleted',     bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.2)',  color: '#991b1b' },
};
const StatusBadge = ({ status }) => {
	const m = STATUS_META[status] || STATUS_META.DEACTIVATED;
	return (
		<span style={{ display:'inline-flex', alignItems:'center', padding:'4px 12px', borderRadius:999, background:m.bg, border:`1px solid ${m.border}`, color:m.color, fontSize:12, fontWeight:700, letterSpacing:'.04em' }}>
			{m.label}
		</span>
	);
};

/* â”€â”€â”€ Generate temp password â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const genPassword = () => {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
	return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

/* â”€â”€â”€ Shared options hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const useOptions = () => {
	const [roles, setRoles] = useState([]);
	const [departments, setDepts] = useState([]);
	useEffect(() => {
		DepartmentService.getAllDepartments().then(r => setDepts(r.data.data || [])).catch(() => {});
		RoleService.getAllRoles().then(r => setRoles(r.data.data || [])).catch(() => {});
	}, []);
	return { roles, departments };
};

/* â”€â”€â”€ Add User Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const AddUserModal = ({ onClose, onAdded }) => {
	const { roles, departments } = useOptions();
	const [form, setForm] = useState({ first_name:'', last_name:'', email:'', phone_number:'', role_id:'', department_id:'' });
	const [error, setError] = useState('');
	const [saving, setSaving] = useState(false);
	const firstRef = useRef(null);
	useEffect(() => { firstRef.current?.focus(); }, []);

	const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(''); };

	const submit = async (ev) => {
		ev.preventDefault();
		const { first_name, last_name, email, phone_number, role_id, department_id } = form;
		if (!first_name || !last_name || !email || !phone_number || !role_id || !department_id) {
			setError('All fields are required.'); return;
		}
		setSaving(true); setError('');
		try {
			const res = await UserService.createUser({ first_name: first_name.trim(), last_name: last_name.trim(), email: email.trim(), phone_number: phone_number.trim(), role_id: parseInt(role_id), department_id: parseInt(department_id), temp_password: genPassword() });
			onAdded(res.data.data);
			onClose();
		} catch (err) {
			setError(err?.response?.data?.message || 'Failed to create user.');
		} finally { setSaving(false); }
	};

	return createPortal(
		<div className="um-modal-overlay" role="dialog" aria-modal="true" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
			<div className="um-modal" style={{ maxWidth:560 }} onClick={e => e.stopPropagation()}>
				<h3>Add New User</h3>
				<form onSubmit={submit} className="um-form">
					<div className="row">
						<label>First Name<input ref={firstRef} value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="John" disabled={saving} /></label>
						<label>Last Name<input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Doe" disabled={saving} /></label>
					</div>
					<div className="row">
						<label>Email<input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john.doe@company.com" disabled={saving} /></label>
						<label>Phone Number<input value={form.phone_number} onChange={e => set('phone_number', e.target.value)} placeholder="+263 77 000 0000" disabled={saving} /></label>
					</div>
					<div className="row">
						<label>Department
							<select value={form.department_id} onChange={e => set('department_id', e.target.value)} disabled={saving}>
								<option value="">Select departmentâ€¦</option>
								{departments.map(d => <option key={d.id} value={d.id}>{d.department}</option>)}
							</select>
						</label>
						<label>Role
							<select value={form.role_id} onChange={e => set('role_id', e.target.value)} disabled={saving}>
								<option value="">Select roleâ€¦</option>
								{roles.map(r => <option key={r.id} value={r.id}>{r.role}</option>)}
							</select>
						</label>
					</div>
					<div className="row" style={{ alignItems:'flex-end' }}>
						<label style={{ flex:1 }}>Temporary Password
							<input value={form.temp_password} onChange={e => set('temp_password', e.target.value)} placeholder="Min 8 characters" disabled={saving} />
						</label>
						<button type="button" className="um-gen-btn" onClick={() => set('temp_password', genPassword())} disabled={saving} title="Auto-generate password">Auto-generate</button>
					</div>
					{form.temp_password && <p style={{ margin:'2px 0 6px', fontSize:12, color:'#64748b' }}>Password: <strong style={{ fontFamily:'monospace', color:'#0f172a' }}>{form.temp_password}</strong> â€” user must change on first login.</p>}
					{error && <div className="field-error">{error}</div>}
					<div className="row actions">
						<button type="button" className="btn-muted" onClick={onClose} disabled={saving}>Cancel</button>
						<button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creatingâ€¦' : 'Create User'}</button>
					</div>
				</form>
			</div>
		</div>, document.body
	);
};

/* â”€â”€â”€ Edit User Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const EditUserModal = ({ user, onClose, onUpdated, onStatusRequest }) => {
	const { roles, departments } = useOptions();
	const [form, setForm] = useState({ first_name: user.first_name||'', last_name: user.last_name||'', phone_number: user.phone_number||'', role_id: user.role?.id||user.role_id||'', department_id: user.department?.id||user.department_id||'' });
	const [error, setError] = useState('');
	const [saving, setSaving] = useState(false);
	const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setError(''); };

	const submit = async (ev) => {
		ev.preventDefault();
		setSaving(true); setError('');
		try {
			const res = await UserService.updateUser(user.id, { first_name: form.first_name.trim(), last_name: form.last_name.trim(), phone_number: form.phone_number.trim(), role_id: parseInt(form.role_id), department_id: parseInt(form.department_id) });
			onUpdated(res.data.data);
			onClose();
		} catch (err) {
			setError(err?.response?.data?.message || 'Failed to update user.');
		} finally { setSaving(false); }
	};

	return createPortal(
		<div className="um-modal-overlay" role="dialog" aria-modal="true" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
			<div className="um-modal" style={{ maxWidth:560 }} onClick={e => e.stopPropagation()}>
				<h3>Edit User</h3>
				<p style={{ margin:'0 0 14px', fontSize:13, color:'#64748b' }}>{user.email}</p>
				<form onSubmit={submit} className="um-form">
					<div className="row">
						<label>First Name<input value={form.first_name} onChange={e => set('first_name', e.target.value)} disabled={saving} /></label>
						<label>Last Name<input value={form.last_name} onChange={e => set('last_name', e.target.value)} disabled={saving} /></label>
					</div>
					<div className="row">
						<label>Phone Number<input value={form.phone_number} onChange={e => set('phone_number', e.target.value)} disabled={saving} /></label>
					</div>
					<div className="row">
						<label>Department
							<select value={form.department_id} onChange={e => set('department_id', e.target.value)} disabled={saving}>
								<option value="">Selectâ€¦</option>
								{departments.map(d => <option key={d.id} value={d.id}>{d.department}</option>)}
							</select>
						</label>
						<label>Role
							<select value={form.role_id} onChange={e => set('role_id', e.target.value)} disabled={saving}>
								<option value="">Selectâ€¦</option>
								{roles.map(r => <option key={r.id} value={r.id}>{r.role}</option>)}
							</select>
						</label>
					</div>
					{error && <div className="field-error">{error}</div>}
					<div className="row actions" style={{ justifyContent:'space-between' }}>
						<button type="button" className="um-status-btn" onClick={() => { onStatusRequest(user); onClose(); }} disabled={saving}>Change Status</button>
						<div style={{ display:'flex', gap:8 }}>
							<button type="button" className="btn-muted" onClick={onClose} disabled={saving}>Cancel</button>
							<button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Savingâ€¦' : 'Save'}</button>
						</div>
					</div>
				</form>
			</div>
		</div>, document.body
	);
};

/* â”€â”€â”€ Status Change Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const StatusModal = ({ user, onClose, onChanged }) => {
	const [status, setStatus] = useState(user.status || 'ACTIVE');
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');

	const confirm = async () => {
		if (status === user.status) { onClose(); return; }
		setSaving(true); setError('');
		try {
			await UserService.updateUserStatus(user.id, status);
			onChanged(user.id, status);
			onClose();
		} catch (err) {
			setError(err?.response?.data?.message || 'Failed to update status.');
		} finally { setSaving(false); }
	};

	return createPortal(
		<div className="um-modal-overlay" role="dialog" aria-modal="true" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
			<div className="um-modal small" onClick={e => e.stopPropagation()}>
				<h3>Change Status</h3>
				<p style={{ margin:'0 0 16px', fontSize:13, color:'#64748b' }}>
					<strong>{user.first_name} {user.last_name}</strong> â€” current: <StatusBadge status={user.status} />
				</p>
				<div className="row">
					<label style={{ width:'100%' }}>New Status
						<select value={status} onChange={e => setStatus(e.target.value)} disabled={saving}>
							<option value="ACTIVE">ACTIVE</option>
							<option value="DEACTIVATED">DEACTIVATED</option>
							<option value="LOCKED">LOCKED</option>
						</select>
					</label>
				</div>
				{error && <div className="field-error" style={{ marginBottom:10 }}>{error}</div>}
				<div className="row actions">
					<button className="btn-muted" onClick={onClose} disabled={saving}>Cancel</button>
					<button className="btn-primary" onClick={confirm} disabled={saving}>{saving ? 'Savingâ€¦' : 'Update Status'}</button>
				</div>
			</div>
		</div>, document.body
	);
};

/* â”€â”€â”€ View User Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const ViewUserModal = ({ user, onClose, onEdit }) => {
	const detail = (label, value) => (
		<div style={{ marginBottom:10 }}>
			<div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:2 }}>{label}</div>
			<div style={{ fontSize:14, color:'#0f172a', fontWeight:500 }}>{value || 'â€”'}</div>
		</div>
	);
	return createPortal(
		<div className="um-modal-overlay" role="dialog" aria-modal="true" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
			<div className="um-modal" style={{ maxWidth:520 }} onClick={e => e.stopPropagation()}>
				<div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
					<div style={{ width:52, height:52, borderRadius:'50%', background:'linear-gradient(135deg,#3b82f6,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:20 }}>
						{(user.first_name?.[0]||'')}{(user.last_name?.[0]||'')}
					</div>
					<div>
						<div style={{ fontWeight:800, fontSize:18, color:'#0f172a' }}>{user.first_name} {user.last_name}</div>
						<div style={{ fontSize:13, color:'#64748b' }}>{user.email}</div>
					</div>
					<div style={{ marginLeft:'auto' }}><StatusBadge status={user.status} /></div>
				</div>
				<div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 24px' }}>
					{detail('Phone', user.phone_number)}
					{detail('Department', user.department?.department)}
					{detail('Role', user.role?.role)}
					{detail('Last Login', user.last_login ? new Date(user.last_login).toLocaleString() : 'Never')}
					{detail('Password Pending', user.is_password_pending ? 'Yes â€” must change on login' : 'No')}
					{detail('MFA Enabled', user.mfa_enabled ? 'Yes' : 'No')}
				</div>
				<div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:20 }}>
					<button className="btn-muted" onClick={onClose}>Close</button>
					<button className="btn-primary" onClick={() => { onEdit(user); onClose(); }}>Edit</button>
				</div>
			</div>
		</div>, document.body
	);
};

/* â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const UserManagement = () => {
	const [users, setUsers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [fetchError, setFetchError] = useState('');

	/* filters */
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('');
	const [roleFilter, setRoleFilter] = useState('');
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalItems, setTotalItems] = useState(0);
	const LIMIT = 15;

	/* filter options */
	const [roles, setRoles] = useState([]);
	const [departments, setDepartments] = useState([]);

	/* modals */
	const [openAdd, setOpenAdd] = useState(false);
	const [editing, setEditing] = useState(null);
	const [viewing, setViewing] = useState(null);
	const [statusTarget, setStatusTarget] = useState(null);
	const [toast, setToast] = useState(null);
	const showToast = (msg, type = 'success') => setToast({ msg, type, key: Date.now() });

	/* load filter options once */
	useEffect(() => {
		DepartmentService.getAllDepartments().then(r => setDepartments(r.data.data || [])).catch(() => {});
		RoleService.getAllRoles().then(r => setRoles(r.data.data || [])).catch(() => {});
	}, []);

	/* fetch users */
	const fetchUsers = useCallback(async (pg = page) => {
		setLoading(true); setFetchError('');
		try {
			const params = { page: pg, limit: LIMIT };
			if (search.trim()) params.search = search.trim();
			if (statusFilter) params.status = statusFilter;
			if (roleFilter) params.role_id = roleFilter;
			const res = await UserService.getAllUsers(params);
			const d = res.data.data;
			setUsers(d.users || []);
			setTotalPages(d.pagination?.total_pages || 1);
			setTotalItems(d.pagination?.total_items || 0);
		} catch (err) {
			setFetchError(err?.response?.data?.message || 'Failed to load users.');
		} finally { setLoading(false); }
	}, [search, statusFilter, roleFilter, page]);

	useEffect(() => { fetchUsers(page); }, [search, statusFilter, roleFilter, page]);

	/* reset to page 1 when filters change */
	const applyFilter = (setter) => (val) => { setter(val); setPage(1); };

	/* CRUD callbacks */
	const onAdded = (u) => { showToast(`User ${u.first_name} ${u.last_name} created.`); fetchUsers(1); setPage(1); };
	const onUpdated = (u) => {
		setUsers(prev => prev.map(x => x.id === u.id ? { ...x, ...u } : x));
		showToast(`User updated.`);
	};
	const onStatusChanged = (id, status) => {
		setUsers(prev => prev.map(x => x.id === id ? { ...x, status } : x));
		showToast(`Status changed to ${status}.`, status === 'ACTIVE' ? 'success' : 'info');
	};

	return (
		<>
			<style>{`
				@keyframes umSlideUp {
					from { opacity:0; transform:translateY(12px); }
					to   { opacity:1; transform:translateY(0); }
				}
				.um-page-header { margin-bottom:6px; }
				.um-page-header h2 { margin:0 0 4px; font-size:22px; font-weight:800; color:#0f172a; letter-spacing:-.02em; }
				.um-page-header p { margin:0; font-size:14px; color:#64748b; }

				.um-filter-bar {
					display:flex; align-items:center; flex-wrap:wrap; gap:10px;
					margin:16px 0 20px; padding:14px 18px;
					background:#fff; border:1px solid rgba(148,163,184,0.18);
					border-radius:14px; box-shadow:0 2px 8px rgba(2,6,23,0.04);
				}
				.um-search-input {
					flex:1; min-width:200px; max-width:300px; padding:9px 14px;
					border:1px solid rgba(148,163,184,0.3); border-radius:10px;
					font-size:14px; color:#0f172a; background:#f8fafc; outline:none;
					transition:border-color .15s, box-shadow .15s;
				}
				.um-search-input:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,0.12); background:#fff; }
				.um-filter-select {
					padding:9px 12px; border:1px solid rgba(148,163,184,0.3); border-radius:10px;
					font-size:14px; color:#0f172a; background:#f8fafc; outline:none; cursor:pointer;
					transition:border-color .15s;
				}
				.um-filter-select:focus { border-color:#3b82f6; background:#fff; }
				.um-filter-actions { margin-left:auto; display:flex; gap:8px; }

				.um-users-table-card {
					background:#fff; border:1px solid rgba(148,163,184,0.18);
					border-radius:14px; box-shadow:0 2px 8px rgba(2,6,23,0.04); overflow:hidden;
				}
				.um-users-table { width:100%; border-collapse:collapse; font-size:14px; }
				.um-users-table thead tr { background:#f8fafc; border-bottom:2px solid rgba(148,163,184,0.18); }
				.um-users-table thead th { padding:12px 14px; text-align:left; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#64748b; white-space:nowrap; }
				.um-users-table tbody tr { border-bottom:1px solid rgba(148,163,184,0.1); transition:background .12s; }
				.um-users-table tbody tr:hover { background:rgba(59,130,246,0.03); }
				.um-users-table tbody tr:last-child { border-bottom:none; }
				.um-users-table td { padding:13px 14px; color:#0f172a; vertical-align:middle; }
				.um-users-table td.num-col { width:48px; color:#94a3b8; font-weight:600; }
				.um-users-table td.action-col { width:100px; text-align:center; }

				.um-avatar {
					width:34px; height:34px; border-radius:50%;
					background:linear-gradient(135deg,#3b82f6,#8b5cf6);
					display:inline-flex; align-items:center; justify-content:center;
					color:#fff; font-weight:800; font-size:13px; flex-shrink:0;
				}
				.um-name-cell { display:flex; align-items:center; gap:10px; }
				.um-name-cell .um-name { font-weight:700; color:#0f172a; line-height:1.2; }
				.um-name-cell .um-email { font-size:12px; color:#64748b; }

				.um-icon-btn {
					display:inline-flex; align-items:center; justify-content:center;
					width:32px; height:32px; border-radius:8px;
					border:1px solid rgba(148,163,184,0.28); background:#f8fafc;
					color:#475569; cursor:pointer;
					transition:background .14s, border-color .14s, color .14s, box-shadow .14s;
				}
				.um-icon-btn:hover { background:rgba(59,130,246,0.08); border-color:rgba(59,130,246,0.35); color:#2563eb; box-shadow:0 4px 10px rgba(59,130,246,0.12); }

				.um-pagination { display:flex; align-items:center; justify-content:space-between; margin-top:14px; font-size:13px; color:#94a3b8; font-weight:500; }
				.um-page-btns { display:flex; gap:6px; }
				.um-page-btn { padding:6px 14px; border-radius:8px; border:1px solid rgba(148,163,184,0.3); background:#f8fafc; color:#475569; font-size:13px; font-weight:600; cursor:pointer; transition:background .12s; }
				.um-page-btn:hover:not(:disabled) { background:#e2e8f0; }
				.um-page-btn:disabled { opacity:.4; cursor:not-allowed; }
				.um-page-btn.active { background:#2563eb; color:#fff; border-color:#2563eb; }

				.um-gen-btn { padding:9px 14px; border-radius:10px; border:1px solid rgba(59,130,246,0.3); background:rgba(59,130,246,0.06); color:#2563eb; font-size:13px; font-weight:700; cursor:pointer; white-space:nowrap; align-self:flex-end; transition:background .12s; }
				.um-gen-btn:hover { background:rgba(59,130,246,0.12); }

				.um-status-btn { padding:10px 14px; border-radius:10px; border:1px solid rgba(148,163,184,0.3); background:#f8fafc; color:#475569; font-size:13px; font-weight:700; cursor:pointer; transition:background .12s; }
				.um-status-btn:hover { background:#e2e8f0; }

				.field-error { color:#dc2626; font-size:13px; font-weight:600; margin:4px 0 8px; }

				/* shared modal styles used by this page */
				.um-form label { display:flex; flex-direction:column; gap:5px; font-size:13px; font-weight:600; color:#334155; }
				.um-form input, .um-form select { padding:9px 12px; border:1px solid rgba(148,163,184,0.3); border-radius:10px; font-size:14px; color:#0f172a; background:#f8fafc; outline:none; transition:border-color .15s; }
				.um-form input:focus, .um-form select:focus { border-color:#3b82f6; background:#fff; }
				.um-form .row { display:flex; gap:14px; margin-bottom:12px; flex-wrap:wrap; }
				.um-form .row label { flex:1; min-width:160px; }
				.um-form .row.actions { justify-content:flex-end; gap:8px; margin-top:6px; }
				.btn-muted { padding:10px 16px; border-radius:10px; border:1px solid rgba(148,163,184,0.3); background:#f8fafc; color:#475569; font-size:14px; font-weight:700; cursor:pointer; }
				.btn-muted:hover { background:#e2e8f0; }
				.btn-muted:disabled { opacity:.5; cursor:not-allowed; }
			`}</style>

			<div className="um-page">

				{/* â”€â”€ Header â”€â”€ */}
				<div className="um-page-header">
					<h2>User Management</h2>
					<p>View, create and manage all users in your organisation</p>
				</div>

				{/* â”€â”€ Filter bar â”€â”€ */}
				<div className="um-filter-bar">
					<input
						className="um-search-input"
						type="search"
						placeholder="Search by name, email or phoneâ€¦"
						value={search}
						onChange={e => applyFilter(setSearch)(e.target.value)}
					/>
					<select className="um-filter-select" value={statusFilter} onChange={e => applyFilter(setStatusFilter)(e.target.value)}>
						<option value="">All Statuses</option>
						<option value="ACTIVE">Active</option>
						<option value="DEACTIVATED">Deactivated</option>
						<option value="LOCKED">Locked</option>
					</select>
					<select className="um-filter-select" value={roleFilter} onChange={e => applyFilter(setRoleFilter)(e.target.value)}>
						<option value="">All Roles</option>
						{roles.map(r => <option key={r.id} value={r.id}>{r.role}</option>)}
					</select>
					<div className="um-filter-actions">
						<button className="btn-primary" onClick={() => setOpenAdd(true)}>+ Add User</button>
					</div>
				</div>

				{/* â”€â”€ Fetch error â”€â”€ */}
				{fetchError && (
					<div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#7f1d1d', padding:'10px 16px', borderRadius:10, marginBottom:16, fontSize:14 }}>
						{fetchError}
						<button style={{ marginLeft:12, background:'none', border:'none', color:'#dc2626', fontWeight:700, cursor:'pointer' }} onClick={() => fetchUsers(page)}>Retry</button>
					</div>
				)}

				{/* â”€â”€ Table â”€â”€ */}
				<div className="um-users-table-card">
					<table className="um-users-table">
						<thead>
							<tr>
								<th style={{ width:48 }}>#</th>
								<th>User</th>
								<th>Phone</th>
								<th>Department</th>
								<th>Role</th>
								<th>Status</th>
								<th style={{ width:100, textAlign:'center' }}>Actions</th>
							</tr>
						</thead>
						<tbody>
							{loading && <tr><td colSpan={7} style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>Loading usersâ€¦</td></tr>}
							{!loading && users.map((u, i) => (
								<tr key={u.id}>
									<td className="num-col">{(page - 1) * LIMIT + i + 1}</td>
									<td>
										<div className="um-name-cell">
											<div className="um-avatar">{(u.first_name?.[0]||'').toUpperCase()}{(u.last_name?.[0]||'').toUpperCase()}</div>
											<div>
												<div className="um-name">{u.first_name} {u.last_name}</div>
												<div className="um-email">{u.email}</div>
											</div>
										</div>
									</td>
									<td style={{ color:'#475569' }}>{u.phone_number || 'â€”'}</td>
									<td style={{ color:'#475569' }}>{u.department?.department || 'â€”'}</td>
									<td style={{ color:'#475569' }}>{u.role?.role || 'â€”'}</td>
									<td><StatusBadge status={u.status} /></td>
									<td className="action-col">
										<div style={{ display:'flex', gap:6, justifyContent:'center' }}>
											<button className="um-icon-btn" title="View details" onClick={() => setViewing(u)}>
												<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5c5.5 0 10 4.5 11 7-1 2.5-5.5 7-11 7S2 14.5 1 12c1-2.5 5.5-7 11-7z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2"/></svg>
											</button>
											<button className="um-icon-btn" title="Edit user" onClick={() => setEditing(u)}>
												<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
											</button>
										</div>
									</td>
								</tr>
							))}
							{!loading && users.length === 0 && !fetchError && (
								<tr><td colSpan={7} style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>
									{search || statusFilter || roleFilter ? 'No users match the current filters.' : 'No users found.'}
								</td></tr>
							)}
						</tbody>
					</table>
				</div>

				{/* â”€â”€ Pagination â”€â”€ */}
				{!loading && totalItems > 0 && (
					<div className="um-pagination">
						<span>Showing {(page - 1) * LIMIT + 1}â€“{Math.min(page * LIMIT, totalItems)} of {totalItems} user{totalItems !== 1 ? 's' : ''}</span>
						<div className="um-page-btns">
							<button className="um-page-btn" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>â† Prev</button>
							{Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
								const pg = totalPages <= 5 ? i + 1 : Math.max(1, page - 2) + i;
								if (pg > totalPages) return null;
								return <button key={pg} className={`um-page-btn${page === pg ? ' active' : ''}`} onClick={() => setPage(pg)}>{pg}</button>;
							})}
							<button className="um-page-btn" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next â†’</button>
						</div>
					</div>
				)}
			</div>

			{/* â”€â”€ Modals â”€â”€ */}
			{openAdd && <AddUserModal onClose={() => setOpenAdd(false)} onAdded={onAdded} />}
			{editing && <EditUserModal user={editing} onClose={() => setEditing(null)} onUpdated={onUpdated} onStatusRequest={u => { setEditing(null); setStatusTarget(u); }} />}
			{viewing && <ViewUserModal user={viewing} onClose={() => setViewing(null)} onEdit={u => { setViewing(null); setEditing(u); }} />}
			{statusTarget && <StatusModal user={statusTarget} onClose={() => setStatusTarget(null)} onChanged={onStatusChanged} />}
			{toast && <Toast key={toast.key} msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
		</>
	);
};

export default UserManagement;
