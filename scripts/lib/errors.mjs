import path from "node:path";

export const MAX_DIAGNOSTIC_CODE_POINTS = 500;

const CODE_PATTERN = /^E_[A-Z0-9_]+$/;

function boundedText(value, fallback) {
  const text = typeof value === "string" && value.length > 0 ? value : fallback;
  const points = [...text];
  if (points.length <= MAX_DIAGNOSTIC_CODE_POINTS) {
    return text;
  }
  return `${points.slice(0, MAX_DIAGNOSTIC_CODE_POINTS - 1).join("")}…`;
}

function safeRelativePath(value) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    return undefined;
  }
  const normalized = value.replaceAll("\\", "/");
  if (
    normalized.startsWith("/") ||
    /^[A-Za-z]:/.test(normalized) ||
    normalized.split("/").includes("..")
  ) {
    return undefined;
  }
  const cleaned = path.posix.normalize(normalized);
  if (cleaned === "." || cleaned.startsWith("../")) {
    return undefined;
  }
  return cleaned;
}

export class ValidationError extends Error {
  constructor(code, rule, options = {}) {
    const safeCode = CODE_PATTERN.test(code) ? code : "E_VALIDATION";
    const safeRule = boundedText(rule, "validation failed");
    super(safeRule, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "ValidationError";
    this.code = safeCode;
    this.rule = safeRule;
    this.relativePath = safeRelativePath(options.relativePath);
  }
}

export function isValidationError(error) {
  return error instanceof ValidationError;
}

export function formatDiagnostic(error) {
  if (!(error instanceof ValidationError)) {
    return "E_INTERNAL: internal failure";
  }
  const location = error.relativePath === undefined ? "" : ` ${error.relativePath}`;
  return boundedText(`${error.code}${location}: ${error.rule}`, "E_VALIDATION: validation failed");
}

export function usageError(rule) {
  return new ValidationError("E_USAGE", rule);
}
