/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from "react";
import { useLoadScript } from "@react-google-maps/api";

const libraries: any = ["places"];
const inmitialState = {
  streetAddress: "",
  country: "",
  zipCode: "",
  city: "",
  state: "",
  latitude: "",
  longitude: "",
};

export default function useAddressHook() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY!,
    libraries,
  });

  const [input, setInput] = useState<{
    streetAddress: string;
    country: string;
    zipCode: string;
    city: string;
    state: string;
    latitude: string;
    longitude: string;
  }>(inmitialState);
  const inputRef = useRef<any>(null);

  const handlePlaceChanged = async (address: any) => {
    if (!isLoaded) return;
    const place = address.getPlace();

    if (!place || !place.geometry) {
      setInput(inmitialState);
      return;
    }
    formData(place);
  };

  const formData = (data: any) => {
    const addressComponents = data?.address_components;

    const componentMap = {
      subPremise: "",
      premise: "",
      street_number: "",
      route: "",
      country: "",
      postal_code: "",
      administrative_area_level_2: "",
      administrative_area_level_1: "",
    };

    for (const component of addressComponents) {
      const componentType: keyof typeof componentMap = component.types[0];
      if (componentMap.hasOwnProperty(componentType)) {
        componentMap[componentType] = component.long_name;
      }
    }

    const formattedAddress =
      `${componentMap.subPremise} ${componentMap.premise} ${componentMap.street_number} ${componentMap.route}`.trim();
    const latitude = data?.geometry?.location?.lat();
    const longitude = data?.geometry?.location?.lng();
    //(format);
    setInput((values) => ({
      ...values,
      streetAddress: formattedAddress,
      country: componentMap.country,
      zipCode: componentMap.postal_code,
      city: componentMap.administrative_area_level_2,
      state: componentMap.administrative_area_level_1,
      latitude: latitude,
      longitude: longitude,
    }));
  };

  useEffect(() => {
    if (!isLoaded || loadError) {
      //("something went wrong!!");
      return;
    }

    const options = {
      componentRestrictions: { country: "ng" },
      fields: ["address_components", "geometry"],
    };

    const autocomplete = new google.maps.places.Autocomplete(
      inputRef.current,
      options
    );
    autocomplete.addListener("place_changed", () =>
      handlePlaceChanged(autocomplete)
    );

    // return () => autocomplete.removeListener("place_changed", handlePlaceChanged);
  }, [isLoaded, loadError]);

  return { input, inputRef };
}
