import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaSearch, FaFilter, FaEye, FaEdit, FaTrash, FaDownload, FaPrint, FaRupeeSign } from 'react-icons/fa';
import { invoiceAPI, productAPI, paymentsAPI } from '../services/api';
import { freeInvoiceNumber, extractNumericInvoiceNumber } from '../utils/invoiceNumber';
import { downloadInvoicePDF, generateInvoicePDF } from '../utils/invoicePDF';
import './Invoices.css';
import { useNotifications } from '../contexts/NotificationContext';

const Invoices = () => {
  const { addNotification } = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [editData, setEditData] = useState({ status: 'pending', notes: '' });
  const [editItems, setEditItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setLoading(true);
        const data = await invoiceAPI.getInvoices();
        // Normalize for UI
        const normalized = (data || []).map(inv => ({
          id: inv.id?.toString?.() ?? 'N/A', // backend id used for actions
          displayId: inv.invoice_number?.toString?.() ?? inv.id?.toString?.() ?? 'N/A',
          client: inv.customer_name || `Customer #${inv.customer_id}`,
          email: inv.customer_email || '',
          amount: Number(inv.total_amount || 0),
          status: inv.status || 'pending',
          date: inv.invoice_date || '',
          dueDate: inv.due_date || '',
          items: inv.items?.length || 0,
          invoice_number: inv.invoice_number,
          customer_id: inv.customer_id,
        }));
        setInvoices(normalized);
        setError(null);
      } catch (e) {
        console.error('Failed to load invoices', e);
        setError('Failed to load invoices');
        addNotification({ type: 'error', title: 'Load Failed', message: 'Failed to load invoices.', icon: '❌', priority: 'high' });
      } finally {
        setLoading(false);
      }
    };

  const handleCreatePaymentLink = async (id) => {
    try {
      setLoading(true);
      const res = await paymentsAPI.createLink(id);
      const shortUrl = res?.payment_link?.short_url || res?.payment_link?.short_url_url || res?.payment_link?.short_url; // defensive
      if (shortUrl) {
        window.open(shortUrl, '_blank');
        addNotification({ type: 'success', title: 'Payment Link', message: 'Opened Razorpay payment link in a new tab.', icon: '💳' });
      } else {
        addNotification({ type: 'error', title: 'Payment Link Failed', message: 'Could not get payment link URL.', icon: '❌', priority: 'high' });
      }
    } catch (e) {
      console.error('Create payment link failed', e);
      addNotification({ type: 'error', title: 'Payment Link Failed', message: 'Failed to create payment link.', icon: '❌', priority: 'high' });
    } finally {
      setLoading(false);
    }
  };

    loadInvoices();
    // Preload products for editing
    (async () => {
      try {
        const prodData = await productAPI.getProducts({ page: 1, per_page: 200 });
        const arr = Array.isArray(prodData) ? prodData : (prodData.products || []);
        setProducts(arr);
      } catch (e) {
        // non-blocking
      }
    })();
  }, []);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'paid': return 'status-paid';
      case 'pending': return 'status-pending';
      case 'overdue': return 'status-overdue';
      case 'draft': return 'status-draft';
      default: return 'status-draft';
    }
  };

  const addEditItem = () => {
    setEditItems(prev => ([...prev, { productId: '', description: '', quantity: 1, rate: 0, amount: 0 }]));
  };

  const removeEditItem = (index) => {
    setEditItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateEditItem = (index, field, value) => {
    setEditItems(prev => {
      const items = [...prev];
      items[index][field] = value;
      if (field === 'productId' && value) {
        const p = products.find(pr => pr.id === parseInt(value));
        if (p) {
          items[index].description = p.name;
          items[index].rate = Number(p.price);
        }
      }
      if (['productId', 'quantity', 'rate'].includes(field)) {
        const q = parseInt(items[index].quantity) || 0;
        const r = parseFloat(items[index].rate) || 0;
        items[index].amount = q * r;
      }
      return items;
    });
  };

  const editSubtotal = editItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  const editTax = editSubtotal * 0.18;
  const editTotal = editSubtotal + editTax;

  const requestDelete = (inv) => {
    setSelectedInvoice(inv);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedInvoice) return;
    try {
      setLoading(true);
      // Prevent deleting paid invoices (should already be disabled in UI)
      if (selectedInvoice.status === 'paid') {
        addNotification({ type: 'info', title: 'Delete Not Allowed', message: 'Paid invoices cannot be deleted.', icon: 'ℹ️' });
        setLoading(false);
        return;
      }

      // Fetch full invoice and store to Deleted Invoices (localStorage)
      try {
        const full = await invoiceAPI.getInvoice(selectedInvoice.id);
        const existing = JSON.parse(localStorage.getItem('deletedInvoices') || '[]');
        existing.push({ ...full, deleted_at: new Date().toISOString() });
        localStorage.setItem('deletedInvoices', JSON.stringify(existing));
      } catch {
        // fallback to minimal info if fetch fails
        try {
          const existing = JSON.parse(localStorage.getItem('deletedInvoices') || '[]');
          existing.push({ ...selectedInvoice, deleted_at: new Date().toISOString() });
          localStorage.setItem('deletedInvoices', JSON.stringify(existing));
        } catch {}
      }

      // Free its invoice number for reuse
      const num = extractNumericInvoiceNumber(selectedInvoice);
      if (Number.isFinite(num)) {
        freeInvoiceNumber(num);
      }

      // Delete via backend
      await invoiceAPI.deleteInvoice(selectedInvoice.id);
      const data = await invoiceAPI.getInvoices();
      const normalized = (data || []).map(inv => ({
        id: inv.id?.toString?.() ?? 'N/A',
        displayId: inv.invoice_number?.toString?.() ?? inv.id?.toString?.() ?? 'N/A',
        client: inv.customer_name || `Customer #${inv.customer_id}`,
        email: inv.customer_email || '',
        amount: Number(inv.total_amount || 0),
        status: inv.status || 'pending',
        date: inv.invoice_date || '',
        dueDate: inv.due_date || '',
        items: inv.items?.length || 0,
        invoice_number: inv.invoice_number,
        customer_id: inv.customer_id,
      }));
      setInvoices(normalized);
      setShowDeleteModal(false);
      setSelectedInvoice(null);
      addNotification({ type: 'success', title: 'Invoice Deleted', message: `Invoice #${selectedInvoice.displayId} deleted successfully.`, icon: '🗑️' });
    } catch (e) {
      console.error('Failed to delete invoice', e);
      addNotification({ type: 'error', title: 'Delete Failed', message: 'Failed to delete invoice.', icon: '❌', priority: 'high' });
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

  const totalRevenue = filteredInvoices
    .filter(invoice => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + invoice.amount, 0);

  const pendingAmount = filteredInvoices
    .filter(invoice => invoice.status === 'pending')
    .reduce((sum, invoice) => sum + invoice.amount, 0);

  const openView = async (id) => {
    try {
      setLoading(true);
      const full = await invoiceAPI.getInvoice(id);
      setSelectedInvoice(full);
      setViewModalOpen(true);
    } catch (e) {
      console.error('Failed to load invoice', e);
      addNotification({ type: 'error', title: 'Load Failed', message: 'Failed to load invoice details.', icon: '❌', priority: 'high' });
    } finally {
      setLoading(false);
    }
  };

  const openEdit = async (id) => {
    try {
      setLoading(true);
      const full = await invoiceAPI.getInvoice(id);
      setSelectedInvoice(full);
      setEditData({ status: full.status || 'pending', notes: full.notes || '' });
      setEditItems((full.items || []).map(it => ({
        productId: it.product_id,
        description: it.product_name || `Product #${it.product_id}`,
        quantity: it.quantity,
        rate: Number(it.unit_price),
        amount: Number(it.total_price)
      })));
      setEditModalOpen(true);
    } catch (e) {
      console.error('Failed to load invoice for edit', e);
      addNotification({ type: 'error', title: 'Load Failed', message: 'Failed to load invoice for edit.', icon: '❌', priority: 'high' });
    } finally {
      setLoading(false);
    }
  };

  const confirmEdit = async () => {
    if (!selectedInvoice) return;
    try {
      setLoading(true);
      const payload = {
        status: editData.status,
        notes: editData.notes,
        items: editItems
          .filter(item => item.productId)
          .map(item => ({
            product_id: parseInt(item.productId),
            quantity: parseInt(item.quantity),
            unit_price: parseFloat(item.rate)
          }))
      };
      await invoiceAPI.updateInvoice(selectedInvoice.id, payload);
      // refresh list
      const data = await invoiceAPI.getInvoices();
      const normalized = (data || []).map(inv => ({
        id: inv.id?.toString?.() ?? inv.invoice_number ?? 'N/A',
        client: inv.customer_name || `Customer #${inv.customer_id}`,
        email: inv.customer_email || '',
        amount: Number(inv.total_amount || 0),
        status: inv.status || 'pending',
        date: inv.invoice_date || '',
        dueDate: inv.due_date || '',
        items: inv.items?.length || 0,
      }));
      setInvoices(normalized);
      setEditModalOpen(false);
      setSelectedInvoice(null);
    } catch (e) {
      console.error('Failed to update invoice', e);
      addNotification({ type: 'error', title: 'Update Failed', message: 'Failed to update invoice.', icon: '❌', priority: 'high' });
    } finally {
      setLoading(false);
    }
  };

  const toPDFModel = (invFull) => {
    return {
      client: invFull.customer_name || `Customer #${invFull.customer_id}`,
      email: invFull.customer_email || '',
      address: invFull.customer_address || '',
      invoiceNumber: invFull.invoice_number,
      invoiceDate: invFull.invoice_date,
      dueDate: invFull.due_date || '',
      notes: invFull.notes || '',
      items: (invFull.items || []).map(it => ({
        description: it.product_name || `Product #${it.product_id}`,
        quantity: it.quantity,
        rate: it.unit_price,
        amount: it.total_price,
      }))
    };
  };

  const handleDownload = async (id) => {
    try {
      setLoading(true);
      const full = await invoiceAPI.getInvoice(id);
      await downloadInvoicePDF(toPDFModel(full));
    } catch (e) {
      console.error('Failed to download PDF', e);
      addNotification({ type: 'error', title: 'Download Failed', message: 'Failed to download invoice PDF.', icon: '❌', priority: 'high' });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async (id) => {
    try {
      setLoading(true);
      const full = await invoiceAPI.getInvoice(id);
      const pdf = await generateInvoicePDF(toPDFModel(full));
      const blobUrl = URL.createObjectURL(pdf.output('blob'));
      const win = window.open(blobUrl);
      if (win) {
        win.onload = () => win.print();
      }
    } catch (e) {
      console.error('Failed to print PDF', e);
      addNotification({ type: 'error', title: 'Print Failed', message: 'Failed to print invoice.', icon: '❌', priority: 'high' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="invoices">
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">Manage your office supplies invoices and billing</p>
        </div>
        <Link to="/create-invoice" className="btn btn-primary">
          <FaPlus /> Create Invoice
        </Link>
      </div>

      {error && (
        <div className="error-container" style={{ padding: '1rem', color: 'red' }}>{error}</div>
      )}
      {loading && (
        <div className="loading-container" style={{ padding: '1rem' }}>Loading invoices...</div>
      )}

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-icon">
            <FaRupeeSign />
          </div>
          <div className="summary-info">
            <div className="summary-value">₹{totalRevenue.toLocaleString()}</div>
            <div className="summary-label">Total Revenue</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">
            <FaRupeeSign />
          </div>
          <div className="summary-info">
            <div className="summary-value">₹{pendingAmount.toLocaleString()}</div>
            <div className="summary-label">Pending Amount</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-info">
            <div className="summary-value">{filteredInvoices.length}</div>
            <div className="summary-label">Total Invoices</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search invoices by client or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-group">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="draft">Draft</option>
          </select>
          
          <select 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Client</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Date</th>
              <th>Due Date</th>
              <th>Items</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedInvoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>
                  <Link to={`/invoices/${invoice.id}`} className="invoice-link">
                    {invoice.displayId}
                  </Link>
                </td>
                <td>
                  <div className="client-info">
                    <div className="client-name">{invoice.client}</div>
                    <div className="client-email">{invoice.email}</div>
                  </div>
                </td>
                <td className="amount">₹{invoice.amount.toLocaleString()}</td>
                <td>
                  <span className={`status-badge ${getStatusBadgeClass(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </td>
                <td>{invoice.date}</td>
                <td>{invoice.dueDate}</td>
                <td>{invoice.items}</td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-icon primary" title="View" onClick={() => openView(invoice.id)}>
                      <FaEye />
                    </button>
                    <button className="btn-icon" title="Edit" onClick={() => openEdit(invoice.id)}>
                      <FaEdit />
                    </button>
                    <button className="btn-icon" title="Download" onClick={() => handleDownload(invoice.id)}>
                      <FaDownload />
                    </button>
                    <button className="btn-icon" title="Print" onClick={() => handlePrint(invoice.id)}>
                      <FaPrint />
                    </button>
                    <button className="btn-icon" title="Pay (Create Link)" onClick={() => handleCreatePaymentLink(invoice.id)}>
                      <FaRupeeSign />
                    </button>
                    {/* Payment removed */}
                    <button className="btn-icon danger" title={invoice.status === 'paid' ? 'Cannot delete paid invoice' : 'Delete'} onClick={() => invoice.status !== 'paid' && requestDelete(invoice)} disabled={invoice.status === 'paid'}>
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View Invoice Modal */}
      {viewModalOpen && selectedInvoice && (
        <div className="modal-overlay" onClick={() => setViewModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Invoice #{selectedInvoice.invoice_number}</h3>
              <button className="modal-close" onClick={() => setViewModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="invoice-details">
                <div className="detail-row"><strong>Client:</strong> {selectedInvoice.customer_name}</div>
                <div className="detail-row"><strong>Email:</strong> {selectedInvoice.customer_email || '-'}</div>
                <div className="detail-row"><strong>Date:</strong> {selectedInvoice.invoice_date}</div>
                <div className="detail-row"><strong>Due Date:</strong> {selectedInvoice.due_date || '-'}</div>
                <div className="detail-row"><strong>Status:</strong> {selectedInvoice.status}</div>
                <div className="detail-row"><strong>Notes:</strong> {selectedInvoice.notes || '-'}</div>
                <div className="detail-row"><strong>Total:</strong> ₹{Number(selectedInvoice.total_amount || 0).toLocaleString()}</div>
              </div>
              <div className="items-table" style={{ marginTop: '1rem' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Rate</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedInvoice.items || []).map(item => (
                      <tr key={item.id}>
                        <td>{item.product_name}</td>
                        <td>{item.quantity}</td>
                        <td>₹{Number(item.unit_price).toLocaleString()}</td>
                        <td>₹{Number(item.total_price).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setViewModalOpen(false)}>Close</button>
              <button className="btn" onClick={() => handleDownload(selectedInvoice.id)}><FaDownload /> Download</button>
              <button className="btn" onClick={() => handlePrint(selectedInvoice.id)}><FaPrint /> Print</button>
              <button className="btn btn-primary" onClick={() => handleCreatePaymentLink(selectedInvoice.id)}><FaRupeeSign /> Pay (Link)</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {editModalOpen && selectedInvoice && (
        <div className="modal-overlay" onClick={() => setEditModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Invoice #{selectedInvoice.invoice_number}</h3>
              <button className="modal-close" onClick={() => setEditModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    className="form-control"
                    value={editData.status}
                    onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={editData.notes}
                  onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div className="items-table" style={{ marginTop: '1rem' }}>
                <div className="items-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4>Items</h4>
                  <button className="btn btn-secondary" type="button" onClick={addEditItem}>+ Add Item</button>
                </div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Rate (₹)</th>
                      <th>Amount (₹)</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editItems.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <select
                            className="form-control"
                            value={item.productId}
                            onChange={(e) => updateEditItem(idx, 'productId', e.target.value)}
                          >
                            <option value="">Select Product</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name} - ₹{Number(p.price).toFixed(2)}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateEditItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) => updateEditItem(idx, 'rate', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td>
                          <input type="number" readOnly className="form-control" value={Number(item.amount).toFixed(2)} />
                        </td>
                        <td>
                          <button className="btn btn-danger" type="button" onClick={() => removeEditItem(idx)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="invoice-summary" style={{ textAlign: 'right' }}>
                  <div>Subtotal: ₹{editSubtotal.toFixed(2)}</div>
                  <div>Tax (18%): ₹{editTax.toFixed(2)}</div>
                  <div style={{ fontWeight: 'bold' }}>Total: ₹{editTotal.toFixed(2)}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmEdit}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedInvoice && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Invoice</h3>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>×</button>
            </div>
            <div className="modal-body">
              Are you sure you want to delete invoice #{selectedInvoice.invoice_number}?
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="pagination">
        <div className="pagination-info">
          Showing {paginatedInvoices.length} of {filteredInvoices.length} filtered invoices (Total: {invoices.length})
        </div>
        <div className="pagination-controls">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={safePage <= 1}
          >
            Previous
          </button>
          <span className="pagination-current">Page {safePage} of {totalPages}</span>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Invoices;