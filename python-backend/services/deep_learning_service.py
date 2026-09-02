"""
Deep Learning Service for Land Records
Implements anomaly detection and risk prediction using TensorFlow/Keras
"""
import os
import json
import numpy as np
from datetime import datetime
from typing import List, Dict, Tuple, Optional
import tensorflow as tf
from tensorflow import keras
from sklearn.model_selection import KFold
from sklearn.preprocessing import StandardScaler
import joblib

class DeepLearningService:
    """Deep Learning model selection and training service"""
    
    def __init__(self, model_path='./ml_models'):
        self.model_path = model_path
        self.is_initialized = False
        
        # Models
        self.anomaly_model = None
        self.risk_model = None
        
        # Scalers
        self.feature_scaler = None
        self.label_scaler = None
        
        # Metadata
        self.metadata = {}
        
        # Create model directory
        os.makedirs(model_path, exist_ok=True)
        
        # Try to load existing models
        self._load_models()
    
    def _load_models(self):
        """Load pre-trained models if they exist"""
        try:
            metadata_path = os.path.join(self.model_path, 'metadata.json')
            if not os.path.exists(metadata_path):
                print('[DL] No pre-trained models found. Models will be trained on first use.')
                return
            
            # Load metadata
            with open(metadata_path, 'r') as f:
                self.metadata = json.load(f)
            
            # Load models
            anomaly_path = os.path.join(self.model_path, 'anomaly_model.h5')
            risk_path = os.path.join(self.model_path, 'risk_model.h5')
            
            if os.path.exists(anomaly_path):
                self.anomaly_model = keras.models.load_model(anomaly_path)
                print(f'[DL] Loaded anomaly model: {self.metadata.get("anomaly_model", {}).get("name")}')
            
            if os.path.exists(risk_path):
                self.risk_model = keras.models.load_model(risk_path)
                print(f'[DL] Loaded risk model: {self.metadata.get("risk_model", {}).get("name")}')
            
            # Load scalers
            scaler_path = os.path.join(self.model_path, 'feature_scaler.pkl')
            if os.path.exists(scaler_path):
                self.feature_scaler = joblib.load(scaler_path)
            
            label_scaler_path = os.path.join(self.model_path, 'label_scaler.pkl')
            if os.path.exists(label_scaler_path):
                self.label_scaler = joblib.load(label_scaler_path)
            
            self.is_initialized = True
            print('[DL] Models loaded successfully')
            
        except Exception as e:
            print(f'[DL] Error loading models: {e}')
            self.is_initialized = False
    
    def extract_features(self, record: Dict) -> np.ndarray:
        """
        Extract 23 features from a land record
        
        Features:
        - Numerical (7): price, log_price, area, year, month, day, existing_risk
        - Categorical (7): property_type, duration, new_build, ownership, mortgage, encumbrance, dispute
        - Binary (7): has_postcode, has_street, has_town, has_county, valid_sig, verified, has_coords
        - Interaction (2): price_per_area, type_price_interaction
        """
        prop = record.get('property', {})
        demo = record.get('synthetic_demo', {})
        sec = record.get('security', {})
        
        # Numerical features
        price = float(prop.get('price', 0))
        price_millions = price / 1_000_000 if price > 0 else 0
        log_price = np.log10(price) if price > 0 else 0
        land_area = float(demo.get('land_area', 0)) / 1000
        
        # Date features
        trans_date = prop.get('transaction_date')
        if isinstance(trans_date, str):
            try:
                trans_date = datetime.fromisoformat(trans_date.replace('Z', '+00:00'))
            except:
                trans_date = datetime.now()
        elif not trans_date:
            trans_date = datetime.now()
        
        year_norm = (trans_date.year - 2000) / 30.0  # Normalize years
        month_norm = (trans_date.month - 1) / 11.0   # 0-1 range
        day_norm = (trans_date.day - 1) / 30.0       # 0-1 range
        
        risk_score = float(sec.get('risk_score', 0)) / 100.0  # Normalize to 0-1
        
        # Categorical features (one-hot style)
        property_types = ['Detached', 'Semi-Detached', 'Terraced', 'Flat', 'Other']
        prop_type = prop.get('property_type', 'Other')
        prop_type_idx = property_types.index(prop_type) if prop_type in property_types else 4
        
        duration_val = 1.0 if prop.get('duration', '').lower() == 'freehold' else 0.0
        new_build_val = 1.0 if prop.get('new_build', False) else 0.0
        
        ownership_val = 1.0 if demo.get('ownership_status', '').upper() == 'REGISTERED' else 0.0
        mortgage_val = 1.0 if demo.get('mortgage_status', '').upper() != 'NONE' else 0.0
        encumbrance_val = 1.0 if demo.get('encumbrance_status', '').upper() != 'NONE' else 0.0
        dispute_val = 1.0 if demo.get('dispute_status', '').upper() != 'NONE' else 0.0
        
        # Binary flags
        has_postcode = 1.0 if prop.get('postcode') else 0.0
        has_street = 1.0 if prop.get('street') else 0.0
        has_town = 1.0 if prop.get('town_city') else 0.0
        has_county = 1.0 if prop.get('county') else 0.0
        
        valid_sig = 1.0 if sec.get('signature_status', '').upper() == 'VALID' else 0.0
        verified = 1.0 if sec.get('tamper_status', '').upper() == 'VERIFIED' else 0.0
        has_coords = 1.0 if (prop.get('latitude') and prop.get('longitude')) else 0.0
        
        # Interaction features
        price_per_area = (price / land_area) if land_area > 0 else 0
        price_per_area_norm = np.log10(price_per_area) if price_per_area > 0 else 0
        type_price_interaction = prop_type_idx * price_millions
        
        # Assemble feature vector (23 features)
        features = np.array([
            # Numerical (7)
            price_millions,
            log_price,
            land_area,
            year_norm,
            month_norm,
            day_norm,
            risk_score,
            # Categorical (7)
            prop_type_idx / 4.0,  # Normalize
            duration_val,
            new_build_val,
            ownership_val,
            mortgage_val,
            encumbrance_val,
            dispute_val,
            # Binary (7)
            has_postcode,
            has_street,
            has_town,
            has_county,
            valid_sig,
            verified,
            has_coords,
            # Interaction (2)
            price_per_area_norm,
            type_price_interaction
        ], dtype=np.float32)
        
        return features
    
    def build_autoencoder(self, input_dim: int, architecture: str) -> keras.Model:
        """Build autoencoder model for anomaly detection"""
        
        if architecture == 'simple':
            # Simple autoencoder
            model = keras.Sequential([
                keras.layers.Input(shape=(input_dim,)),
                keras.layers.Dense(12, activation='relu'),
                keras.layers.Dense(6, activation='relu'),
                keras.layers.Dense(3, activation='relu', name='bottleneck'),
                keras.layers.Dense(6, activation='relu'),
                keras.layers.Dense(12, activation='relu'),
                keras.layers.Dense(input_dim, activation='sigmoid')
            ])
        
        elif architecture == 'deep':
            # Deep autoencoder
            model = keras.Sequential([
                keras.layers.Input(shape=(input_dim,)),
                keras.layers.Dense(16, activation='relu'),
                keras.layers.Dense(8, activation='relu'),
                keras.layers.Dense(4, activation='relu'),
                keras.layers.Dense(2, activation='relu', name='bottleneck'),
                keras.layers.Dense(4, activation='relu'),
                keras.layers.Dense(8, activation='relu'),
                keras.layers.Dense(16, activation='relu'),
                keras.layers.Dense(input_dim, activation='sigmoid')
            ])
        
        elif architecture == 'dropout':
            # With dropout for regularization
            model = keras.Sequential([
                keras.layers.Input(shape=(input_dim,)),
                keras.layers.Dense(16, activation='relu'),
                keras.layers.Dropout(0.2),
                keras.layers.Dense(8, activation='relu'),
                keras.layers.Dropout(0.2),
                keras.layers.Dense(4, activation='relu', name='bottleneck'),
                keras.layers.Dense(8, activation='relu'),
                keras.layers.Dropout(0.2),
                keras.layers.Dense(16, activation='relu'),
                keras.layers.Dense(input_dim, activation='sigmoid')
            ])
        
        else:  # variational
            # Variational autoencoder
            encoder_input = keras.layers.Input(shape=(input_dim,))
            x = keras.layers.Dense(16, activation='relu')(encoder_input)
            x = keras.layers.Dense(8, activation='relu')(x)
            z_mean = keras.layers.Dense(4, name='z_mean')(x)
            z_log_var = keras.layers.Dense(4, name='z_log_var')(x)
            
            # Sampling layer
            def sampling(args):
                z_mean, z_log_var = args
                epsilon = tf.random.normal(shape=tf.shape(z_mean))
                return z_mean + tf.exp(0.5 * z_log_var) * epsilon
            
            z = keras.layers.Lambda(sampling, output_shape=(4,), name='z')([z_mean, z_log_var])
            
            # Decoder
            decoder_input = keras.layers.Input(shape=(4,))
            x = keras.layers.Dense(8, activation='relu')(decoder_input)
            x = keras.layers.Dense(16, activation='relu')(x)
            decoder_output = keras.layers.Dense(input_dim, activation='sigmoid')(x)
            
            decoder = keras.Model(decoder_input, decoder_output, name='decoder')
            encoder_output = decoder(z)
            
            model = keras.Model(encoder_input, encoder_output, name='vae')
        
        model.compile(optimizer='adam', loss='mse', metrics=['mae'])
        return model
    
    def build_risk_predictor(self, input_dim: int, architecture: str) -> keras.Model:
        """Build neural network for risk prediction"""
        
        if architecture == 'shallow':
            # Shallow network
            model = keras.Sequential([
                keras.layers.Input(shape=(input_dim,)),
                keras.layers.Dense(16, activation='relu'),
                keras.layers.Dense(8, activation='relu'),
                keras.layers.Dense(1, activation='sigmoid')
            ])
        
        elif architecture == 'deep':
            # Deep network
            model = keras.Sequential([
                keras.layers.Input(shape=(input_dim,)),
                keras.layers.Dense(32, activation='relu'),
                keras.layers.Dense(16, activation='relu'),
                keras.layers.Dense(8, activation='relu'),
                keras.layers.Dense(4, activation='relu'),
                keras.layers.Dense(1, activation='sigmoid')
            ])
        
        elif architecture == 'wide_deep':
            # Wide & Deep architecture
            input_layer = keras.layers.Input(shape=(input_dim,))
            
            # Wide path
            wide = keras.layers.Dense(1, activation='sigmoid')(input_layer)
            
            # Deep path
            deep = keras.layers.Dense(32, activation='relu')(input_layer)
            deep = keras.layers.Dense(16, activation='relu')(deep)
            deep = keras.layers.Dense(8, activation='relu')(deep)
            deep = keras.layers.Dense(1, activation='sigmoid')(deep)
            
            # Combine
            output = keras.layers.Average()([wide, deep])
            model = keras.Model(inputs=input_layer, outputs=output)
        
        else:  # residual
            # Residual network
            input_layer = keras.layers.Input(shape=(input_dim,))
            
            x = keras.layers.Dense(32, activation='relu')(input_layer)
            residual = x
            
            x = keras.layers.Dense(32, activation='relu')(x)
            x = keras.layers.Add()([x, residual])
            
            x = keras.layers.Dense(16, activation='relu')(x)
            x = keras.layers.Dense(8, activation='relu')(x)
            x = keras.layers.Dense(1, activation='sigmoid')(x)
            
            model = keras.Model(inputs=input_layer, outputs=x)
        
        model.compile(optimizer='adam', loss='mse', metrics=['mae'])
        return model
    
    def select_best_model(self, X: np.ndarray, y: Optional[np.ndarray], 
                          model_type: str, k_folds: int = 3) -> Tuple[str, float]:
        """
        Select best model using cross-validation
        
        Args:
            X: Feature matrix
            y: Labels (None for autoencoder)
            model_type: 'anomaly' or 'risk'
            k_folds: Number of CV folds
        
        Returns:
            (best_architecture, best_score)
        """
        if model_type == 'anomaly':
            architectures = ['simple', 'deep', 'dropout', 'variational']
        else:
            architectures = ['shallow', 'deep', 'wide_deep', 'residual']
        
        best_arch = None
        best_score = float('inf')
        
        print(f'[DL] Testing {len(architectures)} architectures with {k_folds}-fold CV...')
        
        kf = KFold(n_splits=k_folds, shuffle=True, random_state=42)
        
        for arch in architectures:
            scores = []
            
            for fold, (train_idx, val_idx) in enumerate(kf.split(X)):
                X_train, X_val = X[train_idx], X[val_idx]
                
                if model_type == 'anomaly':
                    model = self.build_autoencoder(X.shape[1], arch)
                    model.fit(X_train, X_train, epochs=50, batch_size=32, 
                             verbose=0, validation_data=(X_val, X_val))
                    score = model.evaluate(X_val, X_val, verbose=0)[0]
                else:
                    y_train, y_val = y[train_idx], y[val_idx]
                    model = self.build_risk_predictor(X.shape[1], arch)
                    model.fit(X_train, y_train, epochs=80, batch_size=32,
                             verbose=0, validation_data=(X_val, y_val))
                    score = model.evaluate(X_val, y_val, verbose=0)[0]
                
                scores.append(score)
                print(f'[DL] {arch} - Fold {fold+1}/{k_folds}: {score:.6f}')
            
            avg_score = np.mean(scores)
            print(f'[DL] {arch} - Average CV score: {avg_score:.6f}')
            
            if avg_score < best_score:
                best_score = avg_score
                best_arch = arch
        
        print(f'[DL] Best architecture: {best_arch} (score: {best_score:.6f})')
        return best_arch, best_score
    
    def train_models(self, records: List[Dict], force_retrain: bool = False) -> Dict:
        """
        Train models with automatic architecture selection
        
        Args:
            records: List of land record dictionaries
            force_retrain: Force retraining even if models exist
        
        Returns:
            Training results dictionary
        """
        if self.is_initialized and not force_retrain:
            return {'status': 'already_trained', 'message': 'Models already trained'}
        
        print(f'[DL] Starting model selection and training with {len(records)} records...')
        
        # Extract features
        features = []
        risk_labels = []
        
        for record in records:
            feat = self.extract_features(record)
            features.append(feat)
            
            risk = record.get('security', {}).get('risk_score', 0) / 100.0
            risk_labels.append(risk)
        
        X = np.array(features, dtype=np.float32)
        y = np.array(risk_labels, dtype=np.float32)
        
        print(f'[DL] Extracted {X.shape[0]} samples with {X.shape[1]} features')
        
        # Normalize features
        self.feature_scaler = StandardScaler()
        X_scaled = self.feature_scaler.fit_transform(X)
        
        # Select and train anomaly detection model
        print('[DL] Step 1: Selecting anomaly detection model...')
        best_anomaly_arch, anomaly_score = self.select_best_model(X_scaled, None, 'anomaly')
        
        print('[DL] Training final anomaly detection model on full dataset...')
        self.anomaly_model = self.build_autoencoder(X_scaled.shape[1], best_anomaly_arch)
        history_anomaly = self.anomaly_model.fit(
            X_scaled, X_scaled,
            epochs=100,
            batch_size=32,
            validation_split=0.2,
            verbose=1
        )
        
        # Calculate reconstruction threshold
        reconstructions = self.anomaly_model.predict(X_scaled)
        mse = np.mean(np.power(X_scaled - reconstructions, 2), axis=1)
        threshold = np.mean(mse) + 2 * np.std(mse)
        
        # Select and train risk prediction model
        print('[DL] Step 2: Selecting risk prediction model...')
        best_risk_arch, risk_score = self.select_best_model(X_scaled, y, 'risk')
        
        print('[DL] Training final risk prediction model on full dataset...')
        self.risk_model = self.build_risk_predictor(X_scaled.shape[1], best_risk_arch)
        history_risk = self.risk_model.fit(
            X_scaled, y,
            epochs=120,
            batch_size=32,
            validation_split=0.2,
            verbose=1
        )
        
        # Save models
        print('[DL] Saving models...')
        self.anomaly_model.save(os.path.join(self.model_path, 'anomaly_model.h5'))
        self.risk_model.save(os.path.join(self.model_path, 'risk_model.h5'))
        
        # Save scalers
        joblib.dump(self.feature_scaler, os.path.join(self.model_path, 'feature_scaler.pkl'))
        
        # Save metadata
        self.metadata = {
            'training_date': datetime.now().isoformat(),
            'num_records': len(records),
            'num_features': X.shape[1],
            'anomaly_model': {
                'name': best_anomaly_arch,
                'cv_score': float(anomaly_score),
                'final_loss': float(history_anomaly.history['loss'][-1]),
                'val_loss': float(history_anomaly.history['val_loss'][-1]),
                'threshold': float(threshold)
            },
            'risk_model': {
                'name': best_risk_arch,
                'cv_score': float(risk_score),
                'final_loss': float(history_risk.history['loss'][-1]),
                'val_loss': float(history_risk.history['val_loss'][-1]),
                'val_mae': float(history_risk.history['val_mae'][-1])
            }
        }
        
        with open(os.path.join(self.model_path, 'metadata.json'), 'w') as f:
            json.dump(self.metadata, f, indent=2)
        
        self.is_initialized = True
        print('[DL] Training complete!')
        
        return {
            'status': 'success',
            'records_used': len(records),
            'features_extracted': X.shape[1],
            'anomaly_model': self.metadata['anomaly_model'],
            'risk_model': self.metadata['risk_model']
        }
    
    def detect_anomaly(self, record: Dict) -> Dict:
        """Detect if a record is anomalous"""
        if not self.is_initialized:
            raise ValueError('Models not trained. Train models first.')
        
        # Extract and scale features
        features = self.extract_features(record)
        features_scaled = self.feature_scaler.transform(features.reshape(1, -1))
        
        # Get reconstruction
        reconstruction = self.anomaly_model.predict(features_scaled, verbose=0)
        mse = np.mean(np.power(features_scaled - reconstruction, 2))
        
        threshold = self.metadata['anomaly_model']['threshold']
        is_anomaly = mse > threshold
        anomaly_score = min(1.0, mse / threshold)
        
        return {
            'is_anomaly': bool(is_anomaly),
            'reconstruction_error': float(mse),
            'threshold': float(threshold),
            'anomaly_score': float(anomaly_score),
            'model_used': self.metadata['anomaly_model']['name']
        }
    
    def predict_risk(self, record: Dict) -> Dict:
        """Predict risk score for a record"""
        if not self.is_initialized:
            raise ValueError('Models not trained. Train models first.')
        
        # Extract and scale features
        features = self.extract_features(record)
        features_scaled = self.feature_scaler.transform(features.reshape(1, -1))
        
        # Predict
        prediction = self.risk_model.predict(features_scaled, verbose=0)[0][0]
        risk_score = int(prediction * 100)
        
        # Determine risk band
        if risk_score <= 20:
            risk_band = 'LOW'
        elif risk_score <= 50:
            risk_band = 'MEDIUM'
        elif risk_score <= 80:
            risk_band = 'HIGH'
        else:
            risk_band = 'CRITICAL'
        
        return {
            'ml_risk_score': risk_score,
            'ml_risk_band': risk_band,
            'normalized_score': float(prediction),
            'model_used': self.metadata['risk_model']['name']
        }
    
    def analyze_record(self, record: Dict) -> Dict:
        """Complete analysis of a record"""
        anomaly_result = self.detect_anomaly(record)
        risk_result = self.predict_risk(record)
        
        # Combined risk
        combined_score = risk_result['ml_risk_score']
        if anomaly_result['is_anomaly']:
            combined_score = min(100, combined_score + 30)
        
        if combined_score <= 20:
            combined_band = 'LOW'
        elif combined_score <= 50:
            combined_band = 'MEDIUM'
        elif combined_score <= 80:
            combined_band = 'HIGH'
        else:
            combined_band = 'CRITICAL'
        
        return {
            'features_used': 23,
            'anomaly_detection': anomaly_result,
            'risk_prediction': risk_result,
            'combined_risk': {
                'score': combined_score,
                'band': combined_band,
                'confidence': 'HIGH_ALERT' if anomaly_result['is_anomaly'] else 'MODERATE',
                'factors': [
                    'Anomaly detected' if anomaly_result['is_anomaly'] else 'Normal pattern',
                    f'ML risk: {risk_result["ml_risk_score"]}',
                    f'Reconstruction error: {anomaly_result["reconstruction_error"]:.6f}'
                ]
            }
        }
    
    def get_stats(self) -> Dict:
        """Get model statistics"""
        if not self.is_initialized:
            return {
                'initialized': False,
                'message': 'Models not trained yet'
            }
        
        return {
            'initialized': True,
            'training_date': self.metadata.get('training_date'),
            'num_records': self.metadata.get('num_records'),
            'num_features': self.metadata.get('num_features'),
            'anomaly_model': self.metadata.get('anomaly_model'),
            'risk_model': self.metadata.get('risk_model')
        }
