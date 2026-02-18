import Link from "next/link";
import { AccountType, TransactionType } from "@prisma/client";
import { addTransaction, createAccount, createKid, setMarketTicker } from "@/app/actions";
import { centsToDollars } from "@/lib/money";
import { prisma } from "@/lib/prisma";

const accountTypeLabel: Record<AccountType, string> = {
  CHECKING: "Checking",
  SAVINGS: "Savings",
  MARKET: "Market"
};

const transactionTypeLabel: Record<TransactionType, string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal"
};

export default async function HomePage() {
  const kids = await prisma.kid.findMany({
    orderBy: { name: "asc" },
    include: {
      accounts: {
        include: {
          transactions: true,
          tickerEvents: {
            orderBy: { effectiveDate: "desc" },
            take: 1
          }
        }
      }
    }
  });

  const allAccounts = kids.flatMap((kid) => kid.accounts.map((account) => ({ ...account, kidName: kid.name })));

  return (
    <main>
      <h1>Kid Brokerage</h1>
      <p>Track separate kid accounts, backdated deposits/withdrawals, and market ticker changes.</p>

      <section className="grid" style={{ marginBottom: "1rem" }}>
        <div className="card">
          <h2>Add Kid</h2>
          <form action={createKid}>
            <label>
              Kid name
              <input name="name" placeholder="Avery" required />
            </label>
            <button type="submit">Create kid</button>
          </form>
        </div>

        <div className="card">
          <h2>Add Account</h2>
          <form action={createAccount}>
            <label>
              Kid
              <select name="kidId" required>
                <option value="">Select a kid</option>
                {kids.map((kid) => (
                  <option key={kid.id} value={kid.id}>
                    {kid.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Account name
              <input name="name" placeholder="Allowance Savings" required />
            </label>
            <label>
              Type
              <select name="type" required>
                {Object.values(AccountType).map((type) => (
                  <option key={type} value={type}>
                    {accountTypeLabel[type]}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit">Create account</button>
          </form>
        </div>

        <div className="card">
          <h2>Add Deposit / Withdrawal</h2>
          <form action={addTransaction}>
            <label>
              Account
              <select name="accountId" required>
                <option value="">Select account</option>
                {allAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.kidName} - {account.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Type
              <select name="type" required>
                {Object.values(TransactionType).map((type) => (
                  <option key={type} value={type}>
                    {transactionTypeLabel[type]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Amount (USD)
              <input name="amount" type="number" min="0.01" step="0.01" required />
            </label>
            <label>
              Date (supports backdating)
              <input name="occurredAt" type="date" required />
            </label>
            <label>
              Note (optional)
              <input name="note" placeholder="Birthday gift" />
            </label>
            <button type="submit">Save transaction</button>
          </form>
        </div>
      </section>

      <section className="card" style={{ marginBottom: "1rem" }}>
        <h2>Update Market Ticker</h2>
        <form action={setMarketTicker} className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <label>
            Market account
            <select name="accountId" required>
              <option value="">Select market account</option>
              {allAccounts
                .filter((account) => account.type === AccountType.MARKET)
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.kidName} - {account.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Ticker
            <input name="ticker" placeholder="VOO" maxLength={10} required />
          </label>
          <label>
            Effective date
            <input name="effectiveDate" type="date" required />
          </label>
          <button type="submit">Save ticker event</button>
        </form>
      </section>

      <section className="card">
        <h2>Kids and Accounts</h2>
        {kids.length === 0 ? (
          <p>No kids yet. Create your first kid and account above.</p>
        ) : (
          kids.map((kid) => (
            <div key={kid.id} style={{ marginBottom: "1rem" }}>
              <h3>{kid.name}</h3>
              {kid.accounts.length === 0 ? (
                <p>No accounts yet.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Type</th>
                      <th>Current Ticker</th>
                      <th>Balance</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kid.accounts.map((account) => {
                      const balanceCents = account.transactions.reduce((total, tx) => {
                        const direction = tx.type === TransactionType.DEPOSIT ? 1 : -1;
                        return total + direction * tx.amountCents;
                      }, 0);

                      return (
                        <tr key={account.id}>
                          <td>{account.name}</td>
                          <td>
                            <span className="badge">{accountTypeLabel[account.type]}</span>
                          </td>
                          <td>
                            {account.type === AccountType.MARKET
                              ? account.tickerEvents[0]?.ticker ?? "—"
                              : "N/A"}
                          </td>
                          <td>{centsToDollars(balanceCents)}</td>
                          <td>
                            <Link href={`/accounts/${account.id}`}>Open</Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          ))
        )}
      </section>
    </main>
  );
}
