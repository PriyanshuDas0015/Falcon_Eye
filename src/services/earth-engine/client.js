import ee from "@google/earthengine";
import { config } from "../../config/env.js";
let state = "not_configured";
let initialized = false;
export function getStatus() { return state; }
export async function initialize() {
  if (!config.eeEnabled) { state = "not_configured"; return state; }
  if (!config.eeConfigurationValid) { state = "configuration_error"; console.error(JSON.stringify({level:"error",event:"earth_engine_configuration_invalid",missing:config.eeMissing})); return state; }
  try {
    const key = JSON.parse(await import("node:fs/promises").then(fs => fs.readFile(config.eeCredentials, "utf8")));
    await new Promise((resolve, reject) => ee.data.authenticateViaPrivateKey(key, () => ee.initialize(null, null, resolve, reject, null, config.eeProject), reject));
    initialized = true; state = "connected";
  } catch (error) { state = "authentication_error"; console.error(JSON.stringify({ level:"error", event:"earth_engine_init_failed", message:error.message })); }
  return state;
}
export function getClient() { if (!initialized) { const e = new Error("Google Earth Engine has not been configured for Falcon Eye."); e.code = "EARTH_ENGINE_NOT_CONFIGURED"; throw e; } return ee; }
