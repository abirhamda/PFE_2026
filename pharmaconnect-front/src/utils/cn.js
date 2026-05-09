// Utility for conditional classname joining
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}