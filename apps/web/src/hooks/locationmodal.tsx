"use client";

import dynamic from "next/dynamic";

/**
 * P9 — lazy boundary for the location/address modal.
 *
 * The implementation (./LocationModalImpl) injects the Google Maps JS API at
 * runtime and is entirely window-dependent, so it should never server-render and
 * doesn't belong in the first-load bundle of the ~6 routes that mount it. Loading
 * it via next/dynamic with ssr:false defers its code to an async chunk and keeps
 * SSR clean. The public import path (`@/hooks/locationmodal`) and default-export
 * props API are unchanged, so every existing call-site works untouched.
 */
const LocationModal = dynamic(() => import("./LocationModalImpl"), {
  ssr: false,
});

export default LocationModal;
