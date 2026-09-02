"""Deep Learning API Routes"""
from flask import Blueprint, request, jsonify, session
from models.land_record import LandRecord
from services.deep_learning_service import DeepLearningService
import os

bp = Blueprint('deep_learning', __name__)
dl_service = DeepLearningService()

def require_auth(f):
    """Require authentication decorator"""
    def wrapper(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

def require_role(*roles):
    """Require specific role decorator"""
    def decorator(f):
        def wrapper(*args, **kwargs):
            if 'user_id' not in session:
                return jsonify({'error': 'Unauthorized'}), 401
            if session.get('role') not in roles:
                return jsonify({'error': 'Forbidden'}), 403
            return f(*args, **kwargs)
        wrapper.__name__ = f.__name__
        return wrapper
    return decorator

@bp.route('/stats', methods=['GET'])
@require_role('administrator', 'auditor', 'registration_officer')
def get_stats():
    """Get model statistics"""
    try:
        stats = dl_service.get_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': f'Failed to get stats: {str(e)}'}), 500

@bp.route('/train', methods=['POST'])
@require_role('administrator')
def train_models():
    """Train models with automatic architecture selection"""
    try:
        data = request.get_json() or {}
        force_retrain = data.get('forceRetrain', False)
        min_records = data.get('minRecords', 100)
        max_records = data.get('maxRecords', 1000)
        
        # Check if already trained
        if dl_service.is_initialized and not force_retrain:
            return jsonify({
                'status': 'already_trained',
                'message': 'Models already trained and selected',
                'models': dl_service.get_stats()
            })
        
        # Fetch training data
        records = LandRecord.objects(
            security__tamper_status__in=['VERIFIED', 'TAMPERED', 'HASH_MISMATCH', 'SIGNATURE_INVALID']
        ).limit(max_records)
        
        records_list = [r.to_dict() for r in records]
        
        if len(records_list) < min_records:
            return jsonify({
                'error': f'Insufficient training data. Need at least {min_records} records, found {len(records_list)}',
                'recordsFound': len(records_list)
            }), 400
        
        # Train models
        print(f'[API] Starting training with {len(records_list)} records...')
        results = dl_service.train_models(records_list, force_retrain=force_retrain)
        
        return jsonify({
            'message': 'Model selection and training completed successfully',
            **results
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Training failed: {str(e)}'}), 500

@bp.route('/analyze/<record_id>', methods=['POST'])
@require_role('administrator', 'auditor', 'registration_officer')
def analyze_record(record_id):
    """Analyze a single record"""
    try:
        if not dl_service.is_initialized:
            return jsonify({
                'error': 'Models not trained. Please train models first',
                'initialized': False
            }), 400
        
        # Find record
        record = LandRecord.objects(land_record_id=record_id).first()
        if not record:
            record = LandRecord.objects(transaction_id=record_id).first()
        
        if not record:
            return jsonify({'error': 'Record not found'}), 404
        
        # Analyze
        analysis = dl_service.analyze_record(record.to_dict())
        
        return jsonify({
            'land_record_id': record.land_record_id,
            'transaction_id': record.transaction_id,
            'deepLearningAnalysis': analysis
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500

@bp.route('/batch-analyze', methods=['POST'])
@require_role('administrator', 'auditor')
def batch_analyze():
    """Analyze multiple records"""
    try:
        if not dl_service.is_initialized:
            return jsonify({
                'error': 'Models not trained. Please train models first',
                'initialized': False
            }), 400
        
        data = request.get_json()
        record_ids = data.get('recordIds', [])
        limit = min(data.get('limit', 50), 100)
        
        if not isinstance(record_ids, list):
            return jsonify({'error': 'recordIds array is required'}), 400
        
        results = []
        for record_id in record_ids[:limit]:
            try:
                record = LandRecord.objects(land_record_id=record_id).first()
                if not record:
                    record = LandRecord.objects(transaction_id=record_id).first()
                
                if not record:
                    continue
                
                analysis = dl_service.analyze_record(record.to_dict())
                
                results.append({
                    'land_record_id': record.land_record_id,
                    'transaction_id': record.transaction_id,
                    'is_anomaly': analysis['anomaly_detection']['is_anomaly'],
                    'anomaly_score': analysis['anomaly_detection']['anomaly_score'],
                    'ml_risk_score': analysis['risk_prediction']['ml_risk_score'],
                    'ml_risk_band': analysis['risk_prediction']['ml_risk_band']
                })
            except Exception as e:
                print(f'Error analyzing {record_id}: {e}')
                continue
        
        # Calculate statistics
        anomalies = [r for r in results if r['is_anomaly']]
        avg_risk = sum(r['ml_risk_score'] for r in results) / len(results) if results else 0
        
        return jsonify({
            'analyzed': len(results),
            'anomalies': len(anomalies),
            'anomalyPercentage': f'{len(anomalies) / len(results) * 100:.1f}' if results else '0.0',
            'averageRiskScore': f'{avg_risk:.1f}',
            'results': results
        })
        
    except Exception as e:
        return jsonify({'error': f'Batch analysis failed: {str(e)}'}), 500

@bp.route('/architectures', methods=['GET'])
@require_role('administrator')
def get_architectures():
    """Get available model architectures"""
    return jsonify({
        'anomaly_models': [
            {'name': 'simple', 'description': 'Simple autoencoder (23→12→6→3→6→12→23)'},
            {'name': 'deep', 'description': 'Deep autoencoder (23→16→8→4→2→4→8→16→23)'},
            {'name': 'dropout', 'description': 'Autoencoder with dropout regularization'},
            {'name': 'variational', 'description': 'Variational autoencoder with latent space'}
        ],
        'risk_models': [
            {'name': 'shallow', 'description': 'Shallow neural network (23→16→8→1)'},
            {'name': 'deep', 'description': 'Deep neural network (23→32→16→8→4→1)'},
            {'name': 'wide_deep', 'description': 'Wide & deep architecture with parallel paths'},
            {'name': 'residual', 'description': 'Residual network with skip connections'}
        ]
    })
