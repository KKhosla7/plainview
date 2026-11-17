# Verification and bypass limits

## Local gates

- `npm run lint` — Biome must report no diagnostics.
- `npm test` — builds both extensions, runs the browser suite, then runs the AST ratchet.
- `npm run ast:gate` — fails when AST diagnostics exceed `ast-ratchet.json`.
- `npm run report:ast` — prints the full AST report for the next cleanup batch.

## Ratchet policy

`ast-ratchet.json` records the highest accepted AST diagnostic count. A change
must not increase it. When a cleanup batch reduces the count, lower the ratchet
in the same commit so the improvement is locked in.

The ratchet is not a rule exception. It prevents regression while the remaining
architecture debt is removed.

When the count reaches zero, delete `ast-ratchet.json`, remove `ast:gate` from
`npm test`, and use `npm run ast:check` directly. A zero-diagnostic project must
have a hard gate, not a ratchet. The gate script refuses a zero baseline so this
transition cannot be skipped accidentally.

## What local checks cannot enforce

A local agent with write access can edit the checker, delete the gate or change
`package.json`. No local script can make bypass impossible.

The enforceable outer boundary must be:

- no in-repo ignore mechanism
- no rule-disable configuration
- no suppression comments
- no named-constant remote-URL exemption
- packed checker and rule-pack tarballs
- integrity verification before every scan
- lockfile-pinned installs
- CI from a clean checkout
- protected default branch

## Packed tooling

`dwarpal-core` and `dwarpal-js` live in the private `dwarpal-foundation`
monorepo. Plainview installs packed tarballs from `tools/` as local dev
dependencies, so a clean checkout does not need sibling repositories or a
package-registry token.

`package-lock.json` pins the tarball integrity. Regeneration instructions live in
`tools/README.md`.
