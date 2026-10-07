# Third-party notices

Passage Practice is MIT licensed. The scheduling adaptations and bundled dependencies below retain their respective notices.

The build uses the public Obsidian API. Obsidian API declarations (MIT), TypeScript (Apache-2.0), esbuild (MIT), tsx (MIT), jsdom (MIT), Playwright (Apache-2.0), and Node type declarations (MIT) are development/test dependencies, not bundled application libraries. Their notices are included in their npm distributions. Versions and transitive dependencies are recorded in package-lock.json. esbuild runtime helpers are included in main.js under MIT.

## entities 6.0.1

Bundled HTML entity decoding for safe rendering copies. Source: https://github.com/fb55/entities

Copyright (c) Felix Böhm
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS,
EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

## ts-fsrs 5.4.2 (FSRS-6)

The official Open Spaced Repetition implementation is bundled, without copying
competitor plugin code. Source: https://github.com/open-spaced-repetition/ts-fsrs
Package: https://www.npmjs.com/package/ts-fsrs/v/5.4.2

The scheduler uses the pinned FSRS-6 defaults (90% requested retention, short-term
learning enabled, deterministic previews with fuzz disabled). Exact parameters,
implementation identity, real review logs and memory state are saved with each
FSRS card. The plugin persistence adapter and legacy migration are original.

MIT License

Copyright (c) 2026 Open Spaced Repetition

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

### ts-fsrs build isolation

The bundled scheduler omits only the four upstream compatibility assignments to Date.prototype.scheduler/diff/format/dueFormat. This avoids modifying Obsidian and other plugins’ global Date prototype. All official scheduling functions, parameters, states and review outputs are unchanged. The build checks the exact pinned source blocks and fails if they change.


## Obsidian Spaced Repetition: SM-2-OSR

The day-based scheduling formula and deterministic load-balancing behavior are adapted from the official Obsidian Spaced Repetition 1.15.4 release (commit 22fbea0a71ebd39fe29e0bc2d571aea4c42e10e4), `src/scheduling/algorithms/osr/note-scheduling.ts` and `src/scheduling/due-date-histogram.ts`.

Source: https://github.com/st3v3nmw/obsidian-spaced-repetition/tree/22fbea0a71ebd39fe29e0bc2d571aea4c42e10e4

Passage Practice uses the default ease 250 without note-graph initialization, local midnight boundaries, independent card state, and one appearance per session; Again is due today and is available in the next round. Balancing is among active day-based cards. It does not import upstream card metadata or claim full reviewer equivalence.

MIT License

Copyright (c) 2021 - 2024 Stephen Mwangi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
