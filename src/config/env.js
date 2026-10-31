import "dotenv/config";
const production=process.env.NODE_ENV==="production",eeEnabled=process.env.EARTH_ENGINE_ENABLED==="true";
if(production&&!process.env.SESSION_SECRET)throw new Error("Missing required environment variable: SESSION_SECRET");
if(process.env.PORT&&!Number.isInteger(Number(process.env.PORT)))throw new Error("PORT must be an integer.");
if(process.env.MAX_AOI_AREA_KM2&&(!Number.isFinite(Number(process.env.MAX_AOI_AREA_KM2))||Number(process.env.MAX_AOI_AREA_KM2)<=0))throw new Error("MAX_AOI_AREA_KM2 must be a positive number.");
const missingEarthEngine=eeEnabled?["GOOGLE_CLOUD_PROJECT","GOOGLE_SERVICE_ACCOUNT_EMAIL","GOOGLE_APPLICATION_CREDENTIALS"].filter(key=>!process.env[key]):[];
export const config={port:Number(process.env.PORT||3000),databaseUrl:process.env.DATABASE_URL,sessionSecret:process.env.SESSION_SECRET||"development-only-change-this-secret",maxAoiKm2:Number(process.env.MAX_AOI_AREA_KM2||10000),production,eeEnabled,eeProject:process.env.GOOGLE_CLOUD_PROJECT,eeEmail:process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,eeCredentials:process.env.GOOGLE_APPLICATION_CREDENTIALS,eeConfigurationValid:missingEarthEngine.length===0,eeMissing:missingEarthEngine,logLevel:process.env.LOG_LEVEL||"info"};
