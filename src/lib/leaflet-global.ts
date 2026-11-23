import L from "leaflet";

// leaflet-rotate reads globalThis.L at module evaluation, rather than importing
// Leaflet. Bind the same instance used by our maps before evaluating the plugin.
const leafletGlobal = globalThis as typeof globalThis & { L?: typeof L };
leafletGlobal.L = L;

export default L;