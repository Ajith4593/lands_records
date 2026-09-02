"""Setup script for Python backend"""
import os
import subprocess
import sys

def main():
    """Setup the Python backend"""
    print("=" * 70)
    print("Land Records Platform - Python Backend Setup")
    print("=" * 70)
    print()
    
    # Check Python version
    print("[1/5] Checking Python version...")
    python_version = sys.version_info
    if python_version < (3, 8):
        print(f"✗ Python 3.8+ required. You have {python_version.major}.{python_version.minor}")
        return False
    print(f"✓ Python {python_version.major}.{python_version.minor}.{python_version.micro}")
    print()
    
    # Install dependencies
    print("[2/5] Installing dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✓ Dependencies installed")
    except subprocess.CalledProcessError as e:
        print(f"✗ Failed to install dependencies: {e}")
        return False
    print()
    
    # Create .env file
    print("[3/5] Creating .env file...")
    if not os.path.exists('.env'):
        import secrets
        secret_key = secrets.token_hex(32)
        
        with open('.env', 'w') as f:
            f.write(f"""# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/landrecords

# Flask Configuration
FLASK_ENV=development
SECRET_KEY={secret_key}
SESSION_TYPE=mongodb

# Server Configuration
HOST=0.0.0.0
PORT=5000

# CORS
FRONTEND_URL=http://localhost:5173

# Security
DEMO_MODE=true
PQC_PROVIDER=ecdsa_dev_fallback

# Deep Learning
ML_MODEL_PATH=./ml_models
MIN_TRAINING_RECORDS=100
MAX_TRAINING_RECORDS=1000
""")
        print("✓ .env file created with random SECRET_KEY")
    else:
        print("✓ .env file already exists")
    print()
    
    # Create ml_models directory
    print("[4/5] Creating ml_models directory...")
    os.makedirs('ml_models', exist_ok=True)
    print("✓ ml_models directory created")
    print()
    
    # Test MongoDB connection
    print("[5/5] Testing MongoDB connection...")
    try:
        from pymongo import MongoClient
        client = MongoClient('mongodb://localhost:27017/', serverSelectionTimeoutMS=2000)
        client.server_info()
        print("✓ MongoDB connection successful")
    except Exception as e:
        print(f"⚠ MongoDB connection failed: {e}")
        print("  Make sure MongoDB is running on mongodb://localhost:27017")
    print()
    
    # Success
    print("=" * 70)
    print("Setup Complete! 🎉")
    print("=" * 70)
    print()
    print("Next steps:")
    print("  1. Ensure MongoDB is running")
    print("  2. Start the server: python app.py")
    print("  3. Access: http://localhost:5000/api/health")
    print()
    print("Default login:")
    print("  Username: admin")
    print("  Password: Admin@LandRecords2024")
    print()
    
    return True

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
