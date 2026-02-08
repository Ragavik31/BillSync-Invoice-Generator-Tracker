import pymysql
import sys

def create_database():
    try:
        # Connect to MySQL server (without specifying database)
        connection = pymysql.connect(
            host='localhost',
            user='root',
            password='Ragavi_31'
        )
        
        cursor = connection.cursor()
        
        # Create database if it doesn't exist
        cursor.execute("CREATE DATABASE IF NOT EXISTS billsync_db")
        print("Database 'billsync_db' created successfully!")
        
        # Grant privileges (optional)
        cursor.execute("GRANT ALL PRIVILEGES ON billsync_db.* TO 'root'@'localhost'")
        cursor.execute("FLUSH PRIVILEGES")
        print("Database privileges granted!")
        
        cursor.close()
        connection.close()
        
    except pymysql.Error as e:
        print(f"Error creating database: {e}")
        sys.exit(1)

if __name__ == "__main__":
    create_database()