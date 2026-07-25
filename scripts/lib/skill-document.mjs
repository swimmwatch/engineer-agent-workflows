import { TextDecoder } from "node:util";

import { ValidationError } from "./errors.mjs";

const FRONTMATTER_FIELDS = new Set([
  "name",
  "description",
  "disable-model-invocation",
  "user-invocable",
]);

function assertUnicodeScalarString(value, rule = "text must be valid Unicode") {
  if (typeof value !== "string") {
    throw new ValidationError("E_INVALID_SKILL", rule);
  }
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new ValidationError("E_INVALID_SKILL", rule);
      }
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new ValidationError("E_INVALID_SKILL", rule);
    }
  }
}

export function decodeUTF8(input) {
  if (typeof input === "string") {
    assertUnicodeScalarString(input);
    return input;
  }
  if (!(input instanceof Uint8Array)) {
    throw new ValidationError("E_INVALID_SKILL", "skill document must be UTF-8 text");
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(input);
  } catch (error) {
    throw new ValidationError("E_INVALID_SKILL", "skill document must be valid UTF-8", {
      cause: error,
    });
  }
}

export function countCodePoints(value) {
  assertUnicodeScalarString(value);
  return [...value].length;
}

export function utf8Bytes(value) {
  assertUnicodeScalarString(value);
  return Buffer.byteLength(value, "utf8");
}

function parseDescription(value) {
  if (!value.startsWith('"')) {
    throw new ValidationError(
      "E_INVALID_SKILL",
      "frontmatter description must be a JSON-quoted string",
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new ValidationError(
      "E_INVALID_SKILL",
      "frontmatter description must be a JSON-quoted string",
      { cause: error },
    );
  }
  if (typeof parsed !== "string") {
    throw new ValidationError(
      "E_INVALID_SKILL",
      "frontmatter description must be a JSON-quoted string",
    );
  }
  assertUnicodeScalarString(parsed);
  return parsed;
}

function parseBoolean(value, field) {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  throw new ValidationError(
    "E_INVALID_SKILL",
    `frontmatter ${field} must be a boolean`,
  );
}

function parseFrontmatter(block) {
  const values = {};
  for (const line of block.split("\n")) {
    if (line.length === 0) {
      continue;
    }
    if (/^\s/.test(line) || line.startsWith("#") || !line.includes(":")) {
      throw new ValidationError(
        "E_INVALID_SKILL",
        "frontmatter must use flat scalar fields",
      );
    }
    const separator = line.indexOf(":");
    const field = line.slice(0, separator);
    const value = line.slice(separator + 1).trimStart();
    if (!FRONTMATTER_FIELDS.has(field)) {
      throw new ValidationError("E_INVALID_SKILL", "frontmatter contains an unknown field");
    }
    if (Object.hasOwn(values, field)) {
      throw new ValidationError("E_INVALID_SKILL", "frontmatter contains a duplicate field");
    }
    if (field === "name") {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
        throw new ValidationError("E_INVALID_SKILL", "frontmatter name is invalid");
      }
      values[field] = value;
    } else if (field === "description") {
      values[field] = parseDescription(value);
    } else {
      values[field] = parseBoolean(value, field);
    }
  }
  for (const field of FRONTMATTER_FIELDS) {
    if (!Object.hasOwn(values, field)) {
      throw new ValidationError("E_INVALID_SKILL", "frontmatter is missing a required field");
    }
  }
  return values;
}

export function splitSkillDocument(input) {
  const text = decodeUTF8(input);
  if (text.includes("\0")) {
    throw new ValidationError("E_INVALID_SKILL", "skill document must not contain NUL");
  }
  if (text.includes("\r")) {
    throw new ValidationError("E_INVALID_SKILL", "skill document must use LF line endings");
  }
  if (!text.startsWith("---\n")) {
    throw new ValidationError("E_INVALID_SKILL", "skill document must start with frontmatter");
  }
  const end = text.indexOf("\n---\n", 4);
  if (end < 0) {
    throw new ValidationError("E_INVALID_SKILL", "skill frontmatter is not terminated");
  }
  const frontmatterBlock = text.slice(4, end);
  const body = text.slice(end + 5);
  if (body.startsWith("---\n")) {
    throw new ValidationError("E_INVALID_SKILL", "skill document has repeated frontmatter");
  }
  if (body.trim().length === 0) {
    throw new ValidationError("E_INVALID_SKILL", "skill document body must not be blank");
  }
  return {
    frontmatter: structuredClone(parseFrontmatter(frontmatterBlock)),
    body,
  };
}

export function renderRequiredFrontmatter(entry) {
  if (
    entry === null ||
    typeof entry !== "object" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name ?? "") ||
    typeof entry.description !== "string"
  ) {
    throw new ValidationError("E_INVALID_SKILL", "skill entry cannot render frontmatter");
  }
  assertUnicodeScalarString(entry.description);
  const policies = entry.policies;
  if (
    policies?.claude?.disableModelInvocation !== true ||
    policies?.claude?.userInvocable !== true
  ) {
    throw new ValidationError("E_INVALID_SKILL", "skill entry has invalid Claude policy");
  }
  return [
    "---",
    `name: ${entry.name}`,
    `description: ${JSON.stringify(entry.description)}`,
    "disable-model-invocation: true",
    "user-invocable: true",
    "---",
    "",
  ].join("\n");
}

export function validateSkillDocument(entry, input) {
  const text = decodeUTF8(input);
  if (utf8Bytes(text) > 4096) {
    throw new ValidationError("E_INVALID_SKILL", "SKILL.md exceeds 4096 UTF-8 bytes");
  }
  const parsed = splitSkillDocument(text);
  if (
    parsed.frontmatter.name !== entry.name ||
    parsed.frontmatter.description !== entry.description ||
    parsed.frontmatter["disable-model-invocation"] !== true ||
    parsed.frontmatter["user-invocable"] !== true
  ) {
    throw new ValidationError(
      "E_INVALID_SKILL",
      "skill frontmatter does not match the catalog",
    );
  }
  if (countCodePoints(entry.description) > 240) {
    throw new ValidationError("E_INVALID_SKILL", "skill description exceeds 240 code points");
  }
  return {
    frontmatter: structuredClone(parsed.frontmatter),
    body: parsed.body,
    bytes: utf8Bytes(text),
  };
}
