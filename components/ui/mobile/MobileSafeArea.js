'use client';

export function MobileSafeArea({ children, className = '', edges = ['top', 'bottom', 'left', 'right'] }) {
  const safeAreaClasses = {
    top: 'pt-safe-area-top',
    bottom: 'pb-safe-area-bottom',
    left: 'pl-safe-area-left',
    right: 'pr-safe-area-right'
  };

  const appliedClasses = edges.map(edge => safeAreaClasses[edge]).join(' ');

  return (
    <div className={`${appliedClasses} ${className}`}>
      {children}
    </div>
  );
}