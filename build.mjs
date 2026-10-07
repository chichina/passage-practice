import {fsrsSafeBuildPlugin} from './scripts/fsrs-build.mjs';
import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
const {version}=JSON.parse(await readFile(new URL('./manifest.json',import.meta.url),'utf8'));
await build({entryPoints:['src/main.ts'],plugins:[fsrsSafeBuildPlugin],bundle:true,external:['obsidian'],format:'cjs',platform:'browser',target:'es2018',outfile:'main.js',banner:{js:`/* Passage Practice ${version} | Copyright 2026 Passage Practice contributors | MIT License */`}});
