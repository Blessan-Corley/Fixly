export function formatCurrency(amount?: number): string {
  if (!amount) {
    return 'Not specified';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateInput?: string): string {
  if (!dateInput) {
    return 'Recently';
  }

  const now = new Date();
  const jobDate = new Date(dateInput);
  const diffTime = Math.abs(now.getTime() - jobDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (Number.isNaN(jobDate.getTime())) {
    return 'Recently';
  }
  if (diffDays === 1) {
    return 'Today';
  }
  if (diffDays === 2) {
    return 'Yesterday';
  }
  if (diffDays <= 7) {
    return `${diffDays - 1} days ago`;
  }

  return jobDate.toLocaleDateString('en-IN');
}
