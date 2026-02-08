import React, { useEffect, useState } from 'react';
import { customerAPI, invoiceAPI } from '../services/api';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaEnvelope, FaPhone, FaMapMarkerAlt, FaBuilding, FaUser, FaRupeeSign, FaFileInvoice, FaStar, FaStarHalf, FaRegStar } from 'react-icons/fa';
import './Clients.css';

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [newClientData, setNewClientData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    company: '',
    status: 'active',
    category: 'regular',
    gstin: ''
  });

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [editClientData, setEditClientData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    company: ''
  });

  useEffect(() => {
    const loadClients = async () => {
      try {
        setLoading(true);
        const [customers, invoices] = await Promise.all([
          customerAPI.getCustomers(),
          invoiceAPI.getInvoices(),
        ]);

        // Build aggregates per customer
        const agg = new Map();
        (invoices || []).forEach(inv => {
          const cid = inv.customer_id;
          if (!cid) return;
          const cur = agg.get(cid) || { count: 0, revenue: 0, lastOrder: null };
          cur.count += 1;
          cur.revenue += Number(inv.total_amount || 0);
          const dateStr = inv.invoice_date;
          const dateObj = dateStr ? new Date(dateStr) : null;
          if (!cur.lastOrder || (dateObj && dateObj > cur.lastOrder)) {
            cur.lastOrder = dateObj || cur.lastOrder;
          }
          agg.set(cid, cur);
        });

        const normalized = (customers || []).map(c => {
          const a = agg.get(c.id) || { count: 0, revenue: 0, lastOrder: null };
          return {
            ...c,
            status: c.status ?? 'active',
            category: c.category ?? 'regular',
            totalInvoices: a.count,
            totalRevenue: a.revenue,
            rating: c.rating ?? 4.0,
            lastOrder: (a.lastOrder ? a.lastOrder.toISOString() : (c.lastOrder ?? new Date(0).toISOString())),
          };
        });
        setClients(normalized);
        setError(null);
      } catch (e) {
        console.error('Failed to load clients', e);
        setError('Failed to load clients');
      } finally {
        setLoading(false);
      }
    };
    loadClients();
  }, []);

  // Helper to refresh clients list
  const refreshClients = async () => {
    try {
      setLoading(true);
      const [customers, invoices] = await Promise.all([
        customerAPI.getCustomers(),
        invoiceAPI.getInvoices(),
      ]);
      const agg = new Map();
      (invoices || []).forEach(inv => {
        const cid = inv.customer_id;
        if (!cid) return;
        const cur = agg.get(cid) || { count: 0, revenue: 0, lastOrder: null };
        cur.count += 1;
        cur.revenue += Number(inv.total_amount || 0);
        const dateStr = inv.invoice_date;
        const dateObj = dateStr ? new Date(dateStr) : null;
        if (!cur.lastOrder || (dateObj && dateObj > cur.lastOrder)) {
          cur.lastOrder = dateObj || cur.lastOrder;
        }
        agg.set(cid, cur);
      });
      const normalized = (customers || []).map(c => {
        const a = agg.get(c.id) || { count: 0, revenue: 0, lastOrder: null };
        return {
          ...c,
          status: c.status ?? 'active',
          category: c.category ?? 'regular',
          totalInvoices: a.count,
          totalRevenue: a.revenue,
          rating: c.rating ?? 4.0,
          lastOrder: (a.lastOrder ? a.lastOrder.toISOString() : (c.lastOrder ?? new Date(0).toISOString())),
        };
      });
      setClients(normalized);
    } catch (e) {
      console.error('Failed to refresh clients', e);
      setError('Failed to refresh clients');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active': return 'status-active';
      case 'inactive': return 'status-inactive';
      default: return 'status-active';
    }
  };

  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case 'vip': return 'category-vip';
      case 'premium': return 'category-premium';
      case 'regular': return 'category-regular';
      default: return 'category-regular';
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<FaStar key={i} className="star full" />);
    }
    
    if (hasHalfStar) {
      stars.push(<FaStarHalf key="half" className="star half" />);
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<FaRegStar key={`empty-${i}`} className="star empty" />);
    }
    
    return stars;
  };

  const filteredAndSortedClients = clients
    .filter(client => {
      const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           client.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           client.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'revenue':
          return b.totalRevenue - a.totalRevenue;
        case 'invoices':
          return b.totalInvoices - a.totalInvoices;
        case 'lastOrder':
          return new Date(b.lastOrder) - new Date(a.lastOrder);
        default:
          return 0;
      }
    });

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedClients.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClients = filteredAndSortedClients.slice(startIndex, endIndex);

  const totalRevenue = clients.reduce((sum, client) => sum + (Number(client.totalRevenue) || 0), 0);
  const activeClients = clients.filter(c => c.status === 'active').length;
  const avgRevenue = clients.length ? (totalRevenue / clients.length) : 0;

  const handleAddClient = () => {
    setShowAddModal(true);
  };

  const handleClientFormChange = (field, value) => {
    setNewClientData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitClient = async () => {
    try {
      setLoading(true);
      if (!newClientData.gstin || !newClientData.gstin.trim()) {
        setLoading(false);
        alert('GSTIN is required.');
        return;
      }
      // Map to backend schema
      const payload = {
        name: newClientData.name,
        email: newClientData.email,
        phone: newClientData.phone,
        address: newClientData.address,
        company: newClientData.company,
        gstin: newClientData.gstin || undefined,
      };
      await customerAPI.createCustomer(payload);
      // Refresh list and normalize structure
      const data = await customerAPI.getCustomers();
      const normalized = (data || []).map(c => ({
        ...c,
        status: c.status ?? 'active',
        category: c.category ?? 'regular',
        totalInvoices: c.totalInvoices ?? 0,
        totalRevenue: c.totalRevenue ?? 0,
        rating: c.rating ?? 4.0,
        lastOrder: c.lastOrder ?? new Date().toISOString(),
        gstin: c.gstin ?? '',
      }));
      setClients(normalized);
      setShowAddModal(false);
      setNewClientData({
        name: '',
        email: '',
        phone: '',
        address: '',
        company: '',
        status: 'active',
        category: 'regular',
        gstin: ''
      });
      alert('Client added successfully!');
    } catch (e) {
      console.error('Failed to add client', e);
      alert('Failed to add client. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // View/Edit/Delete handlers
  const handleViewClient = (client) => {
    setSelectedClient(client);
    setShowViewModal(true);
  };

  const handleEditClient = (client) => {
    setSelectedClient(client);
    setEditClientData({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      company: client.company || ''
    });
    setShowEditModal(true);
  };

  const handleDeleteClient = (client) => {
    setSelectedClient(client);
    setShowDeleteModal(true);
  };

  const handleEditInputChange = (field, value) => {
    setEditClientData(prev => ({ ...prev, [field]: value }));
  };

  const confirmEditClient = async () => {
    if (!selectedClient) return;
    try {
      setLoading(true);
      await customerAPI.updateCustomer(selectedClient.id, editClientData);
      await refreshClients();
      setShowEditModal(false);
      setSelectedClient(null);
    } catch (e) {
      console.error('Failed to update client', e);
      alert('Failed to update client. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteClient = async () => {
    if (!selectedClient) return;
    try {
      setLoading(true);
      await customerAPI.deleteCustomer(selectedClient.id);
      await refreshClients();
      setShowDeleteModal(false);
      setSelectedClient(null);
    } catch (e) {
      console.error('Failed to delete client', e);
      alert('Failed to delete client. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="clients">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-text">
            <h1 className="page-title">Client Management</h1>
            <p className="page-subtitle">Manage your business relationships and track customer performance</p>
          </div>
          <button className="btn btn-primary add-client-btn" onClick={handleAddClient}>
            <FaPlus /> Add New Client
          </button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      {error && (
        <div className="error-container" style={{ padding: '1rem', color: 'red' }}>{error}</div>
      )}
      {loading && (
        <div className="loading-container" style={{ padding: '1rem' }}>Loading clients...</div>
      )}
      <div className="stats-overview">
        <div className="stat-card primary">
          <div className="stat-icon">
            <FaUser />
          </div>
          <div className="stat-content">
            <div className="stat-value">{clients.length}</div>
            <div className="stat-label">Total Clients</div>
            {/* trend removed */}
          </div>
        </div>
        
        <div className="stat-card success">
          <div className="stat-icon">
            <FaBuilding />
          </div>
          <div className="stat-content">
            <div className="stat-value">{activeClients}</div>
            <div className="stat-label">Active Clients</div>
            {/* trend removed */}
          </div>
        </div>
        
        <div className="stat-card warning">
          <div className="stat-icon">
            <FaRupeeSign />
          </div>
          <div className="stat-content">
            <div className="stat-value">₹{totalRevenue.toLocaleString()}</div>
            <div className="stat-label">Total Revenue</div>
            {/* trend removed */}
          </div>
        </div>
        
        <div className="stat-card info">
          <div className="stat-icon">
            <FaFileInvoice />
          </div>
          <div className="stat-content">
            <div className="stat-value">₹{avgRevenue.toLocaleString()}</div>
            <div className="stat-label">Avg. Revenue</div>
            {/* trend removed */}
          </div>
        </div>
      </div>

      {/* Enhanced Filters and Search */}
      <div className="filters-section">
        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, company, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-controls">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="name">Sort by Name</option>
            <option value="revenue">Sort by Revenue</option>
            <option value="invoices">Sort by Invoices</option>
            <option value="lastOrder">Sort by Last Order</option>
          </select>
        </div>
      </div>

      {/* Enhanced Clients Grid */}
      <div className="clients-grid">
        {paginatedClients.map((client) => (
          <div key={client.id} className={`client-card ${client.category}`}>
            <div className="card-header">
              <div className="client-avatar">
                <FaUser />
              </div>
              <div className="client-header-info">
                <h3 className="client-name">{client.name}</h3>
                <p className="client-company">{client.company}</p>
                <div className="client-badges">
                  <span className={`status-badge ${getStatusBadgeClass(client.status)}`}>
                    {client.status}
                  </span>
                  <span className={`category-badge ${getCategoryBadgeClass(client.category)}`}>
                    {(client.category || '').toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="client-rating">
                <div className="rating-stars">
                  {renderStars(client.rating)}
                </div>
                <span className="rating-text">{client.rating}</span>
              </div>
            </div>
            
            <div className="card-content">
              <div className="contact-info">
                <div className="contact-item">
                  <FaEnvelope className="contact-icon" />
                  <span className="contact-text">{client.email}</span>
                </div>
                <div className="contact-item">
                  <FaPhone className="contact-icon" />
                  <span className="contact-text">{client.phone}</span>
                </div>
                <div className="contact-item">
                  <FaMapMarkerAlt className="contact-icon" />
                  <span className="contact-text">{client.address}</span>
                </div>
              </div>
              
              <div className="client-metrics">
                <div className="metric">
                  <div className="metric-value">{client.totalInvoices}</div>
                  <div className="metric-label">Invoices</div>
                </div>
                <div className="metric">
                  <div className="metric-value">₹{client.totalRevenue.toLocaleString()}</div>
                  <div className="metric-label">Total Revenue</div>
                </div>
                <div className="metric">
                  <div className="metric-value">{new Date(client.lastOrder).toLocaleDateString()}</div>
                  <div className="metric-label">Last Order</div>
                </div>
              </div>
            </div>
            
            <div className="card-actions">
              <button className="btn-action primary" title="Edit Client" onClick={() => handleEditClient(client)}>
                <FaEdit />
                <span>Edit</span>
              </button>
              <button className="btn-action secondary" title="View Details" onClick={() => handleViewClient(client)}>
                <FaBuilding />
                <span>View</span>
              </button>
              <button className="btn-action danger" title="Delete Client" onClick={() => handleDeleteClient(client)}>
                <FaTrash />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Enhanced Pagination */}
      <div className="pagination-section">
        <div className="pagination-info">
          Showing <span className="highlight">{paginatedClients.length}</span> of <span className="highlight">{filteredAndSortedClients.length}</span> filtered clients (Total: {clients.length})
        </div>
        <div className="pagination-controls">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={safePage <= 1}
          >
            Previous
          </button>
          <div className="pagination-numbers">
            <span className="pagination-number active">Page {safePage} of {totalPages}</span>
          </div>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
          >
            Next
          </button>
        </div>
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Client</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Client Name *</label>
                  <input
                    type="text"
                    value={newClientData.name}
                    onChange={(e) => handleClientFormChange('name', e.target.value)}
                    className="form-input"
                    placeholder="Enter client name"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Company Name *</label>
                  <input
                    type="text"
                    value={newClientData.company}
                    onChange={(e) => handleClientFormChange('company', e.target.value)}
                    className="form-input"
                    placeholder="Enter company name"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    value={newClientData.email}
                    onChange={(e) => handleClientFormChange('email', e.target.value)}
                    className="form-input"
                    placeholder="Enter email address"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="tel"
                    value={newClientData.phone}
                    onChange={(e) => handleClientFormChange('phone', e.target.value)}
                    className="form-input"
                    placeholder="Enter phone number"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">GSTIN</label>
                  <input
                    type="text"
                    value={newClientData.gstin}
                    onChange={(e) => handleClientFormChange('gstin', e.target.value)}
                    className="form-input"
                    placeholder="Enter GSTIN"
                    required
                  />
                </div>
                
                <div className="form-group full-width">
                  <label className="form-label">Business Address *</label>
                  <textarea
                    value={newClientData.address}
                    onChange={(e) => handleClientFormChange('address', e.target.value)}
                    className="form-input"
                    placeholder="Enter complete business address"
                    rows="3"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    value={newClientData.status}
                    onChange={(e) => handleClientFormChange('status', e.target.value)}
                    className="form-input"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    value={newClientData.category}
                    onChange={(e) => handleClientFormChange('category', e.target.value)}
                    className="form-input"
                  >
                    <option value="regular">Regular</option>
                    <option value="premium">Premium</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSubmitClient}>
                <FaPlus /> Add Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Client Modal */}
      {showViewModal && selectedClient && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Client Details</h2>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <div className="form-input">{selectedClient.name}</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Company</label>
                  <div className="form-input">{selectedClient.company}</div>
                </div>
                <div className="form-group">
                  <label className="form-label">GSTIN</label>
                  <div className="form-input">{selectedClient.gstin || '-'}</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <div className="form-input">{selectedClient.email}</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <div className="form-input">{selectedClient.phone}</div>
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Address</label>
                  <div className="form-input">{selectedClient.address}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowViewModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Client</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Client Name</label>
                  <input className="form-input" value={editClientData.name} onChange={(e) => handleEditInputChange('name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Company</label>
                  <input className="form-input" value={editClientData.company} onChange={(e) => handleEditInputChange('company', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={editClientData.email} onChange={(e) => handleEditInputChange('email', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={editClientData.phone} onChange={(e) => handleEditInputChange('phone', e.target.value)} />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Address</label>
                  <textarea className="form-input" rows="3" value={editClientData.address} onChange={(e) => handleEditInputChange('address', e.target.value)} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmEditClient}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedClient && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Client</h2>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>×</button>
            </div>
            <div className="modal-body">
              Are you sure you want to delete "{selectedClient.name}"?
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmDeleteClient}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;