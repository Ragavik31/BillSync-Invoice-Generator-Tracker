from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_mail import Mail, Message
from datetime import datetime, date, timedelta
import os
from decimal import Decimal
import json
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
import secrets
import string
import hmac
import hashlib
import requests

load_dotenv()
app = Flask(__name__)
CORS(app)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:Ragavi_31@localhost/billsync_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'billsync-secret-key-2024'
# Email configuration (env-overridable)
app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', '587'))
app.config['MAIL_USE_TLS'] = os.environ.get('MAIL_USE_TLS', 'True').lower() == 'true'
app.config['MAIL_USE_SSL'] = os.environ.get('MAIL_USE_SSL', 'False').lower() == 'true'
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME', 'your-email@gmail.com')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD', 'your-app-password')
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER', 'your-email@gmail.com')
app.config['ADMIN_EMAIL'] = os.environ.get('ADMIN_EMAIL', app.config['MAIL_USERNAME'])

# Razorpay configuration
app.config['RZP_KEY_ID'] = os.environ.get('RZP_KEY_ID')
app.config['RZP_KEY_SECRET'] = os.environ.get('RZP_KEY_SECRET')
app.config['RZP_WEBHOOK_SECRET'] = os.environ.get('RZP_WEBHOOK_SECRET')

mail = Mail(app)

db = SQLAlchemy(app)


# Payments removed

# Custom JSON encoder for Decimal
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

app.json_encoder = DecimalEncoder

# Email utility function
def send_invoice_email(invoice, customer_email):
    """Send invoice email to customer"""
    try:
        subject = f"Invoice {invoice.invoice_number} from BillSync"
        
        # Create email body
        body = f"""
        Dear Customer,
        
        Please find your invoice details below:
        
        Invoice Number: {invoice.invoice_number}
        Invoice Date: {invoice.invoice_date.strftime('%B %d, %Y')}
        Due Date: {invoice.due_date.strftime('%B %d, %Y') if invoice.due_date else 'N/A'}
        
        Items:
        """
        
        for item in invoice.items:
            body += f"\n- {item.product.name} x {item.quantity} @ ₹{item.unit_price:.2f} = ₹{item.total_price:.2f}"
        
        body += f"""
        
        Subtotal: ₹{invoice.subtotal:.2f}
        Tax (18%): ₹{invoice.tax_amount:.2f}
        Total: ₹{invoice.total_amount:.2f}
        
        Status: {invoice.status.title()}
        
        Thank you for your business!
        
        Best regards,
        BillSync Team
        """
        
        # Create message
        msg = Message(
            subject=subject,
            recipients=[customer_email],
            body=body,
            html=f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2c3e50;">Invoice {invoice.invoice_number}</h2>
                    <p>Dear Customer,</p>
                    <p>Please find your invoice details below:</p>
                    
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Invoice Number:</strong> {invoice.invoice_number}</p>
                        <p><strong>Invoice Date:</strong> {invoice.invoice_date.strftime('%B %d, %Y')}</p>
                        <p><strong>Due Date:</strong> {invoice.due_date.strftime('%B %d, %Y') if invoice.due_date else 'N/A'}</p>
                    </div>
                    
                    <h3 style="color: #2c3e50;">Items:</h3>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <thead>
                            <tr style="background-color: #e9ecef;">
                                <th style="padding: 10px; text-align: left; border: 1px solid #dee2e6;">Product</th>
                                <th style="padding: 10px; text-align: center; border: 1px solid #dee2e6;">Quantity</th>
                                <th style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">Price</th>
                                <th style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {''.join([f'<tr><td style="padding: 10px; border: 1px solid #dee2e6;">{item.product.name}</td><td style="padding: 10px; text-align: center; border: 1px solid #dee2e6;">{item.quantity}</td><td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">₹{item.unit_price:.2f}</td><td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">₹{item.total_price:.2f}</td></tr>' for item in invoice.items])}
                        </tbody>
                    </table>
                    
                    <div style="text-align: right; margin: 20px 0;">
                        <p><strong>Subtotal:</strong> ₹{invoice.subtotal:.2f}</p>
                        <p><strong>Tax (18%):</strong> ₹{invoice.tax_amount:.2f}</p>
                        <p style="font-size: 18px; font-weight: bold;"><strong>Total:</strong> ₹{invoice.total_amount:.2f}</p>
                        <p><strong>Status:</strong> <span style="color: {'#28a745' if invoice.status == 'paid' else '#ffc107' if invoice.status == 'pending' else '#dc3545'};">{invoice.status.title()}</span></p>
                    </div>
                    
                    <p>Thank you for your business!</p>
                    <p>Best regards,<br>BillSync Team</p>
                </div>
            </body>
            </html>
            """
        )
        
        # Send email
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return False

# Helper: map current JWT user to Customer by email
def get_current_customer():
    ident = get_jwt_identity() or {}
    user = User.query.get(ident.get('id')) if ident else None
    if not user:
        return None
    return Customer.query.filter_by(email=(user.email or '').lower()).first()

# Welcome email utility
def send_welcome_email(to_email, temp_password):
    try:
        subject = "Your BillSync Account Details"
        body = (
            f"Welcome to BillSync!\n\n"
            f"Your login has been created.\n"
            f"Email: {to_email}\n"
            f"Temporary Password: {temp_password}\n\n"
            "Please log in and change your password immediately using the Change Password option.\n\n"
            "Regards,\nBillSync Team"
        )
        html = f"""
        <html>
          <body style='font-family: Arial, sans-serif; color:#333;'>
            <h2>Your BillSync Account Details</h2>
            <p>Your login has been created.</p>
            <p><strong>Email:</strong> {to_email}<br/>
               <strong>Temporary Password:</strong> {temp_password}</p>
            <p>Please log in and change your password immediately using the Change Password option.</p>
            <p>Regards,<br/>BillSync Team</p>
          </body>
        </html>
        """
        msg = Message(subject=subject, recipients=[to_email], body=body, html=html)
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Error sending welcome email: {str(e)}")
        return False

# Database Models
# Auth/User model
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), default='user')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'role': self.role,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }

class Customer(db.Model):
    __tablename__ = 'customers'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    company = db.Column(db.String(100))
    gstin = db.Column(db.String(15))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    invoices = db.relationship('Invoice', backref='customer', lazy=True)

class Product(db.Model):
    __tablename__ = 'products'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    sku = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.Text)
    # 'price' is treated as selling price
    price = db.Column(db.Numeric(10, 2), nullable=False)
    # New: purchase price (cost price)
    purchase_price = db.Column(db.Numeric(10, 2), default=0)
    stock_quantity = db.Column(db.Integer, default=0)
    min_stock_level = db.Column(db.Integer, default=10)
    category = db.Column(db.String(50))
    unit = db.Column(db.String(20), default='piece')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    invoice_items = db.relationship('InvoiceItem', backref='product', lazy=True)

class Invoice(db.Model):
    __tablename__ = 'invoices'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    invoice_number = db.Column(db.String(50), unique=True, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    invoice_date = db.Column(db.Date, nullable=False)
    due_date = db.Column(db.Date)
    subtotal = db.Column(db.Numeric(10, 2), default=0)
    tax_amount = db.Column(db.Numeric(10, 2), default=0)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, paid, overdue, cancelled
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    items = db.relationship('InvoiceItem', backref='invoice', lazy=True, cascade='all, delete-orphan')

class InvoiceItem(db.Model):
    __tablename__ = 'invoice_items'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoices.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    total_price = db.Column(db.Numeric(10, 2), nullable=False)

# Payments model
class Payment(db.Model):
    __tablename__ = 'payments'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoices.id'), nullable=False)
    order_id = db.Column(db.String(64))
    payment_id = db.Column(db.String(64))
    method = db.Column(db.String(50))
    amount = db.Column(db.Numeric(10, 2))
    currency = db.Column(db.String(10), default='INR')
    status = db.Column(db.String(30))
    raw_payload = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500

# Create tables at import time within app context (Flask 2.3 compatible)
try:
    with app.app_context():
        db.create_all()
except Exception as e:
    print(f"DB create_all failed: {e}")

# Auth endpoints
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json() or {}
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already registered'}), 400
        role = (data.get('role') or 'user').strip().lower()
        if role not in ('user', 'admin'):
            return jsonify({'error': 'Invalid role. Allowed: user, admin'}), 400
        user = User(email=email, password_hash=generate_password_hash(password), role=role)
        db.session.add(user)
        db.session.commit()
        token = create_access_token(identity={'id': user.id, 'email': user.email})
        return jsonify({'access_token': token, 'user': user.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# --- Razorpay REST helper ---
def rzp_request(method: str, path: str, json_body: dict):
    key_id = app.config.get('RZP_KEY_ID')
    key_secret = app.config.get('RZP_KEY_SECRET')
    if not key_id or not key_secret:
        raise RuntimeError('Razorpay keys not configured')
    url = f"https://api.razorpay.com/v1{path}"
    resp = requests.request(method.upper(), url, auth=(key_id, key_secret), json=json_body, timeout=20)
    if resp.status_code >= 400:
        raise RuntimeError(f"Razorpay API error {resp.status_code}: {resp.text}")
    return resp.json()

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json() or {}
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''
        user = User.query.filter_by(email=email).first()
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({'error': 'Invalid credentials'}), 401
        token = create_access_token(identity={'id': user.id, 'email': user.email})
        return jsonify({'access_token': token, 'user': user.to_dict()})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/me', methods=['GET'])
def me():
    ident = get_jwt_identity() or {}
    user = User.query.get(ident.get('id')) if ident else None
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'user': user.to_dict()})

# Change password (JWT required)
@app.route('/api/auth/change-password', methods=['POST'])
def change_password():
    try:
        ident = get_jwt_identity() or {}
        user = User.query.get(ident.get('id')) if ident else None
        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json() or {}
        current_password = data.get('current_password') or ''
        new_password = data.get('new_password') or ''
        if not current_password or not new_password:
            return jsonify({'error': 'current_password and new_password are required'}), 400

        if not check_password_hash(user.password_hash, current_password):
            return jsonify({'error': 'Current password is incorrect'}), 400

        if len(new_password) < 6:
            return jsonify({'error': 'New password must be at least 6 characters'}), 400

        user.password_hash = generate_password_hash(new_password)
        db.session.commit()
        return jsonify({'message': 'Password changed successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Customer API endpoints
@app.route('/api/customers', methods=['GET'])
def get_customers():
    try:
        customers = Customer.query.all()
        return jsonify([{
            'id': c.id,
            'name': c.name,
            'email': c.email,
            'phone': c.phone,
            'address': c.address,
            'company': c.company,
            'gstin': c.gstin,
            'created_at': c.created_at.isoformat(),
            'updated_at': c.updated_at.isoformat()
        } for c in customers])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/invoices/<int:invoice_id>/email', methods=['POST'])
def email_invoice(invoice_id):
    try:
        invoice = Invoice.query.get_or_404(invoice_id)
        data = request.get_json() or {}
        to_email = data.get('toEmail') or (invoice.customer.email if invoice.customer else None)
        if not to_email:
            return jsonify({'error': 'Recipient email not available'}), 400

        # Reuse existing email utility; PDF attachment currently not supported in backend
        sent = send_invoice_email(invoice, to_email)
        if sent:
            return jsonify({'status': 'sent', 'message': 'Email sent successfully'})
        else:
            return jsonify({'error': 'Failed to send email'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

## Payments removed: no checkout or webhook endpoints

@app.route('/api/customers', methods=['POST'])
def create_customer():
    try:
        data = request.get_json()
        
        customer = Customer(
            name=data['name'],
            email=data['email'],
            phone=data.get('phone'),
            address=data.get('address'),
            company=data.get('company'),
            gstin=data.get('gstin')
        )
        
        db.session.add(customer)
        db.session.commit()
        # Auto-create login for this customer if not exists
        user_created = False
        temp_password = None
        try:
            existing_user = User.query.filter_by(email=customer.email.lower()).first()
            if not existing_user:
                # Generate a random 6-digit numeric password
                temp_password = ''.join(secrets.choice(string.digits) for _ in range(6))
                new_user = User(
                    email=customer.email.lower(),
                    password_hash=generate_password_hash(temp_password),
                    role='user'
                )
                db.session.add(new_user)
                db.session.commit()
                user_created = True
                # Send welcome email with credentials
                try:
                    send_welcome_email(customer.email, temp_password)
                except Exception as mail_err:
                    print(f"Failed to send welcome email: {mail_err}")
        except Exception as user_err:
            db.session.rollback()
            print(f"Auto user creation error: {user_err}")

        return jsonify({
            'id': customer.id,
            'name': customer.name,
            'email': customer.email,
            'phone': customer.phone,
            'address': customer.address,
            'company': customer.company,
            'gstin': customer.gstin,
            'created_at': customer.created_at.isoformat(),
            'updated_at': customer.updated_at.isoformat(),
            'login_created': user_created
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/customers/<int:customer_id>', methods=['GET'])
def get_customer(customer_id):
    try:
        customer = Customer.query.get_or_404(customer_id)
        return jsonify({
            'id': customer.id,
            'name': customer.name,
            'email': customer.email,
            'phone': customer.phone,
            'address': customer.address,
            'company': customer.company,
            'gstin': customer.gstin,
            'created_at': customer.created_at.isoformat(),
            'updated_at': customer.updated_at.isoformat()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/customers/<int:customer_id>', methods=['PUT'])
def update_customer(customer_id):
    try:
        customer = Customer.query.get_or_404(customer_id)
        data = request.get_json()
        
        customer.name = data.get('name', customer.name)
        customer.email = data.get('email', customer.email)
        customer.phone = data.get('phone', customer.phone)
        customer.address = data.get('address', customer.address)
        customer.company = data.get('company', customer.company)
        customer.gstin = data.get('gstin', customer.gstin)
        
        db.session.commit()
        
        return jsonify({
            'id': customer.id,
            'name': customer.name,
            'email': customer.email,
            'phone': customer.phone,
            'address': customer.address,
            'company': customer.company,
            'gstin': customer.gstin,
            'created_at': customer.created_at.isoformat(),
            'updated_at': customer.updated_at.isoformat()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/customers/<int:customer_id>', methods=['DELETE'])
def delete_customer(customer_id):
    try:
        customer = Customer.query.get_or_404(customer_id)
        db.session.delete(customer)
        db.session.commit()
        return jsonify({'message': 'Customer deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Product API endpoints
@app.route('/api/products', methods=['GET'])
def get_products():
    try:
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Validate pagination parameters
        if page < 1:
            page = 1
        if per_page < 1 or per_page > 100:
            per_page = 10
        
        # Query with pagination
        pagination = Product.query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        products = pagination.items
        total = pagination.total
        pages = pagination.pages
        
        return jsonify({
            'products': [{
                'id': p.id,
                'name': p.name,
                'sku': p.sku,
                'description': p.description,
                'price': float(p.price),
                'purchase_price': float(p.purchase_price or 0),
                'stock_quantity': p.stock_quantity,
                'min_stock_level': p.min_stock_level,
                'category': p.category,
                'unit': p.unit,
                'created_at': p.created_at.isoformat(),
                'updated_at': p.updated_at.isoformat()
            } for p in products],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'pages': pages,
                'has_prev': pagination.has_prev,
                'has_next': pagination.has_next
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/products', methods=['POST'])
def create_product():
    try:
        data = request.get_json()
        # Basic validation
        required_fields = ['name', 'sku', 'price']
        missing = [f for f in required_fields if f not in data or data.get(f) in (None, '', [])]
        if missing:
            return jsonify({'error': f"Missing required fields: {', '.join(missing)}"}), 400

        # Duplicate SKU check
        existing = Product.query.filter_by(sku=data['sku']).first()
        if existing:
            return jsonify({'error': 'SKU already exists. Please use a different SKU.'}), 400

        # Numeric validations
        try:
            price_val = Decimal(str(data['price']))
        except Exception:
            return jsonify({'error': 'Invalid price value'}), 400

        stock_qty = data.get('stock_quantity', 0)
        min_stock = data.get('min_stock_level', 10)
        try:
            stock_qty = int(stock_qty)
            min_stock = int(min_stock)
        except Exception:
            return jsonify({'error': 'Stock quantities must be integers'}), 400

        # Parse optional purchase_price
        purchase_price_val = Decimal('0')
        if 'purchase_price' in data and data['purchase_price'] is not None and data['purchase_price'] != '':
            try:
                purchase_price_val = Decimal(str(data['purchase_price']))
            except Exception:
                return jsonify({'error': 'Invalid purchase_price value'}), 400

        product = Product(
            name=data['name'],
            sku=data['sku'],
            description=data.get('description'),
            price=price_val,
            purchase_price=purchase_price_val,
            stock_quantity=stock_qty,
            min_stock_level=min_stock,
            category=data.get('category'),
            unit=data.get('unit', 'piece')
        )

        db.session.add(product)
        db.session.commit()
        
        return jsonify({
            'id': product.id,
            'name': product.name,
            'sku': product.sku,
            'description': product.description,
            'price': float(product.price),
            'purchase_price': float(product.purchase_price or 0),
            'stock_quantity': product.stock_quantity,
            'min_stock_level': product.min_stock_level,
            'category': product.category,
            'unit': product.unit,
            'created_at': product.created_at.isoformat(),
            'updated_at': product.updated_at.isoformat()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    try:
        product = Product.query.get_or_404(product_id)
        data = request.get_json()
        
        product.name = data.get('name', product.name)
        product.sku = data.get('sku', product.sku)
        product.description = data.get('description', product.description)
        if 'price' in data:
            product.price = Decimal(str(data['price']))
        if 'purchase_price' in data:
            product.purchase_price = Decimal(str(data['purchase_price'])) if data['purchase_price'] not in (None, '') else product.purchase_price
        product.stock_quantity = data.get('stock_quantity', product.stock_quantity)
        product.min_stock_level = data.get('min_stock_level', product.min_stock_level)
        product.category = data.get('category', product.category)
        product.unit = data.get('unit', product.unit)
        
        db.session.commit()
        
        return jsonify({
            'id': product.id,
            'name': product.name,
            'sku': product.sku,
            'description': product.description,
            'price': float(product.price),
            'purchase_price': float(product.purchase_price or 0),
            'stock_quantity': product.stock_quantity,
            'min_stock_level': product.min_stock_level,
            'category': product.category,
            'unit': product.unit,
            'created_at': product.created_at.isoformat(),
            'updated_at': product.updated_at.isoformat()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    try:
        product = Product.query.get_or_404(product_id)
        # Prevent deletion if product is referenced by any invoice items
        if product.invoice_items and len(product.invoice_items) > 0:
            return jsonify({'error': 'Cannot delete product with existing invoice items'}), 400

        db.session.delete(product)
        db.session.commit()
        return jsonify({'message': 'Product deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# --- Payments API ---
@app.route('/api/payments/create-order', methods=['POST'])
def payments_create_order():
    try:
        data = request.get_json() or {}
        invoice_id = data.get('invoice_id')
        invoice = Invoice.query.get(invoice_id)
        if not invoice:
            return jsonify({'error': 'Invoice not found'}), 404
        amount_paise = int(Decimal(str(invoice.total_amount)) * 100)
        order = rzp_request('POST', '/orders', {
            'amount': amount_paise,
            'currency': 'INR',
            'receipt': f'invoice-{invoice.id}-{datetime.now().strftime("%Y%m%d%H%M%S")}',
            'payment_capture': 1
        })
        # Store order record
        pay = Payment(
            invoice_id=invoice.id,
            order_id=order.get('id'),
            amount=Decimal(str(invoice.total_amount)),
            currency='INR',
            status=order.get('status', 'created')
        )
        db.session.add(pay)
        db.session.commit()
        return jsonify({
            'order': order,
            'key_id': app.config.get('RZP_KEY_ID')
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/payments/create-link', methods=['POST'])
def payments_create_link():
    try:
        data = request.get_json() or {}
        invoice_id = data.get('invoice_id')
        invoice = Invoice.query.get(invoice_id)
        if not invoice:
            return jsonify({'error': 'Invoice not found'}), 404
        amount_paise = int(Decimal(str(invoice.total_amount)) * 100)
        link = rzp_request('POST', '/payment_links', {
            'amount': amount_paise,
            'currency': 'INR',
            'accept_partial': False,
            'reference_id': f'invoice-{invoice.id}',
            'description': f'Payment for Invoice {invoice.invoice_number}',
            'customer': {
                'name': invoice.customer.name if invoice.customer else 'Customer',
                'email': invoice.customer.email if invoice.customer else None,
            },
            'notify': {'email': True},
            'reminder_enable': True
        })
        # Record a payment link as pending payment
        pay = Payment(
            invoice_id=invoice.id,
            order_id=link.get('id'),
            amount=Decimal(str(invoice.total_amount)),
            currency='INR',
            status=link.get('status', 'created'),
            raw_payload=json.dumps(link)
        )
        db.session.add(pay)
        db.session.commit()
        return jsonify({'payment_link': link})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def _verify_webhook_signature(body_bytes, signature, secret):
    digest = hmac.new(bytes(secret, 'utf-8'), body_bytes, hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest, signature)

@app.route('/api/payments/webhook', methods=['POST'])
def payments_webhook():
    try:
        webhook_secret = app.config.get('RZP_WEBHOOK_SECRET')
        if not webhook_secret:
            return jsonify({'error': 'Webhook secret not configured'}), 500
        signature = request.headers.get('X-Razorpay-Signature')
        body_bytes = request.get_data()
        if not signature or not _verify_webhook_signature(body_bytes, signature, webhook_secret):
            return jsonify({'error': 'Invalid signature'}), 400
        payload = request.get_json() or {}
        event = payload.get('event')
        entity = payload.get('payload', {}).get('payment', {}).get('entity') or {}
        order_id = entity.get('order_id') or payload.get('payload', {}).get('order', {}).get('entity', {}).get('id')
        payment_id = entity.get('id')
        amount = Decimal(str(entity.get('amount', 0))) / 100 if entity.get('amount') is not None else None
        status = entity.get('status')
        method = entity.get('method')

        # Find Payment by order_id
        payment_rec = Payment.query.filter_by(order_id=order_id).first()
        if payment_rec:
            payment_rec.payment_id = payment_id or payment_rec.payment_id
            payment_rec.status = status or payment_rec.status
            payment_rec.method = method or payment_rec.method
            payment_rec.amount = amount or payment_rec.amount
            payment_rec.raw_payload = json.dumps(payload)
            db.session.commit()
            # Update invoice status if paid
            if status in ('captured', 'authorized', 'paid'):
                inv = Invoice.query.get(payment_rec.invoice_id)
                if inv:
                    inv.status = 'paid'
                    db.session.commit()
        return jsonify({'status': 'ok'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Invoice API endpoints
@app.route('/api/invoices', methods=['GET'])
def get_invoices():
    try:
        status = request.args.get('status')
        
        if status:
            invoices = Invoice.query.filter_by(status=status).all()
        else:
            invoices = Invoice.query.all()
        
        return jsonify([{
            'id': inv.id,
            'invoice_number': inv.invoice_number,
            'customer_id': inv.customer_id,
            'customer_name': inv.customer.name if inv.customer else None,
            'invoice_date': inv.invoice_date.isoformat(),
            'due_date': inv.due_date.isoformat() if inv.due_date else None,
            'subtotal': float(inv.subtotal),
            'tax_amount': float(inv.tax_amount),
            'total_amount': float(inv.total_amount),
            'status': inv.status,
            'notes': inv.notes,
            'created_at': inv.created_at.isoformat(),
            'updated_at': inv.updated_at.isoformat(),
            'items': [{
                'id': item.id,
                'product_id': item.product_id,
                'product_name': item.product.name if item.product else None,
                'quantity': item.quantity,
                'unit_price': float(item.unit_price),
                'total_price': float(item.total_price)
            } for item in inv.items]
        } for inv in invoices])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/invoices', methods=['POST'])
def create_invoice():
    try:
        data = request.get_json()
        
        # Generate invoice number if not provided
        invoice_number = data.get('invoice_number', f"INV-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
        
        # --- Date validations ---
        if not data.get('invoice_date'):
            return jsonify({'error': 'invoice_date is required and must be today'}), 400
        try:
            invoice_date_obj = datetime.strptime(data['invoice_date'], '%Y-%m-%d').date()
        except Exception:
            return jsonify({'error': 'invoice_date must be in YYYY-MM-DD format'}), 400
        today = date.today()
        if invoice_date_obj != today:
            return jsonify({'error': 'Invoice date must be today'}), 400
        
        # due_date: default +30 days from invoice_date if missing
        if data.get('due_date'):
            try:
                due_date_obj = datetime.strptime(data['due_date'], '%Y-%m-%d').date()
            except Exception:
                return jsonify({'error': 'due_date must be in YYYY-MM-DD format'}), 400
        else:
            due_date_obj = invoice_date_obj + timedelta(days=30)
        
        # due_date must be strictly after invoice_date
        if not (due_date_obj > invoice_date_obj):
            return jsonify({'error': 'Due date must be after the invoice date'}), 400
        
        # Calculate totals
        subtotal = Decimal('0')
        items = []
        
        for item_data in data['items']:
            product = Product.query.get(item_data['product_id'])
            if not product:
                return jsonify({'error': f"Product with ID {item_data['product_id']} not found"}), 400
            
            quantity = item_data['quantity']
            unit_price = Decimal(str(item_data['unit_price']))
            total_price = quantity * unit_price
            
            subtotal += total_price
            
            # Create invoice item
            invoice_item = InvoiceItem(
                product_id=item_data['product_id'],
                quantity=quantity,
                unit_price=unit_price,
                total_price=total_price
            )
            items.append(invoice_item)
            
            # Update product stock
            if product.stock_quantity >= quantity:
                product.stock_quantity -= quantity
            else:
                return jsonify({'error': f"Insufficient stock for product {product.name}"}), 400
        
        # Calculate tax (assuming 18% GST)
        tax_rate = Decimal('0.18')
        tax_amount = subtotal * tax_rate
        total_amount = subtotal + tax_amount
        
        # Create invoice
        invoice = Invoice(
            invoice_number=invoice_number,
            customer_id=data['customer_id'],
            invoice_date=invoice_date_obj,
            due_date=due_date_obj,
            subtotal=subtotal,
            tax_amount=tax_amount,
            total_amount=total_amount,
            status=data.get('status', 'pending'),
            notes=data.get('notes')
        )
        
        # Add items to invoice
        invoice.items = items
        
        db.session.add(invoice)
        db.session.commit()
        
        # Send email to customer if email is available
        email_sent = False
        if invoice.customer and invoice.customer.email:
            try:
                email_sent = send_invoice_email(invoice, invoice.customer.email)
            except Exception as e:
                print(f"Failed to send email: {str(e)}")
                # Don't fail the invoice creation if email fails
        
        response_data = {
            'id': invoice.id,
            'invoice_number': invoice.invoice_number,
            'customer_id': invoice.customer_id,
            'customer_name': invoice.customer.name if invoice.customer else None,
            'invoice_date': invoice.invoice_date.isoformat(),
            'due_date': invoice.due_date.isoformat() if invoice.due_date else None,
            'subtotal': float(invoice.subtotal),
            'tax_amount': float(invoice.tax_amount),
            'total_amount': float(invoice.total_amount),
            'status': invoice.status,
            'notes': invoice.notes,
            'created_at': invoice.created_at.isoformat(),
            'updated_at': invoice.updated_at.isoformat(),
            'items': [{
                'id': item.id,
                'product_id': item.product_id,
                'product_name': item.product.name if item.product else None,
                'quantity': item.quantity,
                'unit_price': float(item.unit_price),
                'total_price': float(item.total_price)
            } for item in invoice.items],
            'email_sent': email_sent
        }
        
        if email_sent:
            response_data['message'] = 'Invoice created and email sent successfully'
        else:
            response_data['message'] = 'Invoice created successfully (email not sent)'
            
        return jsonify(response_data), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/invoices/<int:invoice_id>', methods=['GET'])
def get_invoice(invoice_id):
    try:
        invoice = Invoice.query.get_or_404(invoice_id)
        return jsonify({
            'id': invoice.id,
            'invoice_number': invoice.invoice_number,
            'customer_id': invoice.customer_id,
            'customer_name': invoice.customer.name if invoice.customer else None,
            'customer_email': invoice.customer.email if invoice.customer else None,
            'customer_phone': invoice.customer.phone if invoice.customer else None,
            'customer_address': invoice.customer.address if invoice.customer else None,
            'customer_company': invoice.customer.company if invoice.customer else None,
            'customer_gstin': invoice.customer.gstin if invoice.customer else None,
            'invoice_date': invoice.invoice_date.isoformat(),
            'due_date': invoice.due_date.isoformat() if invoice.due_date else None,
            'subtotal': float(invoice.subtotal),
            'tax_amount': float(invoice.tax_amount),
            'total_amount': float(invoice.total_amount),
            'status': invoice.status,
            'notes': invoice.notes,
            'created_at': invoice.created_at.isoformat(),
            'updated_at': invoice.updated_at.isoformat(),
            'items': [{
                'id': item.id,
                'product_id': item.product_id,
                'product_name': item.product.name if item.product else None,
                'product_sku': item.product.sku if item.product else None,
                'product_description': item.product.description if item.product else None,
                'quantity': item.quantity,
                'unit_price': float(item.unit_price),
                'total_price': float(item.total_price)
            } for item in invoice.items]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/invoices/<int:invoice_id>', methods=['PUT'])
def update_invoice(invoice_id):
    try:
        invoice = Invoice.query.get_or_404(invoice_id)
        data = request.get_json()
        
        # Update basic fields
        invoice.customer_id = data.get('customer_id', invoice.customer_id)
        # --- Date validations for update ---
        if 'invoice_date' in data:
            try:
                new_inv_date = datetime.strptime(data['invoice_date'], '%Y-%m-%d').date()
            except Exception:
                return jsonify({'error': 'invoice_date must be in YYYY-MM-DD format'}), 400
            if new_inv_date != date.today():
                return jsonify({'error': 'Invoice date must be today'}), 400
            invoice.invoice_date = new_inv_date
        
        if 'due_date' in data:
            try:
                new_due_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date()
            except Exception:
                return jsonify({'error': 'due_date must be in YYYY-MM-DD format'}), 400
            # If invoice_date was updated above, use that; else current invoice.invoice_date
            base_inv_date = invoice.invoice_date
            if not (new_due_date > base_inv_date):
                return jsonify({'error': 'Due date must be after the invoice date'}), 400
            invoice.due_date = new_due_date
        invoice.status = data.get('status', invoice.status)
        invoice.notes = data.get('notes', invoice.notes)
        
        # Recalculate totals if items are updated
        if 'items' in data:
            # Remove existing items
            for item in invoice.items:
                db.session.delete(item)
            
            # Add new items
            subtotal = Decimal('0')
            for item_data in data['items']:
                product = Product.query.get(item_data['product_id'])
                if not product:
                    return jsonify({'error': f"Product with ID {item_data['product_id']} not found"}), 400
                
                quantity = item_data['quantity']
                unit_price = Decimal(str(item_data['unit_price']))
                total_price = quantity * unit_price
                
                subtotal += total_price
                
                invoice_item = InvoiceItem(
                    invoice_id=invoice.id,
                    product_id=item_data['product_id'],
                    quantity=quantity,
                    unit_price=unit_price,
                    total_price=total_price
                )
                db.session.add(invoice_item)
            
            # Update totals
            tax_rate = Decimal('0.18')
            tax_amount = subtotal * tax_rate
            total_amount = subtotal + tax_amount
            
            invoice.subtotal = subtotal
            invoice.tax_amount = tax_amount
            invoice.total_amount = total_amount
        
        db.session.commit()
        
        return jsonify({
            'id': invoice.id,
            'invoice_number': invoice.invoice_number,
            'customer_id': invoice.customer_id,
            'customer_name': invoice.customer.name if invoice.customer else None,
            'invoice_date': invoice.invoice_date.isoformat(),
            'due_date': invoice.due_date.isoformat() if invoice.due_date else None,
            'subtotal': float(invoice.subtotal),
            'tax_amount': float(invoice.tax_amount),
            'total_amount': float(invoice.total_amount),
            'status': invoice.status,
            'notes': invoice.notes,
            'created_at': invoice.created_at.isoformat(),
            'updated_at': invoice.updated_at.isoformat(),
            'items': [{
                'id': item.id,
                'product_id': item.product_id,
                'product_name': item.product.name if item.product else None,
                'quantity': item.quantity,
                'unit_price': float(item.unit_price),
                'total_price': float(item.total_price)
            } for item in invoice.items]
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/invoices/<int:invoice_id>', methods=['DELETE'])
def delete_invoice(invoice_id):
    try:
        invoice = Invoice.query.get_or_404(invoice_id)

        # Restore product stock for each invoice item
        for item in invoice.items:
            product = Product.query.get(item.product_id)
            if product:
                product.stock_quantity = (product.stock_quantity or 0) + (item.quantity or 0)

        # Now delete the invoice (items will be deleted due to cascade)
        db.session.delete(invoice)
        db.session.commit()
        return jsonify({'message': 'Invoice deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/invoices/<int:invoice_id>/paid', methods=['PATCH'])
def mark_invoice_paid(invoice_id):
    try:
        invoice = Invoice.query.get_or_404(invoice_id)
        invoice.status = 'paid'
        invoice.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'id': invoice.id,
            'invoice_number': invoice.invoice_number,
            'status': invoice.status,
            'updated_at': invoice.updated_at.isoformat()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/invoices/stats', methods=['GET'])
def get_invoice_stats():
    try:
        from sqlalchemy import func
        
        # Get total counts by status
        status_counts = db.session.query(
            Invoice.status,
            func.count(Invoice.id)
        ).group_by(Invoice.status).all()
        
        # Get total revenue
        total_revenue = db.session.query(func.sum(Invoice.total_amount)).filter(
            Invoice.status == 'paid'
        ).scalar() or 0
        
        # Get pending amount
        pending_amount = db.session.query(func.sum(Invoice.total_amount)).filter(
            Invoice.status == 'pending'
        ).scalar() or 0
        
        # Get overdue amount
        overdue_amount = db.session.query(func.sum(Invoice.total_amount)).filter(
            Invoice.status == 'overdue'
        ).scalar() or 0
        
        # Get monthly revenue for the last 6 months
        monthly_revenue = db.session.query(
            func.date_format(Invoice.invoice_date, '%Y-%m').label('month'),
            func.sum(Invoice.total_amount).label('revenue')
        ).filter(
            Invoice.status == 'paid',
            Invoice.invoice_date >= datetime.now().replace(day=1).replace(month=datetime.now().month - 5)
        ).group_by('month').order_by('month').all()
        
        return jsonify({
            'status_counts': {k: v for k, v in status_counts},
            'total_revenue_paid': float(total_revenue),
            'pending_amount': float(pending_amount),
            'overdue_amount': float(overdue_amount)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Profit summary endpoint
@app.route('/api/profits/summary', methods=['GET'])
def get_profit_summary():
    try:
        from sqlalchemy import func

        # Overall profit across all invoices
        overall_profit = db.session.query(
            func.coalesce(
                func.sum((InvoiceItem.unit_price - func.coalesce(Product.purchase_price, 0)) * InvoiceItem.quantity),
                0
            )
        ).join(Product, InvoiceItem.product_id == Product.id).scalar() or 0

        # Per-client profit breakdown (single-line chain to avoid indentation issues)
        rows = db.session.query(
            Customer.id.label('customer_id'),
            Customer.name.label('customer_name'),
            func.coalesce(
                func.sum((InvoiceItem.unit_price - func.coalesce(Product.purchase_price, 0)) * InvoiceItem.quantity),
                0
            ).label('profit'),
            func.count(func.distinct(Invoice.id)).label('invoice_count'),
            func.coalesce(func.sum(Invoice.total_amount), 0).label('revenue')
        ).join(Invoice, Invoice.customer_id == Customer.id) \
         .join(InvoiceItem, InvoiceItem.invoice_id == Invoice.id) \
         .join(Product, Product.id == InvoiceItem.product_id) \
         .group_by(Customer.id, Customer.name) \
         .order_by(
            func.coalesce(
                func.sum((InvoiceItem.unit_price - func.coalesce(Product.purchase_price, 0)) * InvoiceItem.quantity),
                0
            ).desc()
         ).all()

        per_client = [
            {
                'customer_id': r.customer_id,
                'customer_name': r.customer_name,
                'profit': float(r.profit or 0),
                'invoice_count': int(r.invoice_count or 0),
                'revenue': float(r.revenue or 0),
                'profit_margin_pct': (float(r.profit) / float(r.revenue) * 100.0) if (r.revenue and float(r.revenue) != 0) else 0.0
            }
            for r in rows
        ]

        return jsonify({
            'overall_profit': float(overall_profit),
            'per_client': per_client
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Run server when executed directly (placed at the very end so all routes are registered first)
if __name__ == '__main__':
    with app.app_context():
        try:
            db.create_all()
        except Exception as e:
            print(f"DB init warning: {e}")
    print('Starting BillSync backend on http://localhost:5000 ...')
    app.run(host='0.0.0.0', port=5000, debug=True)