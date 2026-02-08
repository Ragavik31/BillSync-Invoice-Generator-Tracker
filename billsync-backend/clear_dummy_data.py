#!/usr/bin/env python3
"""
Script to clear all dummy data from the database while keeping products intact
"""

import os
import sys
from app import app, db, Customer, Invoice, InvoiceItem

def clear_dummy_data():
    """Clear all customer and invoice data, keep products"""
    try:
        with app.app_context():
            print("🗑️  Starting to clear dummy data...")
            
            # First, delete all invoice items (child table)
            invoice_items_deleted = InvoiceItem.query.delete()
            print(f"✅ Deleted {invoice_items_deleted} invoice items")
            
            # Then, delete all invoices
            invoices_deleted = Invoice.query.delete()
            print(f"✅ Deleted {invoices_deleted} invoices")
            
            # Finally, delete all customers
            customers_deleted = Customer.query.delete()
            print(f"✅ Deleted {customers_deleted} customers")
            
            # Commit the changes
            db.session.commit()
            print("🎉 All dummy data cleared successfully!")
            print("📦 Products remain intact")
            
            # Show remaining data
            remaining_customers = Customer.query.count()
            remaining_invoices = Invoice.query.count()
            
            print(f"\n📊 Current database status:")
            print(f"   Customers: {remaining_customers}")
            print(f"   Invoices: {remaining_invoices}")
            print(f"   Products: Remain intact (not cleared)")
            
            return True
            
    except Exception as e:
        print(f"❌ Error clearing data: {str(e)}")
        db.session.rollback()
        return False

if __name__ == "__main__":
    success = clear_dummy_data()
    sys.exit(0 if success else 1)