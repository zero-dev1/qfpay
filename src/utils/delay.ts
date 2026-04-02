/**
 * Simple promise-based delay utility with AbortSignal support
 * @param ms - Milliseconds to delay
 * @param signal - Optional AbortSignal to cancel the delay
 * @returns Promise that resolves after the specified delay
 */
export function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      }, { once: true });
    }
  });
}
