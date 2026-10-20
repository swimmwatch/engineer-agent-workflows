import { readFile } from "node:fs/promises";
import Ajv from "ajv";
import { fail } from "../state.js";

const STATE_DEFINITIONS = [
  "Store", "Ref", "SourcePin", "Generation", "Candidate", "Operation",
  "WorkspaceBinding", "TaskBinding", "SafetyBlock", "Decision", "Registry", "Review", "Verdict", "ContextSelection",
  "Head", "Lock", "SessionCheckpoint", "ElementMetadata", "TaskId",
] as const;

const SUCCESS_DEFINITIONS = [
  "Success_Capabilities", "Success_OpenResult", "Success_Page", "Success_InterviewResume", "Success_MutationResult",
  "Success_EditResult", "Success_SourceBatch", "Success_Portion", "Success_ContextSelection", "Success_ReviewStatus",
  "Success_ReviewPortion", "Success_ReviewBatch", "Success_CheckResult", "Success_TaskCheckResult", "Success_OperationStatus", "Success_ActivationStatus",
  "Success_TaskCheckSummary", "Success_TaskInputDetails",
  "Success_CandidateRecordPortion", "Success_SessionResult",
] as const;

export const PRODUCT_RECORD_DEFINITIONS = [...STATE_DEFINITIONS, ...SUCCESS_DEFINITIONS] as const;
export type ProductRecordDefinition = typeof PRODUCT_RECORD_DEFINITIONS[number];

interface ProductSchema {
  $id: string;
  definitions: Record<string, unknown>;
}

interface CompiledProductSchema {
  ajv: Ajv.Ajv;
  schema: ProductSchema;
}

let compiledSchema: Promise<CompiledProductSchema> | undefined;

function isDefinition(value: string): boolean {
  return (PRODUCT_RECORD_DEFINITIONS as readonly string[]).includes(value)
    || value === "product_sources_get_batch_input";
}

function hasInvalidUnicodeScalar(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xD800 && unit <= 0xDBFF) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xDC00 || next > 0xDFFF) return true;
      index += 1;
    } else if (unit >= 0xDC00 && unit <= 0xDFFF) {
      return true;
    }
  }
  return false;
}

function containsInvalidUnicode(value: unknown): boolean {
  const pending: unknown[] = [value];
  const visited = new WeakSet<object>();
  while (pending.length > 0) {
    const current = pending.pop();
    if (typeof current === "string") {
      if (hasInvalidUnicodeScalar(current)) return true;
    } else if (current !== null && typeof current === "object" && !visited.has(current)) {
      visited.add(current);
      for (const [key, nested] of Object.entries(current)) {
        if (hasInvalidUnicodeScalar(key)) return true;
        pending.push(nested);
      }
    }
  }
  return false;
}

async function compileSchema(): Promise<CompiledProductSchema> {
  const raw = await readFile(new URL("../schemas/product.schema.json", import.meta.url), "utf8");
  let schema: ProductSchema;
  try {
    schema = JSON.parse(raw) as ProductSchema;
  } catch {
    return fail("INVALID_STATE", "Published product schema is not valid JSON.");
  }
  if (
    schema === null
    || typeof schema !== "object"
    || typeof schema.$id !== "string"
    || schema.definitions === null
    || typeof schema.definitions !== "object"
    || Array.isArray(schema.definitions)
  ) {
    return fail("INVALID_STATE", "Published product schema has an invalid root contract.");
  }

  const ajv = new Ajv({ allErrors: true, jsonPointers: true, strictKeywords: true });
  try {
    if (!ajv.validateSchema(schema)) return fail("INVALID_STATE", "Published product schema is not valid JSON Schema Draft 7.");
    ajv.addSchema(schema);
    for (const definition of PRODUCT_RECORD_DEFINITIONS) {
      if (!Object.hasOwn(schema.definitions, definition) || ajv.getSchema(`${schema.$id}#/definitions/${definition}`) === undefined) {
        return fail("INVALID_STATE", "Published product schema is missing a required definition.");
      }
    }
  } catch {
    return fail("INVALID_STATE", "Published product schema cannot be compiled.");
  }
  return { ajv, schema };
}

async function productSchema(): Promise<CompiledProductSchema> {
  compiledSchema ??= compileSchema();
  return compiledSchema;
}

export async function validateProductRecord<T>(definition: string, value: T): Promise<T> {
  if (!isDefinition(definition)) return fail("UNSUPPORTED_VERSION", "Product record definition is not supported.");
  if (containsInvalidUnicode(value)) {
    return fail("INVALID_STATE", "Product record contains invalid Unicode scalar values.");
  }
  const { ajv, schema } = await productSchema();
  const validate = ajv.getSchema(`${schema.$id}#/definitions/${definition}`);
  if (validate === undefined) return fail("INVALID_STATE", "Published product schema is missing a required definition.");
  let valid: boolean;
  try {
    valid = Boolean(validate(value));
  } catch {
    return fail("INVALID_STATE", "Product record cannot be validated safely.");
  }
  if (!valid) {
    return fail("INVALID_STATE", "Product record does not match its supported schema.", {
      fields: validate.errors?.slice(0, 10).map((error) => ({ path: error.dataPath, rule: error.keyword, params: error.params })) ?? [],
    });
  }
  return value;
}
