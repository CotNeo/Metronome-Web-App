// Throttle a function using requestAnimationFrame.
// Useful for rendering-heavy updates without flooding the main thread.
export function rafThrottle(fn) {
  let scheduled = false;
  let lastArgs = null;

  return function throttled(...args) {
    lastArgs = args;
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      fn(...(lastArgs || []));
    });
  };
}

