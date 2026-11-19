/*
 * JSON tree sizing policy. Large documents render only the branch the reader
 * opens, with small per-container pages instead of one global node budget.
 */
const SmallSourceBytes = 100_000;
const MediumSourceBytes = 500_000;
const SmallPageSize = 200;
const MediumPageSize = 200;
const LargePageSize = 200;
const SmallOpenDepth = 8;
const MediumOpenDepth = 4;
const LargeOpenDepth = 2;
const AutoOpenChildLimit = 40;

function pageSize(sourceLength) {
  if (sourceLength > MediumSourceBytes) {
    return LargePageSize;
  }

  if (sourceLength > SmallSourceBytes) {
    return MediumPageSize;
  }

  return SmallPageSize;
}

function openDepth(sourceLength) {
  if (sourceLength > MediumSourceBytes) {
    return LargeOpenDepth;
  }

  if (sourceLength > SmallSourceBytes) {
    return MediumOpenDepth;
  }

  return SmallOpenDepth;
}

export const jsonLimits = { autoOpenChildLimit: AutoOpenChildLimit, openDepth, pageSize };
