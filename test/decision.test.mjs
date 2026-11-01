import assert from 'node:assert/strict';
import test from 'node:test';
import { makeBankKey, makeCatalogDigest, resolveDecision } from '../src/decision.mjs';

const digest = (letter) => letter.repeat(64);
const base = {
  modelDigest: digest('a'),
  tokenizerDigest: digest('b'),
  templateDigest: digest('c'),
  runtimeDigest: digest('d'),
  prefixTokenIds: [1, 42, 999],
};

test('choice resolves by ordered catalog only above threshold', () => {
  const catalogDigest = makeCatalogDigest(['low', 'high']);
  assert.deepEqual(resolveDecision({ kind: 'choice', index: 1, probability: 0.9, catalogDigest }, ['low', 'high']),
    { status: 'selected', value: 'high', probability: 0.9 });
  assert.deepEqual(resolveDecision({ kind: 'choice', index: 1, probability: 0.69, catalogDigest }, ['low', 'high']),
    { status: 'fallback', reason: 'low-confidence' });
});

test('catalog mismatch, invalid index and unknown decision fail closed', () => {
  const catalogDigest = makeCatalogDigest(['low']);
  assert.equal(resolveDecision({ kind: 'choice', index: 2, probability: 0.9, catalogDigest }, ['low']).reason, 'catalog-mismatch');
  assert.equal(resolveDecision({ kind: 'choice', index: -1, probability: 0.9, catalogDigest }, ['low']).reason, 'catalog-mismatch');
  assert.equal(resolveDecision({ kind: 'choice', index: 0.5, probability: 0.9, catalogDigest }, ['low']).reason, 'invalid-choice');
  assert.equal(resolveDecision({ kind: 'choice', index: 0, probability: Number.NaN, catalogDigest }, ['low']).reason, 'invalid-choice');
  assert.equal(resolveDecision({ kind: 'choice', index: 0, probability: 0.9, catalogDigest }, ['high']).reason, 'catalog-mismatch');
  assert.notEqual(makeCatalogDigest(['low', 'high']), makeCatalogDigest(['high', 'low']));
  assert.equal(resolveDecision({ kind: 'other' }, []).reason, 'unknown-kind');
  assert.equal(resolveDecision({ kind: 'abstain', reason: 'unsure' }, []).reason, 'abstained');
});

test('boolean and score use typed values', () => {
  assert.equal(resolveDecision({ kind: 'boolean', value: false, confidence: 0.8 }, []).value, false);
  assert.equal(resolveDecision({ kind: 'boolean', value: true, confidence: 0.2 }, []).status, 'fallback');
  assert.equal(resolveDecision({ kind: 'score', value: 3.5 }, []).value, 3.5);
  assert.equal(resolveDecision({ kind: 'score', value: Infinity }, []).status, 'fallback');
});

test('bank key binds exact receiver prefix and runtime versions', () => {
  const key = makeBankKey(base);
  assert.match(key, /^[a-f0-9]{64}$/);
  assert.equal(makeBankKey(base), key);
  assert.notEqual(makeBankKey({ ...base, prefixTokenIds: [1, 42, 998] }), key);
  assert.notEqual(makeBankKey({ ...base, runtimeDigest: digest('e') }), key);
  assert.throws(() => makeBankKey({ ...base, modelDigest: 'qwen' }), TypeError);
});
