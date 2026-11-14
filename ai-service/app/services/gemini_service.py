import os
import json
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from app.services.ml_classifier import predict_incident_severity

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

async def analyze_incident(
    description: str,
    category: str,
    image_path: Optional[str] = None,
    affected_people: int = 1
) -> Dict[str, Any]:
    """
    Analyzes an emergency report using Gemini LLM if key is present,
    or our Scikit-Learn ML classifier fallback.
    """
    # 1. First run deterministic ML model for ground-truth bounds
    ml_prediction = predict_incident_severity(description, category, affected_people)

    if not API_KEY or API_KEY == "placeholder_key_change_me_later":
        return {
            "verified": True,
            "recommendedCategory": category,
            "recommendedSeverity": ml_prediction["severity"],
            "severityLevel": ml_prediction["severityLevel"],
            "confidenceScore": ml_prediction["confidenceScore"],
            "medicalEmergency": ml_prediction["isMedicalEmergency"],
            "possibleCasualties": affected_people,
            "requiredResources": ml_prediction["requiredResources"],
            "reasoning": f"ML Model ({ml_prediction['modelName']}): Acuity calculated from indicators [{', '.join(ml_prediction['matchedCues']) if ml_prediction['matchedCues'] else 'standard category cues'}]. Recommended severity {ml_prediction['severity']}/10.",
            "isGemini": False
        }

    # 2. If Gemini API Key is available, invoke Gemini
    try:
        import google.generativeai as genai
        genai.configure(api_key=API_KEY)
        model = genai.GenerativeModel('gemini-1.5-pro-latest')

        prompt = f"""
        Act as an Expert Emergency Dispatch AI. Analyze this 911/108 emergency report:
        Reported Category: {category}
        Casualties / Affected People: {affected_people}
        Citizen Description: {description}

        Output STRICTLY as a valid JSON object:
        {{
            "verified": true,
            "recommendedCategory": "{category}",
            "recommendedSeverity": integer (1-10),
            "severityLevel": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
            "confidenceScore": float (0.80-0.99),
            "medicalEmergency": boolean,
            "possibleCasualties": {affected_people},
            "requiredResources": {{
                "ambulances": integer,
                "ambulanceType": "BASIC_LIFE_SUPPORT" | "ADVANCED_LIFE_SUPPORT" | "ICU_AMBULANCE",
                "fireEngines": integer,
                "rescueTeams": integer,
                "rescueBoats": integer
            }},
            "reasoning": string
        }}
        """

        response = model.generate_content(prompt)
        raw_text = response.text.replace('```json', '').replace('```', '').strip()
        parsed = json.loads(raw_text)
        parsed["isGemini"] = True
        return parsed
    except Exception as e:
        print(f"Gemini API Exception, falling back to ML model: {e}")
        return {
            "verified": True,
            "recommendedCategory": category,
            "recommendedSeverity": ml_prediction["severity"],
            "severityLevel": ml_prediction["severityLevel"],
            "confidenceScore": ml_prediction["confidenceScore"],
            "medicalEmergency": ml_prediction["isMedicalEmergency"],
            "possibleCasualties": affected_people,
            "requiredResources": ml_prediction["requiredResources"],
            "reasoning": f"Fallback ML Model: Acuity calculated from cues [{', '.join(ml_prediction['matchedCues'])}]. Severity {ml_prediction['severity']}/10.",
            "isGemini": False
        }
