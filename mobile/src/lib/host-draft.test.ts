/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { emptyDraft, isQuickSelected, quickToggle, validateStep, type Draft } from './host-draft.ts';

const t = ((key: string) => key) as unknown as Parameters<typeof validateStep>[2];
const tap = (d: Draft, ...values: string[]): Draft => values.reduce((acc, v) => ({ ...acc, ...quickToggle(acc, v) }), d);

describe('quick "what is in it"', () => {
  it('stores allergens and diets in the same fields the safety step shows', () => {
    const d = tap(emptyDraft('€'), 'Dairy', 'Gluten-Free');
    assert.deepEqual(d.allergens, ['Dairy']);
    assert.deepEqual(d.dietary, ['Gluten-Free']);
    assert.equal(d.isSafetyChecked, false);
  });

  it('vegan also means vegetarian and drops dairy, eggs, meat and fish', () => {
    const d = tap(emptyDraft('€'), 'Meat', 'Fish', 'Dairy', 'Eggs', 'Vegan');
    assert.deepEqual(d.allergens, []);
    assert.equal(d.hasMeat, false);
    assert.deepEqual(d.dietary.sort(), ['Vegan', 'Vegetarian']);
  });

  it('meat rules out vegetarian and vegan, and is never an allergen', () => {
    const d = tap(emptyDraft('€'), 'Vegan', 'Meat');
    assert.equal(d.hasMeat, true);
    assert.deepEqual(d.dietary, []);
    assert.deepEqual(d.allergens, []);
    assert.equal(isQuickSelected(d, 'Meat'), true);
  });

  it('tapping again untoggles; unticking vegetarian unticks vegan', () => {
    const d = tap(emptyDraft('€'), 'Gluten', 'Gluten', 'Vegan', 'Vegetarian');
    assert.deepEqual(d.allergens, []);
    assert.deepEqual(d.dietary, []);
  });

  it('a later answer clears "not sure"', () => {
    const d = tap({ ...emptyDraft('€'), isContentsUnsure: true }, 'Keto');
    assert.equal(d.isContentsUnsure, false);
    assert.deepEqual(d.dietary, ['Keto']);
  });
});

describe('dining photo', () => {
  const table = { ...emptyDraft('€'), listingType: 'table' as const };
  const opts = { minUnits: 0, isTimeChecked: false };

  it('is required on a new table listing only', () => {
    assert.ok(validateStep('when', table, t, { ...opts, isDiningPhotoRequired: true }).diningPhoto);
    assert.equal(validateStep('when', table, t, opts).diningPhoto, undefined);
    assert.equal(validateStep('when', { ...table, listingType: 'market' }, t, { ...opts, isDiningPhotoRequired: true }).diningPhoto, undefined);
  });

  it('must have finished uploading', () => {
    const uploading = { ...table, diningPhoto: { id: 'a', localUri: 'x', base64: 'b', url: null, status: 'uploading' as const } };
    assert.ok(validateStep('when', uploading, t, { ...opts, isDiningPhotoRequired: true }).diningPhoto);
  });
});
