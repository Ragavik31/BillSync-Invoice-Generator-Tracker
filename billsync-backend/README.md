# BillSync Backend - Setup Instructions

This is the Python Flask backend for the BillSync application, which provides REST API endpoints for managing invoices, customers, and products with MySQL database.

## Prerequisites

1. **Python 3.7+** installed on your system
2. **MySQL Server** installed and running
3. **MySQL password**: `Ragavi_31` (as specified)

## Installation Steps

### 1. Create MySQL Database

First, create the database and user in MySQL:

```sql
-- Login to MySQL as root
mysql -u root -p

-- Enter password: Ragavi_31

-- Create database
CREATE DATABASE billsync_db;

-- Create user (optional, if you want to use a specific user)
CREATE USER 'billsync_user'@'localhost' IDENTIFIED BY 'Ragavi_31';
GRANT ALL PRIVILEGES ON billsync_db.* TO 'billsync_user'@'localhost';
FLUSH PRIVILEGES;

-- Exit MySQL
EXIT;
```

### 2. Setup Python Environment

Navigate to the backend directory and create a virtual environment:

```bash
cd billsync-backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

### 3. Install Dependencies

Install all required Python packages:

```bash
pip install -r requirements.txt
```

### 4. Database Configuration

The database connection is already configured in `app.py` with the following settings:

```python
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:Ragavi_31@localhost/billsync_db'
```

If you want to use a different MySQL user, update this line accordingly.

### 5. Run the Application

Start the Flask development server:

```bash
python app.py
```

The server will start on `http://localhost:5000`

## API Endpoints

### Customers
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Create new customer
- `GET /api/customers/<id>` - Get specific customer
- `PUT /api/customers/<id>` - Update customer

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create new product
- `PUT /api/products/<id>` - Update product

### Invoices
- `GET /api/invoices` - Get all invoices (with optional status filter)
- `POST /api/invoices` - Create new invoice
- `GET /api/invoices/<id>` - Get specific invoice
- `PUT /api/invoices/<id>` - Update invoice
- `DELETE /api/invoices/<id>` - Delete invoice
- `PATCH /api/invoices/<id>/paid` - Mark invoice as paid
- `GET /api/invoices/stats` - Get invoice statistics

## Database Schema

### Customers Table
- `id` (Primary Key)
- `name` (String)
- `email` (String, Unique)
- `phone` (String)
- `address` (Text)
- `company` (String)
- `gstin` (String)
- `created_at` (DateTime)
- `updated_at` (DateTime)

### Products Table
- `id` (Primary Key)
- `name` (String)
- `sku` (String, Unique)
- `description` (Text)
- `price` (Decimal)
- `stock_quantity` (Integer)
- `min_stock_level` (Integer)
- `category` (String)
- `unit` (String)
- `created_at` (DateTime)
- `updated_at` (DateTime)

### Invoices Table
- `id` (Primary Key)
- `invoice_number` (String, Unique)
- `customer_id` (Foreign Key)
- `invoice_date` (Date)
- `due_date` (Date)
- `subtotal` (Decimal)
- `tax_amount` (Decimal)
- `total_amount` (Decimal)
- `status` (String: pending, paid, overdue, cancelled)
- `notes` (Text)
- `created_at` (DateTime)
- `updated_at` (DateTime)

### Invoice Items Table
- `id` (Primary Key)
- `invoice_id` (Foreign Key)
- `product_id` (Foreign Key)
- `quantity` (Integer)
- `unit_price` (Decimal)
- `total_price` (Decimal)

## Features

- **Automatic Invoice Number Generation**: If not provided, generates unique invoice numbers
- **Stock Management**: Automatically updates product stock when invoices are created
- **Tax Calculation**: Automatically calculates 18% GST on invoices
- **Invoice Statistics**: Provides revenue and status analytics
- **CORS Support**: Enabled for frontend integration
- **Error Handling**: Comprehensive error handling and validation

## Frontend Integration

The backend is configured to work with your React frontend. Update your frontend's API service to point to:

```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

## Testing the API

You can test the API using curl, Postman, or any HTTP client:

```bash
# Get all customers
curl http://localhost:5000/api/customers

# Create a customer
curl -X POST http://localhost:5000/api/customers \
  -H "Content-Type: application/json" \
  -d '{"name": "ABC Office Supplies", "email": "abc@example.com", "phone": "1234567890"}'

# Get all products
curl http://localhost:5000/api/products

# Create a product
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Copy Paper A4", "sku": "CP-A4-500", "price": 250.00, "stock_quantity": 100}'
```

## Troubleshooting

### MySQL Connection Issues
- Ensure MySQL service is running
- Verify the password `Ragavi_31` is correct
- Check if the database `billsync_db` exists

### Port Already in Use
- If port 5000 is already in use, change it in `app.py`:
```python
app.run(debug=True, port=5001)  # Use a different port
```

### Database Migration Issues
- Delete the database and recreate it if needed
- The tables will be automatically created when you run the application

## Production Deployment

For production deployment:
1. Use environment variables for sensitive data
2. Set `debug=False` in app.py
3. Use a production WSGI server like Gunicorn
4. Set up proper MySQL user permissions
5. Configure proper CORS settings

```bash
# Install gunicorn
pip install gunicorn

# Run with gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```