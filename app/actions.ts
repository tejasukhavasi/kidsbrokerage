"use server";

import { AccountType, TransactionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { dollarsToCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getStockPrice } from "@/lib/stock";

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

  const amountCents = dollarsToCents(amountRaw);
  const occurredAt = new Date(occurredAtRaw);

  let shares: number | undefined;
  let pricePerShare: number | undefined;

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: { tickerEvents: { orderBy: { effectiveDate: "desc" }, take: 1 } }
  });

  if (account?.type === AccountType.MARKET) {
    const ticker = account.tickerEvents[0]?.ticker;
    if (!ticker) {
      throw new Error("Market account has no ticker set. Please set a ticker first.");
    }
    pricePerShare = await getStockPrice(ticker);
    shares = (amountCents / 100) / pricePerShare;
  }

  await prisma.transaction.create({
    data: {
      accountId,
      type: txType,
      amountCents,
      occurredAt,
      note,
      shares,
      pricePerShare
    }
  });

  revalidatePath("/");
  revalidatePath(`/accounts/${accountId}`);
};

export const transferFunds = async (formData: FormData): Promise<void> => {
  const fromAccountId = must(formData.get("fromAccountId"), "Source account");
  const toAccountId = must(formData.get("toAccountId"), "Destination account");
  const amountRaw = must(formData.get("amount"), "Amount");
  const occurredAtRaw = must(formData.get("occurredAt"), "Date");
  const note = formData.get("note")?.toString().trim() || undefined;

  if (fromAccountId === toAccountId) {
    throw new Error("Source and destination accounts must be different.");
  }

  const amountCents = dollarsToCents(amountRaw);
  const occurredAt = new Date(occurredAtRaw);
  const transferNote = note ? `Transfer: ${note}` : "Transfer";

  const [fromAccount, toAccount] = await Promise.all([
    prisma.account.findUnique({
      where: { id: fromAccountId },
      include: { tickerEvents: { orderBy: { effectiveDate: "desc" }, take: 1 } }
    }),
    prisma.account.findUnique({
      where: { id: toAccountId },
      include: { tickerEvents: { orderBy: { effectiveDate: "desc" }, take: 1 } }
    })
  ]);

  let fromShares: number | undefined;
  let fromPrice: number | undefined;
  let toShares: number | undefined;
  let toPrice: number | undefined;

  if (fromAccount?.type === AccountType.MARKET) {
    const ticker = fromAccount.tickerEvents[0]?.ticker;
    if (!ticker) throw new Error("Source market account has no ticker set.");
    fromPrice = await getStockPrice(ticker);
    fromShares = (amountCents / 100) / fromPrice;
  }

  if (toAccount?.type === AccountType.MARKET) {
    const ticker = toAccount.tickerEvents[0]?.ticker;
    if (!ticker) throw new Error("Destination market account has no ticker set.");
    toPrice = await getStockPrice(ticker);
    toShares = (amountCents / 100) / toPrice;
  }

  await prisma.$transaction([
    prisma.transaction.create({
      data: {
        accountId: fromAccountId,
        type: TransactionType.WITHDRAWAL,
        amountCents,
        occurredAt,
        note: transferNote,
        shares: fromShares,
        pricePerShare: fromPrice
      }
    }),
    prisma.transaction.create({
      data: {
        accountId: toAccountId,
        type: TransactionType.DEPOSIT,
        amountCents,
        occurredAt,
        note: transferNote,
        shares: toShares,
        pricePerShare: toPrice
      }
    })
  ]);

  revalidatePath("/");
  revalidatePath(`/accounts/${fromAccountId}`);
  revalidatePath(`/accounts/${toAccountId}`);
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
