import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
  }).format(amount).replace('BDT', '৳');
}

export function getMonthString(date: Date) {
  return date.toISOString().slice(0, 7); // YYYY-MM
}

export function getDateString(date: Date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}
