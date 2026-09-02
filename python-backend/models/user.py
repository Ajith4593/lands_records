"""User Model"""
from mongoengine import Document, StringField, BooleanField, DateTimeField, EmailField
from datetime import datetime

class User(Document):
    """User model for authentication and authorization"""
    
    meta = {
        'collection': 'users',
        'indexes': [
            'username',
            'email',
            'user_id'
        ]
    }
    
    user_id = StringField(required=True, unique=True)
    username = StringField(required=True, unique=True, max_length=100)
    password_hash = StringField(required=True)
    role = StringField(required=True, choices=[
        'administrator',
        'registration_officer',
        'auditor',
        'customer'
    ], default='customer')
    
    full_name = StringField(max_length=200)
    email = EmailField(unique=True, sparse=True)
    
    is_active = BooleanField(default=True)
    created_at = DateTimeField(default=datetime.utcnow)
    last_login = DateTimeField()
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'user_id': self.user_id,
            'username': self.username,
            'role': self.role,
            'full_name': self.full_name,
            'email': self.email,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }
