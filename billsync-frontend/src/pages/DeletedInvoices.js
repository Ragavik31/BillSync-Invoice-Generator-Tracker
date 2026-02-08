import React, { useEffect, useState } from 'react';
import { invoiceAPI } from '../services/api';
import { reserveInvoiceNumber, extractNumericInvoiceNumber } from '../utils/invoiceNumber';
import './Invoices.css';
import { useNotifications } from '../contexts/NotificationContext';

const DeletedInvoices = () => {
  const { addNotification } = useNotifications();
  const [deleted, setDeleted] = useState([]);

  useEffect(() => {
    try {
      const arr = JSON.parse(localStorage.getItem('deletedInvoices') || '[]');
      setDeleted(Array.isArray(arr) ? arr : []);
    } catch {
      setDeleted([]);
    }
  }, []);

  const restoreInvoice = async (inv) => {
    try {
      // Reserve its number to avoid being consumed by another creation concurrently
      const num = extractNumericInvoiceNumber(inv);
      if (Number.isFinite(num)) reserveInvoiceNumber(num);

      const payload = {
        customer_id: inv.customer_id,
        invoice_number: inv.invoice_number ?? undefined,
        invoice_date: inv.invoice_date,
        due_date: inv.due_date || null,
        notes: inv.notes || '',
        items: (inv.items || []).map(it => ({
          product_id: it.product_id,
          quantity: it.quantity,
          unit_price: it.unit_price ?? it.rate ?? 0,
        })),
      };
      await invoiceAPI.createInvoice(payload);

      // Remove from archive
      const arr = JSON.parse(localStorage.getItem('deletedInvoices') || '[]');
      const next = arr.filter(x => (x.invoice_number ?? x.id) !== (inv.invoice_number ?? inv.id));
      localStorage.setItem('deletedInvoices', JSON.stringify(next));
      setDeleted(next);
      addNotification({ type: 'success', title: 'Invoice Restored', message: `Invoice #${inv.invoice_number ?? inv.id} restored successfully.`, icon: '✅' });
    } catch (e) {
      console.error('Restore failed', e);
      addNotification({ type: 'error', title: 'Restore Failed', message: 'Failed to restore invoice.', icon: '❌', priority: 'high' });
    }
  };

  return (
    <div className="invoices">
      <div className="page-header">
        <div>
          <h1 className="page-title">Deleted Invoices</h1>
          <p className="page-subtitle">Archive of invoices removed from the system. Numbers are returned to the pool for reuse.</p>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Client</th>
              <th>Date</th>
              <th>Status</th>
              <th>Total</th>
              <th>Deleted At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {deleted.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '1rem' }}>No deleted invoices.</td>
              </tr>
            ) : (
              deleted.map((inv, idx) => (
                <tr key={(inv.invoice_number || inv.id || 'inv') + '-' + idx}>
                  <td>{inv.invoice_number ?? inv.id}</td>
                  <td>{inv.client || inv.customer_name || `Customer #${inv.customer_id}`}</td>
                  <td>{inv.date || inv.invoice_date}</td>
                  <td>{inv.status}</td>
                  <td>{typeof inv.amount === 'number' ? inv.amount : inv.total_amount}</td>
                  <td>{inv.deleted_at}</td>
                  <td><button className="btn btn-primary" onClick={() => restoreInvoice(inv)}>Restore</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DeletedInvoices;
