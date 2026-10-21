#!/usr/bin/env node
import { parseTimeout } from './configuration.mjs';
try { process.stdout.write(JSON.stringify({timeoutMs:parseTimeout(process.env.TIMEOUT_SECONDS),format:'json'})+'\n'); }
catch { process.stderr.write('INVALID_TIMEOUT\n'); process.exitCode=2; }
