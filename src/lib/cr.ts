/**
 * Generates a random string or number of specified length.
 *
 * @template T - The return type, either "string" or "number"
 * @param {number} n - The number of digits to generate
 * @param {T} r - The return type, either "string" or "number"
 * @returns {T extends "string" ? string : number} A random digit sequence as string or number
 *
 * @example
 * // Returns a string of 6 random digits
 * const strDigits = generateRandomDigits(6, "string"); // "583924"
 *
 * @example
 * // Returns a number of 4 random digits
 * const numDigits = generateRandomDigits(4, "number"); // 7591
 */
export function generateRandomDigits<T extends "string" | "number">(
  n: number,
  r: T = "string" as T,
): T extends "string" ? string : number {
  let result: string | number = r === "string" ? "" : 0;
  for (let i = 0; i < n; i++) {
    const digit = Math.floor(Math.random() * 10);
    if (r === "string") {
      result = String(result) + digit;
    } else {
      result = Number(result) * 10 + digit;
    }
  }
  return result as T extends "string" ? string : number;
}

export function generateRandomAlphanumeric(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateRandomHex(length: number): string {
  const chars = "0123456789ABCDEF";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateSecureToken(length: number = 32): string {
  return generateRandomAlphanumeric(length);
}
