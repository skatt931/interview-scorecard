import { createContext, use, useState, type FormEvent, type ReactNode } from 'react'
import blob from './keyblob.json'
import { unlock, type KeyBlob } from './crypto'
import { Backdrop } from '../components/Backdrop'
import { Button } from '../components/ui'

const STORAGE_KEY = 'groq-key'

const ApiKeyContext = createContext<string>('')

export const useApiKey = () => use(ApiKeyContext)

export function AuthGate({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem(STORAGE_KEY) ?? '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const key = await unlock(blob as KeyBlob, password)
    setBusy(false)
    if (!key) {
      setError('Incorrect password')
      setPassword('')
      return
    }
    sessionStorage.setItem(STORAGE_KEY, key)
    setApiKey(key)
  }

  if (apiKey) return <ApiKeyContext value={apiKey}>{children}</ApiKeyContext>

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <Backdrop />
      <form
        onSubmit={submit}
        className="animate-rise w-full max-w-[20rem] space-y-4 rounded-3xl bg-white p-8 shadow-card"
      >
        <h1 className="text-center text-base font-extrabold tracking-tight text-brand">
          Interview Scorecard
        </h1>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-xl border border-stone-200 bg-stone-100/70 px-3 py-2.5 text-center text-sm tracking-[0.3em] outline-none transition duration-200 placeholder:tracking-normal placeholder:text-stone-400 focus:border-accent focus:bg-white focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-accent)_14%,transparent)]"
        />
        <Button type="submit" disabled={busy || !password} className="w-full">
          {busy ? 'Unlocking…' : 'Unlock'}
        </Button>
        <p className="h-4 text-center text-xs font-medium text-bad">{error}</p>
      </form>
    </div>
  )
}
