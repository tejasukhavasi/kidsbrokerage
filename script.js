const calculator = document.getElementById('calculator');
const result = document.getElementById('result');

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

calculator.addEventListener('submit', (event) => {
  event.preventDefault();

  const weeklyDeposit = Number(document.getElementById('weeklyDeposit').value);
  const annualReturnPercent = Number(document.getElementById('annualReturn').value);
  const years = Number(document.getElementById('years').value);

  if (!weeklyDeposit || years <= 0) {
    result.textContent = 'Please enter valid values.';
    return;
  }

  const weeklyRate = annualReturnPercent / 100 / 52;
  const weeks = years * 52;

  let balance = 0;
  for (let i = 0; i < weeks; i += 1) {
    balance = (balance + weeklyDeposit) * (1 + weeklyRate);
  }

  const invested = weeklyDeposit * weeks;
  const growth = balance - invested;

  result.innerHTML = `
    After <strong>${years} years</strong>, your account could be worth
    <span class="money">${formatMoney(balance)}</span>.<br />
    Total deposits: ${formatMoney(invested)} · Investment growth: ${formatMoney(growth)}
  `;
});
