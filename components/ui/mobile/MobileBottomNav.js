'use client';

export function MobileBottomNav({ activeTab, tabs, className = '' }) {
  return (
    <div className={`bg-fixly-bg border-t border-fixly-border fixed bottom-0 left-0 right-0 z-40 safe-area-pb ${className}`}>
      <div className="flex items-center justify-around py-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={tab.onClick}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'text-fixly-accent'
                : 'text-fixly-text-muted hover:text-fixly-text'
            }`}
          >
            <tab.icon className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">{tab.label}</span>
            {tab.badge && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}