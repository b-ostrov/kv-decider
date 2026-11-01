import { makeBankKey, makeCatalogDigest, resolveDecision } from '../src/decision.mjs';

const reasoningModes = ['brief', 'standard', 'deep'];
const decision = {
  kind: 'choice',
  index: 2,
  probability: 0.91,
  catalogDigest: makeCatalogDigest(reasoningModes),
};

const resolved = resolveDecision(decision, reasoningModes);
if (resolved.status !== 'selected') {
  console.log('Use the ordinary receiver path:', resolved.reason);
  process.exit(0);
}

// A real adapter obtains these from the receiver runtime after rendering its exact static prefix.
const exampleDigest = (hexDigit) => hexDigit.repeat(64);
const bankKey = makeBankKey({
  modelDigest: exampleDigest('a'),
  tokenizerDigest: exampleDigest('b'),
  templateDigest: exampleDigest('c'),
  runtimeDigest: exampleDigest('d'),
  prefixTokenIds: [101, 205, 309],
});

console.log({ plan: { reasoningMode: resolved.value }, bankKey });
console.log('The receiver may restore this key only after verifying an exact native KV entry.');
