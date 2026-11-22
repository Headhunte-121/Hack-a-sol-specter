// kvGet / kvSet: small settings storage (language, quiz progress, score). Namespaced; never throws.
const NS = 'gt02:'

export function kvGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(NS + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback // quota, private mode or corrupt JSON: use the default
  }
}

export function kvSet(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function kvKeys(): string[] {
  try {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(NS))
      .map((k) => k.slice(NS.length))
  } catch {
    return []
  }
}

export function kvClearAll(): void {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(NS)) localStorage.removeItem(k)
  } catch {
    /* ignore */
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}
