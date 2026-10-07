import {readFile} from 'node:fs/promises';
const blocks=[
`Date.prototype.scheduler = function(t, isDay) {\n  return date_scheduler(this, t, isDay);\n};`,
`Date.prototype.diff = function(pre, unit) {\n  return date_diff(this, pre, unit);\n};`,
`Date.prototype.format = function() {\n  return formatDate(this);\n};`,
`Date.prototype.dueFormat = function(last_review, unit, timeUnit) {\n  return show_diff_message(this, last_review, unit, timeUnit);\n};`,
];
/** Only omit upstream's optional global Date compatibility extensions. All
 * official scheduling functions and coefficients remain exactly unchanged. */
export function stripDateExtensions(source){let clean=source;for(const block of blocks){if(clean.split(block).length!==2)throw new Error('Unexpected ts-fsrs Date extension layout; review pinned dependency before building');clean=clean.replace(block,'/* Global Date extension omitted by Passage Practice build. */');}if(clean.includes('Date.prototype'))throw new Error('Unexpected ts-fsrs global Date mutation');return clean;}
export const fsrsSafeBuildPlugin={name:'isolate-ts-fsrs-date-compatibility',setup(build){build.onLoad({filter:/[/\\]ts-fsrs[/\\]dist[/\\]index\.mjs$/},async({path})=>({contents:stripDateExtensions(await readFile(path,'utf8')),loader:'js'}));}};
