import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return `¥${price.toLocaleString("ja-JP")}`
}

export function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`
}
