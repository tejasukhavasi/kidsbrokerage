import Link from "next/link";
import { AccountType, TransactionType } from "@prisma/client";
import { notFound } from "next/navigation";
import { centsToDollars } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getStockPrice } from "@/lib/stock";

export const dynamic = "force-dynamic";

const accountTypeLabel: Record<AccountType, string> = {
  CHECKING: "Checking",
  SAVINGS: "Savings",
  MARKET: "Market"
};

export default async function AccountDetailPage({
  params
}: {
  params: { id: string };
}) {
  const account = await prisma.account.findUnique({
    where: { id: params.id },
    include: {
      kid: true,
      transactions: {
        orderBy: { occurredAt: "desc" }
      },
      tickerEvents: {
        orderBy: { effectiveDate: "desc" }
      }
    }
  });

  if (!account) {
    notFound();
  }

  const balanceCents = account.transactions.reduce((total, tx) => {
    const direction = tx.type === TransactionType.DEPOSIT ? 1 : -1;
    return total + direction * tx.amountCents;
  }, 0);

  const isMarket = account.type === AccountType.MARKET;
  const currentTicker = account.tickerEvents[0]?.ticker;
  let currentPrice: number | null = null;
  let totalShares = 0;
  let costBasisCents = 0;

  if (isMarket && currentTicker) {
    try {
      currentPrice = await getStockPrice(currentTicker);
    } catch {
      currentPrice = null;
    }

    for (const tx of account.transactions) {
      const direction = tx.type === TransactionType.DEPOSIT ? 1 : -1;
      if (tx.shares) {
        totalShares += direction * tx.shares;
      }
      costBasisCents += direction * tx.amountCents;
    }
  }

  const marketValueCents = currentPrice ? Math.round(totalShares * currentPrice * 100) : null;
  const gainLossCents = marketValueCents !== null ? marketValueCents - costBasisCents : null;

  return (
    <main>
      <p>
        <Link href="/">← Back</Link>
      </p>
      <h1>{account.name}</h1>
      <p>
        {account.kid.name} · {accountTypeLabel[account.type]} · Balance {centsToDollars(balanceCents)}
      </p>

      {isMarket && currentTicker && (
        <section className="card" style={{ marginBottom: "1rem" }}>
          <h2>Market Summary — {currentTicker}</h2>
          {currentPrice !== null ? (
            <table>
              <tbody>
                <tr><td>Current Price</td><td>${currentPrice.toFixed(2)}</td></tr>
                <tr><td>Total Shares</td><td>{totalShares.toFixed(4)}</td></tr>
                <tr><td>Market Value</td><td>{centsToDollars(marketValueCents!)}</td></tr>
                <tr><td>Cost Basis</td><td>{centsToDollars(costBasisCents)}</td></tr>
                <tr>
                  <td>Gain/Loss</td>
                  <td style={{ color: gainLossCents! >= 0 ? "green" : "red" }}>
                    {centsToDollars(gainLossCents!)} ({costBasisCents !== 0 ? ((gainLossCents! / Math.abs(costBasisCents)) * 100).toFixed(2) : "0.00"}%)
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p>Unable to fetch current price for {currentTicker}.</p>
          )}
        </section>
      )}

      <section className="card" style={{ marginBottom: "1rem" }}>
        <h2>Transactions</h2>
        {account.transactions.length === 0 ? (
          <p>No transactions yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                {isMarket && <th>Shares</th>}
                {isMarket && <th>Price</th>}
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {account.transactions.map((tx) => {
                const signed = tx.type === TransactionType.DEPOSIT ? tx.amountCents : -tx.amountCents;

                return (
                  <tr key={tx.id}>
                    <td>{tx.occurredAt.toISOString().slice(0, 10)}</td>
                    <td>{tx.type === TransactionType.DEPOSIT ? "Deposit" : "Withdrawal"}</td>
                    <td>{centsToDollars(signed)}</td>
                    {isMarket && <td>{tx.shares?.toFixed(4) ?? "—"}</td>}
                    {isMarket && <td>{tx.pricePerShare ? `$${tx.pricePerShare.toFixed(2)}` : "—"}</td>}
                    <td>{tx.note || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {account.type === AccountType.MARKET && (
        <section className="card">
          <h2>Ticker history</h2>
          {account.tickerEvents.length === 0 ? (
            <p>No ticker history yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Effective date</th>
                  <th>Ticker</th>
                </tr>
              </thead>
              <tbody>
                {account.tickerEvents.map((event) => (
                  <tr key={event.id}>
                    <td>{event.effectiveDate.toISOString().slice(0, 10)}</td>
                    <td>{event.ticker}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </main>
  );
}
