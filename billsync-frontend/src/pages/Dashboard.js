import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaUsers, 
  FaBox, 
  FaExclamationTriangle,
  FaChartLine,
  FaEye,
  FaFileInvoice,
  FaArrowUp,
  FaArrowDown
} from 'react-icons/fa';
import { productAPI, invoiceAPI, customerAPI } from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCustomers: 0
  });
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState([]);
  const [fastSellingProducts, setFastSellingProducts] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [productsData, invoicesData, customersData] = await Promise.all([
        productAPI.getProducts({ page: 1, per_page: 100 }), // Get first 100 products for dashboard
        invoiceAPI.getInvoices(),
        customerAPI.getCustomers()
      ]);

      // Handle both old format (array) and new format (object with products array)
      let productsArray = productsData;
      if (productsData.products && Array.isArray(productsData.products)) {
        productsArray = productsData.products;
      }

      setProducts(productsArray);
      setInvoices(invoicesData);
      setCustomers(customersData);

      setStats({
        totalCustomers: customersData.length,
        totalProducts: productsArray.length
      });

      // Analyze stock levels
      const lowStock = productsArray.filter(product => 
        product.stock_quantity <= product.min_stock_level && product.stock_quantity > 0
      );
      
      const outOfStock = productsArray.filter(product => 
        product.stock_quantity === 0
      );

      // Identify fast-selling products (mock implementation)
      const fastSelling = productsArray
        .filter(product => product.stock_quantity > 0)
        .sort((a, b) => {
          const aRatio = a.stock_quantity / a.min_stock_level;
          const bRatio = b.stock_quantity / b.min_stock_level;
          return aRatio - bRatio;
        })
        .slice(0, 5);

      setLowStockProducts(lowStock);
      setOutOfStockProducts(outOfStock);
      setFastSellingProducts(fastSelling);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, trend, trendValue, color = 'primary' }) => (
    <div className={`stat-card ${color}`}>
      <div className="stat-header">
        <div className="stat-icon">
          <Icon />
        </div>
        {trend && (
          <div className={`stat-change ${trend === 'up' ? 'positive' : 'negative'}`}>
            {trend === 'up' ? <FaArrowUp /> : <FaArrowDown />}
            {trendValue}
          </div>
        )}
      </div>
      <div className="stat-value">{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</div>
      <div className="stat-label">{title}</div>
    </div>
  );

  const ProductCard = ({ product, type }) => {
    const getStockColor = () => {
      switch (type) {
        case 'out-of-stock': return 'text-red-600';
        case 'low-stock': return 'text-yellow-600';
        default: return 'text-green-600';
      }
    };

    const getIconColor = () => {
      switch (type) {
        case 'out-of-stock': return 'text-red-600';
        case 'low-stock': return 'text-yellow-600';
        default: return 'text-green-600';
      }
    };

    return (
      <div className="stock-item">
        <div className="stock-info">
          <div className="stock-name">{product.name}</div>
          <div className="stock-sku">{product.sku}</div>
        </div>
        <div className="stock-level">
          <div className={`stock-current ${getStockColor()}`}>{product.stock_quantity} {product.unit}</div>
          <div className="stock-min">Min: {product.min_stock_level}</div>
        </div>
        <div className="stock-indicator">
          <div className="stock-bar">
            <div 
              className={`stock-fill ${type === 'out-of-stock' ? 'bg-red-500' : type === 'low-stock' ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{width: `${Math.min((product.stock_quantity / product.min_stock_level) * 100, 100)}%`}}
            ></div>
          </div>
        </div>
      </div>
    );
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'paid': return 'status-paid';
      case 'pending': return 'status-pending';
      case 'overdue': return 'status-overdue';
      case 'draft': return 'status-draft';
      default: return 'status-draft';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back! Here's what's happening with your office supplies business.</p>
        </div>
        <div className="flex space-x-3">
          <Link to="/invoices/create" className="btn btn-primary">
            <FaFileInvoice /> Create Invoice
          </Link>
          <Link to="/products" className="btn btn-outline">
            <FaEye /> View Products
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          icon={FaBox}
          color="info"
        />
        <StatCard
          title="Total Customers"
          value={stats.totalCustomers}
          icon={FaUsers}
          color="warning"
        />
      </div>

      {/* Stock Management Section */}
      <div className="dashboard-grid">
        {/* Fast Selling Products */}
        <div className="dashboard-card border-green-200">
          <div className="card-header">
            <h3 className="flex items-center text-green-800">
              <FaArrowUp className="w-5 h-5 mr-2" />
              Fast Selling Products
            </h3>
          </div>
          <div className="card-content">
            <div className="stock-list">
              {fastSellingProducts.length > 0 ? (
                fastSellingProducts.map(product => (
                  <ProductCard key={product.id} product={product} type="fast-selling" />
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No fast-selling products identified</p>
              )}
            </div>
          </div>
        </div>

        {/* Low Stock Products */}
        <div className="dashboard-card border-yellow-200">
          <div className="card-header">
            <h3 className="flex items-center text-yellow-800">
              <FaExclamationTriangle className="w-5 h-5 mr-2" />
              Low Stock Alert
            </h3>
          </div>
          <div className="card-content">
            <div className="stock-list">
              {lowStockProducts.length > 0 ? (
                lowStockProducts.map(product => (
                  <ProductCard key={product.id} product={product} type="low-stock" />
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">All products have sufficient stock</p>
              )}
            </div>
          </div>
        </div>

        {/* Out of Stock Products */}
        <div className="dashboard-card border-red-200">
          <div className="card-header">
            <h3 className="flex items-center text-red-800">
              <FaExclamationTriangle className="w-5 h-5 mr-2" />
              Out of Stock
            </h3>
          </div>
          <div className="card-content">
            <div className="stock-list">
              {outOfStockProducts.length > 0 ? (
                outOfStockProducts.map(product => (
                  <ProductCard key={product.id} product={product} type="out-of-stock" />
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No out of stock products</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Quick Actions</h3>
          </div>
          <div className="card-content">
            <div className="quick-actions">
              <Link to="/invoices/create" className="quick-action-btn">
                <FaFileInvoice />
                <span>Create Invoice</span>
              </Link>
              <Link to="/customers/create" className="quick-action-btn">
                <FaUsers />
                <span>Add Customer</span>
              </Link>
              <Link to="/products" className="quick-action-btn">
                <FaBox />
                <span>Manage Products</span>
              </Link>
              <Link to="/reports" className="quick-action-btn">
                <FaChartLine />
                <span>View Reports</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;