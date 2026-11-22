const clientToken = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"] as string | undefined;
export function PaymentTestModeBanner() {
  if (!clientToken) return <div className="w-full bg-destructive/15 px-4 py-1.5 text-center text-xs text-destructive">Pagamenti reali non ancora attivi.</div>;
  if (clientToken.startsWith("pk_test_")) return <div className="w-full bg-warning/20 px-4 py-1.5 text-center text-xs text-foreground">Anteprima: i pagamenti sono in modalità test, nessun addebito reale.</div>;
  return null;
}
