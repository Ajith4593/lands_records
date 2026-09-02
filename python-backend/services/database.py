"""Database initialization"""
import os
from mongoengine import connect
from dotenv import load_dotenv

load_dotenv()

def init_db():
    """Initialize MongoDB connection"""
    mongodb_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/landrecords')
    
    try:
        connect(host=mongodb_uri)
        print(f'[DB] MongoDB connected: {mongodb_uri}')
        return True
    except Exception as e:
        print(f'[DB] MongoDB connection failed: {e}')
        return False
