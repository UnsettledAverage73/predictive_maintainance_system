from datetime import datetime
from typing import Any, Dict, List, Optional

from src.data.analytics import (
    calculate_failure_probability,
    calculate_historical_failure_factor,
    calculate_log_risk_score,
)
from src.data.database import (
    get_all_equipment_metadata,
    get_all_pending_tasks,
    get_asset_priority_profile,
    get_available_technicians,
    get_available_tools,
    get_equipment_metadata,
    get_inventory_spares,
    get_machine_health_summary,
    get_machine_textual_history,
    get_production_windows,
    get_safety_risk_profile,
)
from src.services.machine_insights import get_machine_insights


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _pick_skill(machine_id: str, threat: str) -> str:
    lowered = threat.lower()
    if "spindle" in lowered or machine_id.startswith("CNC"):
        return "spindle"
    if "hydraulic" in lowered or machine_id.startswith("HYD"):
        return "hydraulics"
    if "conveyor" in lowered or machine_id.startswith("CONV"):
        return "conveyor"
    return "general"


def _criticality_component(machine_id: str) -> Dict[str, Any]:
    profile = get_asset_priority_profile(machine_id) or {}
    meta = get_equipment_metadata(machine_id) or {}
    
    # 1. Production Bottlenecks: Highest priority
    bottleneck_penalty = 3.0 if meta.get("is_bottleneck") else 0.0
    
    # 2. Quality Impact: precision tools impact
    quality_penalty = meta.get("quality_impact_score", 0.0) * 2.5
    
    base = float(profile.get("criticality_score", 3))
    downstream = float(profile.get("downstream_dependency_count", 0))
    bypass_penalty = 0 if profile.get("bypass_available") else 0.5
    
    score = _clamp(base + min(1.0, downstream * 0.2) + bypass_penalty + bottleneck_penalty + quality_penalty, 1, 10)
    return {
        "score": round(score, 2),
        "machineClass": profile.get("machine_class", "tier2"),
        "downtimeCostPerHourInr": float(profile.get("downtime_cost_per_hour_inr", 50000)),
        "demandLevel": profile.get("current_demand_level", "normal"),
        "bypassAvailable": bool(profile.get("bypass_available", 0)),
        "downstreamDependencyCount": int(profile.get("downstream_dependency_count", 0)),
        "isBottleneck": bool(meta.get("is_bottleneck", 0)),
        "qualityImpact": meta.get("quality_impact_score", 0.0)
    }


def _severity_component(machine_id: str, insights: Dict[str, Any]) -> Dict[str, Any]:
    health = get_machine_health_summary(machine_id)
    meta = get_equipment_metadata(machine_id) or {}
    
    telemetry_prob, _ = calculate_failure_probability(health["telemetry"])
    log_risk = calculate_log_risk_score(get_machine_textual_history(machine_id))
    threat_confidence = float(insights["threatDetection"]["confidence"])
    rul_hours = float(insights["wearModel"]["rulHours"])
    alert_count = len(health["alerts"])
    
    # 3. Failure Mode Analysis (Past incidents)
    historical_factor = calculate_historical_failure_factor(machine_id)
    
    # 4. MTBF Aspect: How close are we to typical failure?
    mtbf = float(meta.get("mtbf", 5000))
    runtime = float(insights["wearModel"].get("currentRuntimeHours", 0))
    mtbf_ratio = runtime / mtbf if mtbf > 0 else 0
    mtbf_penalty = min(2.0, mtbf_ratio * 0.7) if mtbf_ratio > 0.85 else 0.0

    rul_penalty = 1.8 if rul_hours <= 48 else (1.2 if rul_hours <= 168 else 0.5)
    
    score = (max(telemetry_prob, log_risk, threat_confidence) / 15.0) + \
            min(1.5, alert_count * 0.4) + rul_penalty + historical_factor + mtbf_penalty
            
    return {
        "score": round(_clamp(score, 1, 12), 2),
        "telemetryProbability": telemetry_prob,
        "logRisk": log_risk,
        "threatConfidence": threat_confidence,
        "rulHours": rul_hours,
        "alertCount": alert_count,
        "historicalFactor": historical_factor,
        "mtbfRatio": round(mtbf_ratio, 2)
    }


def _resource_component(machine_id: str, threat: str, insights: Dict[str, Any]) -> Dict[str, Any]:
    spares = get_inventory_spares(machine_id)
    technicians = get_available_technicians()
    tools = get_available_tools(machine_id)
    required_skill = _pick_skill(machine_id, threat)

    # 5. Cost & Repair Time Aspect
    cost_data = insights.get("costAnalysis", {})
    planned_cost = cost_data.get("plannedCostInr", 10000)
    # Penalize machines that are expensive to fix (over 1 Lakh)
    cost_penalty = min(1.5, planned_cost / 80000.0)
    
    spare_parts = get_inventory_spares(machine_id)
    # Penalize machines with long lead times (over 24h)
    max_lead_time = max([s.get("lead_time_hours", 0) for s in spare_parts]) if spare_parts else 0
    lead_time_penalty = min(1.5, max_lead_time / 36.0)

    spare_ready = any(int(spare.get("qty_available", 0)) > 0 for spare in spares)
    technician_ready = any(tech.get("skill_code") in {required_skill, "general"} for tech in technicians)
    tool_ready = len(tools) > 0

    score = 0.2 + (cost_penalty * 0.5) + (lead_time_penalty * 0.5)
    if spare_ready:
        score += 0.5
    if technician_ready:
        score += 0.3
    if tool_ready:
        score += 0.2

    primary_spare = spares[0]["part_name"] if spares else "General service kit"
    primary_technician = next((tech["technician_name"] for tech in technicians if tech.get("skill_code") in {required_skill, "general"}), "Shift technician")

    return {
        "score": round(_clamp(score, 0, 4), 2),
        "spareReady": spare_ready,
        "technicianReady": technician_ready,
        "toolReady": tool_ready,
        "primarySpare": primary_spare,
        "primaryTechnician": primary_technician,
        "requiredSkill": required_skill,
        "costPenalty": cost_penalty,
        "leadTimePenalty": lead_time_penalty,
        "blockingFactors": [
            factor for factor, ready in [
                ("Spare part unavailable", spare_ready),
                ("Technician skill unavailable", technician_ready),
                ("Specialized tool unavailable", tool_ready),
            ] if not ready
        ],
    }


def _opportunity_component(machine_id: str, criticality: Dict[str, Any]) -> Dict[str, Any]:
    windows = get_production_windows(machine_id)
    if windows:
        best_window = max(windows, key=lambda item: float(item.get("opportunity_score", 0)))
        base = float(best_window.get("opportunity_score", 0.5))
        if criticality["demandLevel"] == "peak":
            base *= 0.8
        elif criticality["demandLevel"] == "low":
            base = min(1.0, base + 0.2)
        return {
            "score": round(_clamp(base, 0, 1), 2),
            "windowType": best_window.get("window_type", "low_demand"),
            "windowStart": best_window.get("window_start"),
            "windowEnd": best_window.get("window_end"),
        }

    fallback = 0.3 if criticality["demandLevel"] == "peak" else 0.7
    return {
        "score": fallback,
        "windowType": "ad_hoc",
        "windowStart": None,
        "windowEnd": None,
    }


def _safety_component(machine_id: str, insights: Dict[str, Any]) -> Dict[str, Any]:
    # 6. Safety & Environment: prioritized regardless of production impact
    safety = get_safety_risk_profile(machine_id) or {}
    notes = " ".join(insights["threatDetection"]["evidence"]).lower()
    
    base = float(safety.get("safety_risk_score", 0)) + float(safety.get("environmental_risk_score", 0)) * 0.8
    
    if any(word in notes for word in ["oil leak", "leak", "smoke", "fire", "spark", "gas", "chemical", "hissing"]):
        base += 20 # Significant boost for active safety threats
        
    if int(safety.get("near_miss_count_90d", 0)) > 0:
        base += min(15, int(safety.get("near_miss_count_90d", 0)) * 3.5)
        
    compliance_boost = 0.0
    due_date = safety.get("compliance_due_date")
    if due_date:
        try:
            days_left = (datetime.fromisoformat(due_date) - datetime.now()).days
            if days_left <= 2:
                compliance_boost = 30 # Immediate compliance need
            elif days_left <= 7:
                compliance_boost = 15
        except ValueError:
            compliance_boost = 0

    return {
        "safetyOverride": round(_clamp(base, 0, 50), 2),
        "complianceBoost": round(_clamp(compliance_boost, 0, 30), 2),
        "regulatoryBlocker": bool(safety.get("regulatory_blocker", 0)),
    }


def _priority_band(priority_score: float) -> str:
    if priority_score >= 80:
        return "critical"
    if priority_score >= 60:
        return "high"
    if priority_score >= 35:
        return "medium"
    return "low"


def _recommended_action(priority_score: float, resource: Dict[str, Any], safety: Dict[str, Any]) -> str:
    if safety["safetyOverride"] >= 30:
        return "Immediate shutdown & Containment"
    if safety["complianceBoost"] >= 25:
        return "Mandatory Compliance Service"
    if priority_score >= 80:
        return "Emergency Intervention"
    if priority_score >= 60:
        return "Next shift priority"
    if resource["blockingFactors"]:
        return "Monitor & Procure parts"
    if priority_score >= 35:
        return "Plan within 48h"
    return "Fill-in task"


def _compose_reason(machine_name: str, criticality: Dict[str, Any], severity: Dict[str, Any], resource: Dict[str, Any], opportunity: Dict[str, Any], action: str) -> str:
    reasons = []
    if criticality["isBottleneck"]:
        reasons.append("Production Bottleneck detected")
    if criticality["qualityImpact"] > 0.7:
        reasons.append("High Quality Impact asset")
    if severity["historicalFactor"] > 0.5:
        reasons.append("Recurring failure mode approaching")
    if severity["mtbfRatio"] > 0.9:
        reasons.append("MTBF limit reached")
    
    parts = [
        f"{machine_name} is a {criticality['machineClass']} asset",
    ] + reasons
    
    if resource["spareReady"]:
        parts.append(f"parts ready ({resource['primarySpare']})")
    else:
        parts.append("procurement pending")
        
    parts.append(f"action: {action}")
    return ". ".join(parts) + "."


def _virtual_task(machine_id: str, machine_name: str, insights: Dict[str, Any], priority_score: float, priority_band: str, action: str, reason: str, breakdown: Dict[str, Any], resource: Dict[str, Any], opportunity: Dict[str, Any], telemetry: Dict[str, Any]) -> Dict[str, Any]:
    due_date = opportunity["windowStart"] or datetime.now().isoformat()
    title_prefix = {
        "critical": "Urgent Intervention",
        "high": "Priority Maintenance",
        "medium": "Planned Inspection",
        "low": "Routine Check",
    }[priority_band]
    
    return {
        "id": f"ai-gen-{machine_id}",
        "machineId": machine_id,
        "machineName": machine_name,
        "title": f"{title_prefix}: {machine_name}",
        "task_type": "repair" if priority_band in {"critical", "high"} else "inspection",
        "status": "pending",
        "priority": priority_band,
        "priorityScore": round(priority_score, 1),
        "recommendedAction": action,
        "dueDate": due_date,
        "assignedTo": resource["primaryTechnician"] if resource["technicianReady"] else "Unassigned",
        "aiReason": reason,
        "scoreBreakdown": breakdown,
        "blockingFactors": resource["blockingFactors"],
        "notes": f"Window: {opportunity['windowType']}. Spare: {resource['primarySpare']}.",
        "createdAt": datetime.now().isoformat(),
        # Diagnostic Fields
        "vibration": telemetry.get("vibration", 0.0),
        "temperature": telemetry.get("temperature", 0.0),
        "vibThreshold": _safe_float(insights["threatDetection"].get("vibThreshold"), 4.5),
        "tempThreshold": _safe_float(insights["threatDetection"].get("tempThreshold"), 100.0),
        "failureMode": insights["threatDetection"]["threat"],
        "failureProbability": insights["threatDetection"]["confidence"],
        "maintenanceAction": action,
    }


def generate_prioritized_schedule(limit: int = 12) -> List[Dict[str, Any]]:
    all_equipment = get_all_equipment_metadata()
    pending_tasks = get_all_pending_tasks()
    prioritized: List[Dict[str, Any]] = []

    for eq in all_equipment:
        machine_id = eq["id"]
        insights = get_machine_insights(machine_id)
        criticality = _criticality_component(machine_id)
        severity = _severity_component(machine_id, insights)
        resource = _resource_component(machine_id, insights["threatDetection"]["threat"], insights)
        opportunity = _opportunity_component(machine_id, criticality)
        safety = _safety_component(machine_id, insights)

        health = get_machine_health_summary(machine_id)
        latest_telemetry = health["telemetry"][0] if health["telemetry"] else {}

        # New Multi-Factor Priority Scoring
        priority_score = (
            (criticality["score"] * 1.8) + 
            (severity["score"] * 2.2) + 
            (resource["score"] * 3.0) + 
            (opportunity["score"] * 5.0) + 
            safety["safetyOverride"] + 
            safety["complianceBoost"]
        )
        
        priority_score = _clamp(priority_score, 1, 100)
        
        # Absolute Overrides for Safety
        if safety["safetyOverride"] >= 35 or safety["complianceBoost"] >= 25:
            priority_score = max(priority_score, 95)
            
        priority_band = _priority_band(priority_score)
        action = _recommended_action(priority_score, resource, safety)

        breakdown = {
            "criticality": float(criticality["score"]),
            "severity": float(severity["score"]),
            "resourceReadiness": float(resource["score"]),
            "opportunityScore": float(opportunity["score"]),
            "safetyOverride": float(safety["safetyOverride"]),
            "complianceBoost": float(safety["complianceBoost"]),
        }
        reason = _compose_reason(eq["name"], criticality, severity, resource, opportunity, action)

        existing_task = next((task for task in pending_tasks if task["machine_id"] == machine_id), None)
        if existing_task:
            existing = dict(existing_task)
            existing["machineId"] = existing.get("machine_id")
            existing["machineName"] = existing.get("machine_name")
            existing["dueDate"] = existing.get("due_date")
            existing["title"] = existing.get("task_name")
            existing["assignedTo"] = existing.get("assigned_to") or resource["primaryTechnician"]
            existing["priority"] = priority_band
            existing["priorityScore"] = round(priority_score, 1)
            existing["recommendedAction"] = action
            existing["aiReason"] = reason
            existing["scoreBreakdown"] = breakdown
            existing["blockingFactors"] = resource["blockingFactors"]
            # Diagnostic Fields
            existing["vibration"] = latest_telemetry.get("vibration", 0.0)
            existing["temperature"] = latest_telemetry.get("temperature", 0.0)
            existing["vibThreshold"] = _safe_float(insights["threatDetection"].get("vibThreshold"), 4.5)
            existing["tempThreshold"] = _safe_float(insights["threatDetection"].get("tempThreshold"), 100.0)
            existing["failureMode"] = insights["threatDetection"]["threat"]
            existing["failureProbability"] = insights["threatDetection"]["confidence"]
            existing["maintenanceAction"] = action
            prioritized.append(existing)
            continue

        if priority_score >= 10:
            prioritized.append(_virtual_task(machine_id, eq["name"], insights, priority_score, priority_band, action, reason, breakdown, resource, opportunity, latest_telemetry))

    status_rank = {"in_progress": 0, "pending": 1, "overdue": 2, "completed": 3}
    prioritized.sort(key=lambda item: (
        status_rank.get(item.get("status", "pending"), 9),
        -float(item.get("priorityScore", 0)),
        item.get("dueDate") or item.get("due_date") or "",
    ))
    return prioritized[:limit]
