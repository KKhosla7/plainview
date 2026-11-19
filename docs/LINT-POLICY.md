# Lint policy

Plainview uses Biome as the broad syntax and correctness gate and Dwarpal for project-specific
architecture rules. The following rules are intentionally disabled because they conflict with the
extension runtime, the existing file layout, or the build scripts. This document is the review
record for those decisions; it is not a general permission to suppress diagnostics inline.

## Global JavaScript and CSS rules

| Rule | Why it is off |
| --- | --- |
| `nursery` | Experimental rules are unstable across Biome releases and are not a release gate. Stable correctness rules remain enabled. |
| `correctness/useQwikValidLexicalScope` | Plainview does not use Qwik. The rule inspects Qwik component boundaries that do not exist here. |
| `correctness/noUnresolvedImports` | Extension pages and content scripts load resources through runtime URLs and web-accessible paths, not Node module resolution. Static resolution produces false positives for lazy vendor bundles. |
| `suspicious/useBaseline` | The supported targets are pinned to Chrome 120+ and Firefox 142+. Browser APIs used by the reader are feature-detected or guarded at the call site. |
| `performance/useTopLevelRegex` | Some regular expressions intentionally live near the parser that owns them; moving them to module scope would make them shared and stateful across independent document renders. |
| `style/noTernary` | Short fallback expressions are used heavily for DOM text and optional values. Rewriting them as statements adds noise without changing behavior. |
| `style/noHexColors` | Hex values are required in SVG data URLs, PNG-adjacent assets and contrast tests where CSS custom properties are not available. |
| `style/noMagicNumbers` | Layout, timing and text-budget values are local to the renderer that owns them. Naming every constant would create a second configuration surface. |
| `style/noContinue` | Filtering loops use `continue` as the clearest early-skip form. The alternative nests the remaining body one level deeper. |
| `style/useNamedCaptureGroup` | Existing expressions use positional groups that are passed directly to small parser helpers. Named groups would not make those call sites clearer. |
| `style/useNamingConvention` | Chrome and browser APIs expose camelCase, while persisted keys and some formats use snake_case or kebab-case. A single convention cannot cover those boundaries. |

## Build and test overrides

These rules are disabled only for `scripts/**` and `tests/**`, not for shipped source.

| Scope | Rule | Why it is off |
| --- | --- | --- |
| scripts, tests | `suspicious/noConsole` | Build, packaging and test harnesses report progress and failures on stdout/stderr. |
| scripts, tests | `suspicious/noPlaywrightWaitForTimeout` | Screenshot and UI tests use bounded waits around animation and file-watch timing. |
| scripts, tests | `style/noPlaywrightWaitForSelector` | The browser harness waits for extension-owned selectors that are not stable app contracts. |
| scripts, tests | `style/noProcessEnv` | CI supplies browser paths and release metadata through environment variables. |
| scripts, tests | `correctness/noNodejsModules` | Build and test scripts are Node programs; shipped source is browser-only. |
| scripts, tests | `correctness/noProcessGlobal` | Build scripts need `process.exitCode` and argument handling. |
| scripts | `performance/noSyncScripts` | Build and packaging steps deliberately use synchronous filesystem operations for deterministic output. |
| tests | `performance/useDomNodeTextContent` | Browser tests inspect rendered text and nodes through Playwright handles. |
| tests | `performance/noAwaitInLoops` | Sequential fixture setup is intentional because each browser state depends on the previous step. |

## Inline suppressions

Inline suppressions are not accepted. If a new rule fires, fix the code or add a documented policy
entry here with a concrete technical reason. A blanket `// biome-ignore` or `// eslint-disable` is a
release blocker.
