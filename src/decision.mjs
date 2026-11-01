import { createHash } from 'node:crypto';

const isProbability = (value) => Number.isFinite(value) && value >= 0 && value <= 1;

/** Bind choice indices to immutable, ordered option IDs. */
export function makeCatalogDigest(catalog) {
  if (!Array.isArray(catalog) || !catalog.every((option) => typeof option === 'string' && option.length > 0)) {
    throw new TypeError('catalog must be an array of non-empty option IDs');
  }
  const hash = createHash('sha256');
  const count = Buffer.allocUnsafe(4);
  count.writeUInt32LE(catalog.length);
  hash.update(count);
  for (const option of catalog) {
    const bytes = Buffer.from(option, 'utf8');
    const length = Buffer.allocUnsafe(4);
    length.writeUInt32LE(bytes.length);
    hash.update(length);
    hash.update(bytes);
  }
  return hash.digest('hex');
}

/** Resolve a decider result against the exact ordered catalog used for inference. */
export function resolveDecision(decision, catalog, { minConfidence = 0.7 } = {}) {
  if (!decision || !Array.isArray(catalog) || !isProbability(minConfidence)) {
    throw new TypeError('A decision, ordered catalog, and valid confidence threshold are required');
  }

  if (decision.kind === 'choice') {
    if (!Number.isInteger(decision.index) || !isProbability(decision.probability)) {
      return { status: 'fallback', reason: 'invalid-choice' };
    }
    if (decision.catalogDigest !== makeCatalogDigest(catalog)) {
      return { status: 'fallback', reason: 'catalog-mismatch' };
    }
    if (decision.probability < minConfidence) {
      return { status: 'fallback', reason: 'low-confidence' };
    }
    if (decision.index < 0 || decision.index >= catalog.length) {
      return { status: 'fallback', reason: 'catalog-mismatch' };
    }
    return { status: 'selected', value: catalog[decision.index], probability: decision.probability };
  }

  if (decision.kind === 'boolean') {
    if (typeof decision.value !== 'boolean' || !isProbability(decision.confidence)) {
      return { status: 'fallback', reason: 'invalid-boolean' };
    }
    if (decision.confidence < minConfidence) {
      return { status: 'fallback', reason: 'low-confidence' };
    }
    return { status: 'selected', value: decision.value, probability: decision.confidence };
  }

  if (decision.kind === 'score') {
    if (!Number.isFinite(decision.value)) {
      return { status: 'fallback', reason: 'invalid-score' };
    }
    return { status: 'selected', value: decision.value };
  }

  if (decision.kind === 'abstain') {
    return { status: 'fallback', reason: 'abstained' };
  }

  return { status: 'fallback', reason: 'unknown-kind' };
}

/** Hash the exact receiver token prefix and all compatibility versions, never a label alone. */
export function makeBankKey({ modelDigest, tokenizerDigest, templateDigest, runtimeDigest, prefixTokenIds }) {
  const versions = [modelDigest, tokenizerDigest, templateDigest, runtimeDigest];
  if (versions.some((value) => typeof value !== 'string' || !/^[a-f0-9]{64}$/i.test(value))) {
    throw new TypeError('Every compatibility digest must be a 64-character SHA-256 hex string');
  }
  if (!Array.isArray(prefixTokenIds) || !prefixTokenIds.every((id) => Number.isSafeInteger(id) && id >= 0)) {
    throw new TypeError('prefixTokenIds must be an array of non-negative token IDs');
  }

  const hash = createHash('sha256');
  for (const digest of versions) hash.update(digest.toLowerCase());
  const length = Buffer.allocUnsafe(4);
  length.writeUInt32LE(prefixTokenIds.length);
  hash.update(length);
  for (const id of prefixTokenIds) {
    const token = Buffer.allocUnsafe(8);
    token.writeBigUInt64LE(BigInt(id));
    hash.update(token);
  }
  return hash.digest('hex');
}
