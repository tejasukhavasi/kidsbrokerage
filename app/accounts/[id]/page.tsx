import Link from "next/link";
import { AccountType, TransactionType } from "@prisma/client";
import { notFound } from "next/navigation";
import { centsToDollars } from "@/lib/money";
import { prisma } from "@/lib/prisma";

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

  return (
    <main>
      <p>
        <Link href="/">← Back</Link>
      </p>
      <h1>{account.name}</h1>
      <p>
        {account.kid.name} · {accountTypeLabel[account.type]} · Balance {centsToDollars(balanceCents)}
      </p>

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
