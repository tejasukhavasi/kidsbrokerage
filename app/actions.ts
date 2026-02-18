"use server";

import { AccountType, TransactionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { dollarsToCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";

const must = (value: FormDataEntryValue | null, label: string): string => {
  const text = value?.toString().trim();
  if (!text) {
    throw new Error(`${label} is required.`);
  }
  return text;
};

export const createKid = async (formData: FormData): Promise<void> => {
  const name = must(formData.get("name"), "Kid name");
  await prisma.kid.create({ data: { name } });
  revalidatePath("/");
};

export const createAccount = async (formData: FormData): Promise<void> => {
  const kidId = must(formData.get("kidId"), "Kid");
  const name = must(formData.get("name"), "Account name");
  const typeValue = must(formData.get("type"), "Account type");
  const type = AccountType[typeValue as keyof typeof AccountType];

  if (!type) {
    throw new Error("Invalid account type.");
  }

  await prisma.account.create({
    data: {
      kidId,
      name,
      type
    }
  });

  revalidatePath("/");
};

export const addTransaction = async (formData: FormData): Promise<void> => {
  const accountId = must(formData.get("accountId"), "Account");
  const typeValue = must(formData.get("type"), "Transaction type");
  const amountRaw = must(formData.get("amount"), "Amount");
  const occurredAtRaw = must(formData.get("occurredAt"), "Date");
  const note = formData.get("note")?.toString().trim() || undefined;

  const txType = TransactionType[typeValue as keyof typeof TransactionType];
  if (!txType) {
    throw new Error("Invalid transaction type.");
  }

  await prisma.transaction.create({
    data: {
      accountId,
      type: txType,
      amountCents: dollarsToCents(amountRaw),
      occurredAt: new Date(occurredAtRaw),
      note
    }
  });

  revalidatePath("/");
  revalidatePath(`/accounts/${accountId}`);
};

export const setMarketTicker = async (formData: FormData): Promise<void> => {
  const accountId = must(formData.get("accountId"), "Account");
  const ticker = must(formData.get("ticker"), "Ticker").toUpperCase();
  const effectiveDateRaw = must(formData.get("effectiveDate"), "Effective date");

  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account || account.type !== AccountType.MARKET) {
    throw new Error("Ticker updates are only allowed for Market accounts.");
  }

  await prisma.marketTickerEvent.create({
    data: {
      accountId,
      ticker,
      effectiveDate: new Date(effectiveDateRaw)
    }
  });

  revalidatePath("/");
  revalidatePath(`/accounts/${accountId}`);
};
