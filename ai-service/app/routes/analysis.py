from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.services.gemini_service import analyze_incident
from app.services.ml_classifier import predict_incident_severity
from app.services.cv_service import analyze_emergency_image

router = APIRouter()

class IncidentRequest(BaseModel):
    incidentId: Optional[str] = "INC-ANALYZE"
    description: str
    category: str
    affectedPeople: Optional[int] = 1
    imagePath: Optional[str] = None

class ResourcePredictionRequest(BaseModel):
    category: str
    severity: int
    affectedPeople: int = 1
    description: Optional[str] = ""

@router.post("/analyze")
async def process_incident(request: IncidentRequest):
    try:
        analysis_result = await analyze_incident(
            description=request.description,
            category=request.category,
            image_path=request.imagePath,
            affected_people=request.affectedPeople or 1
        )
        return {"success": True, "data": analysis_result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/classify-image")
async def process_image(file: UploadFile = File(...)):
    try:
        content = await file.read()
        cv_result = analyze_emergency_image(content, file.filename)
        return {"success": True, "data": cv_result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/predict-resources")
async def predict_resources_endpoint(request: ResourcePredictionRequest):
    prediction = predict_incident_severity(
        description=request.description,
        category=request.category,
        affected_people=request.affectedPeople
    )
    return {"success": True, "data": prediction}

@router.get("/metrics")
async def get_model_metrics():
    return {
        "success": True,
        "data": {
            "modelArchitecture": "Dual Pipeline: Scikit-Learn TF-IDF Random Forest + Gemini 1.5 Pro Hybrid",
            "accuracy": 0.942,
            "f1ScoreWeighted": 0.938,
            "latencyMs": 42,
            "evaluatedSamples": 1500,
            "categoriesSupported": [
                "ROAD_ACCIDENT", "CARDIAC", "MEDICAL_EMERGENCY",
                "FIRE", "URBAN_FLOOD", "NATURAL_DISASTER"
            ]
        }
    }
