/* global Plainview */
/*
 * JSON tree sizing policy. Kept separate from rendering so the limits can be
 * changed without touching the DOM builder.
 */
((root) => {
  const InitialNodeLimit = 8000;
  const NodeChunk = 8000;
  const MaxNodeLimit = 120_000;
  const LargeSourceBytes = 2_000_000;
  const MediumSourceBytes = 500_000;
  const LargeNodeLimit = 500;
  const MediumNodeLimit = 3000;
  const LargeNodeChunk = 2000;
  const MediumNodeChunk = 4000;

  function firstNodeLimit(sourceLength) {
    if (sourceLength > LargeSourceBytes) {
      return LargeNodeLimit;
    }

    if (sourceLength > MediumSourceBytes) {
      return MediumNodeLimit;
    }

    return InitialNodeLimit;
  }

  function nodeChunk(sourceLength) {
    if (sourceLength > LargeSourceBytes) {
      return LargeNodeChunk;
    }

    if (sourceLength > MediumSourceBytes) {
      return MediumNodeChunk;
    }

    return NodeChunk;
  }

  root.Plainview = Object.assign(root.Plainview || {}, {
    jsonLimits: { MaxNodeLimit, firstNodeLimit, nodeChunk },
  });
})(globalThis);
