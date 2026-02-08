from decimal import Decimal
from app import app, db, Product
import re

# Seed dataset: (name, purchase_price, selling_price)
PRODUCTS = [
    ("Copy Paper A4", 234.60, 255.00),
    ("Black Ink Cartridge", 782.00, 850.00),
    ("Stapler Standard", 110.40, 120.00),
    ("Ball Pen Blue", 138.00, 150.00),
    ("Notebook A5", 41.40, 45.00),
    ("Calculator Basic", 257.60, 280.00),
    ("Glue", 91.99, 99.99),
    ("Ballpoint Pens (Box of 50)", 1656.00, 1800.00),
    ("Notebooks (Pack of 10)", 2070.00, 2250.00),
    ("File Folders (Box of 100)", 3220.00, 3500.00),
    ("Ball Pen (Blue, single)", 9.20, 10.00),
    ("Gel Pen (single)", 18.40, 20.00),
    ("Fountain Pen (single)", 92.00, 100.00),
    ("Pencil (HB, single)", 9.20, 10.00),
    ("Pencil Box (12 pcs)", 34.04, 37.00),
    ("Highlighter (single)", 17.48, 19.00),
    ("Eraser (single)", 2.76, 3.00),
    ("Sharpener (single)", 13.80, 15.00),
    ("Whiteboard Marker (single)", 18.40, 20.00),
    ("Permanent Marker (single)", 23.00, 25.00),
    ("A4 Paper (500 sheets, ream)", 322.00, 350.00),
    ("Sticky Notes (3x3, pack)", 32.20, 35.00),
    ("Notebook/Register (single)", 55.20, 60.00),
    ("File Cover (single)", 13.80, 15.00),
    ("Plastic Folder (single)", 27.60, 30.00),
    ("Document Bag (single)", 27.60, 30.00),
    ("Stapler (small)", 115.00, 125.00),
    ("Stapler pins (No. 10, box)", 115.00, 125.00),
    ("Paper Punch Machine (single)", 156.40, 170.00),
    ("Scissors (single)", 46.00, 50.00),
    ("Paper Cutter (single)", 32.20, 35.00),
    ("Rubber Bands (100g pkt)", 18.40, 20.00),
    ("Envelope (Brown, 9x4, single)", 2.76, 3.00),
    ("Glue Stick (single)", 18.40, 20.00),
    ("Gum Tube (small)", 13.80, 15.00),
    ("Cello Tape (2\")", 27.60, 30.00),
    ("Masking Tape (1\")", 17.48, 19.00),
    ("Calculator (Basic, 12-digit)", 230.00, 250.00),
    ("Attendance Register (single)", 92.00, 100.00),
    ("Desk Duster Cloth (single)", 23.00, 25.00),
    ("Tissue Paper (box)", 41.40, 45.00),
    ("Stamp Pad (single)", 32.20, 35.00),
    ("Stamp Pad Ink (single)", 36.80, 40.00),
    ("Carbon Paper (pkt, 100 pcs)", 195.96, 213.00),
    ("Binder Clips (medium, box)", 33.12, 36.00),
    ("Cobra File (spring clip)", 27.60, 30.00),
    ("Nylon File Laces (pack)", 73.60, 80.00),
    ("Desk Organizer (single)", 165.60, 180.00),
    ("File Index/Divider Set", 41.40, 45.00),
    ("Pocket Notepad (96 pg, single)", 82.80, 90.00),
    ("Multi Passbook Holder", 183.08, 199.00),
    ("Copy Paper A4 (second entry)", 230.00, 250.00),
]

def slugify(name: str) -> str:
    s = re.sub(r"[^A-Za-z0-9]+", "-", name).strip("-")
    s = re.sub(r"-+", "-", s)
    return s.upper()[:30]

if __name__ == "__main__":
    with app.app_context():
        created = 0
        updated = 0
        for name, purchase, selling in PRODUCTS:
            # Generate a SKU from name; ensure uniqueness by suffixing if needed
            base_sku = slugify(name)
            sku = base_sku
            counter = 1
            while Product.query.filter_by(sku=sku).first() is not None:
                sku = f"{base_sku}-{counter}"
                counter += 1

            # Try to find by name first (to update existing without duplicating)
            product = Product.query.filter_by(name=name).first()
            if product:
                product.purchase_price = Decimal(str(purchase))
                product.price = Decimal(str(selling))
                updated += 1
            else:
                product = Product(
                    name=name,
                    sku=sku,
                    description=None,
                    purchase_price=Decimal(str(purchase)),
                    price=Decimal(str(selling)),
                    stock_quantity=0,
                    min_stock_level=10,
                    category=None,
                    unit='piece',
                )
                db.session.add(product)
                created += 1
        db.session.commit()
        print(f"Seed complete. Created: {created}, Updated: {updated}")
