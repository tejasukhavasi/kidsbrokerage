import Link from "next/link";
import { AccountType, TransactionType } from "@prisma/client";
import { addTransaction, createAccount, createKid, setMarketTicker, transferFunds } from "@/app/actions";
import { centsToDollars } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

      {allAccounts.length >= 2 && (
        <section className="card" style={{ marginBottom: "1rem" }}>
          <h2>Transfer Between Accounts</h2>
          <form action={transferFunds} className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <label>
              From account
              <select name="fromAccountId" required>
                <option value="">Select source</option>
                {allAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.kidName} - {account.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              To account
              <select name="toAccountId" required>
                <option value="">Select destination</option>
                {allAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.kidName} - {account.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Amount (USD)
              <input name="amount" type="number" min="0.01" step="0.01" required />
            </label>
            <label>
              Date
              <input name="occurredAt" type="date" required />
            </label>
            <label>
              Note (optional)
              <input name="note" placeholder="Moving to market" />
            </label>
            <button type="submit">Transfer</button>
          </form>
        </section>
      )}

      <section className="card" style={{ marginBottom: "1rem" }}>
        <h2>Update Market Ticker</h2>
        <p style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: 0 }}>
          Track which stock/ETF a market account is invested in. Changes are logged with effective dates.
        </p>
        {allAccounts.filter((a) => a.type === AccountType.MARKET).length === 0 ? (
          <p>No market accounts yet — create an account with type &ldquo;Market&rdquo; above.</p>
        ) : (
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
              <input name="ticker" placeholder="VOO" maxLength={10} required list="ticker-suggestions" />
              <datalist id="ticker-suggestions">
                <option value="VOO">Vanguard S&amp;P 500 ETF</option>
                <option value="VTI">Vanguard Total Stock Market</option>
                <option value="SPY">SPDR S&amp;P 500 ETF</option>
                <option value="QQQ">Invesco Nasdaq 100</option>
                <option value="IVV">iShares Core S&amp;P 500</option>
                <option value="VGT">Vanguard Info Tech ETF</option>
                <option value="SCHD">Schwab US Dividend Equity</option>
                <option value="VYM">Vanguard High Dividend Yield</option>
                <option value="AAPL">Apple</option>
                <option value="MSFT">Microsoft</option>
                <option value="GOOG">Alphabet (Google)</option>
                <option value="AMZN">Amazon</option>
                <option value="NVDA">NVIDIA</option>
                <option value="META">Meta Platforms</option>
                <option value="TSLA">Tesla</option>
                <option value="BRK.B">Berkshire Hathaway B</option>
                <option value="JPM">JPMorgan Chase</option>
                <option value="V">Visa</option>
                <option value="DIS">Walt Disney</option>
                <option value="COST">Costco</option>
                <option value="VEA">Vanguard FTSE Developed Markets</option>
                <option value="VWO">Vanguard FTSE Emerging Markets</option>
                <option value="BND">Vanguard Total Bond Market</option>
                <option value="AGG">iShares Core US Aggregate Bond</option>
                <option value="ARKK">ARK Innovation ETF</option>
              </datalist>
            </label>
            <label>
              Effective date
              <input name="effectiveDate" type="date" required />
            </label>
            <button type="submit">Save ticker event</button>
          </form>
        )}
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
