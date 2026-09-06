export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="mb-2 text-2xl font-semibold text-ink-900">Scan to order</h1>
      <p className="text-ink-400">
        Find the QR code at your table and scan it with your phone's camera to see the menu and place your order.
      </p>
    </main>
  );
}
