const SMALL_SOURCE_BYTES = 100_000;
const MEDIUM_SOURCE_BYTES = 500_000;
const SMALL_PAGE_SIZE = 200;
const MEDIUM_PAGE_SIZE = 200;
const LARGE_PAGE_SIZE = 200;
const SMALL_OPEN_DEPTH = 8;
const MEDIUM_OPEN_DEPTH = 4;
const LARGE_OPEN_DEPTH = 2;
const AUTO_OPEN_CHILD_LIMIT = 40;

function pageSize(sourceLength) {
  if (sourceLength > MEDIUM_SOURCE_BYTES) {
    return LARGE_PAGE_SIZE;
  }

  if (sourceLength > SMALL_SOURCE_BYTES) {
    return MEDIUM_PAGE_SIZE;
  }

  return SMALL_PAGE_SIZE;
}

function openDepth(sourceLength) {
  if (sourceLength > MEDIUM_SOURCE_BYTES) {
    return LARGE_OPEN_DEPTH;
  }

  if (sourceLength > SMALL_SOURCE_BYTES) {
    return MEDIUM_OPEN_DEPTH;
  }

  return SMALL_OPEN_DEPTH;
}

export const jsonLimits = { autoOpenChildLimit: AUTO_OPEN_CHILD_LIMIT, openDepth, pageSize };
