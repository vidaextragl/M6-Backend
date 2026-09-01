const DEFAULT_TIMEOUT_MS = 5000;

// fetch() de Node no tiene timeout por defecto: si un proveedor cuelga en vez de fallar, el
// request queda esperando indefinido y la cascada nunca prueba el siguiente. Un proveedor lento
// debe tratarse igual que uno caído.
export async function fetchWithTimeout(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
