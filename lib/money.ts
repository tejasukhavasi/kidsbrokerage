export const dollarsToCents = (input: string): number => {
  const parsed = Number(input);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error("Please enter a valid amount greater than 0.");
  }
  return Math.round(parsed * 100);
};

export const centsToDollars = (amountCents: number): string =>
  (amountCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD"
  });
