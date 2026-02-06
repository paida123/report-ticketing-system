import React, { useEffect, useState } from 'react';
import Sidebar from '../../../components/sidebar/Sidebar';
import TopNav from '../../../components/topnav/TopNav';
import '../userManagement/userManagement.css';


const AddDepartmentModal = ({ open, onClose, onAdd }) => {
	const [form, setForm] = useState({ name: '', manager: '', active: true });
	const [errors, setErrors] = useState({});

	useEffect(() => {
		if (open) setForm({ name: '', description: '', active: true });
	}, [open]);

	const validate = () => {
		const e = {};
		if (!form.name || form.name.trim().length < 2) e.name = 'Name is required (min 2 chars)';
		if (!form.manager || form.manager.trim().length < 2) e.manager = 'Manager name is required (min 2 chars)';
		return e;
	};

	const submit = (ev) => {
		ev.preventDefault();
		const e = validate();
		setErrors(e);
		if (Object.keys(e).length === 0) {
			onAdd({ id: Date.now().toString(), ...form });
			onClose();
		}
	};

	if (!open) return null;

	return (
		<div className="um-modal-overlay" role="dialog" aria-modal="true">
			<div className="um-modal">
				<h3>Add department</h3>
				<form onSubmit={submit} className="um-form">
					<div className="row">
						<label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
					</div>
					<div className="row">
						<label>Manager<input value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} /></label>
					</div>
					<div className="row">
						<label style={{display:'flex',alignItems:'center',gap:8}}><input type="checkbox" checked={form.active} onChange={(e)=>setForm({...form,active:e.target.checked})} /> Active</label>
					</div>

					<div className="row actions">
						<button type="button" className="btn-muted" onClick={onClose}>Cancel</button>
						<button type="submit" className="btn-primary">Add</button>
					</div>
				</form>
				<div className="um-errors">
					{Object.keys(errors).map(k => <div key={k} className="err">{k}: {errors[k]}</div>)}
				</div>
			</div>
		</div>
	);
};


const EditDepartmentModal = ({ open, dept, onClose, onSave, onDelete }) => {
	const [form, setForm] = useState(dept || { name: '', manager: '', active: true });
	const [errors, setErrors] = useState({});

	useEffect(() => { if (open) setForm(dept || { name: '', description: '', active: true }); }, [open, dept]);

	const validate = () => {
		const e = {};
		if (!form.name || form.name.trim().length < 2) e.name = 'Name is required (min 2 chars)';
		if (!form.manager || form.manager.trim().length < 2) e.manager = 'Manager name is required (min 2 chars)';
		return e;
	};

	const submit = (ev) => {
		ev.preventDefault();
		const e = validate();
		setErrors(e);
		if (Object.keys(e).length === 0) {
			onSave({ ...form });
			onClose();
		}
	};

	if (!open) return null;

	return (
		<div className="um-modal-overlay" role="dialog" aria-modal="true">
			<div className="um-modal">
				<h3>Edit department</h3>
				<form onSubmit={submit} className="um-form">
					<div className="row">
						<label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
					</div>
					<div className="row">
						<label>Manager<input value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} /></label>
					</div>
					<div className="row">
						<label style={{display:'flex',alignItems:'center',gap:8}}><input type="checkbox" checked={form.active} onChange={(e)=>setForm({...form,active:e.target.checked})} /> Active</label>
					</div>

					<div className="row actions" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
						<div style={{display:'flex',gap:8}}>
							<button type="button" className="btn-danger" onClick={() => { onDelete && onDelete(form); onClose(); }}>Delete</button>
						</div>
						<div>
							<button type="button" className="btn-muted" onClick={onClose}>Cancel</button>
							<button type="submit" className="btn-primary">Save</button>
						</div>
					</div>
				</form>
				<div className="um-errors">
					{Object.keys(errors).map(k => <div key={k} className="err">{k}: {errors[k]}</div>)}
				</div>
			</div>
		</div>
	);
};

const DepartmentConfuguration = () => {
	const [departments, setDepartments] = useState([]);
	const [openAdd, setOpenAdd] = useState(false);
	const [editOpen, setEditOpen] = useState(false);
	const [editing, setEditing] = useState(null);

	useEffect(() => {
		// seed demo data
		setDepartments([
			{ id: 'd1', name: 'Finance', manager: 'Alice Mbatha', active: true },
			{ id: 'd2', name: 'IT', manager: 'Jonathan Kim', active: true },
			{ id: 'd3', name: 'HR', manager: 'Maya Patel', active: false },
		]);
	}, []);

	const add = (d) => setDepartments(s => [d, ...s]);
	const save = (d) => setDepartments(s => s.map(it => it.id === d.id ? d : it));
	const del = (d) => setDepartments(s => s.filter(it => it.id !== d.id));
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [confirmDept, setConfirmDept] = useState(null);

		const stats = { processed: departments.length, pending: 0, activeUsers: 0, pendingNotifications: 0 };

		return (
			<div className="admin-page">
				<Sidebar stats={stats} />
				<main className="admin-main">
					<TopNav initials="AD" userName="Administrator" pageTitle="Departments" />
					<div className="um-page">
						<div className="um-header">
							<h2>Departments</h2>
							<div className="um-actions">
								<div className="um-actions-left">
									<button className="btn-primary" onClick={() => setOpenAdd(true)}> + Add department</button>
								</div>
							</div>
						</div>

						<div className="um-table">
							<div className="um-table-head">
								<div className="um-row head">
									<div className="um-cell name-col">Name</div>
									<div className="um-cell email-col">Manager</div>
									<div className="um-cell dept-col">Active</div>
									<div className="um-cell action-col">Actions</div>
								</div>
							</div>
							<div className="um-table-body">
								{departments.map(d => (
									<div className="um-row" key={d.id}>
										<div className="um-cell name-col">{d.name}</div>
										<div className="um-cell email-col">{d.manager}</div>
										<div className="um-cell dept-col">{d.active ? 'Yes' : 'No'}</div>
										<div className="um-cell action-col">
											<button className="icon-btn" onClick={() => { setEditing(d); setEditOpen(true); }} title="Edit">
												<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
											</button>
										</div>
									</div>
								))}
							</div>
						</div>

						<AddDepartmentModal open={openAdd} onClose={() => setOpenAdd(false)} onAdd={add} />
						<EditDepartmentModal open={editOpen} dept={editing} onClose={() => setEditOpen(false)} onSave={(d)=>{ save(d); }} onDelete={(d)=>{ setConfirmDept(d); setConfirmOpen(true); }} />

						{confirmOpen && (
							<div className="um-modal-overlay" role="dialog" aria-modal="true">
								<div className="um-modal">
									<h3>Confirm delete</h3>
									<p className="muted">Are you sure you want to delete the department "<strong>{confirmDept?.name}</strong>"? This action cannot be undone.</p>
									<div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop:12}}>
										<button className="btn-muted" onClick={() => setConfirmOpen(false)}>Cancel</button>
										<button className="btn-danger" onClick={() => {
											del(confirmDept);
											setConfirmOpen(false);
											setEditOpen(false);
											setEditing(null);
											setConfirmDept(null);
										}}>Delete</button>
									</div>
								</div>
							</div>
						)}
					</div>
				</main>
			</div>
		);
};

export default DepartmentConfuguration;
