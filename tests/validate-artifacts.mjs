import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { Script } from 'node:vm';
const collection = JSON.parse(readFileSync('postman/SocialApp_Assignment.postman_collection.json', 'utf8'));
const environment = JSON.parse(readFileSync('postman/SocialApp_Local.postman_environment.json', 'utf8'));
assert.equal(collection.info.schema, 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json');
assert.equal(collection.item.length, 1);
assert.equal(collection.item[0].name, 'Social App - New Assignment');
assert.equal(collection.item[0].item.length, 8);
const known = new Set(environment.values.map(v => v.key));
let requests = 0;
const walk = items => items.forEach(item => {
  if (item.item) return walk(item.item);
  requests++;
  assert.ok(item.request.method && item.request.url.startsWith('{{baseUrl}}/api/'));
  if (item.request.body) JSON.parse(item.request.body.raw);
  for (const match of JSON.stringify(item.request).matchAll(/\{\{(\w+)\}\}/g)) assert.ok(known.has(match[1]), `Missing variable ${match[1]}`);
  item.event.forEach(event => new Script(event.script.exec.join('\n')));
});
walk(collection.item);
for (const value of environment.values) if (value.key !== 'baseUrl') assert.equal(value.value, '', `Committed secret or identity: ${value.key}`);
const files = root => readdirSync(root, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(`${root}/${entry.name}`) : [`${root}/${entry.name}`]);
const source = [...files('src'), ...files('course-examples')].map(file => readFileSync(file, 'utf8')).join('\n');
const map = readFileSync('docs/QUESTION_MAP.md', 'utf8');
for (let q = 1; q <= 43; q++) {
  assert.match(source, new RegExp(`// Question ${q}:`));
  assert.ok(map.includes(`| ${q} |`));
}
console.log(`Validated ${requests} Postman requests, 8 folders, empty environment secrets, scripts, and all 43 question references.`);
