import React, { useEffect, useState } from 'react';
import TopNav from '../../../components/topnav/TopNav';
import Sidebar from '../../../components/sidebar/Sidebar';
import '../userManagement/userManagement.css';

const AddRoleModal = ({ open, onClose, onAdd }) => {
  const [form, setForm] = useState({ name: '', description: '', permissions: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => { if (open) setForm({ name: '', description: '', permissions: '' }); }, [open]);

  const validate = () => {
    const e = {};
    if (!form.name || form.name.trim().length < 2) e.name = 'Role name is required (min 2 chars)';
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
        <h3>Add role</h3>
        <form onSubmit={submit} className="um-form">
          <div className="row">
            <label>Name<input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} /></label>
          </div>
          <div className="row">
            <label>Description<textarea value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} /></label>
          </div>
          <div className="row">
            <label>Permissions (comma-separated)<input value={form.permissions} onChange={(e)=>setForm({...form,permissions:e.target.value})} /></label>
          </div>

          <div className="row actions">
            <button type="button" className="btn-muted" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary"> Add role</button>
          </div>
        </form>
        <div className="um-errors">{Object.keys(errors).map(k => <div key={k} className="err">{k}: {errors[k]}</div>)}</div>
      </div>
    </div>
  );
};

const EditRoleModal = ({ open, role, onClose, onSave, onDelete }) => {
  const [form, setForm] = useState(role || { name: '', description: '', permissions: '' });
  const [errors, setErrors] = useState({});

  useEffect(()=>{ if (open) setForm(role || { name: '', description: '', permissions: '' }); }, [open, role]);

  const validate = () => {
    const e = {};
    if (!form.name || form.name.trim().length < 2) e.name = 'Role name is required (min 2 chars)';
    return e;
  };

  const submit = (ev) => { ev.preventDefault(); const e = validate(); setErrors(e); if (Object.keys(e).length===0) { onSave({...form}); onClose(); } };

  if (!open) return null;

  return (
    <div className="um-modal-overlay" role="dialog" aria-modal="true">
      <div className="um-modal">
        <h3>Edit role</h3>
        <form onSubmit={submit} className="um-form">
          <div className="row">
            <label>Name<input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} /></label>
          </div>
          <div className="row">
            <label>Description<textarea value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} /></label>
          </div>
          <div className="row">
            <label>Permissions (comma-separated)<input value={form.permissions} onChange={(e)=>setForm({...form,permissions:e.target.value})} /></label>
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
        <div className="um-errors">{Object.keys(errors).map(k => <div key={k} className="err">{k}: {errors[k]}</div>)}</div>
      </div>
    </div>
  );
};

const RolesConfiguration = () => {
  const [roles, setRoles] = useState([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmRole, setConfirmRole] = useState(null);

  useEffect(()=>{
    setRoles([
      { id: 'r1', name: 'Admin', description: 'Full access', permissions: 'manage_users,manage_depts' },
      { id: 'r2', name: 'Agent', description: 'Handle tickets', permissions: 'tickets:read,tickets:update' }
    ]);
  }, []);

  const add = (r) => setRoles(s => [r, ...s]);
  const save = (r) => setRoles(s => s.map(it => it.id === r.id ? r : it));
  const del = (r) => setRoles(s => s.filter(it => it.id !== r.id));

  const stats = { processed: roles.length, pending: 0, activeUsers: 0, pendingNotifications: 0 };

  const handleDeleteRequest = (r) => {
    setConfirmRole(r);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!confirmRole) return;
    del(confirmRole);
    setConfirmOpen(false);
    setEditOpen(false);
    setEditing(null);
    setConfirmRole(null);
  };

  return (
    <div className="admin-page">
      <Sidebar stats={stats} />
      <main className="admin-main">
        <TopNav initials="AD" userName="Administrator" pageTitle="Roles" />
        <div className="um-page">
          <div className="um-header">
        <h2>Roles</h2>
        <div className="um-actions">
          <div className="um-actions-left">
            <button className="btn-primary" onClick={() => setOpenAdd(true)}> + Add role</button>
          </div>
        </div>
      </div>

      <div className="um-table">
        <div className="um-table-head">
          <div className="um-row head">
            <div className="um-cell name-col">Role</div>
            <div className="um-cell email-col">Description / Permissions</div>
            <div className="um-cell action-col">Actions</div>
          </div>
        </div>
        <div className="um-table-body">
          {roles.map(r => (
            <div className="um-row" key={r.id}>
              <div className="um-cell name-col">{r.name}</div>
              <div className="um-cell email-col">
                <div style={{fontWeight:700}}>{r.description}</div>
                <div className="muted" style={{fontSize:12}}>{r.permissions}</div>
              </div>
              <div className="um-cell action-col">
                <button className="icon-btn" onClick={() => { setEditing(r); setEditOpen(true); }} title="Edit">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AddRoleModal open={openAdd} onClose={() => setOpenAdd(false)} onAdd={add} />
      <EditRoleModal open={editOpen} role={editing} onClose={() => setEditOpen(false)} onSave={(r)=>save(r)} onDelete={(r)=>handleDeleteRequest(r)} />

      {confirmOpen && (
        <div className="um-modal-overlay" role="dialog" aria-modal="true">
          <div className="um-modal">
            <h3>Confirm delete</h3>
            <p className="muted">Are you sure you want to delete the role <strong>{confirmRole?.name}</strong>? 
                This action cannot be undone.</p>
            <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop:12}}>
              <button className="btn-muted" onClick={() => setConfirmOpen(false)}>Cancel</button>
              <button className="btn-danger" onClick={handleConfirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
        </div>
      </main>
    </div>
  );
};

export default RolesConfiguration;
