import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lireMatricule, composerMatricule } from './matricule';

test('0 est le fondateur', () => {
  assert.deepEqual(lireMatricule('0'), { kind: 'fondateur', code: '0' });
});

test('1 à 9 sont les chefs de pôle', () => {
  for (let d = 1; d <= 9; d++) {
    assert.deepEqual(lireMatricule(String(d)), { kind: 'chef', code: String(d), division: d });
  }
});

test('les exemples du cahier des charges : 63 et 612', () => {
  assert.deepEqual(lireMatricule('63'), { kind: 'prestataire', code: '63', division: 6, rang: 3 });
  assert.deepEqual(lireMatricule('612'), { kind: 'prestataire', code: '612', division: 6, rang: 12 });
});

test('matricules mal formés', () => {
  for (const m of ['', '00', '06', '60', '601', '-1', '6a', '1.5', ' ']) {
    assert.equal(lireMatricule(m), null, `« ${m} » devrait être refusé`);
  }
});

test('composer puis relire donne le même prestataire', () => {
  assert.equal(composerMatricule(6, 3), '63');
  assert.equal(composerMatricule(6, 12), '612');
  assert.equal(composerMatricule(1, 100), '1100');
  const lu = lireMatricule(composerMatricule(9, 47));
  assert.deepEqual(lu, { kind: 'prestataire', code: '947', division: 9, rang: 47 });
  assert.throws(() => composerMatricule(6, 0));
  assert.throws(() => composerMatricule(0 as never, 1));
});
