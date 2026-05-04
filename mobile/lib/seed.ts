import { Subscription } from "./types";

export const seedSubscriptions: Subscription[] = [
  {
    id: "spotify",
    name: "Spotify",
    amount: 149,
    currency: "CZK",
    billingPeriod: "monthly",
    renewalDate: "2026-05-09",
    category: "entertainment",
    iconSlug: "spotify",
    color: "#1DB954",
    isActive: true,
    createdAt: "2026-04-20T10:00:00.000Z"
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    amount: 499,
    currency: "CZK",
    billingPeriod: "monthly",
    renewalDate: "2026-05-04",
    category: "work",
    iconSlug: "chatgpt",
    color: "#111827",
    isActive: true,
    createdAt: "2026-04-18T10:00:00.000Z"
  },
  {
    id: "icloud",
    name: "iCloud+",
    amount: 79,
    currency: "CZK",
    billingPeriod: "monthly",
    renewalDate: "2026-05-14",
    category: "cloud",
    iconSlug: "icloud",
    color: "#2563EB",
    isActive: true,
    createdAt: "2026-04-10T10:00:00.000Z"
  },
  {
    id: "adobe",
    name: "Adobe Creative Cloud",
    amount: 2388,
    currency: "CZK",
    billingPeriod: "yearly",
    renewalDate: "2026-09-01",
    category: "work",
    iconSlug: "adobe",
    color: "#DC2626",
    isActive: true,
    createdAt: "2026-03-02T10:00:00.000Z"
  }
];

