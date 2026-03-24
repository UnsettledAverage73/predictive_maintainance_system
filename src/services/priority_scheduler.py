from datetime import datetime
from typing import Any, Dict, List, Optional

from src.data.analytics import calculate_failure_probability, calculate_log_risk_score
from src.data.database import (
    get_all_equipment_metadata,
    get_all_pending_tasks,
    get_asset_priority_profile,
    get_available_technicians,
    get_available_tools,
    get_inventory_spares,
    get_machine_health_summary,
    get_machine_textual_history,
    get_production_windows,
    get_safety_risk_profile,
)
from src.services.machine_insights import get_machine_insights


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
    base = float(profile.get("criticality_score", 3))
    downstream = float(profile.get("downstream_dependency_count", 0))
    bypass_penalty = 0 if profile.get("bypass_available") else 0.5
    score = _clamp(base + min(1.0, downstream * 0.2) + bypass_penalty, 1, 5)
    return {
        "score": round(score, 2),
        "machineClass": profile.get("machine_class", "tier2"),
        "downtimeCostPerHourInr": float(profile.get("downtime_cost_per_hour_inr", 50000)),
        "demandLevel": profile.get("current_demand_level", "normal"),
        "bypassAvailable": bool(profile.get("bypass_available", 0)),
        "downstreamDependencyCount": int(profile.get("downstream_dependency_count", 0)),
    }


def _severity_component(machine_id: str, insights: Dict[str, Any]) -> Dict[str, Any]:
    health = get_machine_health_summary(machine_id)
    telemetry_prob, _ = calculate_failure_probability(health["telemetry"])
    log_risk = calculate_log_risk_score(get_machine_textual_history(machine_id))
    threat_confidence = float(insights["threatDetection"]["confidence"])
    rul_hours = float(insights["wearModel"]["rulHours"])
    alert_count = len(health["alerts"])

    rul_penalty = 1.4 if rul_hours <= 48 else (1.0 if rul_hours <= 168 else 0.4)
    score = (max(telemetry_prob, log_risk, threat_confidence) / 25.0) + min(1.0, alert_count * 0.35) + rul_penalty
    return {
        "score": round(_clamp(score, 1, 5), 2),
        "telemetryProbability": telemetry_prob,
        "logRisk": log_risk,
        "threatConfidence": threat_confidence,
        "rulHours": rul_hours,
        "alertCount": alert_count,
    }


def _resource_component(machine_id: str, threat: str) -> Dict[str, Any]:
    spares = get_inventory_spares(machine_id)
    technicians = get_available_technicians()
    tools = get_available_tools(machine_id)
    required_skill = _pick_skill(machine_id, threat)

    spare_ready = any(int(spare.get("qty_available", 0)) > 0 for spare in spares)
    technician_ready = any(tech.get("skill_code") in {required_skill, "general"} for tech in technicians)
    tool_ready = len(tools) > 0

    score = 0.2
    if spare_ready:
        score += 0.4
    if technician_ready:
        score += 0.25
    if tool_ready:
        score += 0.15

    primary_spare = spares[0]["part_name"] if spares else "General service kit"
    primary_technician = next((tech["technician_name"] for tech in technicians if tech.get("skill_code") in {required_skill, "general"}), "Shift technician")

    return {
        "score": round(_clamp(score, 0, 1), 2),
        "spareReady": spare_ready,
        "technicianReady": technician_ready,
        "toolReady": tool_ready,
        "primarySpare": primary_spare,
        "primaryTechnician": primary_technician,
        "requiredSkill": required_skill,
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
            base *= 0.85
        elif criticality["demandLevel"] == "low":
            base = min(1.0, base + 0.15)
        return {
            "score": round(_clamp(base, 0, 1), 2),
            "windowType": best_window.get("window_type", "low_demand"),
            "windowStart": best_window.get("window_start"),
            "windowEnd": best_window.get("window_end"),
        }

    fallback = 0.35 if criticality["demandLevel"] == "peak" else 0.6
    return {
        "score": fallback,
        "windowType": "ad_hoc",
        "windowStart": None,
        "windowEnd": None,
    }


def _safety_component(machine_id: str, insights: Dict[str, Any]) -> Dict[str, Any]:
    safety = get_safety_risk_profile(machine_id) or {}
    notes = " ".join(insights["threatDetection"]["evidence"]).lower()
    base = float(safety.get("safety_risk_score", 0)) + float(safety.get("environmental_risk_score", 0)) * 0.6
    if any(word in notes for word in ["oil leak", "leak", "smoke", "fire", "spark"]):
        base += 12
    if int(safety.get("near_miss_count_90d", 0)) > 0:
        base += min(8, int(safety.get("near_miss_count_90d", 0)) * 2)
    compliance_boost = 0.0
    due_date = safety.get("compliance_due_date")
    if due_date:
        try:
            days_left = (datetime.fromisoformat(due_date) - datetime.now()).days
            if days_left <= 3:
                compliance_boost = 18
            elif days_left <= 7:
                compliance_boost = 10
        except ValueError:
            compliance_boost = 0

    return {
        "safetyOverride": round(_clamp(base, 0, 30), 2),
        "complianceBoost": round(_clamp(compliance_boost, 0, 20), 2),
        "regulatoryBlocker": bool(safety.get("regulatory_blocker", 0)),
    }


def _priority_band(priority_score: float) -> str:
    if priority_score >= 85:
        return "critical"
    if priority_score >= 65:
        return "high"
    if priority_score >= 40:
        return "medium"
    return "low"


def _recommended_action(priority_score: float, resource: Dict[str, Any], safety: Dict[str, Any]) -> str:
    if safety["safetyOverride"] >= 20:
        return "Immediate shutdown"
    if priority_score >= 85:
        return "Schedule immediately"
    if priority_score >= 65:
        return "Schedule next shift"
    if resource["blockingFactors"]:
        return "Monitor / procurement blocker"
    if priority_score >= 40:
        return "Plan within 48h"
    return "Fill-in task"


def _compose_reason(machine_name: str, criticality: Dict[str, Any], severity: Dict[str, Any], resource: Dict[str, Any], opportunity: Dict[str, Any], action: str) -> str:
    parts = [
        f"{machine_name} is a {criticality['machineClass']} asset",
        f"severity is elevated from threat confidence {int(severity['threatConfidence'])}%",
    ]
    if resource["spareReady"]:
        parts.append(f"parts are ready ({resource['primarySpare']})")
    else:
        parts.append("parts are not fully ready")
    if resource["technicianReady"]:
        parts.append(f"{resource['primaryTechnician']} is on shift")
    if opportunity["windowType"] != "ad_hoc":
        parts.append(f"best stop window is {opportunity['windowType']}")
    parts.append(f"recommended action: {action.lower()}")
    return ". ".join(parts) + "."


def _virtual_task(machine_id: str, machine_name: str, insights: Dict[str, Any], priority_score: float, priority_band: str, action: str, reason: str, breakdown: Dict[str, Any], resource: Dict[str, Any], opportunity: Dict[str, Any]) -> Dict[str, Any]:
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
        resource = _resource_component(machine_id, insights["threatDetection"]["threat"])
        opportunity = _opportunity_component(machine_id, criticality)
        safety = _safety_component(machine_id, insights)

        priority_score = ((criticality["score"] * severity["score"]) * 3.2) + (resource["score"] * opportunity["score"] * 18) + safety["safetyOverride"] + safety["complianceBoost"]
        priority_score = _clamp(priority_score, 1, 100)
        priority_band = _priority_band(priority_score)
        action = _recommended_action(priority_score, resource, safety)

        breakdown = {
            "criticality": criticality["score"],
            "severity": severity["score"],
            "resourceReadiness": resource["score"],
            "opportunityScore": opportunity["score"],
            "safetyOverride": safety["safetyOverride"],
            "complianceBoost": safety["complianceBoost"],
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
            prioritized.append(existing)
            continue

        if priority_score >= 15:
            prioritized.append(_virtual_task(machine_id, eq["name"], insights, priority_score, priority_band, action, reason, breakdown, resource, opportunity))

    status_rank = {"in_progress": 0, "pending": 1, "overdue": 2, "completed": 3}
    prioritized.sort(key=lambda item: (
        status_rank.get(item.get("status", "pending"), 9),
        -float(item.get("priorityScore", 0)),
        item.get("dueDate") or item.get("due_date") or "",
    ))
    return prioritized[:limit]
