import "leaflet";

declare module "leaflet" {
  interface MapOptions {
    rotate?: boolean;
    bearing?: number;
    touchRotate?: boolean;
    rotateControl?: boolean | { position?: ControlPosition; closeOnZeroBearing?: boolean };
  }
  interface MarkerOptions {
    rotateWithView?: boolean;
  }
  interface Map {
    setBearing(degrees: number): this;
    getBearing(): number;
  }
}

declare module "leaflet-rotate";