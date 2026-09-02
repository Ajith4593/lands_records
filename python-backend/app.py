"""
Main Flask Application Entry Point
Land Record Integrity Platform - Python Backend
"""
import os
from datetime import timedelta
from flask import Flask, jsonify, session
from flask_cors import CORS
from flask_session import Session
from dotenv import load_dotenv
from pymongo import MongoClient

# Load environment variables
load_dotenv()

# Import routes
from routes import auth, records, ledger, audit, documents, deep_learning

# Import services
from services.database import init_db
from services.seed import seed_initial_data

def create_app():
    """Create and configure Flask application"""
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev_secret_change_in_production')
    app.config['SESSION_TYPE'] = 'mongodb'
    app.config['SESSION_MONGODB'] = MongoClient(os.getenv('MONGODB_URI', 'mongodb://localhost:27017'))
    app.config['SESSION_MONGODB_DB'] = 'landrecords'
    app.config['SESSION_MONGODB_COLLECT'] = 'sessions'
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=8)
    
    # CORS Configuration
    allowed_origins = [
        os.getenv('FRONTEND_URL', 'http://localhost:5173'),
        'http://localhost:5174',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
    ]
    
    CORS(app, 
         origins=allowed_origins,
         supports_credentials=True,
         allow_headers=['Content-Type', 'Authorization'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
    
    # Initialize session
    Session(app)
    
    # Initialize database
    init_db()
    
    # Register blueprints
    app.register_blueprint(auth.bp, url_prefix='/api/auth')
    app.register_blueprint(records.bp, url_prefix='/api/records')
    app.register_blueprint(ledger.bp, url_prefix='/api/ledger')
    app.register_blueprint(audit.bp, url_prefix='/api/audit')
    app.register_blueprint(documents.bp, url_prefix='/api/documents')
    app.register_blueprint(deep_learning.bp, url_prefix='/api/deep-learning')
    
    # Health check endpoint
    @app.route('/api/health', methods=['GET'])
    def health_check():
        from services.deep_learning_service import DeepLearningService
        
        dl_status = 'not_initialized'
        try:
            dl_service = DeepLearningService()
            dl_status = 'initialized' if dl_service.is_initialized else 'not_initialized'
        except Exception as e:
            dl_status = f'error: {str(e)}'
        
        return jsonify({
            'status': 'ok',
            'disclaimer': 'Prototype system for demonstration purposes only. Not a legally authoritative land registry.',
            'demo_mode': os.getenv('DEMO_MODE', 'true').lower() == 'true',
            'pqc_provider': os.getenv('PQC_PROVIDER', 'ecdsa_dev_fallback'),
            'deep_learning': dl_status,
            'backend': 'Python/Flask',
            'timestamp': str(os.times())
        })
    
    # Error handlers
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({'error': 'Bad request', 'message': str(e)}), 400
    
    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({'error': 'Unauthorized', 'message': str(e)}), 401
    
    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({'error': 'Forbidden', 'message': str(e)}), 403
    
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Not found', 'message': str(e)}), 404
    
    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({'error': 'Internal server error', 'message': str(e)}), 500
    
    return app

if __name__ == '__main__':
    app = create_app()
    
    # Seed initial data
    print('[SEED] Checking database...')
    seed_initial_data()
    
    # Run server
    host = os.getenv('HOST', '0.0.0.0')
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV', 'development') == 'development'
    
    print(f'[SERVER] Starting on http://{host}:{port}')
    print(f'[SECURITY] Demo mode: {os.getenv("DEMO_MODE", "true")}')
    print('[NOTICE] Prototype system for demonstration purposes only.')
    
    app.run(host=host, port=port, debug=debug)
