import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import DepartmentService from '../../../services/department.service';
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
			position:'fixed', bottom:28, right:28, zIndex:9999,
			background: colors[type] || colors.info,
			color:'#fff', padding:'12px 20px', borderRadius:12,
			boxShadow:'0 8px 24px rgba(0,0,0,0.18)', fontWeight:700, fontSize:14,
			maxWidth:320, wordBreak:'break-word',
			animation:'slideUp .22s ease',
		}}>
			{msg}
		</div>,
		document.body
	);
};

/* ─── Normalize helper ──────────────────────────────────────────────────── */
const normalizeDeptName = (raw) =>
	raw.trim().replace(/[\s\-]+/g, '_').replace(/[^A-Z0-9_]/gi, '').toUpperCase();

/* ─── Add Modal ─────────────────────────────────────────────────────────── */
const AddDepartmentModal = ({ onClose, onAdded }) => {
	const [name, setName] = useState('');
	const [error, setError] = useState('');
	const [saving, setSaving] = useState(false);
	const inputRef = useRef(null);

	useEffect(() => { inputRef.current?.focus(); }, []);

	const preview = normalizeDeptName(name);

	const submit = async (ev) => {
		ev.preventDefault();
		if (preview.length < 2) { setError('Department name must be at least 2 characters.'); return; }
		setSaving(true);
		setError('');
		try {
			const res = await DepartmentService.createDepartment(preview);
			onAdded(res.data.data);
			onClose();
		} catch (err) {
			setError(err?.response?.data?.message || 'Failed to create department.');
		} finally {
			setSaving(false);
		}
	};

	return createPortal(
		<div className="um-modal-overlay" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
			<div className="um-modal small" onClick={(e) => e.stopPropagation()}>
				<h3>Add Department</h3>
				<form onSubmit={submit} className="um-form">
					<div className="row">
						<label>
							Department Name
							<input
								ref={inputRef}
								value={name}
								onChange={(e) => { setName(e.target.value); setError(''); }}
								placeholder="e.g. Human Resources"
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
							{saving ? 'Adding…' : 'Add Department'}
						</button>
					</div>
				</form>
			</div>
		</div>,
		document.body
	);
};

/* ─── Edit Modal ────────────────────────────────────────────────────────── */
const EditDepartmentModal = ({ dept, onClose, onUpdated, onDeleteRequest }) => {
	const [name, setName] = useState(dept?.department || '');
	const [error, setError] = useState('');
	const [saving, setSaving] = useState(false);
	const inputRef = useRef(null);

	useEffect(() => { inputRef.current?.focus(); }, []);

	const preview = normalizeDeptName(name);

	const submit = async (ev) => {
		ev.preventDefault();
		if (preview.length < 2) { setError('Department name must be at least 2 characters.'); return; }
		if (preview === dept.department) { onClose(); return; }
		setSaving(true);
		setError('');
		try {
			const res = await DepartmentService.updateDepartment(dept.id, preview);
			onUpdated(res.data.data);
			onClose();
		} catch (err) {
			setError(err?.response?.data?.message || 'Failed to update department.');
		} finally {
			setSaving(false);
		}
	};

	return createPortal(
		<div className="um-modal-overlay" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
			<div className="um-modal small" onClick={(e) => e.stopPropagation()}>
				<h3>Edit Department</h3>
				<form onSubmit={submit} className="um-form">
					<div className="row">
						<label>
							Department Name
							<input
								ref={inputRef}
								value={name}
								onChange={(e) => { setName(e.target.value); setError(''); }}
								disabled={saving}
							/>
						</label>
						{name.trim().length > 0 && preview !== dept.department && (
							<p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
								Will be saved as: <strong style={{ color: '#0f172a', letterSpacing: '0.03em' }}>{preview}</strong>
							</p>
						)}
					</div>
					{error && <div className="field-error">{error}</div>}
					<div className="row actions" style={{ justifyContent:'space-between' }}>
						<button
							type="button"
							className="btn-danger"
							onClick={() => { onDeleteRequest(dept); onClose(); }}
							disabled={saving}
						>
							Delete
						</button>
						<div style={{ display:'flex', gap:8 }}>
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
const ConfirmDeleteModal = ({ dept, onClose, onDeleted }) => {
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState('');

	const confirm = async () => {
		setDeleting(true);
		setError('');
		try {
			await DepartmentService.deleteDepartment(dept.id);
			onDeleted(dept.id);
			onClose();
		} catch (err) {
			setError(err?.response?.data?.message || 'Failed to delete department.');
			setDeleting(false);
		}
	};

	return createPortal(
		<div className="um-modal-overlay" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
			<div className="um-modal small" onClick={(e) => e.stopPropagation()}>
				<h3>Delete Department</h3>
				<p className="muted" style={{ marginBottom:12 }}>
					Are you sure you want to delete <strong>{dept?.department}</strong>? This action cannot be undone.
				</p>
				{error && <div className="field-error" style={{ marginBottom:10 }}>{error}</div>}
				<div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
					<button className="btn-muted" onClick={onClose} disabled={deleting}>Cancel</button>
					<button className="btn-danger" onClick={confirm} disabled={deleting}>
						{deleting ? 'Deleting…' : 'Delete'}
					</button>
				</div>
			</div>
		</div>,
		document.body
	);
};

/* ─── Main Page ─────────────────────────────────────────────────────────── */
const DepartmentConfuguration = () => {
	const [departments, setDepartments] = useState([]);
	const [loading, setLoading] = useState(true);
	const [fetchError, setFetchError] = useState('');
	const [search, setSearch] = useState('');

	const [openAdd, setOpenAdd] = useState(false);
	const [editingDept, setEditingDept] = useState(null);
	const [deletingDept, setDeletingDept] = useState(null);

	const [toast, setToast] = useState(null);
	const showToast = (msg, type = 'success') => setToast({ msg, type, key: Date.now() });

	/* ── Fetch all ── */
	const fetchDepartments = async () => {
		setLoading(true);
		setFetchError('');
		try {
			const res = await DepartmentService.getAllDepartments();
			setDepartments(res.data.data || []);
		} catch (err) {
			setFetchError(err?.response?.data?.message || 'Failed to load departments.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { fetchDepartments(); }, []);

	/* ── CRUD callbacks ── */
	const onAdded = (dept) => {
		setDepartments(prev => [dept, ...prev]);
		showToast(`Department "${dept.department}" created.`);
	};

	const onUpdated = (dept) => {
		setDepartments(prev => prev.map(d => d.id === dept.id ? dept : d));
		showToast(`Department "${dept.department}" updated.`);
	};

	const onDeleted = (id) => {
		setDepartments(prev => prev.filter(d => d.id !== id));
		showToast('Department deleted.', 'error');
	};

	const filtered = departments.filter(d =>
		d.department?.toLowerCase().includes(search.toLowerCase())
	);

	return (
		<>
			<style>{`
				@keyframes slideUp {
					from { opacity:0; transform:translateY(12px); }
					to   { opacity:1; transform:translateY(0); }
				}

				/* ── Page layout ── */
				.dept-page-header {
					margin-bottom: 24px;
					padding-bottom: 16px;
					border-bottom: 2px solid rgba(226, 232, 240, 0.6);
				}
				.dept-page-header h2 {
					margin: 0 0 8px 0;
					font-size: 32px;
					font-weight: 800;
					color: #0f172a;
					letter-spacing: -0.04em;
				}
				.dept-page-header p {
					margin: 0;
					font-size: 15px;
					color: #64748b;
					font-weight: 500;
				}

				/* ── Toolbar (search + button) ── */
				.dept-toolbar {
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
				.dept-search {
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
				.dept-search:focus {
					border-color: #3b82f6;
					box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
					background: #fff;
				}

				/* ── Add button ── */
				.dept-add-btn {
					display: inline-flex;
					align-items: center;
					gap: 8px;
					padding: 11px 20px;
					background: linear-gradient(135deg, #10b981, #059669);
					color: white;
					border: none;
					border-radius: 12px;
					font-size: 14px;
					font-weight: 700;
					cursor: pointer;
					transition: all 0.2s ease;
					box-shadow: 0 4px 14px rgba(16, 185, 129, 0.25);
					white-space: nowrap;
				}
				.dept-add-btn:hover {
					transform: translateY(-2px);
					box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35);
					background: linear-gradient(135deg, #059669, #047857);
				}
				.dept-add-btn:active {
					transform: translateY(0);
				}
				.dept-add-btn svg {
					width: 16px;
					height: 16px;
				}

				/* ── Loading & Empty states ── */
				.dept-empty-state {
					text-align: center;
					padding: 60px 20px;
					color: #94a3b8;
				}
				.dept-empty-state svg {
					width: 48px;
					height: 48px;
					margin-bottom: 16px;
					opacity: 0.4;
				}
				.dept-empty-state p {
					margin: 8px 0 0 0;
					font-size: 14px;
					font-weight: 500;
				}

				/* ── Loading spinner ── */
				@keyframes spin {
					to { transform: rotate(360deg); }
				}
				.dept-loading {
					text-align: center;
					padding: 60px 20px;
					color: #64748b;
				}
				.dept-loading-spinner {
					width: 40px;
					height: 40px;
					border: 3px solid #e2e8f0;
					border-top-color: #3b82f6;
					border-radius: 50%;
					margin: 0 auto 16px;
					animation: spin 0.8s linear infinite;
				}

				/* ── Error banner ── */
				.dept-error-banner {
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
				.dept-error-banner button {
					background: none;
					border: none;
					color: #dc2626;
					font-weight: 700;
					cursor: pointer;
					padding: 6px 14px;
					border-radius: 8px;
					transition: background 0.2s;
				}
				.dept-error-banner button:hover {
					background: rgba(220, 38, 38, 0.1);
				}

				/* ── Table ── */
				.dept-table {
					width: 100%;
					border-collapse: separate;
					border-spacing: 0;
					font-size: 14px;
				}
				.dept-table thead tr {
					background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
					border-bottom: 3px solid #cbd5e1;
				}
				.dept-table thead th {
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
				.dept-table thead th:first-child {
					padding-left: 32px;
				}
				.dept-table tbody tr {
					border-bottom: 1px solid #e2e8f0;
					transition: all .25s ease;
					background: #ffffff;
				}
				.dept-table tbody tr:nth-child(even) {
					background: rgba(248, 250, 252, 0.5);
				}
				.dept-table tbody tr:hover {
					background: linear-gradient(90deg, rgba(59, 130, 246, 0.06), rgba(59, 130, 246, 0.02));
					transform: translateX(4px);
					box-shadow: 0 4px 12px rgba(2, 6, 23, 0.06), inset 3px 0 0 #3b82f6;
				}
				.dept-table tbody tr:last-child {
					border-bottom: none;
				}
				.dept-table td {
					padding: 20px 24px;
					color: #0f172a;
					vertical-align: middle;
				}
				.dept-table td:first-child {
					padding-left: 32px;
				}
				.dept-table td.num-col {
					width: 80px;
					padding-right: 32px;
					color: #64748b;
					font-weight: 700;
					font-size: 14px;
				}
				.dept-table td.action-col {
					width: 140px;
					text-align: center;
					padding-right: 32px;
				}

				/* ── Badge ── */
				.dept-badge {
					display: inline-flex;
					align-items: center;
					padding: 8px 20px;
					border-radius: 8px;
					background: linear-gradient(135deg, #dbeafe, #bfdbfe);
					border: 1.5px solid #93c5fd;
					color: #1e40af;
					font-size: 13px;
					font-weight: 700;
					letter-spacing: .04em;
					transition: all .25s ease;
					box-shadow: 0 1px 3px rgba(59, 130, 246, 0.1);
				}
				.dept-table tbody tr:hover .dept-badge {
					background: linear-gradient(135deg, #3b82f6, #2563eb);
					border-color: #2563eb;
					color: #ffffff;
					transform: scale(1.03);
					box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
				}

				/* ── Edit button ── */
				.dept-edit-btn {
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
				.dept-edit-btn:hover {
					background: linear-gradient(135deg, #3b82f6, #2563eb);
					border-color: #2563eb;
					color: #fff;
					transform: translateY(-3px);
					box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
				}
				.dept-edit-btn:active {
					transform: translateY(-1px);
				}
				.dept-edit-btn svg {
					width: 14px;
					height: 14px;
				}

				/* ── Danger button ── */
				.btn-danger {
					background: linear-gradient(135deg,#ef4444,#dc2626);
					color: #fff;
					border: none;
					border-radius: 10px;
					padding: 10px 16px;
					font-weight: 700;
					cursor: pointer;
				}
				.btn-danger:hover { background: linear-gradient(135deg,#dc2626,#b91c1c); }
				.btn-danger:disabled { opacity:.6; cursor:not-allowed; }

				/* ── Table card wrapper ── */
				.dept-table-card {
					background: #ffffff;
					border: 2px solid rgba(226, 232, 240, 0.8);
					border-radius: 20px;
					box-shadow: 0 10px 40px rgba(2, 6, 23, 0.08), 0 2px 8px rgba(2, 6, 23, 0.04);
					overflow: hidden;
					transition: all .3s ease;
				}
				.dept-table-card:hover {
					box-shadow: 0 20px 60px rgba(2, 6, 23, 0.12), 0 4px 16px rgba(2, 6, 23, 0.06);
					transform: translateY(-2px);
				}

				/* ── Footer ── */
				.dept-footer {
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
			`}</style>

			<div className="um-page">

				{/* ── Page Header ── */}
				<div className="dept-page-header">
					<h2>Departments</h2>
					<p>Manage all departments in your organisation</p>
				</div>

				{/* ── Toolbar ── */}
				<div className="dept-toolbar">
					<input
						className="dept-search"
						type="search"
						placeholder="Search departments…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
					<button className="dept-add-btn" onClick={() => setOpenAdd(true)}>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
							<path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z"/>
						</svg>
						Add Department
					</button>
				</div>

				{/* ── Fetch error ── */}
				{fetchError && (
					<div className="dept-error-banner">
						<span>{fetchError}</span>
						<button onClick={fetchDepartments}>Retry</button>
					</div>
				)}

				{/* ── Table ── */}
				<div className="dept-table-card">
					<table className="dept-table">
						<thead>
							<tr>
								<th style={{ width:80 }}>#</th>
								<th>Department Name</th>
								<th style={{ width:140, textAlign:'center' }}>Actions</th>
							</tr>
						</thead>
						<tbody>
							{loading && (
								<tr>
									<td colSpan={3}>
										<div className="dept-loading">
											<div className="dept-loading-spinner"></div>
											<p>Loading departments…</p>
										</div>
									</td>
								</tr>
							)}
							{!loading && filtered.map((d, i) => (
								<tr key={d.id}>
									<td className="num-col">{i + 1}</td>
									<td>
										<span className="dept-badge">{d.department}</span>
									</td>
									<td className="action-col">
										<button
											className="dept-edit-btn"
											title="Edit department"
											aria-label={`Edit ${d.department}`}
											onClick={() => setEditingDept(d)}
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
										<div className="dept-empty-state">
											<svg viewBox="0 0 16 16" fill="currentColor">
												<path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z"/>
											</svg>
											<p>{search ? `No departments match "${search}".` : 'No departments yet. Add one to get started.'}</p>
										</div>
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				{/* ── Footer count ── */}
				{!loading && (
					<div className="dept-footer">
						<span>Showing {filtered.length} of {departments.length} department{departments.length !== 1 ? 's' : ''}</span>
					</div>
				)}
			</div>

			{/* Modals */}
			{openAdd && (
				<AddDepartmentModal
					onClose={() => setOpenAdd(false)}
					onAdded={onAdded}
				/>
			)}

			{editingDept && (
				<EditDepartmentModal
					dept={editingDept}
					onClose={() => setEditingDept(null)}
					onUpdated={onUpdated}
					onDeleteRequest={(d) => { setEditingDept(null); setDeletingDept(d); }}
				/>
			)}

			{deletingDept && (
				<ConfirmDeleteModal
					dept={deletingDept}
					onClose={() => setDeletingDept(null)}
					onDeleted={onDeleted}
				/>
			)}

			{toast && (
				<Toast key={toast.key} msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />
			)}
		</>
	);
};

export default DepartmentConfuguration;
