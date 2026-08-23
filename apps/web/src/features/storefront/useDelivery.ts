/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import useShippingStore, { ShippingOptionInfo } from "@/store/shippingStore";

/**
 * Encapsulates the product-page delivery flow: the location picker + the
 * shipping-options fetch/select + the two modals (location + delivery sheet).
 *
 * Pure extraction from Product.tsx (W4.4) — same state, same effects, same
 * values. The money path stays in Product: `cartState`/`addToCart` just read
 * `selectedDelivery` from here. `setLoading` is passed IN (not owned) because
 * Product shares that flag with the add-to-cart button + a full-page loader.
 */
export function useDelivery({
  product,
  productId,
  count,
  user,
  setLoading,
}: {
  product: any;
  productId: string | string[] | undefined;
  count: number;
  user: any;
  setLoading: (v: boolean) => void;
}) {
  const {
    singleShippingDetails,
    shippingOptions,
    fetchShippingOptions,
    fetchShippings,
    guestId,
    setSelectedDeliveryLocation,
    selectedDeliveryLocation,
  } = useShippingStore();

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [location, setLocation] = useState<any>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedDelivery, setSelectedDelivery] =
    useState<ShippingOptionInfo | null>(null);

  const openLocationModal = () => setIsLocationModalOpen(true);
  const closeLocationModal = () => setIsLocationModalOpen(false);
  const openDeliveryModal = () => setIsDeliveryModalOpen(true);
  const closeDeliveryModal = () => setIsDeliveryModalOpen(false);

  const handleLocationSelect = async function (locationData: any) {
    try {
      setLoading(true);

      // Extract address components from Google Places data
      const street = locationData?.properties?.full_address || "";
      const addressComponents = locationData?.address_components || [];

      let town = "";
      let state = "";
      let country = "";

      addressComponents.forEach((component: any) => {
        if (
          component.types.includes("locality") ||
          component.types.includes("sublocality")
        ) {
          town = component.long_name;
        } else if (component.types.includes("administrative_area_level_1")) {
          state = component.long_name;
        } else if (component.types.includes("country")) {
          country = component.long_name;
        }
      });

      // Fallback if town is empty
      if (!town) {
        const fallbackTown = addressComponents.find(
          (comp: any) =>
            comp.types.includes("sublocality_level_1") ||
            comp.types.includes("administrative_area_level_2")
        );
        if (fallbackTown) town = fallbackTown.long_name;
      }

      // Validate required fields
      if (!street || !town || !state || !country) {
        console.error("❌ Missing required address fields:", {
          street,
          town,
          state,
          country,
        });
        toast.error(
          "Unable to parse complete address. Please try selecting a different location."
        );
        setLoading(false);
        return;
      }

      // Store the selected location in the shipping store for later use
      setSelectedDeliveryLocation({
        street,
        town,
        state,
        country,
        full_address: street,
      });

      const dataSent = {
        product_id: productId + "",
        quantity: count,
        street: street,
        town: town,
        state: state,
        country: country,
        shipping_user: {
          firstname: user?.firstname || "",
          lastname: user?.lastname || "",
          phone: user?.phone || "",
          email: user?.email || "",
        },
      };

      if (user) {
        await fetchShippingOptions(dataSent);
        // Auto-selection happens in the effect when shippingOptions updates
        openDeliveryModal();
      } else {
        const guestData = {
          product_id: productId + "",
          quantity: count,
          street: street,
          town: town,
          state: state,
          country: country,
          shipping_user: {
            firstname: "guest",
            lastname: "user",
            phone: "+2347023456786",
            email: "guest@yopmail.com",
          },
        };
        await fetchShippingOptions(guestData, guestId);
        openDeliveryModal();
      }

      setLocation(locationData);
    } catch (error: any) {
      console.error("❌ Error handling location selection:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (option: ShippingOptionInfo) => {
    setSelectedOption(option.id);
    setSelectedDelivery(option);
    closeDeliveryModal();
  };

  // Fetch shipping profiles for logged-in users
  useEffect(() => {
    if (user?.id && !singleShippingDetails?.id) {
      fetchShippings();
    }
  }, [user?.id, singleShippingDetails?.id, fetchShippings]);

  // Auto-fetch shipping options if we have a persistent location but no options
  useEffect(() => {
    if (
      selectedDeliveryLocation &&
      (!shippingOptions || shippingOptions.length === 0) &&
      product?.id
    ) {
      const fetchPersistentShipping = async () => {
        try {
          setLoading(true);
          await fetchShippingOptions({
            product_id: product.id ?? "",
            quantity: count,
            street: selectedDeliveryLocation.street,
            town: selectedDeliveryLocation.town,
            state: selectedDeliveryLocation.state,
            country: selectedDeliveryLocation.country,
            shipping_user: {
              firstname: user?.firstname || "Guest",
              lastname: user?.lastname || "User",
              phone: user?.phone || "",
              email: user?.email || "",
            },
          });
        } catch (error) {
          console.error("❌ Error fetching persistent shipping:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchPersistentShipping();
    }
  }, [selectedDeliveryLocation, product?.id, count, user]);

  // Auto-select first shipping option when options are loaded
  useEffect(() => {
    if (shippingOptions && shippingOptions.length > 0 && !selectedDelivery) {
      const defaultOption = shippingOptions[0];
      setSelectedOption(defaultOption.id);
      setSelectedDelivery(defaultOption);
    }
  }, [shippingOptions, selectedDelivery]);

  return {
    shippingOptions,
    singleShippingDetails,
    selectedDeliveryLocation,
    location,
    setLocation,
    selectedDelivery,
    selectedOption,
    isLocationModalOpen,
    openLocationModal,
    closeLocationModal,
    isDeliveryModalOpen,
    openDeliveryModal,
    closeDeliveryModal,
    handleLocationSelect,
    handleSelect,
  };
}
