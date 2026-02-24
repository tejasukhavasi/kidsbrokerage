export async function getStockPrice(ticker: string): Promise<number> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; KidsBrokerage/1.0)"
    },
    next: { revalidate: 0 }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch price for ${ticker}: ${res.status}`);
  }

  const data = await res.json();
  const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;

  if (typeof price !== "number" || price <= 0) {
    throw new Error(`No valid price found for ${ticker}`);
  }

  return price;
}
