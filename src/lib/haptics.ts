/**
 * Feedback tátil via Vibration API.
 * Desktop ignora silenciosamente.
 */
const vibrate = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* noop */
  }
};

export const haptics = {
  light: () => vibrate(10),
  medium: () => vibrate(20),
  heavy: () => vibrate(40),
  success: () => vibrate([10, 50, 10]),
  warning: () => vibrate([20, 100, 20]),
  error: () => vibrate([40, 80, 40, 80, 40]),
};
