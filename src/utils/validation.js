import { getAnalysisType } from "../services/analysis/registry.js";
import { datasets } from "../services/earth-engine/datasets.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizedEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function validEmail(value) {
  return value.length <= 254 && emailPattern.test(value);
}

export function validPassword(value) {
  return typeof value === "string" && value.length >= 10 && value.length <= 200;
}

export function validUuid(value) {
  return typeof value === "string" && uuidPattern.test(value);
}

export function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateAnalysisInput(body = {}) {
  const details = {};
  const type = getAnalysisType(body.analysisType);
  if (!type) details.analysisType = "Select a supported analysis method.";
  else if (type.status === "PLANNED") details.analysisType = type.description;
  if (!validDate(body.startDate) || !validDate(body.endDate) || body.startDate >= body.endDate) {
    details.dateRange = "Start and end dates must be valid, and the start must be before the end.";
  }
  if (type?.requiresComparisonPeriod && (!validDate(body.comparisonStartDate) || !validDate(body.comparisonEndDate) || body.comparisonStartDate >= body.comparisonEndDate)) {
    details.comparisonDateRange = "This method requires a valid comparison period with its start before its end.";
  }
  const dataset = datasets[body.dataset];
  if (!dataset || (type && !dataset.analyses.includes(type.id))) details.dataset = "The selected dataset does not support this method.";
  if (body.savedAreaId != null && !validUuid(body.savedAreaId)) details.savedAreaId = "Saved area ID is invalid.";
  if (body.parameters != null && (typeof body.parameters !== "object" || Array.isArray(body.parameters))) details.parameters = "Parameters must be an object.";
  return { type, dataset, details };
}

export function pickAllowed(source, allowed) {
  const unknown = Object.keys(source || {}).filter(key => !allowed.includes(key));
  return { unknown, value: Object.fromEntries(allowed.filter(key => source?.[key] !== undefined).map(key => [key, source[key]])) };
}
