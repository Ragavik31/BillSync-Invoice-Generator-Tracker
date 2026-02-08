import React from 'react';
import { FaFilePdf, FaFileExcel } from 'react-icons/fa';
import './Reports.css';

const Reports = () => {
  const exportReport = (format) => {
    alert(`No reports available to export yet.`);
  };

  return (
    <div className="reports">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Generate and analyze business reports for your office supplies</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={() => exportReport('pdf')}>
            <FaFilePdf /> Export PDF
          </button>
          <button className="btn btn-outline" onClick={() => exportReport('excel')}>
            <FaFileExcel /> Export Excel
          </button>
        </div>
      </div>

      {/* Empty State */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="card-content" style={{ textAlign: 'center', padding: '2rem' }}>
          <h3>No reports available</h3>
          <p>Once you start generating invoices and data accumulates, reports will appear here.</p>
        </div>
      </div>
    </div>
  );
};

export default Reports;