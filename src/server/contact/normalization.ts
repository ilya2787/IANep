import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().email("Укажите корректный email").max(254, "Email слишком длинный");

export function normalizeEmail(value: string) {
  const result = emailSchema.safeParse(value.normalize("NFKC"));
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Укажите корректный email");
  return result.data;
}

export function normalizeRussianPhone(value: string) {
  const input = value.normalize("NFKC").trim();
  if (!/^[+\d\s()\-]+$/.test(input)) {
    throw new Error("Укажите российский телефон в формате +7 (999) 123-45-67");
  }
  const digits = input.replace(/\D/g, "");
  const canonical = digits.length === 11 && digits.startsWith("8")
    ? `+7${digits.slice(1)}`
    : digits.length === 11 && digits.startsWith("7")
      ? `+${digits}`
      : "";
  if (!canonical || !/^\+7[3489]\d{9}$/.test(canonical)) {
    throw new Error("Укажите корректный российский номер из 11 цифр, начинающийся с +7 или 8");
  }
  return canonical;
}

export function formatRussianPhone(value: string) {
  try {
    const canonical = normalizeRussianPhone(value);
    return `${canonical.slice(0, 2)} (${canonical.slice(2, 5)}) ${canonical.slice(5, 8)}-${canonical.slice(8, 10)}-${canonical.slice(10, 12)}`;
  } catch {
    return value;
  }
}

export function maskRussianPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("8")) digits = `7${digits.slice(1)}`;
  if (!digits.startsWith("7")) digits = `7${digits}`;
  digits = digits.slice(0, 11);
  const subscriber = digits.slice(1);
  let result = "+7";
  if (subscriber.length) result += ` (${subscriber.slice(0, 3)}`;
  if (subscriber.length >= 3) result += ")";
  if (subscriber.length > 3) result += ` ${subscriber.slice(3, 6)}`;
  if (subscriber.length > 6) result += `-${subscriber.slice(6, 8)}`;
  if (subscriber.length > 8) result += `-${subscriber.slice(8, 10)}`;
  return result;
}
