'use client';

export function MobileCard({
  children,
  onClick,
  className = '',
  padding = 'default',
  hover = true
}) {
  const paddingClasses = {
    none: '',
    small: 'p-3',
    default: 'p-4',
    large: 'p-6'
  };

  return (
    <div
      className={`
        bg-fixly-card
        border border-fixly-border
        rounded-xl
        ${paddingClasses[padding]}
        ${onClick ? 'cursor-pointer' : ''}
        ${hover ? 'hover:shadow-md transition-shadow' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}