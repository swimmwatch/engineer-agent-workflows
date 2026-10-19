import { readFile, writeFile } from "node:fs/promises";
import { replaceEmbeddedRuntimeStamp, runtimeArtifacts, runtimeDigests } from "../dist/runtime-info.js";

const metadata = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const artifacts = runtimeArtifacts();
const stamp = { stamp_version: 1, package_version: metadata.version, ...runtimeDigests(artifacts), artifacts };
const modulePath = new URL("../dist/runtime-info.js", import.meta.url);
const source = await readFile(modulePath, "utf8");
await writeFile(modulePath, replaceEmbeddedRuntimeStamp(source, stamp));
await writeFile(new URL("../dist/runtime-stamp.json", import.meta.url), `${JSON.stringify(stamp, null, 2)}\n`);
