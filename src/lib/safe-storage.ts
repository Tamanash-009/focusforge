type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const memoryStorage = new Map<string, string>();

function createMemoryStorage(): StorageLike {
  return {
    getItem: (key) => memoryStorage.get(key) ?? null,
    setItem: (key, value) => {
      memoryStorage.set(key, value);
    },
    removeItem: (key) => {
      memoryStorage.delete(key);
    },
  };
}

export function getSafeStorage(): StorageLike {
  if (typeof window === "undefined") {
    return createMemoryStorage();
  }

  try {
    const testKey = "__focusforge_storage_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return createMemoryStorage();
  }
}

export function readJson<T>(key: string, fallback: T): T {
  try {
    const rawValue = getSafeStorage().getItem(key);
    if (!rawValue) {
      return fallback;
    }

    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

export function writeJson<T>(key: string, value: T): boolean {
  try {
    getSafeStorage().setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
