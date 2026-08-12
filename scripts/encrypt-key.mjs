#!/usr/bin/env node
// Encrypts a Groq API key with a password into src/auth/keyblob.json.
// Usage: node scripts/encrypt-key.mjs
import { webcrypto as crypto } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ITERATIONS = 600_000
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'auth', 'keyblob.json')

const b64 = (buf) => Buffer.from(buf).toString('base64')

const rl = createInterface({ input: process.stdin, output: process.stdout })
const apiKey = (await rl.question('Groq API key (gsk_...): ')).trim()
const password = (await rl.question('Password to protect it with: ')).trim()
rl.close()

if (!apiKey || !password) {
  console.error('Both values are required.')
  process.exit(1)
}

const salt = crypto.getRandomValues(new Uint8Array(16))
const iv = crypto.getRandomValues(new Uint8Array(12))

const material = await crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode(password),
  'PBKDF2',
  false,
  ['deriveKey'],
)
const key = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
  material,
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt'],
)
const ct = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv },
  key,
  new TextEncoder().encode(apiKey),
)

writeFileSync(
  OUT,
  JSON.stringify({ v: 1, iterations: ITERATIONS, salt: b64(salt), iv: b64(iv), ct: b64(ct) }, null, 2) + '\n',
)
console.log(`\nWrote ${OUT}\nCommit it — the key is unreadable without the password.`)
