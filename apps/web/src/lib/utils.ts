import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Detects if the user is on a mobile device (iOS or Android)
 * @returns boolean indicating if the user is on a mobile device
 */
export function isMobileDevice(): boolean {
  // Check for mobile user agents
  const userAgent =
    navigator.userAgent || navigator.vendor || (window as any).opera;

  // iOS detection
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;

  // Android detection
  const isAndroid = /android/i.test(userAgent);

  // Windows Phone detection
  const isWindowsPhone = /windows phone/i.test(userAgent);

  return isIOS || isAndroid || isWindowsPhone;
}
