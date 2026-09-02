"""Authentication Routes"""
from flask import Blueprint, request, jsonify, session
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from nanoid import generate
from models.user import User
from datetime import datetime

bp = Blueprint('auth', __name__)
ph = PasswordHasher()

@bp.route('/register', methods=['POST'])
def register():
    """Register new user (customer only via self-registration)"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip().lower()
        password = data.get('password')
        full_name = data.get('full_name', '').strip()
        email = data.get('email', '').strip().lower() if data.get('email') else None
        role = data.get('role', 'customer')
        
        # Validation
        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400
        
        if len(username) < 3:
            return jsonify({'error': 'Username must be at least 3 characters'}), 400
        
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        
        # SECURITY: Force customer role for self-registration
        if role and role != 'customer':
            return jsonify({
                'error': 'Self-registration is only available for customer accounts. Contact an administrator to create officer or auditor accounts.'
            }), 403
        
        # Check duplicates
        if User.objects(username=username).first():
            return jsonify({'error': 'Username already registered'}), 409
        
        if email and User.objects(email=email).first():
            return jsonify({'error': 'Email already registered'}), 409
        
        # Hash password
        password_hash = ph.hash(password)
        
        # Create user
        user = User(
            user_id=f'USR-{generate(size=8)}',
            username=username,
            password_hash=password_hash,
            role='customer',
            full_name=full_name or username,
            email=email,
            is_active=True,
            last_login=datetime.utcnow()
        )
        user.save()
        
        # Create session
        session['user_id'] = user.user_id
        session['role'] = user.role
        session['username'] = user.username
        session['full_name'] = user.full_name
        session.permanent = True
        
        return jsonify({
            'message': 'Registration successful',
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@bp.route('/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip().lower()
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400
        
        # Find user
        user = User.objects(username=username, is_active=True).first()
        if not user:
            return jsonify({'error': 'Invalid credentials or inactive account'}), 401
        
        # Verify password
        try:
            ph.verify(user.password_hash, password)
        except VerifyMismatchError:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Update last login
        user.last_login = datetime.utcnow()
        user.save()
        
        # Create session
        session['user_id'] = user.user_id
        session['role'] = user.role
        session['username'] = user.username
        session['full_name'] = user.full_name
        session.permanent = True
        
        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': f'Authentication failed: {str(e)}'}), 500

@bp.route('/logout', methods=['POST'])
def logout():
    """Logout user"""
    session.clear()
    return jsonify({'message': 'Logged out'})

@bp.route('/me', methods=['GET'])
def get_current_user():
    """Get current user info"""
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    return jsonify({
        'user_id': session.get('user_id'),
        'username': session.get('username'),
        'role': session.get('role'),
        'full_name': session.get('full_name')
    })
