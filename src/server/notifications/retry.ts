export function notificationRetryDelayMs(attemptCount: number) {
  return Math.min(60, 2 ** attemptCount) * 60_000;
}
