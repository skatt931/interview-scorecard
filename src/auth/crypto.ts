export type KeyBlob = {
  v: 1
  iterations: number
  salt: string
  iv: string
  ct: string
}

const b64decode = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function deriveKey(password: string, salt: Uint8Array, iterations: number) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  )
}

/** Returns the decrypted secret, or null when the password is wrong. */
export async function unlock(blob: KeyBlob, password: string): Promise<string | null> {
  const key = await deriveKey(password, b64decode(blob.salt), blob.iterations)
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b64decode(blob.iv) as BufferSource },
      key,
      b64decode(blob.ct) as BufferSource,
    )
    return new TextDecoder().decode(plain)
  } catch {
    return null
  }
}
