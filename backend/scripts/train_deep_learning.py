"""
Deep Learning Fraud & Anomaly Detection Model Training
Trained on UK HM Land Registry Dataset (ppd_data.csv)
Exports deep neural network architecture, weights, scaler parameters, and anomaly thresholds to JSON.
"""

import os
import csv
import json
import math
import numpy as np
from datetime import datetime
from sklearn.neural_network import MLPClassifier, MLPRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, accuracy_score, f1_score

def find_csv_path():
    candidates = [
        os.path.join(os.path.dirname(__file__), '..', '..', 'ppd_data.csv'),
        os.path.join(os.path.dirname(__file__), '..', 'ppd_data.csv'),
        os.path.join(os.getcwd(), 'ppd_data.csv'),
    ]
    for p in candidates:
        if os.path.exists(p):
            return os.path.abspath(p)
    raise FileNotFoundError("ppd_data.csv not found")

def parse_date(date_str):
    try:
        parts = date_str.strip().split('/')
        if len(parts) == 3:
            d, m, y = int(parts[0]), int(parts[1]), int(parts[2])
            return datetime(y, m, d)
    except Exception:
        pass
    return datetime(2015, 1, 1)

def build_dataset():
    csv_path = find_csv_path()
    print(f"[DATA] Ingesting dataset from: {csv_path}")

    raw_rows = []
    with open(csv_path, 'r', encoding='utf-8', errors='ignore') as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) >= 16:
                raw_rows.append(row)

    print(f"[DATA] Loaded {len(raw_rows)} raw records.")

    # Property type mapping
    pt_map = {'D': 0, 'S': 1, 'T': 2, 'F': 3, 'O': 4}
    dur_map = {'F': 0, 'L': 1, 'U': 2}
    cat_map = {'A': 0, 'B': 1}

    # Step 1: Calculate postcode baseline statistics for regional z-score
    postcode_prices = {}
    for r in raw_rows:
        try:
            price = float(r[1])
            pc = (r[3] or '').strip().split(' ')[0]
            if pc and price > 0:
                postcode_prices.setdefault(pc, []).append(price)
        except Exception:
            continue

    postcode_stats = {}
    for pc, prices in postcode_prices.items():
        arr = np.array(prices)
        postcode_stats[pc] = {
            'mean': float(np.mean(arr)),
            'std': float(np.std(arr)) if np.std(arr) > 0 else float(np.mean(arr) * 0.3)
        }

    # Step 2: Feature Engineering & Label Generation
    # Classes: 0 -> VALID, 1 -> SUSPICIOUS, 2 -> FRAUD
    X = []
    y = []

    rng = np.random.RandomState(42)

    for idx, r in enumerate(raw_rows):
        txn_id = r[0]
        try:
            price = float(r[1])
            if price <= 0:
                price = 10000.0
        except Exception:
            price = 10000.0

        dt = parse_date(r[2])
        postcode = (r[3] or '').strip()
        pc_area = postcode.split(' ')[0] if postcode else 'OTHER'
        pt_raw = (r[4] or 'O').strip().upper()
        nb_raw = (r[5] or 'N').strip().upper()
        dur_raw = (r[6] or 'U').strip().upper()
        cat_raw = (r[14] or 'A').strip().upper()

        # Deterministic synthetic fields
        h = hash(txn_id) % 1000000
        land_area = float(50 + (abs(h) % 4950))
        is_mortgaged = 1.0 if (abs(h) % 3 == 0) else 0.0
        is_disputed = 1.0 if (abs(h) % 25 == 0) else 0.0
        is_new_build = 1.0 if nb_raw == 'Y' else 0.0

        # Derived metrics
        log_price = math.log1p(price)
        price_per_sqm = price / max(land_area, 10.0)
        log_price_per_sqm = math.log1p(price_per_sqm)

        stats = postcode_stats.get(pc_area, {'mean': 250000.0, 'std': 100000.0})
        price_zscore = (price - stats['mean']) / max(stats['std'], 1.0)
        price_zscore = max(min(price_zscore, 5.0), -5.0)

        # Categorical one-hot vectors
        pt_idx = pt_map.get(pt_raw, 4)
        pt_vec = [1.0 if i == pt_idx else 0.0 for i in range(5)]

        dur_idx = dur_map.get(dur_raw, 2)
        dur_vec = [1.0 if i == dur_idx else 0.0 for i in range(3)]

        cat_idx = cat_map.get(cat_raw, 0)
        cat_vec = [1.0 if i == cat_idx else 0.0 for i in range(2)]

        # Temporal features
        year_norm = (dt.year - 1995) / 35.0
        month_norm = dt.month / 12.0
        dow_norm = dt.weekday() / 7.0

        # Base feature vector (20 dims)
        feat = [
            log_price,
            math.log1p(land_area),
            log_price_per_sqm,
            price_zscore,
            is_new_build,
            is_mortgaged,
            is_disputed,
            year_norm,
            month_norm,
            dow_norm,
            *pt_vec,
            *dur_vec,
            *cat_vec,
        ]

        # Ground truth label assignment for training
        # Natural distribution: ~85% Valid, ~10% Suspicious, ~5% Fraud
        label = 0 # VALID
        if is_disputed > 0:
            if abs(price_zscore) > 2.0 or price < 5000:
                label = 2 # FRAUD
            else:
                label = 1 # SUSPICIOUS
        elif abs(price_zscore) > 3.5 or price_per_sqm < 5.0 or price_per_sqm > 50000.0:
            label = 1 # SUSPICIOUS

        X.append(feat)
        y.append(label)

    # Augment with synthetic edge fraud & anomaly cases
    print("[DATA] Generating balanced synthetic edge fraud & anomaly cases...")
    fraud_templates = [
        # (price, land_area, is_mortgaged, is_disputed, pt, dur, label)
        (1.0, 500.0, 1.0, 1.0, 3, 1, 2),        # £1 nominal price transfer with mortgage & active dispute
        (50000000.0, 40.0, 0.0, 1.0, 3, 1, 2),  # £50M flat valuation laundering with dispute
        (10.0, 4000.0, 0.0, 1.0, 0, 0, 2),      # Land grab £10 under dispute
        (99999999.0, 100.0, 1.0, 1.0, 1, 0, 2), # Extreme money laundering anomaly
        (250000.0, 80.0, 0.0, 1.0, 3, 1, 1),    # Active dispute normal price -> Suspicious
        (1200000.0, 45.0, 1.0, 0.0, 3, 1, 1),   # Suspicious valuation spike
    ]

    for f_price, f_area, f_mort, f_disp, f_pt, f_dur, f_lbl in fraud_templates:
        for _ in range(50):
            lp = math.log1p(f_price * (1.0 + rng.normal(0, 0.05)))
            la = math.log1p(f_area * (1.0 + rng.normal(0, 0.05)))
            ppsqm = math.log1p(f_price / max(f_area, 10.0))
            z = 4.5 if f_lbl == 2 else 2.8

            pt_vec = [1.0 if i == f_pt else 0.0 for i in range(5)]
            dur_vec = [1.0 if i == f_dur else 0.0 for i in range(3)]
            cat_vec = [1.0, 0.0]

            feat = [
                lp, la, ppsqm, z, 0.0, f_mort, f_disp,
                0.8, 0.5, 0.3,
                *pt_vec, *dur_vec, *cat_vec
            ]
            X.append(feat)
            y.append(f_lbl)

    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.int64)

    print(f"[DATA] Total samples: {len(X)}. Class distribution:")
    unique, counts = np.unique(y, return_counts=True)
    for u, c in zip(unique, counts):
        name = ['VALID', 'SUSPICIOUS', 'FRAUD'][u]
        print(f"  Class {u} ({name}): {c} ({c/len(y)*100:.1f}%)")

    return X, y, postcode_stats

def train_and_export():
    X, y, postcode_stats = build_dataset()

    # Step 3: Feature Scaling (StandardScaler)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Step 4: Train Deep Multi-Layer Perceptron Classifier
    print("\n[TRAIN] Training Deep Neural Network Classifier (Dense 64 -> Dense 32 -> Dense 16 -> Softmax 3)...")
    clf = MLPClassifier(
        hidden_layer_sizes=(64, 32, 16),
        activation='relu',
        solver='adam',
        alpha=0.0005,
        batch_size=128,
        learning_rate_init=0.003,
        max_iter=80,
        random_state=42,
        early_stopping=True,
        n_iter_no_change=10
    )
    clf.fit(X_scaled, y)

    y_pred = clf.predict(X_scaled)
    acc = accuracy_score(y, y_pred)
    f1 = f1_score(y, y_pred, average='weighted')
    print(f"[EVAL] Deep Neural Network Accuracy: {acc*100:.2f}% | F1-Score: {f1*100:.2f}%")
    print(classification_report(y, y_pred, target_names=['VALID', 'SUSPICIOUS', 'FRAUD']))

    # Step 5: Train Deep Autoencoder (for continuous reconstruction anomaly score)
    print("\n[TRAIN] Training Deep Autoencoder for Anomaly Reconstruction (20 -> 12 -> 6 -> 12 -> 20)...")
    valid_mask = (y == 0)
    X_valid = X_scaled[valid_mask]

    autoencoder = MLPRegressor(
        hidden_layer_sizes=(16, 8, 16),
        activation='relu',
        solver='adam',
        alpha=0.001,
        batch_size=128,
        learning_rate_init=0.005,
        max_iter=60,
        random_state=42
    )
    autoencoder.fit(X_valid, X_valid)

    # Compute reconstruction loss threshold
    reconstructed = autoencoder.predict(X_valid)
    mse = np.mean(np.square(X_valid - reconstructed), axis=1)
    anomaly_threshold_95 = float(np.percentile(mse, 95))
    anomaly_threshold_99 = float(np.percentile(mse, 99))
    print(f"[EVAL] Autoencoder Anomaly Threshold (95th percentile): {anomaly_threshold_95:.4f}")
    print(f"[EVAL] Autoencoder Anomaly Threshold (99th percentile): {anomaly_threshold_99:.4f}")

    # Step 6: Package Model Artifacts for Zero-Latency Native Inference
    model_artifact = {
        'model_name': 'LandRecordsDeepFraudDetector',
        'version': '2.1.0-deep-pqc',
        'architecture': 'Deep-MLP-Autoencoder-Hybrid',
        'input_dim': int(X.shape[1]),
        'num_classes': 3,
        'class_names': ['VALID', 'SUSPICIOUS', 'FRAUD'],
        'metrics': {
            'accuracy': round(float(acc), 4),
            'f1_score': round(float(f1), 4),
            'training_samples': int(len(X)),
        },
        'scaler': {
            'mean': [round(float(v), 6) for v in scaler.mean_],
            'scale': [round(float(v), 6) for v in scaler.scale_]
        },
        'classifier_weights': {
            'coefs': [[[round(float(w), 6) for w in row] for row in coef] for coef in clf.coefs_],
            'intercepts': [[round(float(b), 6) for b in bias] for bias in clf.intercepts_]
        },
        'autoencoder_weights': {
            'coefs': [[[round(float(w), 6) for w in row] for row in coef] for coef in autoencoder.coefs_],
            'intercepts': [[round(float(b), 6) for b in bias] for bias in autoencoder.intercepts_],
            'threshold_95': round(anomaly_threshold_95, 6),
            'threshold_99': round(anomaly_threshold_99, 6)
        },
        'postcode_stats_sample': {k: postcode_stats[k] for k in list(postcode_stats.keys())[:50]},
        'feature_names': [
            'log_price', 'log_land_area', 'log_price_per_sqm', 'price_zscore',
            'is_new_build', 'is_mortgaged', 'is_disputed',
            'year_norm', 'month_norm', 'dow_norm',
            'pt_detached', 'pt_semi', 'pt_terraced', 'pt_flat', 'pt_other',
            'dur_freehold', 'dur_leasehold', 'dur_unknown',
            'cat_standard', 'cat_additional'
        ],
        'exported_at': datetime.utcnow().isoformat() + 'Z'
    }

    out_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src', 'models', 'deep_learning_model.json'))
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(model_artifact, f, indent=2)

    print(f"\n[EXPORT] Successfully saved Deep Learning model artifact to:\n  {out_path}")
    print(f"[EXPORT] Size: {os.path.getsize(out_path)/1024:.1f} KB")

if __name__ == '__main__':
    train_and_export()
