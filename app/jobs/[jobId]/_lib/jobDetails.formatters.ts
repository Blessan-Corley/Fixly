export function formatCurrency(amount: number | null): string {
  if (amount === null) {
    return 'Not specified';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return 'Unknown date';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown date';
  }

  return parsed.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function getUrgencyColor(urgency: string): string {
  switch (urgency) {
    case 'urgent':
    case 'asap':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'medium':
    case 'flexible':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'low':
      return 'text-green-600 bg-green-50 border-green-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'open':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'in_progress':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'completed':
      return 'text-gray-600 bg-gray-50 border-gray-200';
    case 'cancelled':
      return 'text-red-600 bg-red-50 border-red-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}
