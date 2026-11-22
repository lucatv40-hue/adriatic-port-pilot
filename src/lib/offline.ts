export const FAVORITES_KEY = "ra-favorites-v1";
export const MAP_VIEW_KEY = "ra-map-view-v1";

/** Built previews must be excluded even when PROD is true. */
export function refuseOfflineRegistration(host: string, production: boolean, framed: boolean, search: string, delegatedHost = ""): boolean {
  const h = host.toLowerCase();
  const platform = /\.(lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(h);
  const label = h.split(".")[0] ?? "";
  return !production || framed || new URLSearchParams(search).get("sw") === "off"
    || (!!delegatedHost && h === delegatedHost)
    || (platform && (/^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/.test(label) || /^project--.+-dev$/.test(label)))
    || /(^|\.)(lovableproject\.com|lovableproject-dev\.com|beta\.lovable\.dev)$/.test(h);
}

export async function registerOffline(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  if (refuseOfflineRegistration(location.hostname, import.meta.env.PROD, window.self !== window.top, location.search)) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter((r) => [r.active, r.waiting, r.installing].some((worker) => worker && new URL(worker.scriptURL).pathname === "/sw.js")).map((r) => r.unregister()));
    return;
  }
  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  void registration.update();
}