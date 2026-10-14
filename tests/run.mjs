import { build } from 'esbuild';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const folder=await mkdtemp(join(tmpdir(),'porto-ocean-'));
try{const out=join(folder,'ocean-test.mjs');await build({entryPoints:['tests/ocean.test.ts'],outfile:out,bundle:true,platform:'node',format:'esm'});await import(pathToFileURL(out));}finally{await rm(folder,{recursive:true,force:true});}
