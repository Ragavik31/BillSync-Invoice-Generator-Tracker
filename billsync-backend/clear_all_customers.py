#!/usr/bin/env python3
"""
Script to clear all customers/clients from the database
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db, Customer

def clear_all_customers():
    """Clear all customers from the database"""
    with app.app_context():
        try:
            print("🗑️  Deleting all customers...")
            Customer.query.delete()
            
            # Commit the changes
            db.session.commit()
            
            print("✅ All customers cleared successfully!")
            
            # Verify the result
            remaining_customers = Customer.query.count()
            print(f"📊 Remaining customers: {remaining_customers}")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error clearing customers: {str(e)}")
            return False
    
    return True

if __name__ == "__main__":
    clear_all_customers()