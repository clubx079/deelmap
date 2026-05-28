// Shared formatting helpers.

// Display a numeric USD amount with no decimals; empty/zero -> '$0'.
export function formatCurrency(amount) {
  if (!amount) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}
