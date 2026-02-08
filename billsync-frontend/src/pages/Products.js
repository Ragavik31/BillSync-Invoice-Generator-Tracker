import React, { useState, useEffect } from 'react';
import { FaSearch, FaEdit, FaTrash, FaPlus, FaBox, FaExclamationTriangle, FaEye } from 'react-icons/fa';
import { productAPI } from '../services/api';
import './Products.css';
import { useNotifications } from '../contexts/NotificationContext';

const Products = () => {
  const { addNotification } = useNotifications();
  const isAdmin = true; // All users have admin access now
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  // We will show all products on a single page
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Pagination no longer used on this page
  const [editingProduct, setEditingProduct] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewProduct, setViewProduct] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    sku: '',
    description: '',
    price: '',
    purchasePrice: '',
    stock: '',
    minStock: '',
    category: '',
    unit: ''
  });
  const [addFormData, setAddFormData] = useState({
    name: '',
    sku: '',
    description: '',
    price: '',
    purchasePrice: '',
    stock: '',
    minStock: '',
    unit: '',
    category: ''
  });

  // Helper to fetch ALL products from backend by iterating pages
  const fetchAllProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      // First call to detect API response shape
      const perPage = 100; // backend cap safeguard
      let page = 1;
      let allProducts = [];

      // Make initial request
      let resp = await productAPI.getProducts({ page, per_page: perPage });

      if (Array.isArray(resp)) {
        // Old format: server returns all products directly
        allProducts = resp;
      } else if (resp && Array.isArray(resp.products)) {
        // New paginated format
        allProducts = resp.products;
        const hasNext = resp.pagination?.has_next;
        // Loop while more pages
        while (hasNext && page < (resp.pagination?.pages || 1)) {
          page += 1;
          const nextResp = await productAPI.getProducts({ page, per_page: perPage });
          if (nextResp && Array.isArray(nextResp.products)) {
            allProducts = allProducts.concat(nextResp.products);
          } else {
            break;
          }
        }
      } else {
        allProducts = [];
      }

      // Load disabled IDs from localStorage
      const disabledIds = JSON.parse(localStorage.getItem('disabledProducts') || '[]');

      // Map backend data structure to frontend format and apply disabled flag
      let mappedProducts = allProducts.map(product => ({
        ...product,
        stock: product.stock_quantity,
        minStock: product.min_stock_level,
        isDisabled: disabledIds.includes(product.id),
        purchase_price: product.purchase_price ?? 0,
        profit: (Number(product.price) || 0) - (Number(product.purchase_price) || 0)
      }));

      // Sort so that enabled products appear first, then disabled ones at bottom
      mappedProducts = mappedProducts.sort((a, b) => {
        if (a.isDisabled === b.isDisabled) return 0;
        return a.isDisabled ? 1 : -1;
      });

      setProducts(mappedProducts);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch products from API (all products, no pagination)
  useEffect(() => {
    fetchAllProducts();
  }, []);

  // Handle edit product
  const handleEdit = (product) => {
    if (!isAdmin) return; // read-only for non-admin
    setEditingProduct(product);
    setEditFormData({
      name: product.name,
      sku: product.sku,
      description: product.description || '',
      price: product.price.toString(),
      purchasePrice: (product.purchase_price ?? 0).toString(),
      stock: product.stock.toString(),
      minStock: product.minStock.toString(),
      category: product.category,
      unit: product.unit
    });
    setShowEditModal(true);
  };

  // Handle delete product
  const handleDelete = (product) => {
    if (!isAdmin) return; // read-only for non-admin
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  // Handle view product
  const handleView = (product) => {
    setViewProduct(product);
    setShowViewModal(true);
  };

  // Confirm edit
  const confirmEdit = async () => {
    if (!isAdmin) return;
    try {
      const updatedProduct = {
        ...editFormData,
        price: parseFloat(editFormData.price),
        purchase_price: editFormData.purchasePrice !== '' ? parseFloat(editFormData.purchasePrice) : 0,
        stock_quantity: parseInt(editFormData.stock),
        min_stock_level: parseInt(editFormData.minStock)
      };

      await productAPI.updateProduct(editingProduct.id, updatedProduct);
      
      // Refresh products list (fetch all)
      await fetchAllProducts();
      
      // Success notification
      addNotification({
        type: 'success',
        title: 'Product Updated',
        message: `${editingProduct.name} has been updated successfully.`,
        icon: '✅'
      });

      setShowEditModal(false);
      setEditingProduct(null);
      setEditFormData({
        name: '',
        sku: '',
        description: '',
        price: '',
        purchasePrice: '',
        stock: '',
        minStock: '',
        category: '',
        unit: ''
      });
    } catch (err) {
      console.error('Error updating product:', err);
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update product. Please try again.',
        icon: '❌',
        priority: 'high'
      });
    }
  };

  // Confirm delete (soft delete: mark disabled and move to bottom)
  const confirmDelete = async () => {
    if (!isAdmin) return;
    try {
      if (!productToDelete) return;

      // Update localStorage list of disabled product IDs
      const existing = JSON.parse(localStorage.getItem('disabledProducts') || '[]');
      const updatedIds = Array.from(new Set([...existing, productToDelete.id]));
      localStorage.setItem('disabledProducts', JSON.stringify(updatedIds));

      // Update local state to mark this product as disabled and move it to bottom
      setProducts(prev => {
        const updated = prev.map(p => p.id === productToDelete.id ? { ...p, isDisabled: true } : p);
        return updated.sort((a, b) => {
          if (a.isDisabled === b.isDisabled) return 0;
          return a.isDisabled ? 1 : -1;
        });
      });
      
      setShowDeleteModal(false);
      setProductToDelete(null);

      // Success notification
      addNotification({
        type: 'info',
        title: 'Product Disabled',
        message: `${productToDelete.name} was disabled and moved to the bottom.`,
        icon: '🗂️'
      });
    } catch (err) {
      console.error('Error deleting product:', err);
      addNotification({
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to delete product. Please try again.',
        icon: '❌',
        priority: 'high'
      });
    }
  };

  // Handle form input changes
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle add product
  const handleAddProduct = () => {
    if (!isAdmin) return;
    setShowAddModal(true);
  };

  // Handle add form input changes
  const handleAddFormChange = (e) => {
    const { name, value } = e.target;
    setAddFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Confirm add product
  const confirmAddProduct = async () => {
    if (!isAdmin) return;
    try {
      const newProduct = {
        ...addFormData,
        price: parseFloat(addFormData.price),
        purchase_price: addFormData.purchasePrice !== '' ? parseFloat(addFormData.purchasePrice) : 0,
        stock_quantity: parseInt(addFormData.stock),
        min_stock_level: parseInt(addFormData.minStock)
      };

      await productAPI.createProduct(newProduct);
      
      // Refresh products list (fetch all)
      await fetchAllProducts();
      
      // Reset form and close modal
      setShowAddModal(false);
      setAddFormData({
        name: '',
        sku: '',
        description: '',
        price: '',
        purchasePrice: '',
        stock: '',
        minStock: '',
        category: '',
        unit: ''
      });

      // Success notification
      addNotification({
        type: 'success',
        title: 'Product Added',
        message: 'New product has been added successfully.',
        icon: '✅'
      });
    } catch (err) {
      console.error('Error adding product:', err);
      const backendMsg = err?.response?.data?.error;
      addNotification({
        type: 'error',
        title: 'Add Failed',
        message: backendMsg ? `Failed to add product: ${backendMsg}` : 'Failed to add product. Please check the form and try again.',
        icon: '❌',
        priority: 'high'
      });
    }
  };

  // Remove duplicate products declaration and use state instead

  // Get unique categories from products
  const categories = ['all', ...new Set(products.map(product => product.category).filter(Boolean))];
  const stockLevels = ['all', 'low', 'out', 'available'];

  const getStockStatus = (stock, minStock) => {
    if (stock === 0) return 'out';
    if (stock < minStock) return 'low';
    return 'available';
  };

  const getStockBadgeClass = (stock, minStock) => {
    const status = getStockStatus(stock, minStock);
    switch (status) {
      case 'available': return 'status-available';
      case 'low': return 'status-low';
      case 'out': return 'status-out';
      default: return 'status-available';
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesStock = stockFilter === 'all' || getStockStatus(product.stock, product.minStock) === stockFilter;
    return matchesSearch && matchesCategory && matchesStock;
  });

  // No pagination: show all filtered products
  const currentProducts = filteredProducts;

  const lowStockCount = products.filter(p => p.stock < p.minStock).length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;

  // Loading state
  if (loading) {
    return (
      <div className="products">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="products">
        <div className="error-container">
          <FaExclamationTriangle className="error-icon" />
          <h3>Error Loading Products</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="products">
      <div className="page-header">
        <div>
          <h1 className="page-title">Office Supplies Catalog</h1>
          <p className="page-subtitle">Comprehensive office supplies inventory management</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={handleAddProduct}>
            <FaPlus /> Add Product
          </button>
        )}
      </div>

      {/* Stock Alerts */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="stock-alerts">
          {lowStockCount > 0 && (
            <div className="alert alert-warning">
              <FaExclamationTriangle />
              <span>{lowStockCount} products are running low on stock</span>
            </div>
          )}
          {outOfStockCount > 0 && (
            <div className="alert alert-danger">
              <FaExclamationTriangle />
              <span>{outOfStockCount} products are out of stock</span>
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-icon">
            <FaBox />
          </div>
          <div className="summary-info">
            <div className="summary-value">{products.length}</div>
            <div className="summary-label">Total Products</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-info">
            <div className="summary-value">{lowStockCount}</div>
            <div className="summary-label">Low Stock</div>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-info">
            <div className="summary-value">{outOfStockCount}</div>
            <div className="summary-label">Out of Stock</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search products by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-group">
          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="filter-select"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            ))}
          </select>
          
          <select 
            value={stockFilter} 
            onChange={(e) => setStockFilter(e.target.value)}
            className="filter-select"
          >
            {stockLevels.map(level => (
              <option key={level} value={level}>
                {level === 'all' ? 'All Stock' : 
                 level === 'low' ? 'Low Stock' :
                 level === 'out' ? 'Out of Stock' : 'Available'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Purchase Price</th>
              <th>Selling Price</th>
              <th>Profit</th>
              <th>Stock</th>
              <th>Min Stock</th>
              <th>Unit</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentProducts.map((product) => (
              <tr key={product.id} className={product.isDisabled ? 'disabled-row' : ''} style={product.isDisabled ? { opacity: 0.5 } : {}}>
                <td>
                  <div className="product-info">
                    <div className="product-name">{product.name}</div>
                    <div className="product-description">{product.description}</div>
                  </div>
                </td>
                <td className="sku">{product.sku}</td>
                <td className="category">{product.category}</td>
                <td className="price">₹{Number(product.purchase_price || 0).toFixed(2)}</td>
                <td className="price">₹{Number(product.price).toFixed(2)}</td>
                <td className="price">₹{Number(product.profit || 0).toFixed(2)}</td>
                <td className={`stock ${product.stock < product.minStock ? 'low-stock' : ''}`}>
                  {product.stock}
                </td>
                <td className="min-stock">{product.minStock}</td>
                <td className="unit">{product.unit}</td>
                <td>
                  {product.isDisabled ? (
                    <span className="status-badge status-out">Disabled</span>
                  ) : (
                    <span className={`status-badge ${getStockBadgeClass(product.stock, product.minStock)}`}>
                      {getStockStatus(product.stock, product.minStock) === 'available' ? 'Available' :
                       getStockStatus(product.stock, product.minStock) === 'low' ? 'Low Stock' : 'Out of Stock'}
                    </span>
                  )}
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="btn-icon" 
                      title="View"
                      onClick={() => handleView(product)}
                    >
                      <FaEye />
                    </button>
                    {isAdmin && (
                      <>
                        <button 
                          className="btn-icon primary" 
                          title="Edit"
                          onClick={() => !product.isDisabled && handleEdit(product)}
                          disabled={product.isDisabled}
                        >
                          <FaEdit />
                        </button>
                        <button 
                          className="btn-icon danger" 
                          title={product.isDisabled ? 'Disabled' : 'Delete'}
                          onClick={() => !product.isDisabled && handleDelete(product)}
                          disabled={product.isDisabled}
                        >
                          <FaTrash />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination removed: displaying all products on a single page */}

      {/* View Product Modal */}
      {showViewModal && viewProduct && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Product Details</h3>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="edit-form">
                <div className="form-group">
                  <label>Name</label>
                  <div className="form-control" style={{ background: '#f8f9fa' }}>{viewProduct.name}</div>
                </div>
                <div className="form-group">
                  <label>SKU</label>
                  <div className="form-control" style={{ background: '#f8f9fa' }}>{viewProduct.sku}</div>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <div className="form-control" style={{ background: '#f8f9fa' }}>{viewProduct.category || '-'}</div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Price (₹)</label>
                    <div className="form-control" style={{ background: '#f8f9fa' }}>₹{Number(viewProduct.price).toFixed(2)}</div>
                  </div>
                  <div className="form-group">
                    <label>Unit</label>
                    <div className="form-control" style={{ background: '#f8f9fa' }}>{viewProduct.unit}</div>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Stock</label>
                    <div className="form-control" style={{ background: '#f8f9fa' }}>{viewProduct.stock}</div>
                  </div>
                  <div className="form-group">
                    <label>Min Stock</label>
                    <div className="form-control" style={{ background: '#f8f9fa' }}>{viewProduct.minStock}</div>
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <div className="form-control" style={{ background: '#f8f9fa', whiteSpace: 'pre-wrap' }}>{viewProduct.description || '-'}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowViewModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isAdmin && showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Product</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <form className="edit-form">
                <div className="form-group">
                  <label>Product Name</label>
                  <input
                    type="text"
                    name="name"
                    value={editFormData.name}
                    onChange={handleEditFormChange}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>SKU</label>
                  <input
                    type="text"
                    name="sku"
                    value={editFormData.sku}
                    onChange={handleEditFormChange}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={editFormData.description}
                    onChange={handleEditFormChange}
                    className="form-control"
                    rows="3"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Selling Price (₹)</label>
                    <input
                      type="number"
                      name="price"
                      value={editFormData.price}
                      onChange={handleEditFormChange}
                      className="form-control"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label>Purchase Price (₹)</label>
                    <input
                      type="number"
                      name="purchasePrice"
                      value={editFormData.purchasePrice}
                      onChange={handleEditFormChange}
                      className="form-control"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label>Stock Quantity</label>
                    <input
                      type="number"
                      name="stock"
                      value={editFormData.stock}
                      onChange={handleEditFormChange}
                      className="form-control"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Min Stock Level</label>
                    <input
                      type="number"
                      name="minStock"
                      value={editFormData.minStock}
                      onChange={handleEditFormChange}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label>Unit</label>
                    <input
                      type="text"
                      name="unit"
                      value={editFormData.unit}
                      onChange={handleEditFormChange}
                      className="form-control"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select
                    name="category"
                    value={editFormData.category}
                    onChange={handleEditFormChange}
                    className="form-control"
                  >
                    <option value="">Select Category</option>
                    {categories.filter(cat => cat !== 'all').map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={confirmEdit}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isAdmin && showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Delete</h3>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="confirm-message">
                <FaExclamationTriangle className="confirm-icon" />
                <p>Are you sure you want to delete <strong>{productToDelete?.name}</strong>?</p>
                <p className="confirm-warning">This action cannot be undone.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {isAdmin && showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Product</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <form className="add-form">
                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={addFormData.name}
                    onChange={handleAddFormChange}
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>SKU *</label>
                  <input
                    type="text"
                    name="sku"
                    value={addFormData.sku}
                    onChange={handleAddFormChange}
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={addFormData.description}
                    onChange={handleAddFormChange}
                    className="form-control"
                    rows="3"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Selling Price (₹) *</label>
                    <input
                      type="number"
                      name="price"
                      value={addFormData.price}
                      onChange={handleAddFormChange}
                      className="form-control"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Purchase Price (₹)</label>
                    <input
                      type="number"
                      name="purchasePrice"
                      value={addFormData.purchasePrice}
                      onChange={handleAddFormChange}
                      className="form-control"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label>Stock Quantity *</label>
                    <input
                      type="number"
                      name="stock"
                      value={addFormData.stock}
                      onChange={handleAddFormChange}
                      className="form-control"
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Min Stock Level *</label>
                    <input
                      type="number"
                      name="minStock"
                      value={addFormData.minStock}
                      onChange={handleAddFormChange}
                      className="form-control"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Unit *</label>
                    <input
                      type="text"
                      name="unit"
                      value={addFormData.unit}
                      onChange={handleAddFormChange}
                      className="form-control"
                      placeholder="pcs, kg, liters, etc."
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  {categories.filter(cat => cat !== 'all').length === 0 ? (
                    <input
                      type="text"
                      name="category"
                      value={addFormData.category}
                      onChange={handleAddFormChange}
                      className="form-control"
                      placeholder="Enter a new category (optional)"
                    />
                  ) : (
                    <select
                      name="category"
                      value={addFormData.category}
                      onChange={handleAddFormChange}
                      className="form-control"
                    >
                      <option value="">Select Category (optional)</option>
                      {categories.filter(cat => cat !== 'all').map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  )}
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={confirmAddProduct}>
                Add Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;