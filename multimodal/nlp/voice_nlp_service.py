import re
from datetime import datetime

class VoiceTranscriptNLPService:
    """
    Simulates speech-to-text transcription and structured NLP claim fact extraction.
    Transforms verbal claim interview statements into structured entities for cross-modal comparison.
    """
    QUESTIONS = [
        "What happened during the incident?",
        "When and what time did the accident occur?",
        "Where did the accident happen?",
        "Who was driving the vehicle?",
        "Was any other vehicle or third party involved?",
        "Was anyone injured?",
        "Which part of the vehicle sustained damage?",
        "Did you file a police complaint?"
    ]

    @staticmethod
    def extract_structured_facts(transcript: str) -> dict:
        """
        Parses verbal interview transcript and returns structured claim facts.
        """
        lower = transcript.lower()
        
        # 1. Driver
        driver = "Policy Holder"
        if "friend" in lower:
            driver = "Friend"
        elif "driver" in lower or "chauffeur" in lower:
            driver = "Hired Driver"
        elif "family" in lower or "brother" in lower or "wife" in lower or "father" in lower:
            driver = "Family Member"
            
        # 2. Third Party & Injuries
        third_party = any(k in lower for k in ["another car", "truck", "bike", "auto", "pedestrian", "third party"])
        injury = any(k in lower for k in ["hurt", "injury", "injured", "hospital", "bleeding", "fracture"])
        police = any(k in lower for k in ["police", "fir", "cop", "station", "complaint"])
        
        # 3. Damage Areas
        damage_areas = []
        for part in ["front", "bumper", "rear", "headlight", "door", "bonnet", "hood", "windshield", "side"]:
            if part in lower:
                damage_areas.append(part)
                
        # 4. Approximate Reported Time
        time_match = re.search(r"(\d{1,2}(?::\d{2})?\s*(?:am|pm|at night|in the morning|in the evening))", lower)
        reported_time = time_match.group(1) if time_match else "Unspecified"
        
        return {
            "driver_entity": driver,
            "third_party_involved": third_party,
            "injury_reported": injury,
            "police_contacted": police,
            "extracted_damage_areas": damage_areas,
            "extracted_time_statement": reported_time,
            "transcript_word_count": len(transcript.split())
        }

    @staticmethod
    def compute_cross_modal_consistency(form_data: dict, extracted_voice_facts: dict, vision_features: dict) -> dict:
        """
        Cross-validates Form vs Voice vs Photo features.
        Generates discrepancy scores used as inputs for fraud risk assessment.
        """
        # Time consistency
        form_time = form_data.get("accident_time", "").lower()
        voice_time = extracted_voice_facts.get("extracted_time_statement", "").lower()
        time_discrepancy = False
        if "night" in voice_time and any(h in form_time for h in ["08:", "09:", "10:", "11:", "12:", "13:", "14:"]):
            time_discrepancy = True
            
        # Third party consistency
        tp_discrepancy = form_data.get("third_party_involved", False) != extracted_voice_facts.get("third_party_involved", False)
        
        # Damage location consistency (Form vs Voice vs Photo)
        form_desc = form_data.get("damage_description", "").lower()
        voice_damages = extracted_voice_facts.get("extracted_damage_areas", [])
        photo_damage = vision_features.get("detected_damage_location", "").lower()
        
        damage_match = any(d in form_desc for d in voice_damages) or (photo_damage in form_desc)
        
        # Aggregate Cross-Modal Consistency Score in [0, 1] (1.0 = perfect agreement, 0.0 = total contradiction)
        penalty = 0.0
        if time_discrepancy:
            penalty += 0.35
        if tp_discrepancy:
            penalty += 0.25
        if not damage_match and len(voice_damages) > 0:
            penalty += 0.40
            
        consistency_score = round(max(0.0, 1.0 - penalty), 4)
        
        return {
            "cross_modal_consistency_score": consistency_score,
            "time_discrepancy_flag": time_discrepancy,
            "third_party_discrepancy_flag": tp_discrepancy,
            "damage_consistency_flag": damage_match,
            "investigator_advisory": "High cross-modal alignment" if consistency_score >= 0.70 else "Evidence discrepancies detected across form and interview"
        }

if __name__ == "__main__":
    test_transcript = "I was driving home around 11 PM at night. Another car hit my front bumper near the signal."
    facts = VoiceTranscriptNLPService.extract_structured_facts(test_transcript)
    print("Extracted Voice Facts:")
    print(facts)
    
    mock_form = {"accident_time": "14:00", "third_party_involved": False, "damage_description": "Rear bumper dent"}
    mock_vision = {"detected_damage_location": "Rear"}
    consistency = VoiceTranscriptNLPService.compute_cross_modal_consistency(mock_form, facts, mock_vision)
    print("\nCross-Modal Consistency Output:")
    print(consistency)
