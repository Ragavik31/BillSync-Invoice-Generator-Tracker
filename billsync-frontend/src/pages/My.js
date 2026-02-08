import React, { useEffect, useMemo, useState } from 'react';
import { invoiceAPI, productAPI } from '../services/api';
import { FaExclamationTriangle, FaRupeeSign, FaCheckCircle } from 'react-icons/fa';
import './My.css';

const daysUntil = (iso) => {
  if (!iso) return null;
  const today = new Date();
  const due = new Date(iso);
  const ms = due.setHours(0,0,0,0) - today.setHours(0,0,0,0);
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
};

const My = () => {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [inv, prod] = await Promise.all([
          invoiceAPI.getInvoices(),
          productAPI.getProducts({ page: 1, per_page: 100 })
        ]);
        setInvoices(inv || []);
        const arr = Array.isArray(prod) ? prod : (prod.products || []);
        setProducts(arr);
      } catch (e) {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const decoratedInvoices = useMemo(() => {
    return (invoices || []).map(inv => {
      const d = inv.due_date;
      const du = daysUntil(d);
      let dueStatus = 'none';
      if (inv.status !== 'paid' && d) {
        if (du < 0) dueStatus = 'overdue';
        else if (du <= 7) dueStatus = 'due-soon';
      }
      return { ...inv, dueInDays: du, dueStatus };
    });
  }, [invoices]);

  if (loading) return <div style={{ padding: '1rem' }}>Loading your data...</div>;
  if (error) return <div style={{ padding: '1rem', color: 'red' }}>{error}</div>;

  return (
    <div className="my-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Account</h1>
          <p className="page-subtitle">Signed in as {user?.email}</p>
        </div>
      </div>

      <div className="my-grid">
        <div className="my-card">
          <div className="card-header">
            <h3>My Invoices</h3>
          </div>
          <div className="card-content">
            {decoratedInvoices.length === 0 ? (
              <div className="empty">No invoices found.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Client</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Due Date</th>
                    <th>Reminder</th>
                  </tr>
                </thead>
                <tbody>
                  {decoratedInvoices.map(inv => (
                    <tr key={inv.id}>
                      <td>{inv.invoice_number}</td>
                      <td>{inv.customer_name || `Customer #${inv.customer_id}`}</td>
                      <td>₹{Number(inv.total_amount || 0).toLocaleString()}</td>
                      <td>
                        <span className={`status-badge ${inv.status === 'paid' ? 'status-paid' : inv.status === 'overdue' ? 'status-overdue' : 'status-pending'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td>{inv.due_date || '-'}</td>
                      <td>
                        {inv.status === 'paid' ? (
                          <span className="rem-badge rem-paid"><FaCheckCircle /> Paid</span>
                        ) : inv.dueStatus === 'overdue' ? (
                          <span className="rem-badge rem-overdue"><FaExclamationTriangle /> Overdue by {Math.abs(inv.dueInDays)} day(s)</span>
                        ) : inv.dueStatus === 'due-soon' ? (
                          <span className="rem-badge rem-soon">Due in {inv.dueInDays} day(s)</span>
                        ) : (
                          <span className="rem-badge">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="my-card">
          <div className="card-header">
            <h3>Available Products</h3>
          </div>
          <div className="card-content">
            {products.length === 0 ? (
              <div className="empty">No products available.</div>
            ) : (
              <div className="product-grid">
                {products.map(p => (
                  <div key={p.id} className={`product-card ${p.stock_quantity === 0 ? 'disabled' : ''}`}>
                    <div className="product-name">{p.name}</div>
                    <div className="product-sku">{p.sku}</div>
                    <div className="product-price"><FaRupeeSign /> {Number(p.price).toFixed(2)}</div>
                    <div className="product-stock">Stock: {p.stock_quantity} (Min {p.min_stock_level})</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default My;
