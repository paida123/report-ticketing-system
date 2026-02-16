import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../../../components/sidebar/Sidebar';
import TopNav from '../../../components/topnav/TopNav';
import '../adminDashboard/AdminDashboard.css';
import './userManagement.css';

const BtnIcon = ({ children }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
    {children}
  </span>
);

const IconPlus = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const IconX = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const IconCheck = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconTrash = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M9 3h6l1 2h4v2H4V5h4l1-2z" fill="currentColor" />
    <path d="M7 9h10l-1 11H8L7 9z" fill="currentColor" opacity="0.85" />
  </svg>
);

const IconKey = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M7.5 14a4.5 4.5 0 1 1 4.35-5.7H23v3h-2v2h-2v2h-3.15A4.5 4.5 0 0 1 7.5 14z" fill="currentColor" opacity="0.9" />
    <circle cx="7.5" cy="9.5" r="1" fill="white" opacity="0.9" />
  </svg>
);

const IconUpload = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 16V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M7 9l5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const IconEye = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 5c5.5 0 10 4.5 11 7-1 2.5-5.5 7-11 7S2 14.5 1 12c1-2.5 5.5-7 11-7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const IconCopy = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M8 8h12v12H8V8z" fill="currentColor" opacity="0.9" />
    <path d="M4 4h12v2H6v10H4V4z" fill="currentColor" opacity="0.65" />
  </svg>
);

const AddUserModal = ({ open, onClose, onAdd }) => {
  const [form, setForm] = useState({ name: '', surname: '', email: '', department: '', role: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => { if (open) setForm({ name: '', surname: '', email: '', department: '', role: '' }); }, [open]);

  const validate = () => {
    const e = {};
    if (!form.name) e.name = 'Required';
    if (!form.surname) e.surname = 'Required';
    if (!form.email) e.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!form.department) e.department = 'Required';
    if (!form.role) e.role = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    onAdd({ ...form, id: Date.now() });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="um-modal-overlay" role="dialog" aria-modal="true">
      <div className="um-modal">
        <h3>Add new user</h3>
        <form onSubmit={submit} className="um-form">
          <div className="row">
            <label>Name<input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} /></label>
            <label>Surname<input value={form.surname} onChange={(e)=>setForm({...form,surname:e.target.value})} /></label>
          </div>
          <div className="row">
            <label>Email<input value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} /></label>
          </div>
          <div className="row">
            <label>Department
              <select value={form.department} onChange={(e)=>setForm({...form,department:e.target.value})}>
                <option value="">Select department</option>
                <option>Finance</option>
                <option>HR</option>
                <option>IT</option>
                <option>Operations</option>
              </select>
            </label>
            <label>Role
              <select value={form.role} onChange={(e)=>setForm({...form,role:e.target.value})}>
                <option value="">Select role</option>
                <option>Manager</option>
                <option>Technician</option>
                <option>Agent</option>
                <option>Admin</option>
              </select>
            </label>
          </div>

          <div className="row actions">
            <button type="button" className="btn-muted" onClick={onClose}>
              <BtnIcon><IconX /> Cancel</BtnIcon>
            </button>
            <button type="submit" className="btn-primary">
              <BtnIcon><IconPlus /> Add user</BtnIcon>
            </button>
          </div>
        </form>
        <div className="um-errors">
          {Object.keys(errors).map(k => <div key={k} className="err">{k}: {errors[k]}</div>)}
        </div>
      </div>
    </div>
  );
};

const BulkAddModal = ({ open, onClose, onAddMany }) => {
  const [text, setText] = useState('');
  const [items, setItems] = useState([]);
  const [errors, setErrors] = useState([]);

  useEffect(() => { if (open) { setText(''); setItems([]); setErrors([]); } }, [open]);

  const parse = () => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const parsed = [];
    const errs = [];
    lines.forEach((ln, idx) => {
      // accept CSV-like: name,surname,email,department,role
      const parts = ln.split(',').map(p => p.trim());
      if (parts.length < 5) {
        errs.push(`Line ${idx+1}: wrong number of columns`);
        return;
      }
      const [name, surname, email, department, role] = parts;
      if (!name || !surname || !email) {
        errs.push(`Line ${idx+1}: missing required values`);
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errs.push(`Line ${idx+1}: invalid email: ${email}`);
        return;
      }
      parsed.push({ name, surname, email, department, role, _tmpId: Date.now()+idx });
    });
    setItems(parsed);
    setErrors(errs);
    return { parsed, errs };
  };

  const submit = (ev) => {
    ev.preventDefault();
    // validate current items (in case user edited them)
    const errs = [];
    const valid = items.map((it, idx) => {
      const e = {};
      if (!it.name) e.name = 'Required';
      if (!it.surname) e.surname = 'Required';
      if (!it.email) e.email = 'Required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(it.email)) e.email = 'Invalid';
      if (!it.department) e.department = 'Required';
      if (!it.role) e.role = 'Required';
      if (Object.keys(e).length) errs.push(`Row ${idx+1}: ${Object.values(e).join(', ')}`);
      return { ...it };
    });
    setErrors(errs);
    if (errs.length > 0 || valid.length === 0) return;
    onAddMany(valid);
    onClose();
  };

  const updateItemField = (idx, field, value) => {
    setItems(s => {
      const copy = [...s];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const removeItem = (idx) => setItems(s => s.filter((_,i)=>i!==idx));

  if (!open) return null;

  return (
    <div className="um-modal-overlay" role="dialog" aria-modal="true">
      <div className="um-modal">
        <h3>Bulk add users</h3>
        <form onSubmit={submit} className="um-form">
          <p className="muted">Paste lines in the format: <code>name,surname,email,department,role</code> (one per line) or edit entries below.</p>
          <textarea value={text} onChange={(e)=>setText(e.target.value)} rows={6} />

          <div className="row actions">
            <button type="button" className="btn-muted" onClick={onClose}>
              <BtnIcon><IconX /> Cancel</BtnIcon>
            </button>
            <button type="button" className="btn-primary" onClick={(e)=>{ e.preventDefault(); parse(); }}>
              <BtnIcon><IconEye /> Preview</BtnIcon>
            </button>
            <button type="submit" className="btn-primary" style={{marginLeft:8}}>
              <BtnIcon><IconUpload /> Import</BtnIcon>
            </button>
          </div>

          {items.length > 0 && (
            <div className="bulk-entries">
              <h4 className="muted">Parsed entries ({items.length})</h4>
              {items.map((it, idx) => (
                <div className="bulk-entry" key={it._tmpId || idx}>
                  <div className="row">
                    <label>Name<input value={it.name} onChange={(e)=>updateItemField(idx,'name',e.target.value)} /></label>
                    <label>Surname<input value={it.surname} onChange={(e)=>updateItemField(idx,'surname',e.target.value)} /></label>
                  </div>
                  <div className="row">
                    <label>Email<input value={it.email} onChange={(e)=>updateItemField(idx,'email',e.target.value)} /></label>
                  </div>
                  <div className="row">
                    <label>Department
                      <select value={it.department} onChange={(e)=>updateItemField(idx,'department',e.target.value)}>
                        <option value="">Select department</option>
                        <option>Finance</option>
                        <option>HR</option>
                        <option>IT</option>
                        <option>Operations</option>
                      </select>
                    </label>
                    <label>Role
                      <select value={it.role} onChange={(e)=>updateItemField(idx,'role',e.target.value)}>
                        <option value="">Select role</option>
                        <option>Manager</option>
                        <option>Technician</option>
                        <option>Agent</option>
                        <option>Admin</option>
                      </select>
                    </label>
                  </div>
                  <div style={{display:'flex', justifyContent:'flex-end', marginTop:8}}>
                    <button className="btn-muted" type="button" onClick={()=>removeItem(idx)}>
                      <BtnIcon><IconTrash /> Remove</BtnIcon>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </form>

        <div className="um-errors">
          {errors.length > 0 && <div className="err">{errors.map((s,i)=><div key={i}>{s}</div>)}</div>}
          {items.length > 0 && (
            <div className="bulk-preview">
              <h4>Preview ({items.length})</h4>
              <div className="um-list">
                {items.map((u, i) => (
                  <div className="um-card" key={i}>
                    <div className="um-main">
                      <div className="name">{u.name} {u.surname}</div>
                      <div className="email">{u.email}</div>
                    </div>
                    <div className="meta">
                      <div className="dept">{u.department}</div>
                      <div className="role">{u.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const EditUserModal = ({ open, user, onClose, onSave, onDeleteRequest, onReset }) => {
  const [form, setForm] = useState(user || { name:'', surname:'', email:'', department:'', role:'' });
  const [errors, setErrors] = useState({});
  const [tempPassword, setTempPassword] = useState('');

  useEffect(() => { if (open) { setForm(user || { name:'', surname:'', email:'', department:'', role:'' }); setTempPassword(''); } }, [open, user]);

  const validate = () => {
    const e = {};
    if (!form.name) e.name = 'Required';
    if (!form.surname) e.surname = 'Required';
    if (!form.email) e.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    onSave({ ...form, id: user.id });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="um-modal-overlay" role="dialog" aria-modal="true">
      <div className="um-modal">
        <h3>Edit user</h3>
        <form onSubmit={submit} className="um-form">
          <div className="row">
            <label>Name<input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} /></label>
            <label>Surname<input value={form.surname} onChange={(e)=>setForm({...form,surname:e.target.value})} /></label>
          </div>
          <div className="row">
            <label>Email<input value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} /></label>
          </div>
          <div className="row">
            <label>Department
              <select value={form.department} onChange={(e)=>setForm({...form,department:e.target.value})}>
                <option value="">Select department</option>
                <option>Finance</option>
                <option>HR</option>
                <option>IT</option>
                <option>Operations</option>
              </select>
            </label>
            <label>Role
              <select value={form.role} onChange={(e)=>setForm({...form,role:e.target.value})}>
                <option value="">Select role</option>
                <option>Manager</option>
                <option>Technician</option>
                <option>Agent</option>
                <option>Admin</option>
              </select>
            </label>
          </div>

          <div className="row actions" style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:12}}>
            <div style={{display:'flex', gap:8}}>
              <button type="button" className="btn-danger" onClick={() => {
                if (!user) return;
                onDeleteRequest && onDeleteRequest(user);
              }}>
                <BtnIcon><IconTrash /> Delete</BtnIcon>
              </button>
              <button type="button" className="btn-primary" onClick={() => {
              
                const pw = Math.random().toString(36).slice(-10);
                setTempPassword(pw);
                onReset && onReset(user?.id, pw);
              }}>
                <BtnIcon><IconKey /> Reset Password</BtnIcon>
              </button>
            </div>
            <div>
              <button type="button" className="btn-muted" onClick={onClose}>
                <BtnIcon><IconX /> Cancel</BtnIcon>
              </button>
              <button type="submit" className="btn-primary">
                <BtnIcon><IconCheck /> Save</BtnIcon>
              </button>
            </div>
          </div>

          {tempPassword && (
            <div className="reset-area">
              <div>Temporary password:</div>
              <div className="temp-pw">{tempPassword}</div>
              <button className="btn-copy" onClick={() => navigator.clipboard && navigator.clipboard.writeText(tempPassword)}>
                <BtnIcon><IconCopy /> Copy</BtnIcon>
              </button>
            </div>
          )}
        </form>
        <div className="um-errors">
          {Object.keys(errors).map(k => <div key={k} className="err">{k}: {errors[k]}</div>)}
        </div>
      </div>
    </div>
  );
};

const UserManagement = () => {
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(!!(location && location.state && location.state.openAdd));
  const [openBulk, setOpenBulk] = useState(false);

  useEffect(() => {
    // seed with demo users if empty
    if (users.length === 0) {
      setUsers([
        { id: 1, name: 'Alice', surname: 'Smith', email: 'alice@example.com', department: 'Finance', role: 'Manager' },
        { id: 2, name: 'Bob', surname: 'Jones', email: 'bob@example.com', department: 'IT', role: 'Technician' },
      ]);
    }
  }, []);

  useEffect(() => {
    // listen to sidebar event as well (if navigation state wasn't used)
    const h = () => setOpen(true);
    window.addEventListener('sidebar:add-user', h);
    return () => window.removeEventListener('sidebar:add-user', h);
  }, []);

  const addUser = (u) => setUsers((s) => [u, ...s]);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmUser, setConfirmUser] = useState(null);

  const openEdit = (u) => { setEditingUser(u); setEditOpen(true); };
  const saveEdit = (u) => { setUsers(s => s.map(x => x.id === u.id ? u : x)); };

  const handleDeleteRequest = (user) => {
    setConfirmUser(user);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!confirmUser) return;
    setUsers(s => s.filter(x => x.id !== confirmUser.id));
    setConfirmOpen(false);
    setEditOpen(false);
    setEditingUser(null);
    setConfirmUser(null);
  };

  return (
    <div className="admin-page">
      <Sidebar stats={{ processed: users.length, pending: 0 }} />
      <main className="admin-main">
        <TopNav initials="AD" userName="Administrator" pageTitle="User Management" />
        <div className="um-page">
          <div className="um-header">
           
            <div className="um-actions">
              <div className="um-actions-left">
                <button className="btn-primary" onClick={() => setOpen(true)}>
                  <BtnIcon><IconPlus /> Add User</BtnIcon>
                </button>
                <button className="btn-primary" onClick={() => setOpenBulk(true)}>
                  <BtnIcon><IconUpload /> Bulk Add</BtnIcon>
                </button>
              </div>
            </div>
          </div>

          <div className="um-table">
            <div className="table-wrap um-table-wrap">
              <table className="user-tickets-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Surname</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th className="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.surname}</td>
                      <td className="subject-col">{u.email}</td>
                      <td>{u.department}</td>
                      <td className="actions-col">
                        <div className="um-action-icons" aria-label={`Actions for ${u.name} ${u.surname}`}>
                          <button className="icon-btn" title="Edit user" aria-label={`Edit ${u.name} ${u.surname}`} onClick={() => openEdit(u)}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/>
                              <path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
                            </svg>
                          </button>

                          <button
                            className="icon-btn"
                            title="Delete user"
                            aria-label={`Delete ${u.name} ${u.surname}`}
                            onClick={() => handleDeleteRequest(u)}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                              <path d="M9 3h6l1 2h4v2H4V5h4l1-2z" fill="currentColor"/>
                              <path d="M7 9h10l-1 11H8L7 9z" fill="currentColor" opacity="0.85"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={5} className="muted" style={{ textAlign: 'center' }}>No users.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <AddUserModal open={open} onClose={() => setOpen(false)} onAdd={addUser} />
          <BulkAddModal open={openBulk} onClose={() => setOpenBulk(false)} onAddMany={(arr)=>{
            const withIds = arr.map(a=>({ ...a, id: Date.now()+Math.random() }));
            setUsers(s=>[...withIds, ...s]);
            setOpenBulk(false);
          }} />
          <EditUserModal
            open={editOpen}
            user={editingUser}
            onClose={() => { setEditOpen(false); setEditingUser(null); }}
            onSave={(u)=>{ saveEdit(u); }}
            onDeleteRequest={(u)=>{ handleDeleteRequest(u); }}
          />

          {/* Confirm delete modal */}
          {confirmOpen && (
            <div className="um-modal-overlay" role="dialog" aria-modal="true">
              <div className="um-modal">
                <h3>Confirm delete</h3>
                <p>Are you sure you want to delete <strong>{confirmUser?.name} {confirmUser?.surname}</strong>? This action cannot be undone.</p>
                <div className="row actions" style={{display:'flex', justifyContent:'flex-end', gap:8}}>
                  <button className="btn-muted" onClick={()=>setConfirmOpen(false)}>
                    <BtnIcon><IconX /> Cancel</BtnIcon>
                  </button>
                  <button className="btn-danger" onClick={handleConfirmDelete}>
                    <BtnIcon><IconTrash /> Delete</BtnIcon>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default UserManagement;
