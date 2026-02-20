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
					margin-bottom: 6px;
				}
				.dept-page-header h2 {
					margin: 0 0 4px 0;
					font-size: 22px;
					font-weight: 800;
					color: #0f172a;
					letter-spacing: -0.02em;
				}
				.dept-page-header p {
					margin: 0;
					font-size: 14px;
					color: #64748b;
				}

				/* ── Toolbar (search + button) ── */
				.dept-toolbar {
					display: flex;
					align-items: center;
					justify-content: space-between;
					gap: 12px;
					margin: 16px 0 20px 0;
					padding: 14px 18px;
					background: #ffffff;
					border: 1px solid rgba(148,163,184,0.18);
					border-radius: 14px;
					box-shadow: 0 2px 8px rgba(2,6,23,0.04);
				}
				.dept-search {
					flex: 1;
					max-width: 340px;
					padding: 9px 14px;
					border: 1px solid rgba(148,163,184,0.3);
					border-radius: 10px;
					font-size: 14px;
					color: #0f172a;
					background: #f8fafc;
					outline: none;
					transition: border-color .15s, box-shadow .15s;
				}
				.dept-search:focus {
					border-color: #3b82f6;
					box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
					background: #fff;
				}

				/* ── Table ── */
				.dept-table {
					width: 100%;
					border-collapse: collapse;
					font-size: 14px;
				}
				.dept-table thead tr {
					background: #f8fafc;
					border-bottom: 2px solid rgba(148,163,184,0.18);
				}
				.dept-table thead th {
					padding: 12px 16px;
					text-align: left;
					font-size: 12px;
					font-weight: 700;
					text-transform: uppercase;
					letter-spacing: .06em;
					color: #64748b;
				}
				.dept-table tbody tr {
					border-bottom: 1px solid rgba(148,163,184,0.1);
					transition: background .12s;
				}
				.dept-table tbody tr:hover {
					background: rgba(59,130,246,0.03);
				}
				.dept-table tbody tr:last-child {
					border-bottom: none;
				}
				.dept-table td {
					padding: 13px 16px;
					color: #0f172a;
					vertical-align: middle;
				}
				.dept-table td.num-col {
					width: 56px;
					color: #94a3b8;
					font-weight: 600;
				}
				.dept-table td.action-col {
					width: 80px;
					text-align: center;
				}

				/* ── Badge ── */
				.dept-badge {
					display: inline-flex;
					align-items: center;
					padding: 5px 14px;
					border-radius: 999px;
					background: rgba(59,130,246,0.08);
					border: 1px solid rgba(59,130,246,0.2);
					color: #1d4ed8;
					font-size: 13px;
					font-weight: 700;
					letter-spacing: .04em;
				}

				/* ── Edit button ── */
				.dept-edit-btn {
					display: inline-flex;
					align-items: center;
					justify-content: center;
					width: 34px;
					height: 34px;
					border-radius: 10px;
					border: 1px solid rgba(148,163,184,0.28);
					background: #f8fafc;
					color: #475569;
					cursor: pointer;
					transition: background .14s, border-color .14s, color .14s, box-shadow .14s;
				}
				.dept-edit-btn:hover {
					background: rgba(59,130,246,0.08);
					border-color: rgba(59,130,246,0.35);
					color: #2563eb;
					box-shadow: 0 4px 10px rgba(59,130,246,0.12);
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
					border: 1px solid rgba(148,163,184,0.18);
					border-radius: 14px;
					box-shadow: 0 2px 8px rgba(2,6,23,0.04);
					overflow: hidden;
				}

				/* ── Footer ── */
				.dept-footer {
					display: flex;
					align-items: center;
					justify-content: space-between;
					margin-top: 14px;
					font-size: 13px;
					color: #94a3b8;
					font-weight: 500;
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
					<button className="btn-primary" onClick={() => setOpenAdd(true)}>+ Add Department</button>
				</div>

				{/* ── Fetch error ── */}
				{fetchError && (
					<div style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#7f1d1d', padding:'10px 16px', borderRadius:10, marginBottom:16, fontSize:14 }}>
						{fetchError}
						<button style={{ marginLeft:12, background:'none', border:'none', color:'#dc2626', fontWeight:700, cursor:'pointer' }} onClick={fetchDepartments}>Retry</button>
					</div>
				)}

				{/* ── Table ── */}
				<div className="dept-table-card">
					<table className="dept-table">
						<thead>
							<tr>
								<th style={{ width:56 }}>#</th>
								<th>Department Name</th>
								<th style={{ width:80, textAlign:'center' }}>Actions</th>
							</tr>
						</thead>
						<tbody>
							{loading && (
								<tr><td colSpan={3} style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>Loading departments…</td></tr>
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
											title="Edit"
											aria-label={`Edit ${d.department}`}
											onClick={() => setEditingDept(d)}
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
									<td colSpan={3} style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>
										{search ? `No departments match "${search}".` : 'No departments yet. Add one to get started.'}
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
