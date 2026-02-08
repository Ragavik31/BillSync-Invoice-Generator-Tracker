from app import app, db, Customer, Product, Invoice, InvoiceItem
from datetime import datetime, timedelta
from decimal import Decimal

def init_sample_data():
    with app.app_context():
        # Create all tables
        db.create_all()
        
        # Check if data already exists
        if Customer.query.first():
            print("Sample data already exists. Skipping initialization.")
            return
        
        print("Creating sample customers...")
        customers = [
            Customer(
                name="ABC Office Supplies",
                email="abc@example.com",
                phone="9876543210",
                address="123 Business Street, Mumbai - 400001",
                company="ABC Office Supplies Pvt Ltd",
                gstin="27AABCU9603R1ZX"
            ),
            Customer(
                name="Tech Solutions Ltd",
                email="tech@example.com",
                phone="9876543211",
                address="456 Technology Park, Bangalore - 560001",
                company="Tech Solutions Limited",
                gstin="29AADCT1332L1ZU"
            ),
            Customer(
                name="Global Enterprises",
                email="global@example.com",
                phone="9876543212",
                address="789 Corporate Tower, Delhi - 110001",
                company="Global Enterprises India",
                gstin="07AAACG1234R1ZV"
            ),
            Customer(
                name="Smart Office Co",
                email="smart@example.com",
                phone="9876543213",
                address="321 Innovation Hub, Pune - 411001",
                company="Smart Office Company",
                gstin="27AABCS2468M1Z2"
            )
        ]
        
        for customer in customers:
            db.session.add(customer)
        db.session.commit()
        
        print("Creating sample products...")
        products = [
            Product(
                name="Copy Paper A4",
                sku="CP-A4-500",
                description="Premium A4 copy paper, 500 sheets per ream",
                price=Decimal("250.00"),
                stock_quantity=150,
                min_stock_level=20,
                category="Paper",
                unit="ream"
            ),
            Product(
                name="Black Ink Cartridge",
                sku="INK-BLK-HP21",
                description="HP 21 Black Ink Cartridge",
                price=Decimal("850.00"),
                stock_quantity=25,
                min_stock_level=15,
                category="Ink & Toner",
                unit="piece"
            ),
            Product(
                name="Stapler Standard",
                sku="STP-STD-01",
                description="Standard office stapler with 1000 staples",
                price=Decimal("120.00"),
                stock_quantity=35,
                min_stock_level=25,
                category="Stationery",
                unit="piece"
            ),
            Product(
                name="Ball Pen Blue",
                sku="PEN-BLU-10",
                description="Blue ballpoint pen, pack of 10",
                price=Decimal("150.00"),
                stock_quantity=200,
                min_stock_level=50,
                category="Writing Instruments",
                unit="pack"
            ),
            Product(
                name="Notebook A5",
                sku="NB-A5-100",
                description="A5 size notebook, 100 pages",
                price=Decimal("45.00"),
                stock_quantity=80,
                min_stock_level=30,
                category="Notebooks",
                unit="piece"
            ),
            Product(
                name="Calculator Basic",
                sku="CAL-BAS-12D",
                description="12-digit basic calculator",
                price=Decimal("280.00"),
                stock_quantity=15,
                min_stock_level=10,
                category="Electronics",
                unit="piece"
            )
        ]
        
        for product in products:
            db.session.add(product)
        db.session.commit()
        
        print("Creating sample invoices...")
        # Create some sample invoices
        invoice_date = datetime.now().date() - timedelta(days=30)
        
        # Invoice 1
        invoice1 = Invoice(
            invoice_number="INV-2024-001",
            customer_id=1,
            invoice_date=invoice_date,
            due_date=invoice_date + timedelta(days=15),
            subtotal=Decimal("500.00"),
            tax_amount=Decimal("90.00"),
            total_amount=Decimal("590.00"),
            status="paid",
            notes="First invoice for ABC Office Supplies"
        )
        db.session.add(invoice1)
        db.session.flush()
        
        # Add items to invoice 1
        item1 = InvoiceItem(
            invoice_id=invoice1.id,
            product_id=1,
            quantity=2,
            unit_price=Decimal("250.00"),
            total_price=Decimal("500.00")
        )
        db.session.add(item1)
        
        # Invoice 2
        invoice2 = Invoice(
            invoice_number="INV-2024-002",
            customer_id=2,
            invoice_date=invoice_date + timedelta(days=5),
            due_date=invoice_date + timedelta(days=20),
            subtotal=Decimal("970.00"),
            tax_amount=Decimal("174.60"),
            total_amount=Decimal("1144.60"),
            status="pending",
            notes="Tech Solutions order"
        )
        db.session.add(invoice2)
        db.session.flush()
        
        # Add items to invoice 2
        item2 = InvoiceItem(
            invoice_id=invoice2.id,
            product_id=2,
            quantity=1,
            unit_price=Decimal("850.00"),
            total_price=Decimal("850.00")
        )
        item3 = InvoiceItem(
            invoice_id=invoice2.id,
            product_id=3,
            quantity=1,
            unit_price=Decimal("120.00"),
            total_price=Decimal("120.00")
        )
        db.session.add(item2)
        db.session.add(item3)
        
        # Invoice 3 (overdue)
        invoice3 = Invoice(
            invoice_number="INV-2024-003",
            customer_id=3,
            invoice_date=invoice_date - timedelta(days=20),
            due_date=invoice_date - timedelta(days=5),
            subtotal=Decimal("195.00"),
            tax_amount=Decimal("35.10"),
            total_amount=Decimal("230.10"),
            status="overdue",
            notes="Overdue payment from Global Enterprises"
        )
        db.session.add(invoice3)
        db.session.flush()
        
        # Add items to invoice 3
        item4 = InvoiceItem(
            invoice_id=invoice3.id,
            product_id=4,
            quantity=1,
            unit_price=Decimal("150.00"),
            total_price=Decimal("150.00")
        )
        item5 = InvoiceItem(
            invoice_id=invoice3.id,
            product_id=5,
            quantity=1,
            unit_price=Decimal("45.00"),
            total_price=Decimal("45.00")
        )
        db.session.add(item4)
        db.session.add(item5)
        
        # Commit all changes
        db.session.commit()
        
        print("Sample data created successfully!")
        print(f"Created {len(customers)} customers")
        print(f"Created {len(products)} products")
        print(f"Created 3 sample invoices")
        
        # Update product stock based on invoice items
        for item in [item1, item2, item3, item4, item5]:
            product = Product.query.get(item.product_id)
            product.stock_quantity -= item.quantity
        
        db.session.commit()
        print("Updated product stock levels")

if __name__ == "__main__":
    init_sample_data()