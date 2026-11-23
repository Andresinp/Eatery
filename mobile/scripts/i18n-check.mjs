#!/usr/bin/env node
// Fails (exit 1) when:
//  - code calls t('some.key') and English has no such key (a raw key on someone's screen);
//    plural calls are satisfied by key_one / key_other;
//  - another language is missing a key English has, or has one English does not;
//  - any copy names a platform or a store (App Store guideline 2.3.10).
// Also regenerates nothing: src/i18n/resources.ts is written by scripts/i18n-resources.mjs.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const localesDir = join(root, 'src/i18n/locales');

function loadLang(lang) {
  const dir = join(localesDir, lang);
  const out = {};
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
    const data = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    for (const [k, v] of Object.entries(data)) {
      if (k in out) throw new Error(`${lang}: key ${k} defined twice (${f})`);
      out[k] = v;
    }
  }
  return out;
}

const en = loadLang('en');
const keys = new Set(Object.keys(en));
const problems = [];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(tsx?|jsx?)$/.test(name)) yield p;
  }
}

for (const file of files(join(root, 'src'))) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/\bt\(\s*['"]([a-zA-Z][\w.]*)['"]/g)) {
    const key = m[1];
    if (keys.has(key) || keys.has(`${key}_one`) || keys.has(`${key}_other`)) continue;
    problems.push(`missing en key: ${file.replace(root, '')}: ${key}`);
  }
}

const langs = readdirSync(localesDir).filter((n) => existsSync(join(localesDir, n)) && statSync(join(localesDir, n)).isDirectory());
for (const lang of langs) {
  const dict = lang === 'en' ? en : loadLang(lang);
  if (lang !== 'en') {
    // Plural keys: English has base_one/base_other; other languages carry the forms their grammar
    // needs (CLDR: zero, one, two, few, many, other) and must at least have base_other.
    const PLURAL = /_(zero|one|two|few|many|other)$/;
    const pluralBases = new Set([...keys].filter((k) => PLURAL.test(k)).map((k) => k.replace(PLURAL, '')));
    for (const k of keys) {
      if (PLURAL.test(k)) continue;
      if (!(k in dict)) problems.push(`${lang}: missing ${k}`);
    }
    for (const base of pluralBases) if (!(`${base}_other` in dict)) problems.push(`${lang}: missing ${base}_other`);
    for (const k of Object.keys(dict)) {
      const isPluralForm = PLURAL.test(k) && pluralBases.has(k.replace(PLURAL, ''));
      if (!keys.has(k) && !isPluralForm) problems.push(`${lang}: extra key ${k}`);
    }
    // Every {{placeholder}} in English must survive translation.
    for (const [k, v] of Object.entries(dict)) {
      const enValue = en[k] ?? en[k.replace(PLURAL, '_other')];
      if (typeof enValue !== 'string') continue;
      for (const ph of enValue.match(/{{\s*\w+\s*}}/g) ?? []) {
        if (!String(v).includes(ph.replace(/\s/g, '')) && !String(v).includes(ph)) problems.push(`${lang}: ${k} lost ${ph}`);
      }
    }
  }
  for (const [k, v] of Object.entries(dict)) {
    if (/\b(android|iphone|ios|app store|google play|play store|apple store)\b/i.test(String(v))) problems.push(`${lang}: platform named in ${k}`);
  }
}

if (problems.length) {
  console.error(problems.slice(0, 80).join('\n'));
  if (problems.length > 80) console.error(`… and ${problems.length - 80} more`);
  process.exit(1);
}
console.log(`i18n ok: ${keys.size} keys, ${langs.length} languages, every literal t() key exists, no platform names`);
