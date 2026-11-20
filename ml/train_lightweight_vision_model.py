import os
import sys
import json
import joblib
import numpy as np
import cv2
from PIL import Image

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
SERIALIZED_DIR = os.path.join(PROJECT_ROOT, "ml", "serialized")
os.makedirs(SERIALIZED_DIR, exist_ok=True)

# 4 High-Level Master Visual Categories + 29 Catalog Classes
MASTER_CATEGORIES = [
    "CAR",
    "TWO_WHEELER",
    "ELECTRIC_VEHICLE",
    "HUMAN_PERSON",
    "NON_VEHICLE_OBJECT"
]

def extract_visual_feature_vector(img: np.ndarray) -> np.ndarray:
    """
    Extracts a 192-dimensional robust visual fingerprint:
    1. Aspect ratio & density (4 features)
    2. HSV Color distribution (48 features)
    3. Spatial gradient energy & edge directionality (40 features)
    4. Compact HOG texture descriptor (100 features)
    """
    if img is None:
        return np.zeros(192, dtype=np.float32)
        
    h, w = img.shape[:2]
    aspect_ratio = float(w) / max(1, h)
    
    # Resize to standard canonical size for consistent feature representation
    resized = cv2.resize(img, (128, 128))
    
    # 1. Color in HSV space
    hsv = cv2.cvtColor(resized, cv2.COLOR_BGR2HSV)
    hist_h = cv2.calcHist([hsv], [0], None, [16], [0, 180])
    hist_s = cv2.calcHist([hsv], [1], None, [16], [0, 256])
    hist_v = cv2.calcHist([hsv], [2], None, [16], [0, 256])
    cv2.normalize(hist_h, hist_h)
    cv2.normalize(hist_s, hist_s)
    cv2.normalize(hist_v, hist_v)
    color_feats = np.hstack([hist_h.flatten(), hist_s.flatten(), hist_v.flatten()]) # 48 dims
    
    # 2. Gradient & Edge Energy via Sobel & Laplacian
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    mag, ang = cv2.cartToPolar(sobelx, sobely, angleInDegrees=True)
    
    hist_mag = np.histogram(mag, bins=20, range=(0, 255))[0].astype(np.float32)
    hist_mag /= (np.sum(hist_mag) + 1e-6)
    
    hist_ang = np.histogram(ang, bins=20, range=(0, 360))[0].astype(np.float32)
    hist_ang /= (np.sum(hist_ang) + 1e-6)
    gradient_feats = np.hstack([hist_mag, hist_ang]) # 40 dims
    
    # 3. Compact HOG (Histogram of Oriented Gradients)
    hog = cv2.HOGDescriptor(
        _winSize=(128, 128),
        _blockSize=(64, 64),
        _blockStride=(32, 32),
        _cellSize=(32, 32),
        _nbins=9
    )
    hog_feats = hog.compute(gray).flatten()
    if len(hog_feats) > 100:
        hog_feats = hog_feats[:100]
    elif len(hog_feats) < 100:
        hog_feats = np.pad(hog_feats, (0, 100 - len(hog_feats)))
        
    # 4. Global geometry & silhouette
    lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    geom_feats = np.array([
        aspect_ratio,
        float(np.mean(gray)) / 255.0,
        float(np.std(gray)) / 255.0,
        min(1.0, lap_var / 500.0)
    ], dtype=np.float32)
    
    vector = np.hstack([geom_feats, color_feats, gradient_feats, hog_feats])
    return vector[:192].astype(np.float32)

def train_lightweight_vision_model():
    print("==========================================================================")
    print("   TRAINING LIGHTWEIGHT HIGH-SPEED VISUAL CLASSIFIER (ZERO-TORCH ENGINE)  ")
    print("   Compatible with Render 512MB RAM & Instant Response                    ")
    print("==========================================================================\n")
    
    # Import generator from build_and_train_vehicle_catalog
    from ml.build_and_train_vehicle_catalog import (
        ALL_CLASSES, SUPPORTED_CATALOG, REJECTION_CLASSES,
        generate_synthetic_vehicle_seed, apply_physical_augmentations
    )
    from sklearn.ensemble import ExtraTreesClassifier
    from sklearn.metrics import accuracy_score, classification_report
    
    X_train = []
    y_train = []
    X_test = []
    y_test = []
    
    category_map = {}
    for cls in ALL_CLASSES:
        if "REJECTED_Chair" in cls or "REJECTED_Household" in cls:
            cat = "NON_VEHICLE_OBJECT"
        elif "REJECTED_Human" in cls:
            cat = "HUMAN_PERSON"
        elif "REJECTED_Unsupported" in cls:
            cat = "NON_VEHICLE_OBJECT"
        elif any(b in cls for b in ["Classic", "Hunter", "Ather", "Ola", "Activa", "Jupiter", "Pulsar", "MT-15", "Duke"]):
            cat = "TWO_WHEELER"
        elif "EV" in cls or "Ioniq" in cls or "Atto" in cls:
            cat = "ELECTRIC_VEHICLE"
        else:
            cat = "CAR"
        category_map[cls] = cat

    print("Generating feature vectors from MotorClaim-VI dataset...")
    NUM_SEEDS = 6
    AUGS_PER_SEED = 10
    
    for cls_name in ALL_CLASSES:
        cat_label = category_map[cls_name]
        for s_idx in range(NUM_SEEDS):
            seed_img = generate_synthetic_vehicle_seed(cls_name, s_idx)
            is_train = (s_idx < 4) # 4/6 = 66.7% (approx 70-30 split)
            
            for aug_id in range(AUGS_PER_SEED):
                aug_img = apply_physical_augmentations(seed_img, aug_id)
                # Convert PIL to BGR OpenCV format
                cv_img = cv2.cvtColor(np.array(aug_img), cv2.COLOR_RGB2BGR)
                feat = extract_visual_feature_vector(cv_img)
                
                if is_train:
                    X_train.append(feat)
                    y_train.append(cat_label)
                else:
                    X_test.append(feat)
                    y_test.append(cat_label)
                    
    X_train = np.array(X_train)
    X_test = np.array(X_test)
    y_train = np.array(y_train)
    y_test = np.array(y_test)
    
    print(f"Dataset Size: {len(X_train) + len(X_test)} samples")
    print(f"Train Set: {len(X_train)} samples (70%) | Test Set: {len(X_test)} samples (30%)")
    
    # Train high-speed ExtraTreesClassifier (takes ~2 seconds, zero memory footprint)
    print("\nFitting ExtraTreesClassifier...")
    clf = ExtraTreesClassifier(n_estimators=100, max_depth=16, random_state=42, n_jobs=-1)
    clf.fit(X_train, y_train)
    
    preds = clf.predict(X_test)
    acc = accuracy_score(y_test, preds)
    print(f"\n==========================================================================")
    print(f"   30% UNSEEN TEST ACCURACY: {acc * 100:.2f}%")
    print("==========================================================================")
    print("\nClassification Report:\n")
    print(classification_report(y_test, preds))
    
    # Save the lightweight model
    model_path = os.path.join(SERIALIZED_DIR, "lightweight_vision_classifier.joblib")
    joblib.dump(clf, model_path, compress=3)
    print(f"Lightweight Vision Model saved to: {model_path} (Size: {os.path.getsize(model_path) // 1024} KB)")
    print("Zero-Torch high-speed visual inference engine is ready!")

if __name__ == "__main__":
    train_lightweight_vision_model()
