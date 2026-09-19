// lodash `debounce` / `throttle` — the exact implementations bundled by the original
// site (used by the resize service and the header's hide-on-scroll).

type AnyFn = (...args: any[]) => any;

export type Debounced<F extends AnyFn> = ((...args: Parameters<F>) => ReturnType<F> | undefined) & {
  cancel: () => void;
  flush: () => ReturnType<F> | undefined;
};

export function debounce<F extends AnyFn>(
  func: F,
  wait = 0,
  options: { leading?: boolean; maxWait?: number; trailing?: boolean } = {},
): Debounced<F> {
  let lastArgs: any[] | undefined;
  let lastThis: any;
  let maxWait: number | undefined;
  let result: ReturnType<F> | undefined;
  let timerId: ReturnType<typeof setTimeout> | undefined;
  let lastCallTime: number | undefined;
  let lastInvokeTime = 0;
  const leading = !!options.leading;
  const maxing = 'maxWait' in options;
  const trailing = 'trailing' in options ? !!options.trailing : true;
  if (maxing) maxWait = Math.max(options.maxWait || 0, wait);

  function invokeFunc(time: number) {
    const args = lastArgs!;
    const thisArg = lastThis;
    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  }
  function leadingEdge(time: number) {
    lastInvokeTime = time;
    timerId = setTimeout(timerExpired, wait);
    return leading ? invokeFunc(time) : result;
  }
  function remainingWait(time: number) {
    const timeSinceLastCall = time - lastCallTime!;
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastCall;
    return maxing ? Math.min(timeWaiting, maxWait! - timeSinceLastInvoke) : timeWaiting;
  }
  function shouldInvoke(time: number) {
    const timeSinceLastCall = time - (lastCallTime as number);
    const timeSinceLastInvoke = time - lastInvokeTime;
    return (
      lastCallTime === undefined ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxing && timeSinceLastInvoke >= maxWait!)
    );
  }
  function timerExpired() {
    const time = Date.now();
    if (shouldInvoke(time)) return trailingEdge(time);
    timerId = setTimeout(timerExpired, remainingWait(time));
  }
  function trailingEdge(time: number) {
    timerId = undefined;
    if (trailing && lastArgs) return invokeFunc(time);
    lastArgs = lastThis = undefined;
    return result;
  }
  function cancel() {
    if (timerId !== undefined) clearTimeout(timerId);
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timerId = undefined;
  }
  function flush() {
    return timerId === undefined ? result : trailingEdge(Date.now());
  }
  function debounced(this: any, ...args: any[]) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);
    lastArgs = args;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    lastThis = this;
    lastCallTime = time;
    if (isInvoking) {
      if (timerId === undefined) return leadingEdge(lastCallTime);
      if (maxing) {
        timerId = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timerId === undefined) timerId = setTimeout(timerExpired, wait);
    return result;
  }
  debounced.cancel = cancel;
  debounced.flush = flush;
  return debounced as Debounced<F>;
}

export function throttle<F extends AnyFn>(
  func: F,
  wait = 0,
  options: { leading?: boolean; trailing?: boolean } = {},
): Debounced<F> {
  const leading = 'leading' in options ? !!options.leading : true;
  const trailing = 'trailing' in options ? !!options.trailing : true;
  return debounce(func, wait, { leading, maxWait: wait, trailing });
}
