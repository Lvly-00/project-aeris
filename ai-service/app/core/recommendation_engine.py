"""
Recommendation Engine - AI-powered Decision Support System
Generates intelligent recommendations for incident response
This is the PRIMARY FEATURE of the system

NEVER automatically dispatches responders - only provides recommendations
"""
import logging
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)

class ResponderType(str, Enum):
    BARANGAY_TANOD = "Barangay_Tanod"
    BARANGAY_OFFICIAL = "Barangay_Official"
    MDRRMO = "MDRRMO"
    BFP = "BFP"
    PNP = "PNP"

class SuggestedAction(str, Enum):
    VERIFY_INCIDENT = "Verify_Incident"
    DISPATCH_RESPONDERS = "Dispatch_Responders"
    ROAD_CLEARING = "Road_Clearing"
    EVACUATION = "Evacuation"
    EMERGENCY_ESCALATION = "Emergency_Escalation"
    CONTINUE_MONITORING = "Continue_Monitoring"

class Priority(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"

@dataclass
class Recommendation:
    incident_id: int
    responder_type: ResponderType
    suggested_action: SuggestedAction
    priority: Priority
    explanation: str
    confidence_score: float
    reasoning: str

class RecommendationEngine:
    """
    AI Decision Support Engine
    
    Analyzes incident data and generates response recommendations.
    CONSIDERATIONS:
    - Incident type and severity
    - Duration of incident
    - Crowd size (estimated from detection)
    - Camera location (proximity to schools, hospitals, etc.)
    - Nearby facilities
    - Time of day
    - Historical incident patterns
    """
    
    # Incident type -> likely required responders
    INCIDENT_RESPONDERS = {
        "Fire": [ResponderType.BFP, ResponderType.MDRRMO, ResponderType.BARANGAY_TANOD],
        "Smoke": [ResponderType.BFP, ResponderType.BARANGAY_TANOD],
        "Vehicle_Accident": [ResponderType.PNP, ResponderType.MDRRMO, ResponderType.BARANGAY_TANOD],
    }
    
    # Actions based on severity and type
    SEVERITY_ACTIONS = {
        "Critical": [SuggestedAction.EMERGENCY_ESCALATION, SuggestedAction.EVACUATION, SuggestedAction.DISPATCH_RESPONDERS],
        "High": [SuggestedAction.DISPATCH_RESPONDERS, SuggestedAction.VERIFY_INCIDENT],
        "Medium": [SuggestedAction.VERIFY_INCIDENT, SuggestedAction.DISPATCH_RESPONDERS],
        "Low": [SuggestedAction.CONTINUE_MONITORING, SuggestedAction.VERIFY_INCIDENT],
    }
    
    # Nearby facilities that affect priority
    SENSITIVE_FACILITIES = ["School", "Hospital", "Church", "Market", "Terminal"]
    
    def __init__(self):
        self.confidence_threshold = 0.6
    
    def generate_recommendations(self, incident_data: Dict) -> List[Dict]:
        """
        Generate recommendations for an incident
        
        Args:
            incident_data: Dict with keys:
                - id: incident ID
                - incident_type: str
                - severity: str
                - confidence_score: float
                - duration: Optional[float] in seconds
                - crowd_size: Optional[int]
                - location_lat: Optional[float]
                - location_lng: Optional[float]
                - zone: Optional[dict] with name, barangay, boundary_coords
                - detected_at: ISO datetime string
                - camera: Optional[dict] with location info
        
        Returns:
            List of recommendation dicts ready for backend API
        """
        incident_type = incident_data.get('incident_type', 'Unknown')
        severity = incident_data.get('severity', 'Medium')
        confidence = incident_data.get('confidence_score', 0.5)
        duration = incident_data.get('duration')
        crowd_size = incident_data.get('crowd_size')
        
        recommendations = []
        
        # Get appropriate responders for this incident type
        responders = self.INCIDENT_RESPONDERS.get(incident_type, [ResponderType.BARANGAY_TANOD])
        
        # Get suggested actions based on severity
        actions = self.SEVERITY_ACTIONS.get(severity, [SuggestedAction.VERIFY_INCIDENT])
        
        # Generate a recommendation for each responder-action pair
        for responder in responders:
            for action in actions:
                rec = self._build_recommendation(
                    incident_data=incident_data,
                    responder=responder,
                    action=action,
                    severity=severity,
                    confidence=confidence,
                    duration=duration,
                    crowd_size=crowd_size,
                )
                if rec:
                    recommendations.append(rec)
        
        # Sort by priority and confidence
        recommendations.sort(
            key=lambda r: (
                {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}[r['priority']],
                -r['confidence_score']
            )
        )
        
        return recommendations
    
    def _build_recommendation(
        self,
        incident_data: Dict,
        responder: ResponderType,
        action: SuggestedAction,
        severity: str,
        confidence: float,
        duration: Optional[float],
        crowd_size: Optional[int],
    ) -> Optional[Dict]:
        """Build a single recommendation with explanation and reasoning"""
        
        incident_type = incident_data.get('incident_type', 'Unknown')
        
        # Determine priority based on multiple factors
        priority = self._calculate_priority(severity, confidence, duration, crowd_size, incident_type)
        
        # Generate explanation
        explanation = self._generate_explanation(responder, action, incident_type, severity, priority)
        
        # Generate detailed reasoning
        reasoning = self._generate_reasoning(
            responder, action, incident_type, severity, 
            confidence, duration, crowd_size, priority
        )
        
        # Calculate confidence for this specific recommendation
        rec_confidence = self._calculate_recommendation_confidence(
            responder, action, incident_type, severity, confidence
        )
        
        if rec_confidence < self.confidence_threshold:
            return None
        
        return {
            'incident_id': incident_data.get('id'),
            'responder_type': responder.value,
            'suggested_action': action.value,
            'priority': priority.value,
            'explanation': explanation,
            'confidence_score': round(rec_confidence, 3),
            'reasoning': reasoning,
        }
    
    def _calculate_priority(
        self, 
        severity: str, 
        confidence: float, 
        duration: Optional[float],
        crowd_size: Optional[int],
        incident_type: str
    ) -> Priority:
        """Calculate overall priority based on multiple factors"""
        score = 0
        
        # Severity base score
        severity_scores = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}
        score += severity_scores.get(severity, 2) * 2
        
        # Confidence contributes to priority
        if confidence > 0.8:
            score += 2
        elif confidence > 0.6:
            score += 1
        
        # Duration increases priority (if we have it)
        if duration:
            if duration > 300:  # > 5 minutes
                score += 2
            elif duration > 60:  # > 1 minute
                score += 1
        
        # Crowd size increases priority
        if crowd_size:
            if crowd_size > 50:
                score += 3
            elif crowd_size > 20:
                score += 2
            elif crowd_size > 10:
                score += 1
        
        # Certain incident types are inherently higher priority
        high_priority_types = ["Fire", "Vehicle_Accident"]
        if incident_type in high_priority_types:
            score += 1
        
        # Map score to priority
        if score >= 9:
            return Priority.CRITICAL
        elif score >= 6:
            return Priority.HIGH
        elif score >= 4:
            return Priority.MEDIUM
        else:
            return Priority.LOW
    
    def _generate_explanation(
        self, 
        responder: ResponderType, 
        action: SuggestedAction,
        incident_type: str,
        severity: str,
        priority: Priority
    ) -> str:
        """Generate human-readable explanation for the recommendation"""
        
        responder_names = {
            ResponderType.BARANGAY_TANOD: "Barangay Tanod",
            ResponderType.BARANGAY_OFFICIAL: "Barangay Officials",
            ResponderType.MDRRMO: "MDRRMO (Municipal Disaster Risk Reduction Management Office)",
            ResponderType.BFP: "BFP (Bureau of Fire Protection)",
            ResponderType.PNP: "PNP (Philippine National Police)",
        }
        
        action_descriptions = {
            SuggestedAction.VERIFY_INCIDENT: "Verify the reported incident",
            SuggestedAction.DISPATCH_RESPONDERS: "Dispatch responders to the location",
            SuggestedAction.ROAD_CLEARING: "Clear road obstruction",
            SuggestedAction.EVACUATION: "Evacuate nearby residents",
            SuggestedAction.EMERGENCY_ESCALATION: "Escalate to higher emergency authorities",
            SuggestedAction.CONTINUE_MONITORING: "Continue monitoring the situation",
        }
        
        responder_name = responder_names.get(responder, responder.value)
        action_desc = action_descriptions.get(action, action.value)
        
        explanation = (
            f"{responder_name} should {action_desc.lower()} for {incident_type.lower()} incident. "
            f"Severity: {severity}, Priority: {priority.value}. "
            f"This recommendation is based on AI analysis of the detected incident."
        )
        
        return explanation
    
    def _generate_reasoning(
        self,
        responder: ResponderType,
        action: SuggestedAction,
        incident_type: str,
        severity: str,
        confidence: float,
        duration: Optional[float],
        crowd_size: Optional[int],
        priority: Priority,
    ) -> str:
        """Generate detailed reasoning for the recommendation"""
        reasons = []
        
        # Incident type reasoning
        type_reasons = {
            "Fire": "Fire incidents require immediate attention from fire suppression units.",
            "Smoke": "Smoke detection may indicate a potential fire and requires verification.",
            "Vehicle_Accident": "Vehicle accidents require traffic management and medical assistance.",
        }
        reasons.append(type_reasons.get(incident_type, f"Detection of {incident_type}."))
        
        # Severity reasoning
        severity_reasons = {
            "Critical": "This is a critical incident requiring immediate coordinated response.",
            "High": "This incident requires prompt attention from appropriate responders.",
            "Medium": "This incident should be addressed in regular operations.",
            "Low": "This incident can be handled through routine monitoring.",
        }
        reasons.append(severity_reasons.get(severity, ""))
        
        # Confidence reasoning
        if confidence > 0.9:
            reasons.append(f"AI detection confidence is very high ({confidence:.1%}), indicating strong reliability of the detection.")
        elif confidence > 0.7:
            reasons.append(f"AI detection confidence is high ({confidence:.1%}), suggesting the detection is likely accurate.")
        else:
            reasons.append(f"AI detection confidence is moderate ({confidence:.1%}). Manual verification is recommended.")
        
        # Action-specific reasoning
        if action == SuggestedAction.CONTINUE_MONITORING:
            reasons.append("Current conditions do not warrant immediate action. Continued observation is sufficient.")
        elif action == SuggestedAction.EMERGENCY_ESCALATION:
            reasons.append("This incident exceeds local response capabilities and requires escalation to higher authorities.")
        elif action == SuggestedAction.EVACUATION:
            reasons.append("Potential threat to life and property necessitates evacuation of affected areas.")
        elif action == SuggestedAction.DISPATCH_RESPONDERS:
            reasons.append(f"{responder.value} has the appropriate authority and capability to address this incident.")
        
        # Duration reasoning
        if duration:
            if duration > 300:
                reasons.append(f"The incident has been ongoing for {duration/60:.1f} minutes, increasing urgency.")
            elif duration > 60:
                reasons.append(f"The incident has persisted for {duration/60:.1f} minutes.")
        
        # Crowd reasoning
        if crowd_size and crowd_size > 20:
            reasons.append(f"The presence of approximately {crowd_size} people at the scene requires crowd management.")
        
        return " ".join(reasons)
    
    def _calculate_recommendation_confidence(
        self,
        responder: ResponderType,
        action: SuggestedAction,
        incident_type: str,
        severity: str,
        detection_confidence: float,
    ) -> float:
        """Calculate confidence score for a specific recommendation"""
        confidence = detection_confidence
        
        # Adjust based on responder appropriateness
        responders = self.INCIDENT_RESPONDERS.get(incident_type, [])
        if responder in responders:
            confidence += 0.1
        else:
            confidence -= 0.1
        
        # Adjust based on action appropriateness for severity
        actions = self.SEVERITY_ACTIONS.get(severity, [])
        if action in actions:
            confidence += 0.1
        else:
            confidence -= 0.1
        
        return max(0.0, min(1.0, confidence))
