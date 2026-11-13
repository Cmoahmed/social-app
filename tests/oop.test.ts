import { it, expect } from 'vitest';
import { DisplayLabel, PrivateLabel, profileObjects, replaceRenderer, formatNames, loadLabel, ProfileCard } from '../course-examples/oop.js';
it('demonstrates references, copies, callbacks and async functions', async () => {
  const objects = profileObjects();
  expect(objects.profile).toBe(objects.reference); expect(objects.copy).not.toBe(objects.profile);
  expect(formatNames(['alice'], name => name.toUpperCase())).toEqual(['ALICE']);
  expect(await loadLabel(async () => 'Alice')).toBe('User: Alice');
});
it('validates encapsulated state and demonstrates inheritance and property replacement', () => {
  const label = DisplayLabel.from(' Alice ');
  expect(label.label).toBe('Alice'); expect(() => { label.label = ''; }).toThrow(RangeError);
  const privateLabel = new PrivateLabel('Bob'); expect(privateLabel.render()).toBe('@Bob (private)');
  replaceRenderer(privateLabel); expect(privateLabel.render()).toBe('replacement');
  const profile = { username: 'alice' }; const card = new ProfileCard(profile);
  profile.username = 'bob'; expect(card.label()).toBe('@bob');
});
