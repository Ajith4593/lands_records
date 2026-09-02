# Land Records Platform - Python Backend

Complete Python/Flask backend with TensorFlow/Keras deep learning for land record integrity verification.

## 🚀 Quick Start

### 1. Install Python Dependencies

```bash
cd python-backend
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Copy example env file
copy .env.example .env

# Edit .env and set:
# - MONGODB_URI (MongoDB connection string)
# - SECRET_KEY (generate with: python -c "import secrets; print(secrets.token_hex(32))")
```

### 3. Start MongoDB

Ensure MongoDB is running on `mongodb://localhost:27017`

### 4. Run the Server

```bash
python app.py
```

Server starts on: **http://localhost:5000**

## 📊 Deep Learning Features

### Automatic Model Selection
- **4 Anomaly Detection Models**: Simple, Deep, Dropout, Variational Autoencoders
- **4 Risk Prediction Models**: Shallow, Deep, Wide & Deep, Residual Networks
- **3-Fold Cross-Validation**: Automatically selects best architecture
- **23 Enhanced Features**: Numerical, categorical, binary, and interaction features

### Train Models

**Via API:**
```bash
# Login first
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@LandRecords2024"}' \
  -c cookies.txt

# Train models
curl -X POST http://localhost:5000/api/deep-learning/train \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"minRecords":100,"maxRecords":1000,"forceRetrain":true}'
```

**Via Python Script:**
```python
from services.deep_learning_service import DeepLearningService
from models.land_record import LandRecord

# Initialize service
dl_service = DeepLearningService()

# Get training data
records = LandRecord.objects().limit(1000)
records_list = [r.to_dict() for r in records]

# Train
results = dl_service.train_models(records_list)
print(results)
```

### Analyze Records

```bash
curl -X POST http://localhost:5000/api/deep-learning/analyze/LR-000001 \
  -b cookies.txt
```

## 🔐 Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `Admin@LandRecords2024` |
| Officer | `officer1` | `Officer@2024` |
| Auditor | `auditor1` | `Auditor@2024` |
| Customer | `customer1` | `Customer@2024` |

## 📁 Project Structure

```
python-backend/
├── app.py                          # Flask app entry point
├── requirements.txt                # Python dependencies
├── .env.example                    # Environment variables template
├── models/                         # MongoDB models
│   ├── user.py                     # User model
│   ├── land_record.py              # Land record model
│   ├── ledger_block.py             # Ledger block model
│   └── audit_log.py                # Audit log model
├── routes/                         # API routes
│   ├── auth.py                     # Authentication routes
│   ├── records.py                  # Land records routes
│   ├── deep_learning.py            # Deep learning routes
│   ├── ledger.py                   # Ledger routes
│   ├── audit.py                    # Audit routes
│   └── documents.py                # Document routes
├── services/                       # Business logic
│   ├── database.py                 # Database initialization
│   ├── seed.py                     # Seed data
│   └── deep_learning_service.py    # Deep learning service
└── ml_models/                      # Trained models (generated)
    ├── anomaly_model.h5            # Anomaly detection model
    ├── risk_model.h5               # Risk prediction model
    ├── feature_scaler.pkl          # Feature scaler
    └── metadata.json               # Model metadata
```

## 🧠 Deep Learning Architecture

### Anomaly Detection Models

1. **Simple Autoencoder**: 23→12→6→3→6→12→23
2. **Deep Autoencoder**: 23→16→8→4→2→4→8→16→23
3. **Dropout Autoencoder**: With 0.2 dropout regularization
4. **Variational Autoencoder**: Probabilistic latent space

### Risk Prediction Models

1. **Shallow Network**: 23→16→8→1
2. **Deep Network**: 23→32→16→8→4→1
3. **Wide & Deep**: Parallel wide and deep paths
4. **Residual Network**: Skip connections

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (customer only)
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Deep Learning
- `GET /api/deep-learning/stats` - Get model statistics
- `POST /api/deep-learning/train` - Train models (Admin only)
- `POST /api/deep-learning/analyze/<id>` - Analyze record
- `POST /api/deep-learning/batch-analyze` - Batch analysis
- `GET /api/deep-learning/architectures` - List architectures

### Health Check
- `GET /api/health` - Server health check

## 🐍 Python Requirements

- Python 3.8+
- TensorFlow 2.15+
- Flask 3.0+
- MongoDB 4.0+

## 📦 Key Dependencies

- **Flask**: Web framework
- **TensorFlow/Keras**: Deep learning
- **MongoEngine**: MongoDB ODM
- **scikit-learn**: ML utilities
- **argon2-cffi**: Password hashing
- **numpy/pandas**: Data processing

## 🔬 Model Training Details

### Feature Engineering (23 features)

**Numerical (7):**
- Price (millions)
- Log price
- Land area (thousands)
- Year normalized
- Month normalized
- Day normalized
- Existing risk score

**Categorical (7):**
- Property type
- Duration (Freehold/Leasehold)
- New build flag
- Ownership status
- Mortgage status
- Encumbrance status
- Dispute status

**Binary (7):**
- Has postcode
- Has street
- Has town/city
- Has county
- Valid signature
- Is verified
- Has coordinates

**Interaction (2):**
- Price per area
- Type × price interaction

### Training Process

1. **Data Collection**: Fetch records with tamper status
2. **Feature Extraction**: Extract 23 features per record
3. **Normalization**: StandardScaler for feature scaling
4. **Cross-Validation**: 3-fold CV for model selection
5. **Final Training**: Train selected model on full dataset
6. **Model Persistence**: Save models and scalers

### Performance Metrics

- **Anomaly Detection**: Reconstruction error (MSE)
- **Risk Prediction**: Mean Squared Error, Mean Absolute Error
- **Threshold**: Mean + 2σ of reconstruction errors

## 🚦 Running Tests

```bash
# Install test dependencies
pip install pytest pytest-flask

# Run tests
pytest tests/
```

## 🛡️ Security Features

- ✅ Argon2 password hashing
- ✅ Flask session management
- ✅ CORS configuration
- ✅ Role-based access control
- ✅ Customer-only self-registration
- ✅ Admin-only model training

## 📊 Example API Response

### Model Stats
```json
{
  "initialized": true,
  "training_date": "2026-08-27T...",
  "num_records": 1000,
  "num_features": 23,
  "anomaly_model": {
    "name": "deep",
    "cv_score": 0.000234,
    "threshold": 0.000456
  },
  "risk_model": {
    "name": "deep",
    "cv_score": 0.012345,
    "val_mae": 0.098765
  }
}
```

### Analysis Result
```json
{
  "land_record_id": "LR-000001",
  "deepLearningAnalysis": {
    "anomaly_detection": {
      "is_anomaly": false,
      "anomaly_score": 0.23,
      "reconstruction_error": 0.000234
    },
    "risk_prediction": {
      "ml_risk_score": 45,
      "ml_risk_band": "MEDIUM"
    },
    "combined_risk": {
      "score": 45,
      "band": "MEDIUM",
      "confidence": "MODERATE"
    }
  }
}
```

## 🔄 Migrating from Node.js Backend

The Python backend provides the same API interface as the Node.js backend. Update the frontend to connect to the Python backend:

```javascript
// frontend/src/api/client.js
const API_BASE = 'http://localhost:5000';  // Python backend
```

## 📝 Environment Variables

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/landrecords

# Flask
FLASK_ENV=development
SECRET_KEY=your-secret-key-here
SESSION_TYPE=mongodb

# Server
HOST=0.0.0.0
PORT=5000

# CORS
FRONTEND_URL=http://localhost:5173

# Deep Learning
ML_MODEL_PATH=./ml_models
MIN_TRAINING_RECORDS=100
MAX_TRAINING_RECORDS=1000
```

## 🎯 Next Steps

1. ✅ Backend structure created
2. ✅ Deep learning service implemented
3. ✅ Authentication routes added
4. ✅ Model selection with cross-validation
5. ⏳ Implement remaining CRUD routes (records, ledger, audit)
6. ⏳ Add cryptographic signing services
7. ⏳ Connect frontend to Python backend
8. ⏳ Deploy to production

## 🆘 Troubleshooting

### Port Already in Use
```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill process (Windows)
taskkill /PID <pid> /F
```

### MongoDB Connection Error
```bash
# Check MongoDB service
net start MongoDB

# Or use Docker
docker run -d -p 27017:27017 mongo:latest
```

### TensorFlow Installation Issues
```bash
# Use CPU-only version if GPU issues
pip install tensorflow-cpu==2.15.0
```

## 📚 Documentation

- [TensorFlow Guide](https://www.tensorflow.org/guide)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [MongoEngine Documentation](http://mongoengine.org/)

## ✨ Features

- ✅ Complete Python/Flask backend
- ✅ TensorFlow/Keras deep learning
- ✅ Automatic model selection
- ✅ Cross-validation
- ✅ 23-feature engineering
- ✅ MongoDB integration
- ✅ Session-based auth
- ✅ Role-based access control
- ✅ Security best practices

---

**Backend:** Python/Flask/TensorFlow  
**Status:** Ready for Development ✅
