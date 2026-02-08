import React, { useEffect, useState, useMemo } from 'react';
import { profitAPI, invoiceAPI, customerAPI } from '../services/api';
import jsPDF from 'jspdf';
import { FaRupeeSign, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import './Reports.css';

const numberFmt = (n) => `₹${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pctFmt = (n) => `${Number(n || 0).toFixed(2)}%`;

const Profit = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState({ overall_profit: 0, per_client: [] });
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('profit');
  const [sortDir, setSortDir] = useState('desc');

  // Sales report state
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`; // yyyy-mm
  });
  const [selectedClientId, setSelectedClientId] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [summaryData, invoiceData, customerData] = await Promise.all([
          profitAPI.getSummary().catch(() => ({ overall_profit: 0, per_client: [] })),
          invoiceAPI.getInvoices().catch(() => ([])),
          customerAPI.getCustomers().catch(() => ([])),
        ]);
        setSummary(summaryData || { overall_profit: 0, per_client: [] });
        setInvoices(Array.isArray(invoiceData) ? invoiceData : (invoiceData || []));
        setCustomers(Array.isArray(customerData) ? customerData : (customerData || []));
        setError(null);
      } catch (e) {
        console.error('Failed to load profit summary', e);
        setError('Failed to load profit summary');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const rows = useMemo(() => {
    // Build per-client aggregates from invoices to ensure revenue matches
    const map = new Map(); // customer_id -> { customer_id, customer_name, invoice_count, revenue }
    const nameById = new Map(customers.map(c => [String(c.id), c.name]));
    (Array.isArray(invoices) ? invoices : []).forEach(inv => {
      const cid = inv.customer_id != null ? String(inv.customer_id) : undefined;
      if (!cid) return;
      const entry = map.get(cid) || { customer_id: Number(cid), customer_name: inv.customer_name || nameById.get(cid) || `Customer #${cid}`, invoice_count: 0, revenue: 0 };
      entry.invoice_count += 1;
      entry.revenue += Number(inv.total_amount || 0);
      // keep latest seen name
      if (!entry.customer_name && (inv.customer_name || nameById.get(cid))) {
        entry.customer_name = inv.customer_name || nameById.get(cid);
      }
      map.set(cid, entry);
    });

    // Merge in backend profit summary (profit, profit_margin_pct) when available
    const backend = Array.isArray(summary.per_client) ? summary.per_client : [];
    const backendById = new Map(backend.map(r => [String(r.customer_id), r]));

    let merged = Array.from(map.values()).map(e => {
      const b = backendById.get(String(e.customer_id));
      return {
        ...e,
        profit: b?.profit ?? 0,
        profit_margin_pct: b?.profit_margin_pct ?? 0,
      };
    });

    // If backend has clients not present in invoices, include them as zero revenue (optional)
    backend.forEach(b => {
      const key = String(b.customer_id);
      if (!map.has(key)) {
        merged.push({
          customer_id: b.customer_id,
          customer_name: b.customer_name || nameById.get(key) || `Customer #${key}`,
          invoice_count: 0,
          revenue: 0,
          profit: b.profit ?? 0,
          profit_margin_pct: b.profit_margin_pct ?? 0,
        });
      }
    });

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      merged = merged.filter(r => (r.customer_name || '').toLowerCase().includes(q));
    }

    // Sorting
    const dir = sortDir === 'asc' ? 1 : -1;
    merged.sort((a, b) => {
      const av = a[sortBy] ?? 0;
      const bv = b[sortBy] ?? 0;
      if (typeof av === 'string') return av.localeCompare(bv) * dir;
      return (av - bv) * dir;
    });
    return merged;
  }, [invoices, customers, summary, search, sortBy, sortDir]);

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <FaSort style={{ opacity: 0.5 }} />;
    return sortDir === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('desc');
    }
  };

  // Derived: filtered invoices by month and client
  const filteredInvoices = useMemo(() => {
    if (!Array.isArray(invoices)) return [];
    const [yr, mon] = selectedMonth.split('-');
    return invoices.filter(inv => {
      const dateStr = inv.invoice_date || inv.date;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      const matchMonth = d.getFullYear() === Number(yr) && (d.getMonth() + 1) === Number(mon);
      const matchClient = selectedClientId === 'all' || String(inv.customer_id) === String(selectedClientId);
      return matchMonth && matchClient;
    });
  }, [invoices, selectedMonth, selectedClientId]);

  const monthlyTotals = useMemo(() => {
    const totalAmount = filteredInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
    const count = filteredInvoices.length;
    const paid = filteredInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total_amount || 0), 0);
    const pending = filteredInvoices.filter(i => i.status === 'pending').reduce((s, i) => s + Number(i.total_amount || 0), 0);
    return { totalAmount, count, paid, pending };
  }, [filteredInvoices]);

  // Export CSV for current Sales Report (filteredInvoices)
  const handleExportSalesCsv = () => {
    const header = ['Invoice ID', 'Client', 'Date', 'Due Date', 'Status', 'Amount'];
    const rows = filteredInvoices.map(inv => [
      inv.id || inv.invoice_number || '',
      inv.customer_name || `Customer #${inv.customer_id}`,
      inv.invoice_date || '',
      inv.due_date || '',
      inv.status || '',
      Number(inv.total_amount || 0).toFixed(2),
    ]);
    const csv = [header, ...rows].map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const label = selectedClientId === 'all' ? 'all' : `client-${selectedClientId}`;
    a.download = `sales-report-${selectedMonth}-${label}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export PDF for current Sales Report (summary + table skeleton)
  const handleExportSalesPdf = () => {
    const pdf = new jsPDF();
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('Sales Report', 14, 20);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.text(`Month: ${selectedMonth}`, 14, 28);
    const clientLabel = selectedClientId === 'all' ? 'All Clients' : (customers.find(c => String(c.id) === String(selectedClientId))?.name || `Client #${selectedClientId}`);
    pdf.text(`Client: ${clientLabel}`, 14, 34);

    // Summary
    pdf.text(`Total Sales: ${numberFmt(monthlyTotals.totalAmount)}`, 14, 44);
    pdf.text(`Invoices: ${monthlyTotals.count}`, 14, 50);
    pdf.text(`Paid: ${numberFmt(monthlyTotals.paid)}`, 80, 50);
    pdf.text(`Pending: ${numberFmt(monthlyTotals.pending)}`, 140, 50);

    // Table headers
    let y = 62;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Invoice ID', 14, y);
    pdf.text('Client', 50, y);
    pdf.text('Date', 120, y);
    pdf.text('Status', 150, y);
    pdf.text('Amount', 175, y, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    y += 6;
    filteredInvoices.forEach(inv => {
      if (y > 280) {
        pdf.addPage();
        y = 20;
      }
      pdf.text(String(inv.id || inv.invoice_number || ''), 14, y);
      pdf.text(String(inv.customer_name || `Customer #${inv.customer_id}`), 50, y);
      pdf.text(String(inv.invoice_date || ''), 120, y);
      pdf.text(String(inv.status || ''), 150, y);
      pdf.text(`${Number(inv.total_amount || 0).toFixed(2)}`, 175, y, { align: 'right' });
      y += 6;
    });

    const label = selectedClientId === 'all' ? 'all' : `client-${selectedClientId}`;
    pdf.save(`sales-report-${selectedMonth}-${label}.pdf`);
  };

  return (
    <div className="reports">
      <div className="page-header">
        <div>
          <h1 className="page-title">Profit</h1>
          <p className="page-subtitle">Overall company profit and profit per client</p>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <div className="card-content" style={{ color: '#c00' }}>{error}</div>
        </div>
      )}

      {/* Summary cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-label">Overall Profit</div>
          </div>
          <div className="stat-value">{numberFmt(summary.overall_profit)}</div>
        </div>
      </div>

      {/* Sales Report (Monthly and Per-Client) */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="card-header">
          <h3>Sales Report</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: 12, opacity: 0.8 }}>Month</label>
            <input
              type="month"
              className="form-control"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
            <label style={{ fontSize: 12, opacity: 0.8 }}>Client</label>
            <select
              className="form-control"
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              style={{ minWidth: 220 }}
            >
              <option value="all">All Clients</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button className="btn btn-secondary" onClick={handleExportSalesCsv}>Export CSV</button>
            <button className="btn btn-secondary" onClick={handleExportSalesPdf}>Export PDF</button>
          </div>
        </div>
        <div className="card-content">
          {loading ? (
            <div>Loading...</div>
          ) : (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-header"><div className="stat-label">Total Sales</div></div>
                  <div className="stat-value">{numberFmt(monthlyTotals.totalAmount)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-header"><div className="stat-label">Invoices</div></div>
                  <div className="stat-value">{monthlyTotals.count}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-header"><div className="stat-label">Paid</div></div>
                  <div className="stat-value">{numberFmt(monthlyTotals.paid)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-header"><div className="stat-label">Pending</div></div>
                  <div className="stat-value">{numberFmt(monthlyTotals.pending)}</div>
                </div>
              </div>

              <div className="table-container" style={{ marginTop: '1rem' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Invoice ID</th>
                      <th>Client</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '1rem' }}>No invoices for the selected filters.</td></tr>
                    ) : (
                      filteredInvoices.map(inv => (
                        <tr key={inv.id}>
                          <td>{inv.id}</td>
                          <td>{inv.customer_name || `Customer #${inv.customer_id}`}</td>
                          <td>{inv.invoice_date}</td>
                          <td>{inv.status || 'pending'}</td>
                          <td>{numberFmt(inv.total_amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Per-client table */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="card-header">
          <h3>Profit by Client</h3>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              className="form-control"
              placeholder="Search client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 220 }}
            />
          </div>
        </div>
        <div className="card-content">
          {loading ? (
            <div>Loading...</div>
          ) : rows.length === 0 ? (
            <div>No profit data yet. Create invoices to see profit per client.</div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('customer_name')} style={{ cursor: 'pointer' }}>Client <SortIcon column="customer_name" /></th>
                    <th onClick={() => handleSort('invoice_count')} style={{ cursor: 'pointer' }}>Invoices <SortIcon column="invoice_count" /></th>
                    <th onClick={() => handleSort('revenue')} style={{ cursor: 'pointer' }}>Revenue <SortIcon column="revenue" /></th>
                    <th onClick={() => handleSort('profit')} style={{ cursor: 'pointer' }}>Profit <SortIcon column="profit" /></th>
                    <th onClick={() => handleSort('profit_margin_pct')} style={{ cursor: 'pointer' }}>Margin <SortIcon column="profit_margin_pct" /></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.customer_id}>
                      <td>{r.customer_name}</td>
                      <td>{r.invoice_count}</td>
                      <td>{numberFmt(r.revenue)}</td>
                      <td>{numberFmt(r.profit)}</td>
                      <td>{pctFmt(r.profit_margin_pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profit;
