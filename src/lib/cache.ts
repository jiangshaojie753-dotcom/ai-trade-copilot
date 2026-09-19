type Entry<T> = { value: T; expiresAt: number };

export class TtlCache<T> {
  private readonly entries = new Map<string, Entry<T>>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T) {
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  clear() {
    this.entries.clear();
  }
}

export function normalizeCachePart(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
