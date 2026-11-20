import numpy as np
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    matthews_corrcoef,
    confusion_matrix
)

def compute_cost(y_true, y_pred, cost_fp=1.0, cost_fn=10.0):
    """
    Computes the total and average misclassification cost given asymmetric error costs.
    Cost = (FP * cost_fp) + (FN * cost_fn)
    """
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()
    total_cost = (fp * cost_fp) + (fn * cost_fn)
    avg_cost = total_cost / len(y_true)
    return total_cost, avg_cost, (tn, fp, fn, tp)

def evaluate_predictions(y_true, y_pred, y_prob=None, cost_fp=1.0, cost_fn=10.0):
    """
    Evaluates binary classification output against comprehensive metrics.
    Emphasizes Recall, PR-AUC, MCC, and Expected Cost over raw Accuracy.
    """
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()
    
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    mcc = matthews_corrcoef(y_true, y_pred)
    
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
    fnr = fn / (fn + tp) if (fn + tp) > 0 else 0.0
    
    roc_auc = np.nan
    pr_auc = np.nan
    if y_prob is not None:
        try:
            roc_auc = roc_auc_score(y_true, y_prob)
            pr_auc = average_precision_score(y_true, y_prob)
        except Exception:
            pass
            
    total_cost, avg_cost, _ = compute_cost(y_true, y_pred, cost_fp=cost_fp, cost_fn=cost_fn)
    
    metrics = {
        "accuracy": acc,
        "precision": prec,
        "recall": rec,
        "f1_score": f1,
        "roc_auc": roc_auc,
        "pr_auc": pr_auc,
        "mcc": mcc,
        "fpr": fpr,
        "fnr": fnr,
        "tp": int(tp),
        "fp": int(fp),
        "tn": int(tn),
        "fn": int(fn),
        "total_cost": total_cost,
        "avg_cost": avg_cost,
        "cost_fp": cost_fp,
        "cost_fn": cost_fn
    }
    return metrics

def print_metrics(metrics, title="Model Evaluation"):
    """Neatly prints the metrics dictionary."""
    print(f"\n==================== {title} ====================")
    print(f"Accuracy:        {metrics['accuracy']:.4f}")
    print(f"Precision:       {metrics['precision']:.4f}")
    print(f"Recall (Fraud):  {metrics['recall']:.4f}  <-- Priority")
    print(f"F1-Score:        {metrics['f1_score']:.4f}")
    print(f"ROC-AUC:         {metrics['roc_auc']:.4f}")
    print(f"PR-AUC:          {metrics['pr_auc']:.4f}  <-- Priority (Imbalance)")
    print(f"MCC:             {metrics['mcc']:.4f}")
    print(f"FPR:             {metrics['fpr']:.4f} | FNR: {metrics['fnr']:.4f}")
    print(f"Confusion Matrix: [TN={metrics['tn']}, FP={metrics['fp']}, FN={metrics['fn']}, TP={metrics['tp']}]")
    print(f"Total Cost:      {metrics['total_cost']:.1f} (Cost Ratio FP={metrics['cost_fp']} : FN={metrics['cost_fn']})")
    print("========================================================\n")

if __name__ == "__main__":
    y_test = np.array([0]*94 + [1]*6)
    y_pred_naive = np.zeros(100, dtype=int)
    print("Test Naive Predict-All-Legitimate Classifier (demonstrates why Accuracy is misleading):")
    m = evaluate_predictions(y_test, y_pred_naive, np.zeros(100))
    print_metrics(m, "Naive Zero-Fraud Classifier")
