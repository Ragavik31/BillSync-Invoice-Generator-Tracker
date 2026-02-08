from app import app, db, Product
from decimal import Decimal

def add_sample_products():
    with app.app_context():
        # Check if products already exist
        existing_count = Product.query.count()
        if existing_count > 0:
            print(f"Products already exist: {existing_count} products found")
            return
        
        # Sample products with various stock levels
        sample_products = [
            {
                'name': 'Ballpoint Pens',
                'sku': 'PEN-BALL-100',
                'description': 'Black ink, medium point (pack of 100)',
                'price': Decimal('425.00'),
                'stock_quantity': 25,
                'min_stock_level': 20,
                'category': 'Writing Instruments',
                'unit': 'pack'
            },
            {
                'name': 'Printer Paper',
                'sku': 'PAPER-A4-500',
                'description': 'A4 size, 80gsm (ream of 500 sheets)',
                'price': Decimal('340.00'),
                'stock_quantity': 5,
                'min_stock_level': 15,
                'category': 'Paper Products',
                'unit': 'ream'
            },
            {
                'name': 'Stapler',
                'sku': 'STAPLER-01',
                'description': 'Standard office stapler',
                'price': Decimal('850.00'),
                'stock_quantity': 0,
                'min_stock_level': 5,
                'category': 'Binding and Fastening',
                'unit': 'piece'
            },
            {
                'name': 'Sticky Notes',
                'sku': 'STICKY-100',
                'description': 'Yellow, 3x3 inches (pack of 100 sheets)',
                'price': Decimal('255.00'),
                'stock_quantity': 3,
                'min_stock_level': 10,
                'category': 'Paper Products',
                'unit': 'pack'
            },
            {
                'name': 'Ink Cartridges',
                'sku': 'INK-CART-01',
                'description': 'Black ink for HP printers',
                'price': Decimal('2125.00'),
                'stock_quantity': 12,
                'min_stock_level': 8,
                'category': 'Printing and Duplicating',
                'unit': 'piece'
            }
        ]
        
        # Add products to database
        for product_data in sample_products:
            product = Product(**product_data)
            db.session.add(product)
        
        db.session.commit()
        print(f"Added {len(sample_products)} sample products successfully!")
        
        # Show summary
        all_products = Product.query.all()
        low_stock = [p for p in all_products if p.stock_quantity < p.min_stock_level]
        out_of_stock = [p for p in all_products if p.stock_quantity == 0]
        
        print(f"\nStock Summary:")
        print(f"Total products: {len(all_products)}")
        print(f"Low stock items: {len(low_stock)}")
        print(f"Out of stock items: {len(out_of_stock)}")
        
        if low_stock:
            print("\nLow stock items:")
            for p in low_stock:
                print(f"  - {p.name}: {p.stock_quantity} (min: {p.min_stock_level})")
        
        if out_of_stock:
            print("\nOut of stock items:")
            for p in out_of_stock:
                print(f"  - {p.name}: 0 stock")

if __name__ == '__main__':
    add_sample_products()