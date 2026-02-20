import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PageHeader from "../../../components/PageHeader/PageHeader";
import StatsCard, { StatsRow } from "../../../components/StatsCard/StatsCard";
import TicketService from "../../../services/ticket.service";
import TicketTypeService from "../../../services/ticketType.service";
import UserService from "../../../services/user.service";
import "../../admin.css";
import "./UserTicketsPage.css";

/*  Status helpers  */
const statusMeta = (s) => {
  switch (s) {
    case "PENDING_APPROVAL": return { label: "Pending Approval", cls: "pending-approval", color: "#f59e0b" };
    case "QUEUED":           return { label: "In Queue",         cls: "in-process",       color: "#3b82f6" };
    case "PROCESSING":       return { label: "In Progress",      cls: "in-process",       color: "#06b6d4" };
    case "RESOLVED":         return { label: "Resolved",         cls: "done",             color: "#10b981" };
    case "CLOSED":           return { label: "Closed",           cls: "done",             color: "#10b981" };
    case "REJECTED":         return { label: "Rejected",         cls: "overdue",          color: "#ef4444" };
    default:                 return { label: s || "Unknown",     cls: "unknown",          color: "#94a3b8" };
  }
};

const FILTER_OPTIONS = [
  { value: "All",              label: "All Statuses" },
  { value: "PENDING_APPROVAL", label: "Pending Approval" },
  { value: "QUEUED",           label: "In Queue" },
  { value: "PROCESSING",       label: "In Progress" },
  { value: "RESOLVED",         label: "Resolved" },
  { value: "CLOSED",           label: "Closed" },
  { value: "REJECTED",         label: "Rejected" },
];

const UserTicketsPage = () => {
  /*  API ticket state  */
  const [tickets, setTickets]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [loadErr, setLoadErr]           = useState("");
  const [successMsg, setSuccessMsg]     = useState("");

  /*  Modals  */
  const [modalOpen, setModalOpen]       = useState(false);
  const [selected, setSelected]         = useState(null);
  const [closeTicketBusy, setCloseTicketBusy] = useState(false);
  const [closeTicketErr, setCloseTicketErr]   = useState("");

  /*  Table controls  */
  const [query, setQuery]               = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  /*  Create ticket modal  */
  const [ctForm, setCtForm]             = useState({ title: "", description: "", ticket_type_id: "", assigned_to: "" });
  const [ctTouched, setCtTouched]       = useState({});
  const [ctBusy, setCtBusy]             = useState(false);
  const [ctErr, setCtErr]               = useState("");
  const [ctFocus, setCtFocus]           = useState("");
  const [typesList, setTypesList]       = useState([]);
  const [officers, setOfficers]         = useState([]);
  const [officersLoading, setOfficersLoading] = useState(true);

  /*  Load tickets  */
  const loadTickets = useCallback(() => {
    setLoading(true); setLoadErr("");
    TicketService.getAllTickets({ limit: 200 })
      .then(r => {
        const d = r?.data?.data;
        setTickets(Array.isArray(d?.tickets) ? d.tickets : []);
      })
      .catch(() => setLoadErr("Failed to load tickets. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  /*  Load ticket types  */
  useEffect(() => {
    TicketTypeService.getAllTicketTypes({ limit: 100 })
      .then(r => {
        const d = r?.data?.data;
        setTypesList(Array.isArray(d?.ticket_types) ? d.ticket_types : []);
      })
      .catch(() => {});
  }, []);

  /*  Load officers  */
  useEffect(() => {
    UserService.getAllUsers({ limit: 200 })
      .then(r => {
        const users = r?.data?.data?.users || r?.data?.data || [];
        setOfficers(Array.isArray(users) ? users : []);
      })
      .catch(() => setOfficers([]))
      .finally(() => setOfficersLoading(false));
  }, []);

  /*  Body scroll lock  */
  useEffect(() => {
    const open = modalOpen || !!selected;
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen, selected]);

  /*  Close ticket  */
  const handleCloseTicket = async (id) => {
    setCloseTicketBusy(true); setCloseTicketErr("");
    try {
      await TicketService.closeTicket(id);
      setSelected(null);
      setSuccessMsg("Ticket closed successfully.");
      setTimeout(() => setSuccessMsg(""), 4000);
      loadTickets();
    } catch (e) {
      setCloseTicketErr(e?.response?.data?.message || "Failed to close ticket.");
    } finally { setCloseTicketBusy(false); }
  };

  /*  Create ticket helpers  */
  const ctSet   = (k, v) => { setCtForm(f => ({ ...f, [k]: v })); setCtTouched(t => ({ ...t, [k]: true })); };
  const ctTouch = (k)    => setCtTouched(t => ({ ...t, [k]: true }));
  const ctFieldErr = (k) => {
    if (!ctTouched[k]) return "";
    if (k === "title"          && !ctForm.title.trim())       return "Title is required.";
    if (k === "description"    && !ctForm.description.trim()) return "Description is required.";
    if (k === "ticket_type_id" && !ctForm.ticket_type_id)     return "Please select a ticket type.";
    return "";
  };

  const submitCreateTicket = async () => {
    setCtTouched({ title: true, description: true, ticket_type_id: true });
    if (!ctForm.title.trim() || !ctForm.description.trim() || !ctForm.ticket_type_id) {
      setCtErr("Please fill in all required fields."); return;
    }
    setCtBusy(true); setCtErr("");
    try {
      const payload = { title: ctForm.title.trim(), description: ctForm.description.trim(), ticket_type_id: Number(ctForm.ticket_type_id) };
      if (ctForm.assigned_to) payload.assigned_to = Number(ctForm.assigned_to);
      await TicketService.createTicket(payload);
      setCtForm({ title: "", description: "", ticket_type_id: "", assigned_to: "" });
      setCtTouched({});
      setModalOpen(false);
      setSuccessMsg("Ticket created successfully.");
      setTimeout(() => setSuccessMsg(""), 4000);
      loadTickets();
    } catch (e) {
      setCtErr(e?.response?.data?.message || "Failed to create ticket. Please try again.");
    } finally { setCtBusy(false); }
  };

  /*  Derived counts  */
  const count = (...ss) => tickets.filter(t => ss.includes(t.status)).length;

  /*  Filtering  */
  const q = (query || "").trim().toLowerCase();
  const filtered = tickets.filter(t => {
    if (statusFilter !== "All" && t.status !== statusFilter) return false;
    if (!q) return true;
    return (
      (t.title || "").toLowerCase().includes(q) ||
      (t.ticket_type?.title || "").toLowerCase().includes(q) ||
      (t.created_by?.name || "").toLowerCase().includes(q) ||
      (t.id || "").toLowerCase().includes(q)
    );
  });

  /*  Input style helper (create modal)  */
  const inputStyle = (hasErr) => ({
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: `1.5px solid ${hasErr ? "#fca5a5" : "#e5e7eb"}`,
    fontSize: 14, outline: "none", background: hasErr ? "#fff7f7" : "#ffffff",
    boxSizing: "border-box", fontFamily: "inherit", color: "#111827",
  });

  return (
    <>
      <PageHeader
        title="My Tickets"
        subtitle="View and manage all your submitted tickets"
        actions={<button className="btn-primary" onClick={() => setModalOpen(true)}>+ Create Ticket</button>}
      />

      {/*  Success toast  */}
      {successMsg && createPortal(
        <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:"#10b981", color:"#fff", borderRadius:12, padding:"13px 22px", fontWeight:600, fontSize:14, boxShadow:"0 8px 32px rgba(16,185,129,0.35)", display:"flex", alignItems:"center", gap:10 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/><path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {successMsg}
        </div>,
        document.body
      )}

      {/*  Stats  */}
      <StatsRow>
        <StatsCard label="Total"    value={loading ? "" : tickets.length}                                           color="blue"  />
        <StatsCard label="Pending"  value={loading ? "" : count("PENDING_APPROVAL")}                                color="amber" />
        <StatsCard label="Active"   value={loading ? "" : count("QUEUED","PROCESSING")}                             color="cyan"  />
        <StatsCard label="Resolved" value={loading ? "" : count("RESOLVED","CLOSED")}                               color="green" />
        <StatsCard label="Rejected" value={loading ? "" : count("REJECTED")}                                        color="red"   />
      </StatsRow>

      {/*  Main panel  */}
      <section className="utp-panel">

        {/* Toolbar */}
        <div className="utp-toolbar">
          <div className="utp-search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="utp-search-icon"><circle cx="11" cy="11" r="7" stroke="#94a3b8" strokeWidth="1.8"/><path d="M16.5 16.5l3.5 3.5" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round"/></svg>
            <input className="utp-search-input" placeholder="Search by title, type or ID" value={query} onChange={e => setQuery(e.target.value)} />
            {query && <button className="utp-search-clear" onClick={() => setQuery("")} aria-label="Clear search"></button>}
          </div>
          <select className="utp-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            {FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <span className="utp-count">{loading ? "" : `${filtered.length} ticket${filtered.length !== 1 ? "s" : ""}`}</span>
        </div>

        {/* Error bar */}
        {loadErr && (
          <div className="utp-error-bar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/><path d="M12 8v4M12 16h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/></svg>
            {loadErr}
            <button onClick={loadTickets} className="utp-retry-btn">Retry</button>
          </div>
        )}

        {/* Table wrapper */}
        <div className="utp-table-wrap">
          <table className="utp-table">
            <thead>
              <tr>
                <th className="col-id">Ticket ID</th>
                <th className="col-title">Title</th>
                <th className="col-type">Type</th>
                <th className="col-status">Status</th>
                <th className="col-date">Created</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && [1,2,3,4,5].map(i => (
                <tr key={i} className="utp-skeleton-row">
                  <td colSpan={6}><div className="utp-skeleton" /></td>
                </tr>
              ))}

              {!loading && filtered.map(t => {
                const m = statusMeta(t.status);
                const dateStr = t.created_at ? new Date(t.created_at).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "";
                return (
                  <tr key={t.id} className="utp-row" onClick={() => { setCloseTicketErr(""); setSelected(t); }} tabIndex={0} onKeyDown={e => { if (e.key === "Enter") { setCloseTicketErr(""); setSelected(t); } }}>
                    <td className="col-id">
                      <code className="ticket-id-pill" title={t.id}>{t.id}</code>
                    </td>
                    <td className="col-title">
                      <span className="ticket-title-text" title={t.title}>{t.title}</span>
                    </td>
                    <td className="col-type">
                      <span className="ticket-type-pill">{t.ticket_type?.title || ""}</span>
                    </td>
                    <td className="col-status">
                      <span className={`chip ${m.cls}`}>{m.label}</span>
                    </td>
                    <td className="col-date">{dateStr}</td>
                    <td className="col-actions" onClick={e => e.stopPropagation()}>
                      <button className="icon-btn" onClick={() => { setCloseTicketErr(""); setSelected(t); }} aria-label="View ticket" title="View details">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M2.2 12.1C3.7 7.6 7.5 4.5 12 4.5c4.5 0 8.3 3.1 9.8 7.6.1.3.1.6 0 .9-1.5 4.5-5.3 7.6-9.8 7.6-4.5 0-8.3-3.1-9.8-7.6a1.2 1.2 0 0 1 0-.9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.7"/></svg>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="utp-empty">
                      <svg width="38" height="38" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="3" stroke="#cbd5e1" strokeWidth="1.4"/><path d="M3 9h18" stroke="#cbd5e1" strokeWidth="1.3" strokeLinecap="round"/></svg>
                      <div>{query || statusFilter !== "All" ? "No tickets match your filter." : "No tickets yet. Create your first one!"}</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 
          CREATE TICKET MODAL
       */}
      {modalOpen && createPortal(
        (() => {
          const selectedType = typesList.find(t => String(t.id) === String(ctForm.ticket_type_id)) || null;
          const descMax = 1000;
          return (
            <div role="dialog" aria-modal="true" aria-label="Create new ticket"
              style={{ position:"fixed", top:0, left:260, right:0, bottom:0, display:"flex", alignItems:"center", justifyContent:"center", zIndex:60, background:"rgba(2,6,23,0.45)", backdropFilter:"blur(3px)" }}
              onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submitCreateTicket(); }}
            >
              <div style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:560, boxShadow:"0 32px 64px rgba(2,6,23,0.22)", display:"flex", flexDirection:"column", maxHeight:"92vh", overflow:"hidden" }}>
                {/* Header */}
                <div style={{ background:"linear-gradient(135deg,#3b82f6,#6366f1)", padding:"22px 28px", display:"flex", alignItems:"center", gap:14, flexShrink:0 }}>
                  <div style={{ width:42, height:42, borderRadius:12, background:"rgba(255,255,255,0.18)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="3" stroke="white" strokeWidth="1.8"/><path d="M3 9h18" stroke="white" strokeWidth="1.6" strokeLinecap="round"/><path d="M7 13h5M7 16h3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ color:"#fff", fontWeight:800, fontSize:18, letterSpacing:"-0.02em" }}>New Ticket</div>
                    <div style={{ color:"rgba(255,255,255,0.75)", fontSize:13, marginTop:2 }}>Submit a new support request</div>
                  </div>
                  <button onClick={() => { setModalOpen(false); setCtForm({ title:"",description:"",ticket_type_id:"",assigned_to:"" }); setCtTouched({}); setCtErr(""); }} disabled={ctBusy}
                    style={{ width:32, height:32, borderRadius:8, border:"none", background:"rgba(255,255,255,0.18)", color:"#fff", cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, flexShrink:0 }} aria-label="Close"></button>
                </div>
                {/* Body */}
                <div style={{ padding:"24px 28px", overflowY:"auto", flex:1 }}>
                  {ctErr && (
                    <div style={{ display:"flex", alignItems:"flex-start", gap:8, background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:10, padding:"11px 14px", marginBottom:20, fontSize:13, color:"#b91c1c" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0, marginTop:1 }}><circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/><path d="M12 8v4M12 16h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/></svg>
                      <span>{ctErr}</span>
                    </div>
                  )}
                  {/* Title */}
                  <div style={{ marginBottom:20 }}>
                    <label style={{ display:"flex", justifyContent:"space-between", fontSize:13, fontWeight:600, color:"#374151", marginBottom:7 }}>
                      <span>Title <span style={{ color:"#ef4444" }}>*</span></span>
                      {ctForm.title && <span style={{ fontWeight:400, color:"#9ca3af", fontSize:12 }}>{ctForm.title.length} chars</span>}
                    </label>
                    <input value={ctForm.title} onChange={e => ctSet("title",e.target.value)} onBlur={() => ctTouch("title")} onFocus={() => setCtFocus("title")} onBlurCapture={() => setCtFocus("")}
                      placeholder="Brief, descriptive title for the issue" maxLength={200}
                      style={{ ...inputStyle(!!ctFieldErr("title")), boxShadow:ctFocus==="title"?"0 0 0 3px rgba(59,130,246,0.15)":"none", borderColor:ctFocus==="title"&&!ctFieldErr("title")?"#93c5fd":ctFieldErr("title")?"#fca5a5":"#e5e7eb" }} />
                    {ctFieldErr("title") && <div style={{ color:"#ef4444", fontSize:12, marginTop:5 }}>{ctFieldErr("title")}</div>}
                  </div>
                  {/* Description */}
                  <div style={{ marginBottom:20 }}>
                    <label style={{ display:"flex", justifyContent:"space-between", fontSize:13, fontWeight:600, color:"#374151", marginBottom:7 }}>
                      <span>Description <span style={{ color:"#ef4444" }}>*</span></span>
                      <span style={{ fontWeight:400, color:ctForm.description.length>descMax*0.9?"#f59e0b":"#9ca3af", fontSize:12 }}>{ctForm.description.length} / {descMax}</span>
                    </label>
                    <textarea value={ctForm.description} onChange={e => ctSet("description",e.target.value)} onBlur={() => ctTouch("description")} onFocus={() => setCtFocus("description")} onBlurCapture={() => setCtFocus("")}
                      rows={5} maxLength={descMax} placeholder="Describe the issue in detail  steps to reproduce, expected vs actual behaviour"
                      style={{ ...inputStyle(!!ctFieldErr("description")), resize:"vertical", lineHeight:1.65, boxShadow:ctFocus==="description"?"0 0 0 3px rgba(59,130,246,0.15)":"none", borderColor:ctFocus==="description"&&!ctFieldErr("description")?"#93c5fd":ctFieldErr("description")?"#fca5a5":"#e5e7eb" }} />
                    {ctFieldErr("description") && <div style={{ color:"#ef4444", fontSize:12, marginTop:5 }}>{ctFieldErr("description")}</div>}
                  </div>
                  {/* Ticket Type */}
                  <div style={{ marginBottom:20 }}>
                    <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"block", marginBottom:7 }}>Ticket Type <span style={{ color:"#ef4444" }}>*</span></label>
                    <select value={ctForm.ticket_type_id} onChange={e => ctSet("ticket_type_id",e.target.value)} onBlur={() => ctTouch("ticket_type_id")} onFocus={() => setCtFocus("type")} onBlurCapture={() => setCtFocus("")}
                      style={{ ...inputStyle(!!ctFieldErr("ticket_type_id")), boxShadow:ctFocus==="type"?"0 0 0 3px rgba(59,130,246,0.15)":"none", borderColor:ctFocus==="type"&&!ctFieldErr("ticket_type_id")?"#93c5fd":ctFieldErr("ticket_type_id")?"#fca5a5":"#e5e7eb", cursor:"pointer" }}>
                      <option value=""> Select a ticket type </option>
                      {typesList.map(t => <option key={t.id} value={t.id}>{t.title}{t.approval_required?" (Requires Approval)":""}</option>)}
                    </select>
                    {ctFieldErr("ticket_type_id") && <div style={{ color:"#ef4444", fontSize:12, marginTop:5 }}>{ctFieldErr("ticket_type_id")}</div>}
                    {selectedType && (
                      <div style={{ marginTop:10, padding:"10px 14px", borderRadius:10, background:"linear-gradient(135deg,#eff6ff,#eef2ff)", border:"1.5px solid #bfdbfe", display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, color:"#1e40af", fontSize:13 }}>{selectedType.title}</div>
                          <div style={{ color:"#4b5563", fontSize:12, marginTop:3 }}>
                            {selectedType.departmental?.department && <span style={{ marginRight:10 }}>Dept: <strong>{selectedType.departmental.department}</strong></span>}
                            {selectedType.approval_required
                              ? <span style={{ color:"#92400e" }}>Requires <strong>{selectedType.approval_count}</strong> approval{selectedType.approval_count!==1?"s":""}</span>
                              : <span style={{ color:"#065f46" }}>No approval needed</span>}
                          </div>
                        </div>
                        {selectedType.expected_sla_duration && (
                          <div style={{ display:"flex", alignItems:"center", gap:4, background:"#dbeafe", color:"#1d4ed8", borderRadius:8, padding:"4px 10px", fontSize:12, fontWeight:700 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0 }}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                            {selectedType.expected_sla_duration}h SLA
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Assign To */}
                  <div>
                    <label style={{ fontSize:13, fontWeight:600, color:"#374151", display:"flex", justifyContent:"space-between", marginBottom:7 }}>
                      <span>Assign To <span style={{ fontWeight:400, color:"#6b7280", fontSize:12 }}>(optional)</span></span>
                      {ctForm.assigned_to && <button type="button" onClick={() => ctSet("assigned_to","")} style={{ fontSize:12, color:"#6b7280", background:"none", border:"none", cursor:"pointer", padding:0 }}>Clear</button>}
                    </label>
                    <select value={ctForm.assigned_to} onChange={e => ctSet("assigned_to",e.target.value)} onFocus={() => setCtFocus("assigned_to")} onBlurCapture={() => setCtFocus("")} disabled={officersLoading}
                      style={{ ...inputStyle(false), boxShadow:ctFocus==="assigned_to"?"0 0 0 3px rgba(59,130,246,0.15)":"none", borderColor:ctFocus==="assigned_to"?"#93c5fd":"#e5e7eb", cursor:"pointer", color:ctForm.assigned_to?"#111827":"#9ca3af" }}>
                      <option value="">{officersLoading?"Loading officers":" Auto-assign (recommended) "}</option>
                      {officers.map(u => {
                        const deptName = typeof u.department === 'string' ? u.department : u.department?.department;
                        return <option key={u.id} value={u.id}>{u.first_name} {u.last_name}{deptName?`  ${deptName}`:""}</option>;
                      })}
                    </select>
                    <div style={{ marginTop:7, fontSize:12, color:"#6b7280", display:"flex", alignItems:"center", gap:5 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#9ca3af" strokeWidth="2"/><path d="M12 8v4M12 16h.01" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/></svg>
                      If left blank, the system will auto-assign to an available officer.
                    </div>
                  </div>
                </div>
                {/* Footer */}
                <div style={{ padding:"16px 28px", borderTop:"1px solid #f3f4f6", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, background:"#fafafa", borderBottomLeftRadius:18, borderBottomRightRadius:18 }}>
                  <span style={{ fontSize:12, color:"#9ca3af" }}>Ctrl+Enter to submit</span>
                  <div style={{ display:"flex", gap:10 }}>
                    <button onClick={() => { setModalOpen(false); setCtForm({ title:"",description:"",ticket_type_id:"",assigned_to:"" }); setCtTouched({}); setCtErr(""); }} disabled={ctBusy}
                      style={{ padding:"9px 18px", borderRadius:10, border:"1.5px solid #e5e7eb", background:"#fff", color:"#374151", fontWeight:600, fontSize:14, cursor:ctBusy?"not-allowed":"pointer", opacity:ctBusy?0.7:1 }}>Cancel</button>
                    <button onClick={submitCreateTicket} disabled={ctBusy}
                      style={{ padding:"9px 22px", borderRadius:10, border:"none", background:ctBusy?"#93c5fd":"linear-gradient(135deg,#3b82f6,#6366f1)", color:"#fff", fontWeight:700, fontSize:14, cursor:ctBusy?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:8, boxShadow:ctBusy?"none":"0 4px 14px rgba(99,102,241,0.35)" }}>
                      {ctBusy && <div style={{ width:14, height:14, border:"2px solid rgba(255,255,255,0.4)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />}
                      {ctBusy?"Submitting":"Submit Ticket"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })(),
        document.body
      )}

      {/* 
          VIEW TICKET MODAL
       */}
      {selected && createPortal(
        <div role="dialog" aria-modal="true"
          style={{ position:"fixed", top:0, left:260, right:0, bottom:0, display:"flex", alignItems:"center", justifyContent:"center", zIndex:70, background:"rgba(2,6,23,0.50)", backdropFilter:"blur(4px)" }}
          onClick={e => { if (e.target===e.currentTarget) setSelected(null); }}
        >
          <div style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:600, maxHeight:"90vh", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 32px 72px rgba(2,6,23,0.28)" }}
            onClick={e => e.stopPropagation()}>
            {(() => {
              const m = statusMeta(selected.status);
              const initials = (selected.created_by?.name||"U").split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase();
              return (
                <>
                  {/* Header */}
                  <div style={{ background:"linear-gradient(135deg,#0f172a,#1e3a5f)", padding:"22px 28px", flexShrink:0 }}>
                    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, marginBottom:10 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                        <code style={{ background:"rgba(255,255,255,0.12)", color:"#93c5fd", padding:"3px 10px", borderRadius:6, fontSize:11, fontFamily:"monospace", letterSpacing:"0.05em" }}>{selected.id}</code>
                        <span style={{ background:m.color+"25", color:m.color, borderRadius:8, padding:"4px 12px", fontSize:12, fontWeight:700 }}>{m.label}</span>
                      </div>
                      <button onClick={() => setSelected(null)} style={{ width:30, height:30, borderRadius:7, border:"none", background:"rgba(255,255,255,0.12)", color:"#94a3b8", cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, flexShrink:0 }}></button>
                    </div>
                    <div style={{ color:"#f1f5f9", fontWeight:700, fontSize:17, lineHeight:1.35, marginBottom:5 }}>{selected.title}</div>
                    <div style={{ color:"#64748b", fontSize:12 }}>Created {selected.created_at ? new Date(selected.created_at).toLocaleString() : ""}</div>
                  </div>

                  {/* Body */}
                  <div style={{ padding:"24px 28px", overflowY:"auto", flex:1 }}>
                    {/* Description */}
                    <div style={{ marginBottom:20 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Description</div>
                      <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"14px 16px", fontSize:14, color:"#374151", lineHeight:1.7, textIndent:"1em", wordBreak:"break-word", maxHeight:150, overflowY:"auto" }}>
                        {selected.description || "No description provided."}
                      </div>
                    </div>

                    {/* Info grid */}
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                      {/* Type */}
                      <div style={{ background:"#f8fafc", border:"1px solid #e5e7eb", borderRadius:12, padding:"14px 16px" }}>
                        <div style={{ fontSize:11, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Ticket Type</div>
                        <div style={{ fontWeight:600, color:"#111827", fontSize:14 }}>{selected.ticket_type?.title||""}</div>
                        {selected.ticket_type?.expected_sla_duration && (
                          <div style={{ display:"inline-flex", alignItems:"center", gap:4, background:"#dbeafe", color:"#1d4ed8", borderRadius:6, padding:"3px 8px", fontSize:11, fontWeight:700, marginTop:6 }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                            {selected.ticket_type.expected_sla_duration}h SLA
                          </div>
                        )}
                        <div style={{ fontSize:12, color:"#6b7280", marginTop:6 }}>
                          {selected.ticket_type?.approval_required
                            ? `Requires ${selected.ticket_type.approval_count} approval${selected.ticket_type.approval_count!==1?"s":""}`
                            : "No approval needed"}
                        </div>
                      </div>

                      {/* Status */}
                      <div style={{ background:"#f8fafc", border:"1px solid #e5e7eb", borderRadius:12, padding:"14px 16px" }}>
                        <div style={{ fontSize:11, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Status</div>
                        <span style={{ background:m.color+"1a", color:m.color, borderRadius:8, padding:"5px 12px", fontSize:13, fontWeight:700 }}>{m.label}</span>
                        {selected.status === "REJECTED" && selected.rejection_reason && (
                          <div style={{ marginTop:10, background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"9px 12px" }}>
                            <div style={{ fontSize:10, fontWeight:700, color:"#ef4444", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>Reason for Rejection</div>
                            <div style={{ fontSize:13, color:"#b91c1c", lineHeight:1.55 }}>{selected.rejection_reason}</div>
                          </div>
                        )}
                      </div>

                      {/* Created By */}
                      <div style={{ background:"#f8fafc", border:"1px solid #e5e7eb", borderRadius:12, padding:"14px 16px" }}>
                        <div style={{ fontSize:11, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Created By</div>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:34, height:34, borderRadius:"50%", background:"linear-gradient(135deg,#8b5cf6,#6366f1)", color:"#fff", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{initials}</div>
                          <div>
                            <div style={{ fontWeight:600, color:"#111827", fontSize:13 }}>{selected.created_by?.name||""}</div>
                            <div style={{ fontSize:11, color:"#6b7280" }}>{selected.created_by?.email||""}</div>
                            {selected.created_by?.department && (
                              <div style={{ fontSize:11, color:"#9ca3af" }}>
                                {typeof selected.created_by.department === 'string' 
                                  ? selected.created_by.department 
                                  : selected.created_by.department?.department || 'Unknown Department'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Assigned Officer */}
                      <div style={{ background:"#f8fafc", border:"1px solid #e5e7eb", borderRadius:12, padding:"14px 16px" }}>
                        <div style={{ fontSize:11, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Assigned Officer</div>
                        {selected.assignment?.officer ? (
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <div style={{ width:34, height:34, borderRadius:"50%", background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                              {selected.assignment.officer.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'NA'}
                            </div>
                            <div>
                              <div style={{ fontWeight:600, color:"#111827", fontSize:13 }}>{selected.assignment.officer.name}</div>
                              <div style={{ fontSize:11, color:"#6b7280" }}>{selected.assignment.officer.email}</div>
                            </div>
                          </div>
                        ) : (
                          <span style={{ color:"#9ca3af", fontSize:13 }}>Not yet assigned</span>
                        )}
                      </div>
                    </div>

                    {/* Close ticket error */}
                    {closeTicketErr && (
                      <div style={{ marginTop:16, display:"flex", gap:8, background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:10, padding:"11px 14px", fontSize:13, color:"#b91c1c" }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink:0 }}><circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/><path d="M12 8v4M12 16h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/></svg>
                        {closeTicketErr}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div style={{ padding:"16px 28px", borderTop:"1px solid #f1f5f9", display:"flex", justifyContent:"flex-end", gap:10, flexShrink:0, background:"#fafafa", borderBottomLeftRadius:18, borderBottomRightRadius:18 }}>
                    {["PENDING_APPROVAL","QUEUED"].includes(selected.status) && (
                      <button onClick={() => handleCloseTicket(selected.id)} disabled={closeTicketBusy}
                        style={{ padding:"9px 20px", borderRadius:10, border:"none", background:closeTicketBusy?"#fca5a5":"linear-gradient(135deg,#ef4444,#dc2626)", color:"#fff", fontWeight:700, fontSize:14, cursor:closeTicketBusy?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:8 }}>
                        {closeTicketBusy && <div style={{ width:13, height:13, border:"2px solid rgba(255,255,255,0.4)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />}
                        {closeTicketBusy?"Closing":"Close Ticket"}
                      </button>
                    )}
                    <button onClick={() => setSelected(null)}
                      style={{ padding:"9px 18px", borderRadius:10, border:"1.5px solid #e5e7eb", background:"#fff", color:"#374151", fontWeight:600, fontSize:14, cursor:"pointer" }}>Dismiss</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default UserTicketsPage;