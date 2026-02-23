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
				.role-page-header {
					margin-bottom: 24px;
					padding-bottom: 16px;
					border-bottom: 2px solid rgba(226, 232, 240, 0.6);
				}
				.role-page-header h2 {
					margin: 0 0 8px 0;
					font-size: 32px;
					font-weight: 800;
					color: #0f172a;
					letter-spacing: -0.04em;
				}
				.role-page-header p {
					margin: 0;
					font-size: 15px;
					color: #64748b;
					font-weight: 500;
				}

				.role-toolbar {
					display: flex;
					align-items: center;
					justify-content: space-between;
					gap: 14px;
					margin: 0 0 24px 0;
					padding: 16px 20px;
					background: linear-gradient(135deg, #ffffff, #f8fafc);
					border: 1px solid rgba(2, 6, 23, 0.06);
					border-radius: 16px;
					box-shadow: 0 2px 12px rgba(2, 6, 23, 0.04);
				}
				.role-search {
					flex: 1;
					max-width: 380px;
					padding: 11px 16px;
					border: 2px solid rgba(148,163,184,0.25);
					border-radius: 12px;
					font-size: 14px;
					color: #0f172a;
					background: rgba(248,250,252,0.8);
					outline: none;
					transition: all .2s ease;
					font-weight: 500;
				}
				.role-search:focus {
					border-color: #8b5cf6;
					box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
					background: #fff;
				}

				.role-add-btn {
					display: inline-flex;
					align-items: center;
					gap: 8px;
					padding: 11px 20px;
					background: linear-gradient(135deg, #8b5cf6, #7c3aed);
					color: white;
					border: none;
					border-radius: 12px;
					font-size: 14px;
					font-weight: 700;
					cursor: pointer;
					transition: all 0.2s ease;
					box-shadow: 0 4px 14px rgba(139, 92, 246, 0.25);
					white-space: nowrap;
				}
				.role-add-btn:hover {
					transform: translateY(-2px);
					box-shadow: 0 6px 20px rgba(139, 92, 246, 0.35);
					background: linear-gradient(135deg, #7c3aed, #6d28d9);
				}
				.role-add-btn:active {
					transform: translateY(0);
				}
				.role-add-btn svg {
					width: 16px;
					height: 16px;
				}

				.role-table-card {
					background: #ffffff;
					border: 2px solid rgba(226, 232, 240, 0.8);
					border-radius: 20px;
					box-shadow: 0 10px 40px rgba(2, 6, 23, 0.08), 0 2px 8px rgba(2, 6, 23, 0.04);
					overflow: hidden;
					transition: all .3s ease;
				}
				.role-table-card:hover {
					box-shadow: 0 20px 60px rgba(2, 6, 23, 0.12), 0 4px 16px rgba(2, 6, 23, 0.06);
					transform: translateY(-2px);
				}

				.role-table {
					width: 100%;
					border-collapse: separate;
					border-spacing: 0;
					font-size: 14px;
				}
				.role-table thead tr {
					background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
					border-bottom: 3px solid #cbd5e1;
				}
				.role-table thead th {
					padding: 18px 24px;
					text-align: left;
					font-size: 11px;
					font-weight: 800;
					text-transform: uppercase;
					letter-spacing: .08em;
					color: #475569;
					position: sticky;
					top: 0;
					z-index: 10;
				}
				.role-table thead th:first-child {
					padding-left: 32px;
				}
				.role-table tbody tr {
					border-bottom: 1px solid #e2e8f0;
					transition: all .25s ease;
					background: #ffffff;
				}
				.role-table tbody tr:nth-child(even) {
					background: rgba(248, 250, 252, 0.5);
				}
				.role-table tbody tr:hover {
					background: linear-gradient(90deg, rgba(139, 92, 246, 0.06), rgba(139, 92, 246, 0.02));
					transform: translateX(4px);
					box-shadow: 0 4px 12px rgba(2, 6, 23, 0.06), inset 3px 0 0 #8b5cf6;
				}
				.role-table tbody tr:last-child {
					border-bottom: none;
				}
				.role-table td {
					padding: 20px 24px;
					color: #0f172a;
					vertical-align: middle;
				}
				.role-table td:first-child {
					padding-left: 32px;
				}
				.role-table td.num-col {
					width: 80px;
					padding-right: 32px;
					color: #64748b;
					font-weight: 700;
					font-size: 14px;
				}
				.role-table td.action-col {
					width: 140px;
					text-align: center;
					padding-right: 32px;
				}

				.role-badge {
					display: inline-flex;
					align-items: center;
					padding: 8px 20px;
					border-radius: 8px;
					background: linear-gradient(135deg, #e9d5ff, #d8b4fe);
					border: 1.5px solid #c084fc;
					color: #6d28d9;
					font-size: 13px;
					font-weight: 700;
					letter-spacing: .04em;
					transition: all .25s ease;
					box-shadow: 0 1px 3px rgba(139, 92, 246, 0.1);
				}
				.role-table tbody tr:hover .role-badge {
					background: linear-gradient(135deg, #8b5cf6, #7c3aed);
					border-color: #7c3aed;
					color: #ffffff;
					transform: scale(1.03);
					box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
				}

				.role-edit-btn {
					display: inline-flex;
					align-items: center;
					justify-content: center;
					gap: 8px;
					padding: 10px 20px;
					border-radius: 10px;
					border: 1.5px solid #cbd5e1;
					background: linear-gradient(135deg, #f8fafc, #f1f5f9);
					color: #475569;
					cursor: pointer;
					font-size: 13px;
					font-weight: 700;
					transition: all .25s ease;
					box-shadow: 0 2px 6px rgba(2, 6, 23, 0.06);
				}
				.role-edit-btn:hover {
					background: linear-gradient(135deg, #8b5cf6, #7c3aed);
					border-color: #7c3aed;
					color: #fff;
					transform: translateY(-3px);
					box-shadow: 0 8px 20px rgba(139, 92, 246, 0.3);
				}
				.role-edit-btn:active {
					transform: translateY(-1px);
				}
				.role-edit-btn svg {
					width: 14px;
					height: 14px;
				}

				.role-danger-btn {
					background: linear-gradient(135deg,#ef4444,#dc2626);
					color: #fff;
					border: none;
					border-radius: 10px;
					padding: 10px 16px;
					font-weight: 700;
					cursor: pointer;
					font-size: 14px;
				}
				.role-danger-btn:hover {
					background: linear-gradient(135deg,#dc2626,#b91c1c);
				}
				.role-danger-btn:disabled {
					opacity:.6;
					cursor:not-allowed;
				}

				.role-footer {
					display: flex;
					align-items: center;
					justify-content: space-between;
					margin-top: 24px;
					padding: 16px 24px;
					background: linear-gradient(135deg, #f8fafc, #f1f5f9);
					border: 1px solid #e2e8f0;
					border-radius: 14px;
					font-size: 13px;
					color: #475569;
					font-weight: 600;
					box-shadow: 0 2px 8px rgba(2, 6, 23, 0.04);
				}

				.role-error-banner {
					display: flex;
					align-items: center;
					justify-content: space-between;
					background: linear-gradient(135deg, #fef2f2, #fee2e2);
					border: 1px solid #fecaca;
					color: #7f1d1d;
					padding: 14px 20px;
					border-radius: 12px;
					margin-bottom: 20px;
					font-size: 14px;
					font-weight: 600;
					box-shadow: 0 2px 8px rgba(239, 68, 68, 0.08);
				}
				.role-error-banner button {
					background: none;
					border: none;
					color: #dc2626;
					font-weight: 700;
					cursor: pointer;
					padding: 6px 14px;
					border-radius: 8px;
					transition: background 0.2s;
				}
				.role-error-banner button:hover {
					background: rgba(220, 38, 38, 0.1);
				}

				.role-empty-state {
					text-align: center;
					padding: 60px 20px;
					color: #94a3b8;
				}
				.role-empty-state svg {
					width: 48px;
					height: 48px;
					margin-bottom: 16px;
					opacity: 0.4;
				}
				.role-empty-state p {
					margin: 8px 0 0 0;
					font-size: 14px;
					font-weight: 500;
				}

				@keyframes spin {
					to { transform: rotate(360deg); }
				}
				.role-loading {
					text-align: center;
					padding: 60px 20px;
					color: #64748b;
				}
				.role-loading-spinner {
					width: 40px;
					height: 40px;
					border: 3px solid #e2e8f0;
					border-top-color: #8b5cf6;
					border-radius: 50%;
					margin: 0 auto 16px;
					animation: spin 0.8s linear infinite;
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
					<button className="role-add-btn" onClick={() => setOpenAdd(true)}>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
							<path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z"/>
						</svg>
						Add Role
					</button>
				</div>

				{fetchError && (
					<div className="role-error-banner">
						<span>{fetchError}</span>
						<button onClick={fetchRoles}>Retry</button>
					</div>
				)}

				<div className="role-table-card">
					<table className="role-table">
						<thead>
							<tr>
								<th style={{ width: 80 }}>#</th>
								<th>Role Name</th>
								<th style={{ width: 140, textAlign: 'center' }}>Actions</th>
							</tr>
						</thead>
						<tbody>
							{loading && (
								<tr>
									<td colSpan={3}>
										<div className="role-loading">
											<div className="role-loading-spinner"></div>
											<p>Loading roles…</p>
										</div>
									</td>
								</tr>
							)}
							{!loading && filtered.map((r, i) => (
								<tr key={r.id}>
									<td className="num-col">{i + 1}</td>
									<td><span className="role-badge">{r.role}</span></td>
									<td className="action-col">
										<button
											className="role-edit-btn"
											title="Edit role"
											aria-label={`Edit ${r.role}`}
											onClick={() => setEditingRole(r)}
										>
											<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
												<path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
											</svg>
											Edit
										</button>
									</td>
								</tr>
							))}
							{!loading && filtered.length === 0 && !fetchError && (
								<tr>
									<td colSpan={3}>
										<div className="role-empty-state">
											<svg viewBox="0 0 16 16" fill="currentColor">
												<path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
												<path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z"/>
											</svg>
											<p>{search ? `No roles match "${search}".` : 'No roles yet. Add one to get started.'}</p>
										</div>
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
