import { UserSettings } from "./api";

export function formatDate(value: string, format: UserSettings["dateFormat"]): string {
  const date = toLocalDate(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());

  if (format === "MM/DD/YYYY") {
    return `${month}/${day}/${year}`;
  }

  if (format === "YYYY-MM-DD") {
    return `${year}-${month}-${day}`;
  }

  return `${day}.${month}.${year}`;
}

export function formatShortDate(value: string): string {
  const date = toLocalDate(value);
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(date);
}

export function toLocalDate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00`);
}

export function toLocalIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
