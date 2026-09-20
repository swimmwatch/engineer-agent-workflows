import { unzipSync } from "fflate";
import { fail, hash, obj, readDependency, rows } from "./state.js";
import type { Context, Data } from "./state.js";

// Native v3 container, as documented by Penpot's developer data-model guide.
// Parsing checks local identity and structure, not rendering or accessibility.
export async function inspectExport(context: Context, value: Data, catalog?: Data): Promise<string> {
  const path = obj(value.snapshot).path;
  if (typeof path !== "string") fail("INVALID_STATE", "Snapshot path is missing.");
  const bytes = await readDependency(context, path);
  if (!bytes) fail("PREREQUISITE_REQUIRED", "Save the native Penpot export at the declared snapshot path first.");
  let files: Record<string, Uint8Array>;
  try {
    let total = 0;
    const names = new Set<string>();
    files = unzipSync(bytes, { filter: (entry) => {
      if (names.has(entry.name) || entry.name.startsWith("/") || entry.name.includes("\\") || entry.name.split("/").includes("..")) throw new Error("Unsafe archive entry.");
      names.add(entry.name); total += entry.originalSize;
      if (names.size > 100000 || total > 64 * 1024 * 1024) throw new Error("Archive expansion limit.");
      return entry.name.endsWith(".json") && (entry.name === "manifest.json" || entry.name.startsWith("files/"));
    } });
  } catch { return fail("INVALID_EXPORT", "Export must be a bounded native Penpot v3 ZIP archive."); }
  function json(path: string): Data {
    try { const entry = files[path]; if (!entry) throw new Error("Missing entry."); return obj(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(entry)) as unknown); }
    catch { return fail("INVALID_EXPORT", "Export is missing valid required native metadata."); }
  }
  const manifest = json("manifest.json"), fileId = obj(value.penpot).file_id;
  if (manifest.type !== "penpot/export-files" || manifest.version !== 1 || !rows(manifest.files).some((f) => f.id === fileId)) fail("INVALID_EXPORT", "Native export identity does not match the registered Penpot file.");
  if (typeof fileId !== "string" || json(`files/${fileId}.json`).id !== fileId) fail("INVALID_EXPORT", "File metadata identity is inconsistent.");
  if (!catalog) {
    for (const component of rows(value.components)) for (const variant of rows(component.variants)) {
      const main = variant.main_component_id;
      if (typeof main !== "string" || !Object.keys(files).some((path) => path.startsWith(`files/${fileId}/`) && path.endsWith(`/${main}.json`))) fail("INVALID_EXPORT", "A registered main component is absent from the export.", { component_id: component.id, variant_id: variant.id });
    }
  } else {
    const library = obj(catalog.penpot).file_id;
    if (!Array.isArray(manifest.relations) || !manifest.relations.some((r: unknown) => Array.isArray(r) && r[0] === fileId && r[1] === library)) fail("INVALID_EXPORT", "Export does not preserve the shared library relationship.");
    for (const screen of rows(value.screens)) {
      const pageId = screen.page_id, boardId = screen.board_id;
      if (typeof pageId !== "string" || typeof boardId !== "string") fail("INVALID_STATE", "Screen identities are missing.");
      if (json(`files/${fileId}/pages/${pageId}.json`).id !== pageId || json(`files/${fileId}/pages/${pageId}/${boardId}.json`).id !== boardId) fail("INVALID_EXPORT", "Screen board or page identity is inconsistent.");
      for (const instance of rows(screen.instances)) {
        if (typeof instance.element_id !== "string") fail("INVALID_STATE", "Instance identity is missing.");
        const shape = json(`files/${fileId}/pages/${pageId}/${instance.element_id}.json`);
        const component = rows(catalog.components).find((c) => c.id === instance.component);
        const variant = rows(component?.variants).find((v) => v.id === instance.variant);
        if (shape.id !== instance.element_id || shape.componentFile !== library || shape.componentId !== variant?.main_component_id) fail("INVALID_EXPORT", "Exported instance is not linked to the registered component variant.", { instance_id: instance.id });
      }
    }
  }
  return hash(bytes);
}
