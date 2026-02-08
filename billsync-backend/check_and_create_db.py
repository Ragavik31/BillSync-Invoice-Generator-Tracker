from app import app, db, Customer, Product, Invoice, InvoiceItem

def check_and_create_database():
    with app.app_context():
        try:
            # Try to create all tables
            db.create_all()
            print("✅ Database tables created successfully!")
            
            # Check if any data exists
            customer_count = Customer.query.count()
            product_count = Product.query.count()
            invoice_count = Invoice.query.count()
            
            print(f"📊 Current database status:")
            print(f"   Customers: {customer_count}")
            print(f"   Products: {product_count}")
            print(f"   Invoices: {invoice_count}")
            
            if customer_count == 0 and product_count == 0 and invoice_count == 0:
                print("📝 Database is empty - ready for initialization!")
            else:
                print("✅ Database already contains data!")
                
        except Exception as e:
            print(f"❌ Error checking database: {e}")

if __name__ == "__main__":
    check_and_create_database()