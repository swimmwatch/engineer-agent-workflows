import { z } from "zod";
import { validationDiagnostics } from "./diagnostics.js";
import type { Data } from "./state.js";
import { fail } from "./state.js";

export interface WorkflowTool {
  name: string; description: string; inputSchema: z.ZodType | Record<string, unknown>;
  outputSchema?: Record<string, unknown>; schemaKind: "zod" | "json"; write: boolean; destructive: boolean;
  run(input: unknown, signal?: AbortSignal): Promise<Data>;
}
export function tool<S extends z.ZodType>(name: string, description: string, inputSchema: S, write: boolean, run: (input: z.output<S>, signal?: AbortSignal) => Promise<Data>, destructive = write): WorkflowTool {
  return { name, description, inputSchema, schemaKind: "zod", write, destructive, run: async (input, signal) => {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) {
      fail(
        "INVALID_INPUT",
        "Use the published parameters for this scenario tool.",
        validationDiagnostics(
          parsed.error.issues,
          z.toJSONSchema(inputSchema, { io: "input" }),
        ),
      );
    }
    return run(parsed.data, signal);
  } };
}
