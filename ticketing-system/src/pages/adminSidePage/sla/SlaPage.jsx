import React, { useCallback, useEffect, useState } from "react";
import PageHeader from "../../../components/PageHeader/PageHeader";
import SlaService from "../../../services/sla.service";
import TicketService from "../../../services/ticket.service";
import "../../admin.css";
import "../adminDashboard/AdminDashboard.css";
import "./SlaPage.css";

const SlaPage = () => {
  const [slaData, setSlaData] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [query, setQuery] = useState("");
  
  // Pagination
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(10);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadErr("");
    try {
      const [slaRes, ticketsRes] = await Promise.all([
        SlaService.getAllSla({ limit: 1000 }),
        TicketService.getAllTickets({ limit: 1000 }),
      ]);

      const slaArr = slaRes?.data?.data || [];
      const ticketsArr = ticketsRes?.data?.data?.tickets || [];

      setSlaData(slaArr);
      setTickets(ticketsArr);
    } catch (err) {
      console.error("Error loading SLA data:", err);
      setLoadErr("Failed to load SLA data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get unique departments - use correct API path
  const departments = [
    "All",
    ...Array.from(new Set(slaData.map((s) => s.ticket_department).filter(Boolean))),
  ];

  // helper to compute grade color
  const gradeColor = (g) => {
    switch ((g || "").toUpperCase()) {
      case "EXCELLENT":
        return "#10b981";
      case "ON_TARGET":
        return "#3b82f6";
      case "POOR":
        return "#ef4444";
      default:
        return "#94a3b8";
    }
  };

  const isMet = (r) => r.grade === "EXCELLENT" || r.grade === "ON_TARGET";

  // Enrich SLA data with ticket information
  const enrichedSla = slaData.map((sla) => {
    const ticket = tickets.find((t) => t.id === sla.ticket_id);
    const department = sla.ticket_department || "Unknown";
    const breached = sla.grade === "POOR";
    const atRisk = sla.grade === "ON_TARGET";

    return {
      ...sla,
      department,
      ticket,
      breached,
      atRisk,
    };
  });

  // Filter by department
  let visibleSla = deptFilter === "All" ? enrichedSla : enrichedSla.filter((s) => s.department === deptFilter);

  // Filter by SLA status
  if (statusFilter !== "All") {
    visibleSla = visibleSla.filter((s) => {
      if (statusFilter === "Met") return isMet(s);
      if (statusFilter === "At Risk") return s.atRisk;
      if (statusFilter === "Breached") return s.breached;
      return true;
    });
  }

  // Filter by search query
  const filteredSla = visibleSla.filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (s.ticket_id || "").toLowerCase().includes(q) ||
      (s.type || "").toLowerCase().includes(q) ||
      (`${s.assigned_to?.first_name || ""} ${s.assigned_to?.last_name || ""}`).toLowerCase().includes(q) ||
      (s.department || "").toLowerCase().includes(q)
    );
  });

  // KPI calculations
  const total = visibleSla.length;
  const breachedCount = visibleSla.filter((s) => s.breached).length;
  const atRiskCount = visibleSla.filter((s) => s.atRisk).length;
  const metCount = visibleSla.filter((s) => isMet(s)).length;
  const avgSla = slaData.length > 0 ? Math.round(slaData.reduce((acc, s) => acc + (s.actual_sla || 0), 0) / slaData.length) : 0;

  // Pagination helper
  const paginate = (rows, page, pageSize) => {
    const safeSize = Math.max(1, Number(pageSize) || 10);
    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / safeSize));
    const safePage = Math.min(Math.max(1, Number(page) || 1), pages);
    const start = (safePage - 1) * safeSize;
    const end = start + safeSize;
    return {
      page: safePage,
      pageSize: safeSize,
      total,
      pages,
      start,
      end: Math.min(end, total),
      slice: rows.slice(start, end),
    };
  };

  const tablePager = paginate(filteredSla, tablePage, tablePageSize);

  // Reset pagination when filters change
  useEffect(() => {
    setTablePage(1);
  }, [deptFilter, statusFilter, query]);

  // Export CSV
  const exportCsv = (rows = filteredSla) => {
    if (rows.length === 0) return alert("No data to export");
    const exportRows = rows.map((s) => ({
      ticket_id: s.ticket_id,
      department: s.department,
      assigned_to: `${s.assigned_to?.first_name || ""} ${s.assigned_to?.last_name || ""}`.trim(),
      type: s.type,
      expected_sla: s.expected_sla || "N/A",
      actual_sla: s.actual_sla || "N/A",
      grade: s.grade,
    }));
    const hdr = Object.keys(exportRows[0]).join(",") + "\n";
    const body = exportRows
      .map((r) =>
        Object.values(r)
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    const csv = hdr + body;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sla-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader title="📊 SLA Management" subtitle="Monitor service level agreement compliance and performance metrics" />

      <section className="panel sla-panel">
        {loadErr && (
          <div className="dashboard-error">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="10" cy="10" r="8"></circle>
              <line x1="10" y1="6" x2="10" y2="10"></line>
              <line x1="10" y1="13" x2="10.01" y2="13"></line>
            </svg>
            {loadErr}
            <button onClick={loadData}>Retry</button>
          </div>
        )}

        {/* KPI Cards */}
        <div className="sla-kpi-grid">
          <div className="sla-kpi-card" onClick={() => setDeptFilter("All")}>
            <div className="kpi-icon-wrap blue">
              <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
                <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z"/>
              </svg>
            </div>
            <div className="kpi-content">
              <div className="kpi-value">{loading ? "..." : total}</div>
              <div className="kpi-title">Total Records</div>
            </div>
          </div>
          <div className="sla-kpi-card success" onClick={() => setDeptFilter("All")}>
            <div className="kpi-icon-wrap green">
              <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
              </svg>
            </div>
            <div className="kpi-content">
              <div className="kpi-value">{loading ? "..." : metCount}</div>
              <div className="kpi-title">SLA Met</div>
            </div>
          </div>
          <div className="sla-kpi-card warning" onClick={() => setDeptFilter("All")}>
            <div className="kpi-icon-wrap yellow">
              <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
              </svg>
            </div>
            <div className="kpi-content">
              <div className="kpi-value">{loading ? "..." : atRiskCount}</div>
              <div className="kpi-title">At Risk</div>
            </div>
          </div>
          <div className="sla-kpi-card danger" onClick={() => setDeptFilter("All")}>
            <div className="kpi-icon-wrap red">
              <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
              </svg>
            </div>
            <div className="kpi-content">
              <div className="kpi-value">{loading ? "..." : breachedCount}</div>
              <div className="kpi-title">Breached</div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="sla-controls">
          <div className="control-group">
            <label>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{marginRight: '6px'}}>
                <path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/>
              </svg>
              Department Filter
            </label>
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d === "All" ? "🌐 All Departments" : d}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{marginRight: '6px'}}>
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>
              </svg>
              SLA Status
            </label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">📊 All Status</option>
              <option value="Met">✅ SLA Met</option>
              <option value="At Risk">⚠️ At Risk</option>
              <option value="Breached">❌ Breached</option>
            </select>
          </div>

          <div className="control-group search-group">
            <label>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{marginRight: '6px'}}>
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
              </svg>
              Search
            </label>
            <div className="search-input-wrap">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="search-icon">
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
              </svg>
              <input placeholder="Search ticket ID, officer, or type..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>

          <button className="sla-export-btn" onClick={() => exportCsv()} disabled={filteredSla.length === 0}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8.5 6.5a.5.5 0 0 0-1 0v3.793L6.354 9.146a.5.5 0 1 0-.708.708l2 2a.5.5 0 0 0 .708 0l2-2a.5.5 0 0 0-.708-.708L8.5 10.293V6.5z"/>
              <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/>
            </svg>
            Export CSV
          </button>
        </div>

        {loading ? (
          <div className="dashboard-loading">
            <div className="spinner"></div>
            <p>Loading SLA data...</p>
          </div>
        ) : (
          /* Table View */
          <div className="sla-table-wrap">
            <table className="user-tickets-table">
              <thead>
                <tr>
                  <th className="id-col">Ticket ID</th>
                  <th>Assigned Officer</th>
                  <th>Department</th>
                  <th>Type</th>
                  <th>Expected (min)</th>
                  <th>Actual (min)</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {tablePager.slice.map((s) => {
                  const gColor = gradeColor(s.grade);
                  const officerName = `${s.assigned_to?.first_name || ""} ${s.assigned_to?.last_name || ""}`.trim() || "N/A";
                  return (
                    <tr key={s.id} className={s.breached ? "row-breached" : s.atRisk ? "row-atrisk" : ""}>
                      <td className="id-col">{s.ticket_id}</td>
                      <td>{officerName}</td>
                      <td>{s.department}</td>
                      <td>
                        <span className={`status ${s.type.toLowerCase()}`}>{s.type}</span>
                      </td>
                      <td><strong>{s.expected_sla || "N/A"}</strong></td>
                      <td><strong>{s.actual_sla || "N/A"}</strong></td>
                      <td>
                        <span className="sla-grade-badge" style={{ background: `${gColor}22`, color: gColor, padding: "6px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: 700 }}>
                          {s.grade || "N/A"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredSla.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "60px 20px" }}>
                      <div style={{ color: "#94a3b8", fontSize: "15px" }}>
                        <strong>No SLA records match the filter.</strong>
                        <p style={{ marginTop: "8px", fontSize: "13px" }}>Try adjusting your search or department filter.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {filteredSla.length > 0 && (
              <div className="pagination">
                <div className="pagination-info">
                  Showing {tablePager.start + 1}–{tablePager.end} of {tablePager.total}
                </div>

                <div className="pagination-controls">
                  <label className="pagination-size">
                    Rows
                    <select value={tablePageSize} onChange={(e) => setTablePageSize(Number(e.target.value) || 10)}>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </label>

                  <button type="button" className="btn-muted" disabled={tablePager.page <= 1} onClick={() => setTablePage((p) => Math.max(1, p - 1))}>
                    Prev
                  </button>
                  <div className="pagination-page">
                    Page {tablePager.page} of {tablePager.pages}
                  </div>
                  <button type="button" className="btn-muted" disabled={tablePager.page >= tablePager.pages} onClick={() => setTablePage((p) => Math.min(tablePager.pages, p + 1))}>
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
};

export default SlaPage;
