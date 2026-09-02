# 🚀 Quick Start - Python Backend

## Complete Python Backend with TensorFlow Deep Learning

The Python backend is **ready to run** with full deep learning capabilities!

## ⚡ Quick Start (5 Steps)

### 1. Install Python Dependencies
```bash
cd python-backend
python setup.py
```

This will:
- ✅ Check Python 3.8+ is installed
- ✅ Install all dependencies (Flask, TensorFlow, etc.)
- ✅ Create .env file with secure SECRET_KEY
- ✅ Create ml_models directory
- ✅ Test MongoDB connection

### 2. Start MongoDB
Ensure MongoDB is running:
```bash
# Windows - if installed as service
net start MongoDB

# Or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 3. Start Python Backend
```bash
python app.py
```

Server starts on: **http://localhost:5000**

### 4. Test the Backend
```bash
# Health check
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "backend": "Python/Flask",
  "deep_learning": "not_initialized",
  "demo_mode": true
}
```

### 5. Login and Train Models
```bash
# Login as admin
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"Admin@LandRecords2024\"}" \
  -c cookies.txt

# Train deep learning models
curl -X POST http://localhost:5000/api/deep-learning/train \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d "{\"minRecords\":100,\"maxRecords\":1000,\"forceRetrain\":true}"
```

## 🎯 Default Credentials

| Role | Username | Password |
|------|----------|----------|
| **Admin** | `admin` | `Admin@LandRecords2024` |
| Officer | `officer1` | `Officer@2024` |
| Auditor | `auditor1` | `Auditor@2024` |
| Customer | `customer1` | `Customer@2024` |

## 🔄 Connect Frontend to Python Backend

The frontend needs no changes! The Python backend provides the same API as Node.js.

**Already configured correctly in `frontend/src/api/client.js`:**
```javascript
const API_BASE = import.meta.env.VITE_API_URL || '';  // Uses relative URLs
```

Just ensure:
1. Python backend running on `http://localhost:5000` ✅
2. Frontend running on `http://localhost:5173` ✅
3. CORS configured in Python backend ✅

## 🧠 Train Deep Learning Models

### Option A: Via API (Recommended)
```bash
# Login first
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"Admin@LandRecords2024\"}" \
  -c cookies.txt

# Train models (takes 3-5 minutes)
curl -X POST http://localhost:5000/api/deep-learning/train \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### Option B: Via Frontend
1. Open `http://localhost:5173`
2. Login as Admin
3. Navigate to "Deep Learning"
4. Click "Train Models"
5. Wait 3-5 minutes

### Option C: Via Python Script
```python
from services.deep_learning_service import DeepLearningService
from models.land_record import LandRecord

# Initialize
dl = DeepLearningService()

# Get training data
records = [r.to_dict() for r in LandRecord.objects().limit(1000)]

# Train
results = dl.train_models(records)
print(results)
```

## 📊 Check Model Status

```bash
# Get model statistics
curl http://localhost:5000/api/deep-learning/stats -b cookies.txt
```

Expected response after training:
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
    "cv_score": 0.012345
  }
}
```

## 🔍 Analyze Records

```bash
# Analyze single record
curl -X POST http://localhost:5000/api/deep-learning/analyze/LR-000001 \
  -b cookies.txt
```

## 🛠️ Troubleshooting

### Port 5000 Already in Use
```bash
# Windows - find process using port 5000
netstat -ano | findstr :5000

# Kill process
taskkill /PID <pid> /F

# Restart Python backend
python app.py
```

### MongoDB Not Running
```bash
# Windows - start MongoDB service
net start MongoDB

# Or check if it's running
mongo --eval "db.adminCommand('ping')"
```

### TensorFlow Installation Issues
```bash
# Use CPU-only version if GPU issues
pip uninstall tensorflow
pip install tensorflow-cpu==2.15.0
```

### Import Errors
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Module Not Found
```bash
# Ensure you're in the python-backend directory
cd python-backend

# Run from correct location
python app.py
```

## 📁 File Structure

```
python-backend/
├── app.py                    # ← Start here!
├── setup.py                  # ← Run first!
├── requirements.txt          # Dependencies
├── .env                      # Config (auto-created)
│
├── models/                   # Database models
│   ├── user.py
│   └── land_record.py
│
├── routes/                   # API endpoints
│   ├── auth.py              # Login/register
│   └── deep_learning.py     # ML endpoints
│
├── services/                 # Business logic
│   ├── database.py
│   ├── seed.py
│   └── deep_learning_service.py  # 900+ lines of ML!
│
└── ml_models/                # Generated during training
    ├── anomaly_model.h5      # Saved model
    ├── risk_model.h5         # Saved model
    └── metadata.json         # Model info
```

## ✅ Verification Checklist

- [ ] Python 3.8+ installed
- [ ] MongoDB running on port 27017
- [ ] Dependencies installed (`python setup.py`)
- [ ] .env file created
- [ ] Python backend running on port 5000
- [ ] Health check returns "ok"
- [ ] Can login as admin
- [ ] Models trained successfully
- [ ] Can analyze records

## 🎯 What You Get

✅ **Complete Python Backend** - Flask with all features
✅ **TensorFlow Deep Learning** - 8 model architectures
✅ **Automatic Model Selection** - Cross-validation picks best
✅ **23-Feature Engineering** - Comprehensive features
✅ **Secure Authentication** - Argon2 password hashing
✅ **Role-Based Access** - Admin, Officer, Auditor, Customer
✅ **MongoDB Integration** - MongoEngine ODM
✅ **Complete Documentation** - README + setup guide

## 📚 Documentation

- `README.md` - Complete usage guide
- `PYTHON_BACKEND_COMPLETE.md` - Implementation details
- `requirements.txt` - All dependencies
- Code comments throughout

## 🚦 Status

| Component | Status |
|-----------|--------|
| Python Backend | ✅ Ready |
| TensorFlow/Keras | ✅ Integrated |
| Authentication | ✅ Working |
| Deep Learning API | ✅ Complete |
| Model Selection | ✅ Implemented |
| Documentation | ✅ Complete |
| Frontend Compatible | ✅ Yes |

## 🎉 Next Steps

1. ✅ Run `python setup.py`
2. ✅ Start MongoDB
3. ✅ Run `python app.py`
4. ✅ Open `http://localhost:5000/api/health`
5. ✅ Train models
6. ✅ Start using!

## 💡 Pro Tips

- **First Time**: Run setup.py to install everything
- **Training**: Needs at least 100 records (seed data)
- **Models**: Saved in ml_models/ directory
- **Logs**: Check terminal for training progress
- **API**: Same interface as Node.js backend
- **Frontend**: No changes needed!

## 🆘 Need Help?

**Backend not starting?**
- Check Python version: `python --version` (need 3.8+)
- Check MongoDB: `mongo --eval "db.adminCommand('ping')"`
- Check port 5000: `netstat -ano | findstr :5000`

**Dependencies issues?**
- Run: `pip install -r requirements.txt --force-reinstall`
- Use virtual environment: `python -m venv venv`

**Training fails?**
- Check MongoDB has records: `mongo landrecords --eval "db.land_records.count()"`
- Need at least 100 records
- Check logs in terminal

---

**Backend:** Python 3.8+ / Flask 3.0 / TensorFlow 2.15  
**Status:** Ready to Start! 🚀  
**Command:** `python app.py`
