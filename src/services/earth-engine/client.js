import ee from "@google/earthengine";
import { readFile } from "node:fs/promises";
import { config } from "../../config/env.js";
let state = "not_configured";
let initialized = false;
export function getStatus() { return state; }
export function getEarthEngineStatus(settings = config, currentState = state) {
  const configured = Boolean(settings.eeEnabled && settings.eeConfigurationValid);
  if (!configured) return { status: "unavailable", configured: false, initialized: false };
  if (currentState === "connected") return { status: "configured", configured: true, initialized: true };
  if (currentState === "initialization_error" || currentState === "authentication_error") {
    return { status: "initialization_error", configured: true, initialized: false };
  }
  return { status: "configured", configured: true, initialized: false };
}
export async function initialize({ settings = config, engine = ee, loadCredentials = async location => JSON.parse(await readFile(location, "utf8")) } = {}) {
  if (!settings.eeEnabled) { initialized = false; state = "not_configured"; return state; }
  if (!settings.eeConfigurationValid) { initialized = false; state = "configuration_error"; return state; }
  if (settings === config && initialized && state === "connected") return state;
  initialized = false;
  try {
    const key = await loadCredentials(settings.eeCredentials);
    await new Promise((resolve, reject) => engine.data.authenticateViaPrivateKey(key, () => engine.initialize(null, null, resolve, reject, null, settings.eeProject), reject));
    initialized = true; state = "connected";
  } catch {
    state = "initialization_error";
    console.error(JSON.stringify({ level:"error", event:"earth_engine_init_failed" }));
  }
  return state;
}
export function getClient() { if (!initialized) { const e = new Error("Google Earth Engine has not been configured for Falcon Eye."); e.code = "EARTH_ENGINE_NOT_CONFIGURED"; throw e; } return ee; }
