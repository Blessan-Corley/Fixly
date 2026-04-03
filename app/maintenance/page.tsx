export default function MaintenancePage(): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-fixly-bg p-8 text-center">
      <h1 className="text-3xl font-bold text-fixly-text">We&apos;ll be right back</h1>
      <p className="max-w-md text-fixly-text-light">
        Fixly is currently undergoing scheduled maintenance. We&apos;re making a few improvements
        and will be back online shortly.
      </p>
      <p className="text-sm text-fixly-text-muted">
        If you need urgent assistance, contact us at support@fixly.com.
      </p>
    </div>
  );
}
