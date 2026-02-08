from app import app, db, Product

app.app_context().push()

# Hardcoded products from CreateInvoice.js
hardcoded_products = [
    {'name': 'Copy Paper A4 (500 sheets)', 'sku': 'CP-A4-500', 'price': 1250, 'stock_quantity': 100, 'min_stock_level': 10, 'unit': 'reams', 'category': 'Office Supplies', 'description': 'High quality A4 copy paper, 500 sheets per ream'},
    {'name': 'Black Ink Cartridge HP21', 'sku': 'INK-BLK-HP21', 'price': 2500, 'stock_quantity': 50, 'min_stock_level': 5, 'unit': 'pcs', 'category': 'Printer Supplies', 'description': 'Original HP21 black ink cartridge'},
    {'name': 'Stapler Standard', 'sku': 'STP-STD-01', 'price': 1575, 'stock_quantity': 75, 'min_stock_level': 8, 'unit': 'pcs', 'category': 'Office Supplies', 'description': 'Standard office stapler'},
    {'name': 'Ballpoint Pens (Box of 50)', 'sku': 'PEN-BLU-50', 'price': 1800, 'stock_quantity': 200, 'min_stock_level': 20, 'unit': 'box', 'category': 'Writing Instruments', 'description': 'Blue ballpoint pens, box of 50'},
    {'name': 'Notebooks (Pack of 10)', 'sku': 'NB-A5-10', 'price': 2250, 'stock_quantity': 150, 'min_stock_level': 15, 'unit': 'pack', 'category': 'Stationery', 'description': 'A5 size notebooks, pack of 10'},
    {'name': 'File Folders (Box of 100)', 'sku': 'FF-STD-100', 'price': 3500, 'stock_quantity': 80, 'min_stock_level': 8, 'unit': 'box', 'category': 'Office Supplies', 'description': 'Standard file folders, box of 100'}
]

# Check which products already exist
existing_skus = [p.sku for p in Product.query.all()]
products_added = 0

for product_data in hardcoded_products:
    if product_data['sku'] not in existing_skus:
        new_product = Product(**product_data)
        db.session.add(new_product)
        products_added += 1
        print(f'Added: {product_data["name"]}')

if products_added > 0:
    db.session.commit()
    print(f'Total new products added: {products_added}')
else:
    print('All products already exist in database')

print(f'Total products in database: {Product.query.count()}')