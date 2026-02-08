import requests
import json

# API endpoint
API_BASE_URL = "http://127.0.0.1:5000/api"

def add_product(product_data):
    """Add a single product to the database"""
    try:
        response = requests.post(f"{API_BASE_URL}/products", json=product_data)
        if response.status_code == 201:
            print(f'✓ Added: {product_data["name"]}')
            return True
        elif response.status_code == 400:
            error_data = response.json()
            if 'error' in error_data and 'already exists' in error_data['error']:
                print(f'⚠ Already exists: {product_data["name"]}')
                return True
            else:
                print(f'✗ Error adding {product_data["name"]}: {error_data}')
                return False
        else:
            print(f'✗ Error adding {product_data["name"]}: {response.status_code} - {response.text}')
            return False
    except Exception as e:
        print(f'✗ Exception adding {product_data["name"]}: {str(e)}')
        return False

# New products to add
new_products = [
    {"name": "Ball Pen (Blue, single)", "sku": "BALL-PEN-BLUE-001", "description": "Blue ballpoint pen", "price": 10, "stock_quantity": 100, "min_stock_level": 10, "category": "Writing Instruments", "unit": "piece"},
    {"name": "Gel Pen (single)", "sku": "GEL-PEN-001", "description": "Gel ink pen", "price": 20, "stock_quantity": 100, "min_stock_level": 10, "category": "Writing Instruments", "unit": "piece"},
    {"name": "Fountain Pen (single)", "sku": "FOUNTAIN-PEN-001", "description": "Fountain pen", "price": 100, "stock_quantity": 50, "min_stock_level": 5, "category": "Writing Instruments", "unit": "piece"},
    {"name": "Pencil (HB, single)", "sku": "PENCIL-HB-001", "description": "HB pencil", "price": 10, "stock_quantity": 200, "min_stock_level": 20, "category": "Writing Instruments", "unit": "piece"},
    {"name": "Pencil Box (12 pcs)", "sku": "PENCIL-BOX-12-001", "description": "Box of 12 pencils", "price": 37, "stock_quantity": 50, "min_stock_level": 5, "category": "Writing Instruments", "unit": "box"},
    {"name": "Highlighter (single)", "sku": "HIGHLIGHTER-001", "description": "Highlighter pen", "price": 19, "stock_quantity": 80, "min_stock_level": 8, "category": "Writing Instruments", "unit": "piece"},
    {"name": "Eraser (single)", "sku": "ERASER-001", "description": "Rubber eraser", "price": 3, "stock_quantity": 300, "min_stock_level": 30, "category": "Writing Instruments", "unit": "piece"},
    {"name": "Sharpener (single)", "sku": "SHARPENER-001", "description": "Pencil sharpener", "price": 15, "stock_quantity": 150, "min_stock_level": 15, "category": "Writing Instruments", "unit": "piece"},
    {"name": "Whiteboard Marker (single)", "sku": "WHITEBOARD-MARKER-001", "description": "Whiteboard marker", "price": 20, "stock_quantity": 60, "min_stock_level": 6, "category": "Writing Instruments", "unit": "piece"},
    {"name": "Permanent Marker (single)", "sku": "PERMANENT-MARKER-001", "description": "Permanent marker", "price": 25, "stock_quantity": 70, "min_stock_level": 7, "category": "Writing Instruments", "unit": "piece"},
    {"name": "A4 Paper (500 sheets, ream)", "sku": "A4-PAPER-REAM-001", "description": "A4 paper ream (500 sheets)", "price": 350, "stock_quantity": 25, "min_stock_level": 3, "category": "Paper", "unit": "ream"},
    {"name": "Sticky Notes (3x3, pack)", "sku": "STICKY-NOTES-3X3-001", "description": "3x3 sticky notes pack", "price": 35, "stock_quantity": 40, "min_stock_level": 4, "category": "Paper", "unit": "pack"},
    {"name": "Notebook/Register (single)", "sku": "NOTEBOOK-001", "description": "Single notebook/register", "price": 60, "stock_quantity": 30, "min_stock_level": 3, "category": "Paper", "unit": "piece"},
    {"name": "File Cover (single)", "sku": "FILE-COVER-001", "description": "Single file cover", "price": 15, "stock_quantity": 100, "min_stock_level": 10, "category": "Files & Folders", "unit": "piece"},
    {"name": "Plastic Folder (single)", "sku": "PLASTIC-FOLDER-001", "description": "Single plastic folder", "price": 30, "stock_quantity": 80, "min_stock_level": 8, "category": "Files & Folders", "unit": "piece"},
    {"name": "Document Bag (single)", "sku": "DOCUMENT-BAG-001", "description": "Single document bag", "price": 30, "stock_quantity": 60, "min_stock_level": 6, "category": "Files & Folders", "unit": "piece"},
    {"name": "Stapler (small)", "sku": "STAPLER-SMALL-001", "description": "Small stapler", "price": 125, "stock_quantity": 20, "min_stock_level": 2, "category": "Stationery", "unit": "piece"},
    {"name": "Stapler pins (No. 10, box)", "sku": "STAPLER-PINS-10-001", "description": "Box of No. 10 stapler pins", "price": 125, "stock_quantity": 30, "min_stock_level": 3, "category": "Stationery", "unit": "box"},
    {"name": "Paper Punch Machine (single)", "sku": "PAPER-PUNCH-001", "description": "Single paper punch machine", "price": 170, "stock_quantity": 15, "min_stock_level": 2, "category": "Stationery", "unit": "piece"},
    {"name": "Scissors (single)", "sku": "SCISSORS-001", "description": "Single pair of scissors", "price": 50, "stock_quantity": 25, "min_stock_level": 3, "category": "Stationery", "unit": "piece"},
    {"name": "Paper Cutter (single)", "sku": "PAPER-CUTTER-001", "description": "Single paper cutter", "price": 30, "stock_quantity": 35, "min_stock_level": 4, "category": "Stationery", "unit": "piece"},
    {"name": "Rubber Bands (100g pkt)", "sku": "RUBBER-BANDS-100G-001", "description": "100g packet of rubber bands", "price": 20, "stock_quantity": 50, "min_stock_level": 5, "category": "Stationery", "unit": "packet"},
    {"name": "Envelope (Brown, 9x4, single)", "sku": "ENVELOPE-BROWN-9X4-001", "description": "Single brown envelope 9x4", "price": 3, "stock_quantity": 500, "min_stock_level": 50, "category": "Paper", "unit": "piece"},
    {"name": "Glue Stick (single)", "sku": "GLUE-STICK-001", "description": "Single glue stick", "price": 20, "stock_quantity": 60, "min_stock_level": 6, "category": "Adhesives", "unit": "piece"},
    {"name": "Gum Tube (small)", "sku": "GUM-TUBE-SMALL-001", "description": "Small gum tube", "price": 15, "stock_quantity": 40, "min_stock_level": 4, "category": "Adhesives", "unit": "piece"},
    {"name": "Cello Tape (2\")", "sku": "CELLO-TAPE-2INCH-001", "description": "2 inch cello tape", "price": 30, "stock_quantity": 45, "min_stock_level": 5, "category": "Adhesives", "unit": "piece"},
    {"name": "Masking Tape (1\")", "sku": "MASKING-TAPE-1INCH-001", "description": "1 inch masking tape", "price": 19, "stock_quantity": 55, "min_stock_level": 6, "category": "Adhesives", "unit": "piece"},
    {"name": "Calculator (Basic, 12-digit)", "sku": "CALCULATOR-BASIC-12D-001", "description": "Basic 12-digit calculator", "price": 250, "stock_quantity": 12, "min_stock_level": 2, "category": "Electronics", "unit": "piece"},
    {"name": "Attendance Register (single)", "sku": "ATTENDANCE-REGISTER-001", "description": "Single attendance register", "price": 100, "stock_quantity": 20, "min_stock_level": 2, "category": "Registers", "unit": "piece"},
    {"name": "Desk Duster Cloth (single)", "sku": "DESK-DUSTER-001", "description": "Single desk duster cloth", "price": 25, "stock_quantity": 40, "min_stock_level": 4, "category": "Cleaning", "unit": "piece"},
    {"name": "Tissue Paper (box)", "sku": "TISSUE-PAPER-BOX-001", "description": "Box of tissue paper", "price": 45, "stock_quantity": 30, "min_stock_level": 3, "category": "Paper", "unit": "box"},
    {"name": "Stamp Pad (single)", "sku": "STAMP-PAD-001", "description": "Single stamp pad", "price": 35, "stock_quantity": 25, "min_stock_level": 3, "category": "Stationery", "unit": "piece"},
    {"name": "Stamp Pad Ink (single)", "sku": "STAMP-PAD-INK-001", "description": "Single stamp pad ink", "price": 40, "stock_quantity": 30, "min_stock_level": 3, "category": "Stationery", "unit": "piece"},
    {"name": "Carbon Paper (pkt, 100 pcs)", "sku": "CARBON-PAPER-PKT-100-001", "description": "Packet of 100 carbon papers", "price": 213, "stock_quantity": 15, "min_stock_level": 2, "category": "Paper", "unit": "packet"},
    {"name": "Binder Clips (medium, box)", "sku": "BINDER-CLIPS-MEDIUM-BOX-001", "description": "Box of medium binder clips", "price": 36, "stock_quantity": 35, "min_stock_level": 4, "category": "Stationery", "unit": "box"},
    {"name": "Cobra File (spring clip)", "sku": "COBRA-FILE-SPRING-001", "description": "Cobra file with spring clip", "price": 30, "stock_quantity": 45, "min_stock_level": 5, "category": "Files & Folders", "unit": "piece"},
    {"name": "Nylon File Laces (pack)", "sku": "NYLON-FILE-LACES-PACK-001", "description": "Pack of nylon file laces", "price": 80, "stock_quantity": 25, "min_stock_level": 3, "category": "Files & Folders", "unit": "pack"},
    {"name": "Desk Organizer (single)", "sku": "DESK-ORGANIZER-001", "description": "Single desk organizer", "price": 180, "stock_quantity": 10, "min_stock_level": 1, "category": "Organizers", "unit": "piece"},
    {"name": "File Index/Divider Set", "sku": "FILE-INDEX-DIVIDER-SET-001", "description": "Set of file index/dividers", "price": 45, "stock_quantity": 20, "min_stock_level": 2, "category": "Files & Folders", "unit": "set"},
    {"name": "Pocket Notepad (96 pg, single)", "sku": "POCKET-NOTEPAD-96PG-001", "description": "96-page pocket notepad", "price": 90, "stock_quantity": 15, "min_stock_level": 2, "category": "Paper", "unit": "piece"},
    {"name": "Multi Passbook Holder", "sku": "MULTI-PASSBOOK-HOLDER-001", "description": "Multi passbook holder", "price": 199, "stock_quantity": 8, "min_stock_level": 1, "category": "Files & Folders", "unit": "piece"}
]

def main():
    print("Adding new products to the database...")
    print("-" * 50)
    
    added_count = 0
    skipped_count = 0
    
    for product in new_products:
        if add_product(product):
            added_count += 1
        else:
            skipped_count += 1
    
    print("-" * 50)
    print(f"Process completed!")
    print(f"Successfully added: {added_count}")
    print(f"Skipped/Failed: {skipped_count}")
    print(f"Total processed: {len(new_products)}")

if __name__ == "__main__":
    main()