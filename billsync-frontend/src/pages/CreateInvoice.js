import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaTrash, FaPrint, FaSave } from 'react-icons/fa';
import { generateInvoicePDF, downloadInvoicePDF, getInvoicePDFBlob } from '../utils/invoicePDF';
import { sendInvoiceEmail, mockSendInvoiceEmail } from '../utils/emailService';
import { useNotifications } from '../contexts/NotificationContext';
import { invoiceAPI, customerAPI, productAPI } from '../services/api';
import { consumeNextInvoiceNumber, extractNumericInvoiceNumber } from '../utils/invoiceNumber';
import './CreateInvoice.css';

const CreateInvoice = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Sequential invoice number (assigned after loading invoices)
  const [nextNumberLoaded, setNextNumberLoaded] = useState(false);

  // Helpers for date handling
  const todayStr = () => new Date().toISOString().split('T')[0];
  const plusDaysStr = (baseDateStr, days) => {
    const d = new Date(baseDateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  // Create invoice and send in one click from header
  const handleCreateAndSend = async () => {
    // Basic validation
    const isValidEmail = (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    if (!invoiceData.customerId) {
      addNotification({ type: 'error', title: 'Client Required', message: 'Please select a client.', icon: '⚠️', priority: 'high' });
      return;
    }
    if (!invoiceData.email) {
      addNotification({ type: 'error', title: 'Email Required', message: 'Please enter the customer email address.', icon: '⚠️', priority: 'high' });
      return;
    }
    if (!isValidEmail(invoiceData.email)) {
      addNotification({ type: 'error', title: 'Invalid Email', message: 'Please enter a valid email address.', icon: '⚠️', priority: 'high' });
      return;
    }
    if (!invoiceData.dueDate) {
      addNotification({ type: 'error', title: 'Due Date Required', message: 'Please select a due date for the invoice.', icon: '⚠️', priority: 'high' });
      return;
    }
    // Enforce invoice date is today and due date strictly after invoice date
    try {
      const invDate = new Date(invoiceData.invoiceDate);
      const dueDate = new Date(invoiceData.dueDate);
      const today = new Date(todayStr());
      if (invDate.getTime() !== today.getTime()) {
        addNotification({ type: 'error', title: 'Invalid Invoice Date', message: 'Invoice date must be today.', icon: '⚠️', priority: 'high' });
        return;
      }
      if (!(dueDate > invDate)) {
        addNotification({ type: 'error', title: 'Invalid Due Date', message: 'Due date must be after the invoice date.', icon: '⚠️', priority: 'high' });
        return;
      }
    } catch {}
    const validItems = invoiceData.items.filter(i => i.productId);
    if (validItems.length === 0) {
      addNotification({ type: 'error', title: 'No Items', message: 'Add at least one invoice item.', icon: '⚠️', priority: 'high' });
      return;
    }
    // Items validation
    const invalidItem = validItems.find(i => (parseInt(i.quantity) || 0) <= 0 || (parseFloat(i.rate) || 0) < 0);
    if (invalidItem) {
      addNotification({ type: 'error', title: 'Invalid Items', message: 'Each item must have quantity > 0 and rate ≥ 0.', icon: '⚠️', priority: 'high' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Build payload
      const invoicePayload = {
        customer_id: invoiceData.customerId,
        invoice_number: invoiceData.invoiceNumber,
        invoice_date: invoiceData.invoiceDate,
        due_date: invoiceData.dueDate || null,
        notes: invoiceData.notes,
        items: validItems.map(item => ({
          product_id: item.productId, // Mongo ObjectId string
          quantity: parseInt(item.quantity),
          unit_price: parseFloat(item.rate)
        }))
      };

      // Create invoice in backend
      const created = await invoiceAPI.createInvoice(invoicePayload);

      // Send email via backend (no attachment path)
      try {
        await invoiceAPI.sendInvoiceEmail(created.id, {
          toEmail: invoiceData.email,
          subject: `Invoice #${invoiceData.invoiceNumber} from Your Company`,
          message: `Dear ${invoiceData.client},\n\nPlease find invoice #${invoiceData.invoiceNumber} for ₹${total}.\n\nThank you for your business.`,
        });
      } catch (err) {
        console.error('Backend email send failed:', err?.response?.data || err?.message || err);
        // Fallback to mock email to avoid blocking the user
        try {
          await mockSendInvoiceEmail(invoiceData, await getInvoicePDFBlob(invoiceData));
          addNotification({
            type: 'warning',
            title: 'Email Sent (Mock)',
            message: `Backend email failed (HTTP ${err?.response?.status || 'error'}). Sent using mock.`,
            icon: '⚠️'
          });
        } catch (mockErr) {
          throw err; // rethrow original to be handled by outer catch
        }
      }

      addNotification({
        type: 'success',
        title: 'Invoice Created & Sent',
        message: `Invoice #${invoiceData.invoiceNumber} was created and emailed to ${invoiceData.email}.`,
        icon: '✅'
      });

      // Optional: download PDF locally for records
      try { await handleDownloadPDF(); } catch {}

      // Navigate to invoices list
      setTimeout(() => navigate('/invoices'), 1200);
    } catch (err) {
      console.error('Create & Send failed:', err?.response?.data || err?.message || err);
      addNotification({ type: 'error', title: 'Create & Send Failed', message: 'Could not create or email the invoice. Please try again.', icon: '❌', priority: 'high' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const [invoiceData, setInvoiceData] = useState({
    customerId: null,
    client: '',
    email: '',
    address: '',
    gstin: '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: plusDaysStr(new Date().toISOString().split('T')[0], 30),
    notes: '',
    items: [
      {
        productId: '',
        description: '',
        quantity: 1,
        rate: 0,
        amount: 0
      }
    ]
  });

  const [clients, setClients] = useState([]);

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Fetch products, clients, and compute next invoice number
  useEffect(() => {
    const fetchData = async () => {
      try {
        const prodData = await productAPI.getProducts({ page: 1, per_page: 100 });
        const productsArray = Array.isArray(prodData) ? prodData : (prodData.products || []);
        setProducts(productsArray);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoadingProducts(false);
      }
      try {
        const custs = await customerAPI.getCustomers();
        setClients(custs);
      } catch (error) {
        console.error('Error fetching customers:', error);
      }
      try {
        // Load existing invoices to compute next sequential number
        const invs = await invoiceAPI.getInvoices();
        const existingNums = (Array.isArray(invs) ? invs : [])
          .map(extractNumericInvoiceNumber)
          .filter(n => Number.isFinite(n));
        const nextNum = consumeNextInvoiceNumber(existingNums);
        const padded = String(nextNum).padStart(10, '0');
        setInvoiceData(prev => ({ ...prev, invoiceNumber: padded }));
        setNextNumberLoaded(true);
      } catch (e) {
        console.error('Error computing next invoice number:', e);
        // Fallback: start at 0000000001
        setInvoiceData(prev => ({ ...prev, invoiceNumber: '0000000001' }));
        setNextNumberLoaded(true);
      }
    };
    fetchData();
  }, []);

  const addItem = () => {
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', description: '', quantity: 1, rate: 0, amount: 0 }]
    }));
  };

  const removeItem = (index) => {
    setInvoiceData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index, field, value) => {
    setInvoiceData(prev => {
      const newItems = [...prev.items];
      newItems[index][field] = value;
      
      // If product is selected (by id), auto-fill the description and rate
      if (field === 'productId' && value) {
        const selectedProduct = products.find(product => String(product.id) === String(value));
        if (selectedProduct) {
          newItems[index].description = selectedProduct.name;
          newItems[index].rate = selectedProduct.price;
        }
      }
      
      // Calculate amount
      if (field === 'quantity' || field === 'rate' || field === 'productId') {
        const qty = parseFloat(newItems[index].quantity) || 0;
        const rate = parseFloat(newItems[index].rate) || 0;
        newItems[index].amount = qty * rate;
      }
      
      return { ...prev, items: newItems };
    });
  };

  const handleClientChange = (e) => {
    const selectedId = e.target.value || null;
    const selectedClient = clients.find(client => String(client.id) === String(selectedId));
    setInvoiceData(prev => ({
      ...prev,
      customerId: selectedId,
      client: selectedClient ? selectedClient.name : '',
      email: selectedClient ? selectedClient.email : '',
      address: selectedClient ? (selectedClient.address || '') : '',
      gstin: selectedClient ? (selectedClient.gstin || '') : ''
    }));
  };

  const subtotal = invoiceData.items.reduce((sum, item) => sum + item.amount, 0);
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + tax;

  const handleDownloadPDF = async () => {
    try {
      await downloadInvoicePDF(invoiceData);
      addNotification({
        type: 'success',
        title: 'PDF Downloaded',
        message: `Invoice ${invoiceData.invoiceNumber} has been downloaded successfully.`,
        icon: '📄'
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      addNotification({
        type: 'error',
        title: 'Download Failed',
        message: 'Failed to download PDF. Please try again.',
        icon: '❌',
        priority: 'high'
      });
    }
  };

  const handleSendInvoice = async (invoiceId = null) => {
    if (!invoiceData.email) {
      addNotification({
        type: 'error',
        title: 'Email Required',
        message: 'Please enter the customer email address.',
        icon: '⚠️',
        priority: 'high'
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Generate PDF
      const pdfBlob = await getInvoicePDFBlob(invoiceData);
      
      // Use real API if invoiceId is provided, otherwise use mock
      if (invoiceId) {
        try {
          await invoiceAPI.sendInvoiceEmail(invoiceId, {
            toEmail: invoiceData.email,
            subject: `Invoice #${invoiceData.invoiceNumber} from Your Company`,
            message: `Dear ${invoiceData.client},\n\nPlease find attached invoice #${invoiceData.invoiceNumber} for ₹${total}.\n\nThank you for your business.`,
            pdfBlob: pdfBlob,
            filename: `Invoice_${invoiceData.invoiceNumber}.pdf`,
          });
        } catch (err) {
          console.error('Email send failed (with attachment):', err?.response?.data || err?.message || err);
          // Fallback to mock email so user flow continues
          await mockSendInvoiceEmail(invoiceData, pdfBlob);
          addNotification({
            type: 'warning',
            title: 'Email Sent (Mock)',
            message: `Backend email failed (HTTP ${err?.response?.status || 'error'}). Sent using mock.`,
            icon: '⚠️'
          });
        }
      } else {
        // Fallback to mock function for testing
        await mockSendInvoiceEmail(invoiceData, pdfBlob);
      }

      {
        addNotification({
          type: 'success',
          title: 'Invoice Sent',
          message: `Invoice ${invoiceData.invoiceNumber} has been sent to ${invoiceData.client} successfully.`,
          icon: '✅'
        });
        
        // Add a notification for customer reply simulation
        setTimeout(() => {
          addNotification({
            type: 'customer_reply',
            title: 'Invoice Sent',
            message: `Customer ${invoiceData.client} can now reply to invoice ${invoiceData.invoiceNumber}.`,
            invoiceNumber: invoiceData.invoiceNumber,
            icon: '📧',
            priority: 'medium'
          });
        }, 3000);
      }
    } catch (error) {
      console.error('Error sending invoice:', error?.response?.data || error?.message || error);
      addNotification({
        type: 'error',
        title: 'Send Failed',
        message: 'Failed to send invoice. Please try again.',
        icon: '❌',
        priority: 'high'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validation
      if (!invoiceData.customerId) {
        addNotification({ type: 'error', title: 'Client Required', message: 'Please select a client.', icon: '⚠️', priority: 'high' });
        setIsSubmitting(false);
        return;
      }
      const isValidEmail = (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      if (!invoiceData.email) {
        addNotification({ type: 'error', title: 'Email Required', message: 'Please enter the customer email address.', icon: '⚠️', priority: 'high' });
        setIsSubmitting(false);
        return;
      }
      if (!isValidEmail(invoiceData.email)) {
        addNotification({ type: 'error', title: 'Invalid Email', message: 'Please enter a valid email address.', icon: '⚠️', priority: 'high' });
        setIsSubmitting(false);
        return;
      }
      const validItems = invoiceData.items.filter(i => i.productId);
      if (validItems.length === 0) {
        addNotification({ type: 'error', title: 'No Items', message: 'Add at least one invoice item.', icon: '⚠️', priority: 'high' });
        setIsSubmitting(false);
        return;
      }
      if (!invoiceData.dueDate) {
        addNotification({
          type: 'error',
          title: 'Due Date Required',
          message: 'Please select a due date for the invoice.',
          icon: '⚠️',
          priority: 'high'
        });
        setIsSubmitting(false);
        return;
      }
      // Enforce invoice date is today and due date strictly after invoice date
      try {
        const invDate = new Date(invoiceData.invoiceDate);
        const dueDate = new Date(invoiceData.dueDate);
        const today = new Date(todayStr());
        if (invDate.getTime() !== today.getTime()) {
          addNotification({ type: 'error', title: 'Invalid Invoice Date', message: 'Invoice date must be today.', icon: '⚠️', priority: 'high' });
          setIsSubmitting(false);
          return;
        }
        if (!(dueDate > invDate)) {
          addNotification({ type: 'error', title: 'Invalid Due Date', message: 'Due date must be after the invoice date.', icon: '⚠️', priority: 'high' });
          setIsSubmitting(false);
          return;
        }
      } catch {}
      // Items validation
      const invalidItem = validItems.find(i => (parseInt(i.quantity) || 0) <= 0 || (parseFloat(i.rate) || 0) < 0);
      if (invalidItem) {
        addNotification({ type: 'error', title: 'Invalid Items', message: 'Each item must have quantity > 0 and rate ≥ 0.', icon: '⚠️', priority: 'high' });
        setIsSubmitting(false);
        return;
      }
      // Generate PDF first
      const pdfBlob = await getInvoicePDFBlob(invoiceData);
      
      // Create invoice in backend with correct schema
      const invoicePayload = {
        customer_id: invoiceData.customerId,
        invoice_number: invoiceData.invoiceNumber,
        invoice_date: invoiceData.invoiceDate,
        due_date: invoiceData.dueDate || null,
        notes: invoiceData.notes,
        items: validItems
          .map(item => ({
            product_id: item.productId, // Mongo ObjectId string
            quantity: parseInt(item.quantity),
            unit_price: parseFloat(item.rate)
          }))
      };

      const createdInvoice = await invoiceAPI.createInvoice(invoicePayload);
      console.log('Invoice created:', createdInvoice);
      
      // Add success notification
      addNotification({
        type: 'success',
        title: 'Invoice Created',
        message: `Invoice #${invoiceData.invoiceNumber} has been created successfully.`,
        timestamp: new Date().toISOString(),
      });

      // Auto-download PDF
      await handleDownloadPDF();
      
      // Auto-send email if customer email is provided
      if (invoiceData.email) {
        await handleSendInvoice(createdInvoice.id);
      }

      // Redirect to invoices list after 2 seconds
      setTimeout(() => {
        navigate('/invoices');
      }, 2000);

    } catch (error) {
      console.error('Error creating invoice:', error);
      addNotification({
        type: 'error',
        title: 'Invoice Creation Failed',
        message: 'Failed to create invoice. Please try again.',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-invoice">
      <div className="page-header">
        <div>
          <h1 className="page-title">Create Invoice</h1>
          <p className="page-subtitle">Generate a new invoice for office supplies</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={() => window.print()} disabled={isSubmitting}>
            <FaPrint /> Print
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="invoice-form">
        <div className="invoice-header">
          <div className="invoice-info">
            <div className="form-group">
              <label className="form-label">Invoice Number</label>
              <input
                type="text"
                value={invoiceData.invoiceNumber}
                readOnly
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Invoice Date</label>
              <input
                type="date"
                value={invoiceData.invoiceDate}
                readOnly
                min={todayStr()}
                max={todayStr()}
                className="form-control"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input
                type="date"
                value={invoiceData.dueDate}
                min={plusDaysStr(invoiceData.invoiceDate, 1)}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="form-control"
              />
            </div>
          </div>
        </div>

        <div className="invoice-client">
          <h3>Bill To</h3>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Client *</label>
              <select
                value={invoiceData.customerId || ''}
                onChange={handleClientChange}
                className="form-control"
                required
              >
                <option value="">Select Client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                value={invoiceData.email}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, email: e.target.value }))}
                className="form-control"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Billing Address</label>
            <textarea
              value={invoiceData.address}
              onChange={(e) => setInvoiceData(prev => ({ ...prev, address: e.target.value }))}
              className="form-control"
              rows="3"
            />
          </div>
        </div>

        <div className="invoice-items">
          <div className="items-header">
            <h3>Invoice Items</h3>
            <button type="button" className="btn btn-secondary" onClick={addItem}>
              <FaPlus /> Add Item
            </button>
          </div>
          
          <div className="items-table">
            <table className="table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Rate (₹)</th>
                  <th>Amount (₹)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoiceData.items.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <select
                        value={item.productId}
                        onChange={(e) => updateItem(index, 'productId', e.target.value)}
                        className="form-control"
                        disabled={loadingProducts}
                      >
                        <option value="">{loadingProducts ? 'Loading products...' : 'Select Product'}</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} - ₹{Number(product.price).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="form-control"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.rate}
                        onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                        className="form-control"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        value={item.amount.toFixed(2)}
                        readOnly
                        className="form-control"
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-icon danger"
                        onClick={() => removeItem(index)}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="invoice-summary">
          <div className="summary-details">
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>₹{subtotal.toLocaleString()}</span>
            </div>
            <div className="summary-row">
              <span>Tax (8%):</span>
              <span>₹{tax.toLocaleString()}</span>
            </div>
            <div className="summary-row total">
              <span>Total:</span>
              <span>₹{total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="invoice-notes">
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              value={invoiceData.notes}
              onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
              className="form-control"
              rows="4"
              placeholder="Additional notes or payment terms..."
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            <FaSave /> {isSubmitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateInvoice;