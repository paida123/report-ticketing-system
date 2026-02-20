import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import PageHeader from "../../../components/PageHeader/PageHeader";
import SlaService from "../../../services/sla.service";
import "../../admin.css";
import "../UserDashboard.css";
import "./UserSlaPage.css";

/*  Medal helper  */
const getMedal = (score) => {
  if (score >= 0.9) return { label: "Gold",   cls: "gold",   color: "#f59e0b", desc: "Excellent performance" };
  if (score >= 0.7) return { label: "Silver", cls: "silver", color: "#94a3b8", desc: "On target" };
  if (score >= 0.5) return { label: "Bronze", cls: "bronze", color: "#c2700a", desc: "Needs improvement" };
  return               { label: "Fail",   cls: "fail",   color: "#ef4444", desc: "Below standard" };
};

const gradeColor = (g) => {
  switch ((g || "").toUpperCase()) {
    case "EXCELLENT":  return "#10b981";
    case "ON_TARGET":  return "#3b82f6";
    case "POOR":       return "#ef4444";
    default:           return "#94a3b8";
  }
};

const isMet = (r) => r.grade === "EXCELLENT" || r.grade === "ON_TARGET";

/*  Component  */
const UserSlaPage = () => {
  const [slaData, setSlaData]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [loadErr, setLoadErr]   = useState("");
  const [selected, setSelected] = useState(null);
  const [query,    setQuery]    = useState("");

  const loadSla = useCallback(() => {
    setLoading(true);
    setLoadErr("");
    SlaService.getAllSla({ limit: 100 })
      .then(r => {
        const d = r?.data;
        setSlaData(Array.isArray(d?.data) ? d.data : []);
      })
      .catch(() => setLoadErr("Failed to load SLA data. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadSla(); }, [loadSla]);

  useEffect(() => {
    document.body.style.overflow = selected ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [selected]);

  /* Derived stats */
  const stats = useMemo(() => {
    if (!slaData.length) return { total: 0, met: 0, breached: 0, score: 1 };
    const total    = slaData.length;
    const met      = slaData.filter(r => isMet(r)).length;
    const breached = total - met;
    const score    = total > 0 ? met / total : 1;
    return { total, met, breached, score };
  }, [slaData]);

  const medal = getMedal(stats.score);
  const pct   = Math.round(stats.score * 100);

  /* Filtering */
  const q        = query.trim().toLowerCase();
  const filtered = slaData.filter(r => {
    if (!q) return true;
    return (
      (r.ticket_id || "").toLowerCase().includes(q) ||
      (`${r.assigned_to?.first_name || ""} ${r.assigned_to?.last_name || ""}`).toLowerCase().includes(q) ||
      (r.type  || "").toLowerCase().includes(q) ||
      (r.grade || "").toLowerCase().includes(q)
    );
  });

  /*  Render  */
  return (
    <div className="user-sla-page">
      <PageHeader
        title="My SLA"
        subtitle="Track your ticket SLA compliance and performance rating"
      />

      <section className="panel user-panel">

        {/*  Performance Card  */}
        <div className="sla-perf-card">
          {/* Dark gradient header */}
          <div className="sla-perf-header">
            <div className="sla-perf-left">
              <span className="sla-perf-section-label">Overall Performance</span>
              <span className={`sla-badge ${medal.cls}`}>
                <span className={`sla-medal ${medal.cls}`} aria-hidden="true" />
                {medal.label}
                <span className="sla-badge-desc">{medal.desc}</span>
              </span>
            </div>
            <div className="sla-perf-right">
              <span className="sla-perf-score" style={{ color: medal.color }}>{pct}%</span>
              <span className="sla-perf-score-label">compliance rate</span>
            </div>
          </div>

          {/* Progress + mini-stats */}
          <div className="sla-perf-body">
            <div className="sla-progress-wrap">
              <div className="sla-progress-track">
                <div
                  className="sla-progress-fill"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${medal.color}88, ${medal.color})`,
                  }}
                />
              </div>
              <div className="sla-progress-ticks">
                <span className="sla-progress-tick">0%</span>
                <span className="sla-progress-tick">50%  Fail</span>
                <span className="sla-progress-tick">70%  Bronze</span>
                <span className="sla-progress-tick">90%  Gold</span>
              </div>
            </div>

            <div className="sla-mini-stats">
              <div className="sla-mini-stat">
                <span className="sla-mini-stat-label">Total</span>
                <span className="sla-mini-stat-value c-blue">{loading ? "" : stats.total}</span>
              </div>
              <div className="sla-mini-stat">
                <span className="sla-mini-stat-label">SLA Met</span>
                <span className="sla-mini-stat-value c-green">{loading ? "" : stats.met}</span>
              </div>
              <div className="sla-mini-stat">
                <span className="sla-mini-stat-label">Breached</span>
                <span className="sla-mini-stat-value c-red">{loading ? "" : stats.breached}</span>
              </div>
            </div>
          </div>
        </div>

        {/*  Error bar  */}
        {loadErr && (
          <div className="sla-error-bar">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/>
              <path d="M12 8v4M12 16h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {loadErr}
            <button onClick={loadSla}>Retry</button>
          </div>
        )}

        {/*  Toolbar  */}
        <div className="sla-toolbar">
          <div className="sla-search-wrap">
            <span className="sla-search-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="#94a3b8" strokeWidth="1.8"/>
                <path d="M16.5 16.5l3.5 3.5" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </span>
            <input
              className="sla-search-input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by ID, officer or type"
            />
          </div>
          {!loading && (
            <span className="sla-record-count">
              {filtered.length} record{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/*  Table  */}
        <div className="um-sla-table-wrap">
          <div className="sla-table-outer">
            <div className="sla-table-scroll">
              <table className="sla-table">
                <thead>
                  <tr>
                    <th className="id-col">Ticket ID</th>
                    <th>Assigned Officer</th>
                    <th className="type-col">Type</th>
                    <th className="sla-col">Expected</th>
                    <th className="sla-col">Actual</th>
                    <th className="sla-col">Status</th>
                    <th className="actions-col">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && [1,2,3,4,5].map(i => (
                    <tr key={i} className="sla-skeleton-row">
                      <td colSpan={7}><div /></td>
                    </tr>
                  ))}

                  {!loading && filtered.map((r, i) => {
                    const met    = isMet(r);
                    const gColor = gradeColor(r.grade);
                    return (
                      <tr key={r.ticket_id || i} onClick={() => setSelected(r)}>
                        <td className="id-col">
                          <span className="sla-id-chip" title={r.ticket_id}>{r.ticket_id}</span>
                        </td>
                        <td>{r.assigned_to ? `${r.assigned_to.first_name} ${r.assigned_to.last_name}` : ""}</td>
                        <td className="type-col">{r.type || ""}</td>
                        <td className="sla-col">{r.expected_sla != null ? `${r.expected_sla}h` : ""}</td>
                        <td className="sla-col">{r.actual_sla    != null ? `${r.actual_sla}h`    : ""}</td>
                        <td className="sla-col">
                          <span className={`sla-chip ${met ? "met" : "breached"}`}>
                            {met ? "Met" : "Breached"}
                          </span>
                        </td>
                        <td className="actions-col">
                          {r.grade
                            ? <span className="sla-grade-chip" style={{ background: gColor + "18", color: gColor }}>{r.grade}</span>
                            : ""}
                        </td>
                      </tr>
                    );
                  })}

                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <div className="sla-empty">
                          <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="5" width="18" height="14" rx="3" stroke="#cbd5e1" strokeWidth="1.4"/>
                            <path d="M3 9h18" stroke="#cbd5e1" strokeWidth="1.3" strokeLinecap="round"/>
                          </svg>
                          <p className="sla-empty-text">No SLA records found.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/*  Detail Modal  */}
      {selected && createPortal(
        <div className="sla-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="sla-modal">
            {(() => {
              const met    = isMet(selected);
              const gColor = gradeColor(selected.grade);
              return (
                <>
                  {/* Modal header */}
                  <div className="sla-modal-header">
                    <div className="sla-modal-header-top">
                      <span className="sla-modal-id">{selected.ticket_id}</span>
                      <button className="sla-modal-close" onClick={() => setSelected(null)}></button>
                    </div>
                    <div className="sla-modal-chips">
                      <span className={`sla-chip ${met ? "met" : "breached"}`}>
                        {met ? "SLA Met" : "SLA Breached"}
                      </span>
                      {selected.grade && (
                        <span className="sla-grade-chip">Grade: {selected.grade}</span>
                      )}
                    </div>
                  </div>

                  {/* Modal body */}
                  <div className="sla-modal-body">
                    <div className="sla-modal-field">
                      <span className="sla-modal-field-label">Assigned Officer</span>
                      <span className="sla-modal-field-value">
                        {selected.assigned_to ? `${selected.assigned_to.first_name} ${selected.assigned_to.last_name}` : ""}
                      </span>
                    </div>
                    <div className="sla-modal-field">
                      <span className="sla-modal-field-label">Type</span>
                      <span className="sla-modal-field-value">{selected.type || ""}</span>
                    </div>
                    <div className="sla-modal-field">
                      <span className="sla-modal-field-label">Expected SLA</span>
                      <span className="sla-modal-field-value large" style={{ color: "#3b82f6" }}>
                        {selected.expected_sla != null ? `${selected.expected_sla}h` : ""}
                      </span>
                    </div>
                    <div className="sla-modal-field">
                      <span className="sla-modal-field-label">Actual SLA</span>
                      <span className="sla-modal-field-value large" style={{ color: met ? "#10b981" : "#ef4444" }}>
                        {selected.actual_sla != null ? `${selected.actual_sla}h` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Modal footer */}
                  <div className="sla-modal-footer">
                    <button className="sla-modal-close-btn" onClick={() => setSelected(null)}>Close</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default UserSlaPage;
