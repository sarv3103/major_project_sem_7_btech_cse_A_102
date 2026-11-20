import os
import json
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional

class GroqFraudReasoningService:
    """
    Advanced Groq Dual-Key AI Reasoning Service for SecureWheels.
    Provides real-time deep semantic reasoning cross-referencing:
    - Customer written incident description
    - Claimed damaged parts & repair estimate
    - Vehicle type (Car, Two-Wheeler, EV, SUV)
    - Computer Vision forensic telemetry (Entity, Dominant Paint Color, Scratch/Dent/Glass patterns, ELA Heatmap, AI Deepfake risk)
    - 3-Model ML Ensemble Fraud Scores (Random Forest, XGBoost, Isolation Forest)
    
    Equipped with Dual-Key Automatic Failover:
    Primary Key -> Backup Key -> Graceful Local ML Fallback.
    """

    PRIMARY_KEY = os.getenv("GROQ_PRIMARY_API_KEY", "")
    BACKUP_KEY = os.getenv("GROQ_BACKUP_API_KEY", "")

    PRIMARY_MODEL = "openai/gpt-oss-120b"
    BACKUP_MODEL = "openai/gpt-oss-20b"
    FALLBACK_MODEL = "qwen/qwen3.8-27b"

    API_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"

    @classmethod
    def analyze_claim_forensics(
        cls,
        incident_description: str,
        damage_description: str,
        vehicle_make: str,
        vehicle_type: str,
        estimated_repair_cost: float,
        accident_location: str = "",
        cv_telemetry: Optional[Dict[str, Any]] = None,
        ensemble_scores: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Executes Groq LLM multimodal cross-examination with dual-key resilience.
        """
        cv = cv_telemetry or {}
        ens = ensemble_scores or {}

        # Prepare contextual prompt for Groq
        prompt = f"""You are the Chief Claims Fraud Investigator and Senior AI Adjudicator for SecureWheels IRDAI Insurance.
Analyze the following comprehensive claim dossier and cross-verify all textual and physical computer vision evidence:

[1. CLAIM PARTICULARS]
- Insured Vehicle: {vehicle_make} (Category: {vehicle_type})
- Incident Narrative: "{incident_description}"
- Accident Location: {accident_location or 'Not specified'}
- Claimed Damaged Components: {damage_description}
- Claimed Repair Estimate: Rs. {estimated_repair_cost:,.2f}

[2. COMPUTER VISION FORENSIC TELEMETRY]
- Visually Classified Vehicle Entity: {cv.get('detected_entity_label', 'Standard Vehicle')}
- Dominant Body Paint Extracted: {cv.get('dominant_paint_color', 'Unknown')}
- Identified Physical Damage Patterns: {', '.join(cv.get('damage_patterns', {}).get('detected_patterns', ['Standard Exterior Wear']))}
- Visual Consistency Score: {cv.get('visual_consistency_score', 0.85) * 100:.0f}%
- AI-Generation / Deepfake Risk: {cv.get('ai_generation_verdict', 'AUTHENTIC_CAMERA_CAPTURE')}
- Physical Discrepancies Noted: {json.dumps(cv.get('discrepancies', []))}

[3. TABULAR ENSEMBLE FRAUD SCORES]
- Random Forest (Supervised): {ens.get('random_forest_score', 0.15)}
- XGBoost (Gradient Boosted): {ens.get('xgboost_score', 0.18)}
- Isolation Forest (Anomaly): {ens.get('isolation_forest_score', 0.10)}
- Blended Ensemble Risk Level: {ens.get('risk_level', 'LOW')} (Score: {ens.get('ensemble_score', 0.16)})

[YOUR TASK]
Provide a strict, professional adjudication assessment. Return VALID JSON ONLY with these exact keys:
{{
  "verdict": "RECOMMENDED_APPROVAL" | "REQUEST_EVIDENCE" | "UNDER_INVESTIGATION" | "REJECT",
  "credibility_score": integer between 10 and 99,
  "executive_summary": "2-3 sentences synthesizing narrative consistency, visual alignment, and cost plausibility",
  "key_findings": ["3 to 4 concise bullet points explaining specific fraud risks, inconsistencies, or confirmations"],
  "recommended_investigative_steps": ["2 actionable directives for the field surveyor"]
}}"""

        keys_to_try = [
            (cls.PRIMARY_KEY, "PRIMARY_KEY", cls.PRIMARY_MODEL),
            (cls.BACKUP_KEY, "BACKUP_KEY", cls.PRIMARY_MODEL),
            (cls.PRIMARY_KEY, "PRIMARY_KEY_FALLBACK_MODEL", cls.BACKUP_MODEL),
            (cls.BACKUP_KEY, "BACKUP_KEY_FALLBACK_MODEL", cls.FALLBACK_MODEL)
        ]

        for api_key, key_label, model_name in keys_to_try:
            if not api_key:
                continue
            try:
                payload = json.dumps({
                    "model": model_name,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "response_format": {"type": "json_object"}
                }).encode("utf-8")

                req = urllib.request.Request(
                    cls.API_ENDPOINT,
                    data=payload,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                        "User-Agent": "SecureWheels-Forensics/2.0"
                    }
                )

                with urllib.request.urlopen(req, timeout=7) as resp:
                    resp_json = json.loads(resp.read().decode("utf-8"))
                    content_str = resp_json["choices"][0]["message"]["content"]
                    parsed = json.loads(content_str)

                    # Normalize fields
                    cluster_tier = "Primary Active Neural Cluster" if "PRIMARY" in key_label else "Secondary Failover Cluster"
                    return {
                        "status": "ONLINE_ACTIVE",
                        "engine": "SecureWheels Autonomous Forensic Arbiter (Neural Core v2.4)",
                        "active_model": "SecureWheels Forensic-XL (Autonomous)",
                        "key_tier_used": cluster_tier,
                        "verdict": parsed.get("verdict", "UNDER_INVESTIGATION"),
                        "credibility_score": int(parsed.get("credibility_score", 75)),
                        "executive_summary": parsed.get("executive_summary", "Claim reviewed by SecureWheels Senior Forensic Arbiter."),
                        "key_findings": parsed.get("key_findings", []),
                        "recommended_investigative_steps": parsed.get("recommended_investigative_steps", [
                            "Conduct physical inspection of damaged components.",
                            "Verify repair invoice and garage estimate authenticity."
                        ])
                    }

            except urllib.error.HTTPError as he:
                print(f"[GroqService] Failover on {key_label} ({model_name}) HTTP Error {he.code}: {he.reason}")
                continue
            except Exception as e:
                print(f"[GroqService] Failover on {key_label} ({model_name}) Exception: {e}")
                continue

        # Graceful Local Fallback if both keys fail or no network
        print("[GroqService] All Groq API keys exhausted or offline. Engaging Local ML Forensics Engine.")
        return cls._generate_local_fallback(incident_description, damage_description, cv, ens)

    @classmethod
    def _generate_local_fallback(
        cls,
        incident_description: str,
        damage_description: str,
        cv: Dict[str, Any],
        ens: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Graceful on-device fallback synthesizing local models when external API is unreachable.
        """
        discrepancies = cv.get("discrepancies", [])
        is_high_risk = ens.get("risk_level") == "HIGH" or len(discrepancies) > 0 or cv.get("visual_consistency_score", 1.0) < 0.60
        credibility = int(cv.get("visual_consistency_score", 0.85) * 100)

        findings = []
        if discrepancies:
            findings.extend(discrepancies[:3])
        else:
            findings.append(f"Visual damage profile ({cv.get('detected_entity_label', 'Automotive')}) aligns with stated impact.")
            findings.append("No critical inconsistencies found between description and physical image.")

        if is_high_risk:
            verdict = "REQUEST_EVIDENCE" if cv.get("detected_entity_type") == "NON_VEHICLE" else "UNDER_INVESTIGATION"
            summary = "Automated local inspection identified discrepancies requiring documentary verification."
        else:
            verdict = "RECOMMENDED_APPROVAL"
            summary = "Claim narrative and physical computer vision patterns demonstrate high consistency."

        return {
            "status": "LOCAL_ML_FALLBACK",
            "engine": "SecureWheels Local Tri-Model & MobileNetV3 Engine",
            "key_tier_used": "ON_DEVICE_FALLBACK",
            "verdict": verdict,
            "credibility_score": credibility,
            "executive_summary": summary,
            "key_findings": findings,
            "recommended_investigative_steps": [
                "Verify vehicle chassis and registration number at cashless network garage.",
                "Review detailed repair estimate line items."
            ]
        }
