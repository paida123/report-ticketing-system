import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import RoleService from '../../../services/role.service';
import '../userManagement/userManagement.css';

/* ─── Toast ────────────────────────────────────────────────────────────── */
const Toast = ({ msg, type, onDone }) => {
	useEffect(() => {
		const t = setTimeout(onDone, 3200);
		return () => clearTimeout(t);
	}, [onDone]);
	const colors = { success: '#10b981', error: '#ef4444', info: '#3b82f6' };
	return createPortal(
		<div style={{
			position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
			background: colors[type] || colors.info,
			color: '#fff', padding: '12px 20px', borderRadius: 12,
			boxShadow: '0 8px 24px rgba(0,0,0,0.18)', fontWeight: 700, fontSize: 14,
			maxWidth: 320, wordBreak: 'break-word',
			animation: 'slideUp .22s ease',
		}}>
			{msg}
		</div>,
		document.body
	);
};

/* ─── Normalize helper ──────────────────────────────────────────────────── */
const normalizeRoleName = (raw) =>
	raw.trim().replace(/[\s\-]+/g, '_').replace(/[^A-Z0-9_]/gi, '').toUpperCase();

/* ─── Add Modal ─────────────────────────────────────────────────────────── */
const AddRoleModal = ({ onClose, onAdded }) => {
	const [name, setName] = useState('');
	const [error, setError] = useState('');
	const [saving, setSaving] = useState(false);
	const inputRef = useRef(null);

	useEffect(() => { inputRef.current?.focus(); }, []);

	const preview = normalizeRoleName(name);

	const submit = async (ev) => {
		ev.preventDefault();
		if (preview.length < 2) { setError('Role name must be at least 2 characters.'); return; }
		setSaving(true);
		setError('');
		try {
			const res = await RoleService.createRole({ role: preview });
			onAdded(res.data.data);
			onClose();
		} catch (err) {
			setError(err?.response?.data?.message || 'Failed to create role.');
		} finally {
			setSaving(false);
		}
	};

	return createPortal(
		<div className="um-modal-overlay" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
			<div className="um-modal small" onClick={(e) => e.stopPropagation()}>
				<h3>Add Role</h3>
				<form onSubmit={submit} className="um-form">
					<div className="row">
						<label>
							Role Name
							<input
								ref={inputRef}
								value={name}
								onChange={(e) => { setName(e.target.value); setError(''); }}
								placeholder="e.g. Support Officer"
								disabled={saving}
							/>
						</label>
						{name.trim().length > 0 && (
							<p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
								Will be saved as: <strong style={{ color: '#0f172a', letterSpacing: '0.03em' }}>{preview}</strong>
							</p>
						)}
					</div>
					{error && <div className="field-error">{error}</div>}
					<div className="row actions">
						<button type="button" className="btn-muted" onClick={onClose} disabled={saving}>Cancel</button>
						<button type="submit" className="btn-primary" disabled={saving}>
							{saving ? 'Adding…' : 'Add Role'}
						</button>
					</div>
				</form>
			</div>
		</div>,
		document.body
	);
};

/* ─── Edit Modal ────────────────────────────────────────────────────────── */
const EditRoleModal = ({ role, onClose, onUpdated, onDeleteRequest }) => {
	const [name, setName] = useState(role?.role || '');
	const [error, setError] = useState('');
	const [saving, setSaving] = useState(false);
	const inputRef = useRef(null);

	useEffect(() => { inputRef.current?.focus(); }, []);

	const preview = normalizeRoleName(name);

	const submit = async (ev) => {
		ev.preventDefault();
		if (preview.length < 2) { setError('Role name must be at least 2 characters.'); return; }
		if (preview === role.role) { onClose(); return; }
		setSaving(true);
		setError('');
		try {
			const res = await RoleService.updateRole(role.id, { role: preview });
			onUpdated(res.data.data);
			onClose();
		} catch (err) {
			setError(err?.response?.data?.message || 'Failed to update role.');
		} finally {
			setSaving(false);
		}
	};

	return createPortal(
		<div className="um-modal-overlay" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
			<div className="um-modal small" onClick={(e) => e.stopPropagation()}>
				<h3>Edit Role</h3>
				<form onSubmit={submit} className="um-form">
					<div className="row">
						<label>
							Role Name
							<input
								ref={inputRef}
								value={name}
								onChange={(e) => { setName(e.target.value); setError(''); }}
								disabled={saving}
							/>
						</label>
						{name.trim().length > 0 && preview !== role.role && (
							<p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
								Will be saved as: <strong style={{ color: '#0f172a', letterSpacing: '0.03em' }}>{preview}</strong>
							</p>
						)}
					</div>
					{error && <div className="field-error">{error}</div>}
					<div className="row actions" style={{ justifyContent: 'space-between' }}>
						<button
							type="button"
							className="role-danger-btn"
							onClick={() => { onDeleteRequest(role); onClose(); }}
							disabled={saving}
						>
							Delete
						</button>
						<div style={{ display: 'flex', gap: 8 }}>
							<button type="button" className="btn-muted" onClick={onClose} disabled={saving}>Cancel</button>
							<button type="submit" className="btn-primary" disabled={saving}>
								{saving ? 'Saving…' : 'Save'}
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>,
		document.body
	);
};

/* ─── Confirm Delete Modal ──────────────────────────────────────────────── */
const ConfirmDeleteModal = ({ role, onClose, onDeleted }) => {
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState('');

	const confirm = async () => {
		setDeleting(true);
		setError('');
		try {
			await RoleService.deleteRole(role.id);
			onDeleted(role.id);
			onClose();
		} catch (err) {
			setError(err?.response?.data?.message || 'Failed to delete role.');
			setDeleting(false);
		}
	};

	return createPortal(
		<div className="um-modal-overlay" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
			<div className="um-modal small" onClick={(e) => e.stopPropagation()}>
				<h3>Delete Role</h3>
				<p className="muted" style={{ marginBottom: 12 }}>
					Are you sure you want to delete <strong>{role?.role}</strong>? This cannot be undone.
				</p>
				{error && <div className="field-error" style={{ marginBottom: 10 }}>{error}</div>}
				<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
					<button className="btn-muted" onClick={onClose} disabled={deleting}>Cancel</button>
					<button className="role-danger-btn" onClick={confirm} disabled={deleting}>
						{deleting ? 'Deleting…' : 'Delete'}
					</button>
				</div>
			</div>
		</div>,
		document.body
	);
};

/* ─── Main Page ─────────────────────────────────────────────────────────── */
const RolesConfiguration = () => {
	const [roles, setRoles] = useState([]);
	const [loading, setLoading] = useState(true);
	const [fetchError, setFetchError] = useState('');
	const [search, setSearch] = useState('');

	const [openAdd, setOpenAdd] = useState(false);
	const [editingRole, setEditingRole] = useState(null);
	const [deletingRole, setDeletingRole] = useState(null);
	const [toast, setToast] = useState(null);

	const showToast = (msg, type = 'success') => setToast({ msg, type, key: Date.now() });

	/* ── Fetch ── */
	const fetchRoles = async () => {
		setLoading(true);
		setFetchError('');
		try {
			const res = await RoleService.getAllRoles();
			setRoles(res.data.data || []);
		} catch (err) {
			setFetchError(err?.response?.data?.message || 'Failed to load roles.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { fetchRoles(); }, []);

	/* ── CRUD callbacks ── */
	const onAdded = (role) => {
		setRoles((prev) => [role, ...prev]);
		showToast(`Role "${role.role}" created.`);
	};

	const onUpdated = (role) => {
		setRoles((prev) => prev.map((r) => r.id === role.id ? role : r));
		showToast(`Role "${role.role}" updated.`);
	};

	const onDeleted = (id) => {
		setRoles((prev) => prev.filter((r) => r.id !== id));
		showToast('Role deleted.', 'error');
	};

	const filtered = roles.filter((r) =>
		r.role?.toLowerCase().includes(search.toLowerCase())
	);

	return (
		<>
			<style>{`
				@keyframes slideUp {
					from { opacity:0; transform:translateY(12px); }
					to   { opacity:1; transform:translateY(0); }
				}
				.role-page-header { margin-bottom: 6px; }
				.role-page-header h2 {
					margin: 0 0 4px 0; font-size: 22px; font-weight: 800;
					color: #0f172a; letter-spacing: -0.02em;
				}
				.role-page-header p { margin: 0; font-size: 14px; color: #64748b; }

				.role-toolbar {
					display: flex; align-items: center; justify-content: space-between;
					gap: 12px; margin: 16px 0 20px 0; padding: 14px 18px;
					background: #ffffff; border: 1px solid rgba(148,163,184,0.18);
					border-radius: 14px; box-shadow: 0 2px 8px rgba(2,6,23,0.04);
				}
				.role-search {
					flex: 1; max-width: 340px; padding: 9px 14px;
					border: 1px solid rgba(148,163,184,0.3); border-radius: 10px;
					font-size: 14px; color: #0f172a; background: #f8fafc;
					outline: none; transition: border-color .15s, box-shadow .15s;
				}
				.role-search:focus {
					border-color: #3b82f6;
					box-shadow: 0 0 0 3px rgba(59,130,246,0.12); background: #fff;
				}
				.role-table-card {
					background: #ffffff; border: 1px solid rgba(148,163,184,0.18);
					border-radius: 14px; box-shadow: 0 2px 8px rgba(2,6,23,0.04); overflow: hidden;
				}
				.role-table { width: 100%; border-collapse: collapse; font-size: 14px; }
				.role-table thead tr {
					background: #f8fafc; border-bottom: 2px solid rgba(148,163,184,0.18);
				}
				.role-table thead th {
					padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700;
					text-transform: uppercase; letter-spacing: .06em; color: #64748b;
				}
				.role-table tbody tr {
					border-bottom: 1px solid rgba(148,163,184,0.1); transition: background .12s;
				}
				.role-table tbody tr:hover { background: rgba(139,92,246,0.03); }
				.role-table tbody tr:last-child { border-bottom: none; }
				.role-table td { padding: 13px 16px; color: #0f172a; vertical-align: middle; }
				.role-table td.num-col { width: 56px; color: #94a3b8; font-weight: 600; }
				.role-table td.action-col { width: 80px; text-align: center; }

				.role-badge {
					display: inline-flex; align-items: center; padding: 5px 14px;
					border-radius: 999px; background: rgba(139,92,246,0.08);
					border: 1px solid rgba(139,92,246,0.2); color: #6d28d9;
					font-size: 13px; font-weight: 700; letter-spacing: .04em;
				}
				.role-edit-btn {
					display: inline-flex; align-items: center; justify-content: center;
					width: 34px; height: 34px; border-radius: 10px;
					border: 1px solid rgba(148,163,184,0.28); background: #f8fafc;
					color: #475569; cursor: pointer;
					transition: background .14s, border-color .14s, color .14s, box-shadow .14s;
				}
				.role-edit-btn:hover {
					background: rgba(139,92,246,0.08); border-color: rgba(139,92,246,0.35);
					color: #7c3aed; box-shadow: 0 4px 10px rgba(139,92,246,0.12);
				}
				.role-danger-btn {
					background: linear-gradient(135deg,#ef4444,#dc2626); color: #fff;
					border: none; border-radius: 10px; padding: 10px 16px;
					font-weight: 700; cursor: pointer; font-size: 14px;
				}
				.role-danger-btn:hover { background: linear-gradient(135deg,#dc2626,#b91c1c); }
				.role-danger-btn:disabled { opacity:.6; cursor:not-allowed; }
				.role-footer {
					display: flex; align-items: center; justify-content: space-between;
					margin-top: 14px; font-size: 13px; color: #94a3b8; font-weight: 500;
				}
			`}</style>

			<div className="um-page">

				<div className="role-page-header">
					<h2>Roles</h2>
					<p>Manage all roles in your organisation</p>
				</div>

				<div className="role-toolbar">
					<input
						className="role-search"
						type="search"
						placeholder="Search roles…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
					<button className="btn-primary" onClick={() => setOpenAdd(true)}>+ Add Role</button>
				</div>

				{fetchError && (
					<div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#7f1d1d', padding: '10px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14 }}>
						{fetchError}
						<button style={{ marginLeft: 12, background: 'none', border: 'none', color: '#dc2626', fontWeight: 700, cursor: 'pointer' }} onClick={fetchRoles}>Retry</button>
					</div>
				)}

				<div className="role-table-card">
					<table className="role-table">
						<thead>
							<tr>
								<th style={{ width: 56 }}>#</th>
								<th>Role Name</th>
								<th style={{ width: 80, textAlign: 'center' }}>Actions</th>
							</tr>
						</thead>
						<tbody>
							{loading && (
								<tr><td colSpan={3} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading roles…</td></tr>
							)}
							{!loading && filtered.map((r, i) => (
								<tr key={r.id}>
									<td className="num-col">{i + 1}</td>
									<td><span className="role-badge">{r.role}</span></td>
									<td className="action-col">
										<button
											className="role-edit-btn"
											title="Edit"
											aria-label={`Edit ${r.role}`}
											onClick={() => setEditingRole(r)}
										>
											<svg width="15" height="15" viewBox="0 0 24 24" fill="none">
												<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
											</svg>
										</button>
									</td>
								</tr>
							))}
							{!loading && filtered.length === 0 && !fetchError && (
								<tr>
									<td colSpan={3} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
										{search ? `No roles match "${search}".` : 'No roles yet. Add one to get started.'}
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				{!loading && (
					<div className="role-footer">
						<span>Showing {filtered.length} of {roles.length} role{roles.length !== 1 ? 's' : ''}</span>
					</div>
				)}
			</div>

			{openAdd && <AddRoleModal onClose={() => setOpenAdd(false)} onAdded={onAdded} />}

			{editingRole && (
				<EditRoleModal
					role={editingRole}
					onClose={() => setEditingRole(null)}
					onUpdated={onUpdated}
					onDeleteRequest={(r) => { setEditingRole(null); setDeletingRole(r); }}
				/>
			)}

			{deletingRole && (
				<ConfirmDeleteModal
					role={deletingRole}
					onClose={() => setDeletingRole(null)}
					onDeleted={onDeleted}
				/>
			)}

			{toast && <Toast key={toast.key} msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
		</>
	);
};

export default RolesConfiguration;
