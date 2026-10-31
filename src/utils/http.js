import crypto from "node:crypto";
import { performance } from "node:perf_hooks";

export function sendData(res, data, status = 200, legacy = {}) {
  return res.status(status).json({ success: true, data, ...legacy });
}

export function apiError(res, status, code, message, details) {
  const body = { success: false, code, message };
  if (details && Object.keys(details).length) body.details = details;
  if (res.locals.requestId) body.requestId = res.locals.requestId;
  return res.status(status).json(body);
}

export function requestContext(req, res, next) {
  const supplied = req.get("X-Request-ID");
  const requestId = supplied && /^[a-zA-Z0-9._:-]{1,100}$/.test(supplied)
    ? supplied
    : crypto.randomUUID();
  const startedAt = performance.now();
  req.requestId = requestId;
  res.locals.requestId = requestId;
  res.set("X-Request-ID", requestId);
  res.on("finish", () => {
    console.info(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      event: "request_completed",
      requestId,
      method: req.method,
      route: req.originalUrl.split("?")[0],
      status: res.statusCode,
      durationMs: Number((performance.now() - startedAt).toFixed(1))
    }));
  });
  next();
}

export function parsePage(query) {
  const rawPage = Number(query.page ?? 1);
  const rawLimit = Number(query.limit ?? 20);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 20;
  return { page, limit, offset: (page - 1) * limit };
}
