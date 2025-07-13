import fs from 'fs/promises';
import crypto from 'crypto';
import path from 'path';
import { mkdir } from './file-utils.mjs';

const CACHE_FILE = process.env.LLM_CACHE_FILE || path.join('.cache', 'llm-cache.json');
let cache = null;

async function loadCache() {
  if (cache) return cache;
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf8');
    cache = JSON.parse(data);
  } catch {
    cache = {};
  }
  return cache;
}

async function saveCache() {
  await mkdir(path.dirname(CACHE_FILE));
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
}

export function hashText(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export async function getCachedResult(key) {
  const c = await loadCache();
  return c[key];
}

export async function setCachedResult(key, value) {
  const c = await loadCache();
  c[key] = value;
  await saveCache();
}

export function _clearCache() {
  cache = null;
}
