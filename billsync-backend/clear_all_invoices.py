#!/usr/bin/env python3
"""
Script to clear all invoices from the database
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db, Invoice, InvoiceItem

def clear_all_invoices():
    """Clear all invoices and invoice items from the database"""
    with app.app_context():
        try:
            # First delete all invoice items
            print("🗑️  Deleting all invoice items...")
            InvoiceItem.query.delete()
            
            # Then delete all invoices
            print("🗑️  Deleting all invoices...")
            Invoice.query.delete()
            
            # Commit the changes
            db.session.commit()
            
            print("✅ All invoices cleared successfully!")
            
            # Verify the result
            remaining_invoices = Invoice.query.count()
            remaining_items = InvoiceItem.query.count()
            
            print(f"📊 Remaining invoices: {remaining_invoices}")
            print(f"📊 Remaining invoice items: {remaining_items}")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error clearing invoices: {str(e)}")
            return False
    
    return True

if __name__ == "__main__":
    clear_all_invoices()