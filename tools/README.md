# Packed AST tooling

These tarballs are the locked copies used by `npm test`, `npm run ast:gate` and
`npm run report:ast`. Installing them from the local files makes a clean checkout
verifiable without sibling repositories or registry authentication.

Regenerate after changing the private monorepo:

```bash
cd ../dwarpal-foundation
npm pack --workspace @kkhosla7/dwarpal-core --pack-destination ../plainview/tools
npm pack --workspace @kkhosla7/dwarpal-js --pack-destination ../plainview/tools

cd /home/user/Projects/plainview
npm install --save-dev ./tools/kkhosla7-dwarpal-core-<version>.tgz \
  ./tools/kkhosla7-dwarpal-js-<version>.tgz
npm test
```

The package-lock records the tarball integrity. Do not edit the tarballs by hand.

The same versions are also published privately to GitHub Packages. Other
consumers can install them with a token that has `read:packages`:

```ini
@kkhosla7:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Plainview deliberately uses the packed tarballs instead, so clean CI does not
need a registry token.
