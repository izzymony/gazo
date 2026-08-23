/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
import BottomModal from "@/design-system/common/BottomModal";
import { useCallback, useEffect, useState } from "react";
import { CiSearch } from "@/design-system/icons";

// Extend Window interface for Google Maps
declare global {
  interface Window {
    google: any;
  }
}

export default function LocationModal({
  isLocationModalOpen,
  closeLocationModal,
  setLoading,
  setLocation,
  callback,
  location,
  setAddress,
}: {
  isLocationModalOpen: boolean;
  closeLocationModal: () => void;
  setLoading: (val: boolean) => void;
  setLocation: (val: any) => void;
  callback?: (val: any) => Promise<void>;
  location: any;
  setAddress?: (val: string) => void;
}) {
  const [search, setSeacrh] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);

  // Load Google Maps API
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.onload = () => {
        console.log('✅ Google Maps API loaded successfully');
        setIsGoogleLoaded(true);
      };
      script.onerror = (error) => {
        console.error('❌ Failed to load Google Maps:', error);
        console.log('📍 Google Maps API key:', process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing');
      };
      document.head.appendChild(script);
    } else if (window.google) {
      console.log('✅ Google Maps already loaded');
      setIsGoogleLoaded(true);
    }
  }, []);

  const upDateSuggestions = useCallback(
    async function getSuggestions() {
      if (!isGoogleLoaded || !window.google || !search || search.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        console.log('🔍 Getting suggestions for:', search);
        const autocompleteService = new window.google.maps.places.AutocompleteService();

        autocompleteService.getPlacePredictions(
          {
            input: search,
            componentRestrictions: { country: 'NG' }, // Nigeria only
            types: ['establishment', 'geocode']
          },
          (predictions: any[], status: any) => {
            console.log('📍 Google Maps status:', status, 'Predictions:', predictions?.length || 0);
            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
              // Map to format similar to original structure
              const mappedSuggestions = predictions.map((prediction) => ({
                place_id: prediction.place_id,
                name: prediction.description,
                structured_formatting: prediction.structured_formatting
              }));
              console.log('✅ Mapped suggestions:', mappedSuggestions.length);
              setSuggestions(mappedSuggestions);
            } else {
              console.log('⚠️ No suggestions or API error:', status);
              setSuggestions([]);
            }
          }
        );
      } catch (error: any) {
        console.error('❌ Error getting suggestions:', error);
        setSuggestions([]);
      }
    },
    [search, isGoogleLoaded]
  );

  const retrieveLocation = useCallback(
    async function getLocation(placeId: string) {
      console.log("🗺️ retrieveLocation called with placeId:", placeId);
      closeLocationModal();
      setSeacrh("");

      if (!window.google || !isGoogleLoaded) {
        console.error('Google Places service not available');
        return;
      }

      try {
        setLoading(true);

        const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));

        placesService.getDetails(
          {
            placeId: placeId,
            fields: ['formatted_address', 'geometry', 'name', 'place_id', 'address_components']
          },
          (place: any, status: any) => {
            setLoading(false);

            if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
              // Format to match your existing structure
              const locationData = {
                properties: {
                  full_address: place.formatted_address,
                  name: place.name
                },
                geometry: {
                  coordinates: [
                    place.geometry.location.lng(),
                    place.geometry.location.lat()
                  ]
                },
                place_id: place.place_id,
                address_components: place.address_components
              };

              console.log("🔥 About to call callback with locationData:", locationData);
              if (callback) {
                console.log("🔥 Calling callback function");
                callback(locationData);
              } else {
                console.log("🔥 No callback provided");
              }
              setLocation(locationData);
              if (setAddress) {
                setAddress(locationData.properties.full_address);
              }
            } else {
              console.error('Failed to get place details');
            }
          }
        );
      } catch (error: any) {
        console.error('Error retrieving location:', error);
        setLoading(false);
      }
    },
    [isGoogleLoaded, callback, setLocation, setAddress, setLoading, closeLocationModal]
  );

  useEffect(() => {
    if (search && search.length > 1) {
      upDateSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [search, upDateSuggestions]);

  return (
    <BottomModal isOpen={isLocationModalOpen} onClose={closeLocationModal}>
      <div>
        <h2 className="text-base font-medium text-center mb-4">
          Choose a location
        </h2>

        {/* Clean input styling - no border conflicts */}
        <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center space-x-3 mb-6">
          <CiSearch className="text-gray-400 text-xl" />
          <input
            type="text"
            placeholder="Search address or enter manually"
            className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-500"
            value={search}
            onChange={(e: any) => setSeacrh(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && search.trim()) {
                e.preventDefault();
                console.log('⌨️ Enter pressed with search:', search.trim());
                if (setAddress) {
                  console.log('📝 Setting address from Enter key:', search.trim());
                  setAddress(search.trim());
                }
                if (callback) {
                  const manualLocationData = {
                    properties: {
                      full_address: search.trim(),
                      name: search.trim()
                    },
                    geometry: {
                      coordinates: [0, 0]
                    },
                    place_id: `manual_${Date.now()}`,
                    address_components: []
                  };
                  callback(manualLocationData);
                }
                setLocation({
                  properties: {
                    full_address: search.trim(),
                    name: search.trim()
                  }
                });
                closeLocationModal();
                setSeacrh("");
              }
            }}
          />
        </div>


        {/* Results */}
        <div className="space-y-2">
          {!isGoogleLoaded ? (
            <div className="text-center text-gray-500 py-4">
              <div>Loading Google Maps...</div>
              <div className="text-xs mt-2 text-gray-400">
                API Key: {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? '✅ Present' : '❌ Missing'}
              </div>
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((item: { place_id: string; name: string }) => (
              <div
                key={item.place_id}
                onClick={() => retrieveLocation(item.place_id)}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <img
                  className="w-5 h-5 object-cover flex-shrink-0"
                  src={"/images/location.png"}
                  alt="Location"
                />
                <span className="flex-1 text-gray-900 text-sm">
                  {item.name}
                </span>
              </div>
            ))
          ) : search.length > 0 ? (
            <>
              {suggestions.length === 0 && (
                <div className="text-center text-gray-500 py-2">
                  No locations found from Google Maps
                </div>
              )}
              {/* Manual entry option - always show when user has typed something */}
              <div
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🔧 Manual entry clicked:', search.trim());
                  if (search.trim()) {
                    if (setAddress) {
                      console.log('📝 Setting address:', search.trim());
                      setAddress(search.trim());
                    }
                    if (callback) {
                      console.log('🔥 Calling callback with manual entry');
                      const manualLocationData = {
                        properties: {
                          full_address: search.trim(),
                          name: search.trim()
                        },
                        geometry: {
                          coordinates: [0, 0] // Default coordinates for manual entry
                        },
                        place_id: `manual_${Date.now()}`,
                        address_components: []
                      };
                      callback(manualLocationData);
                    }
                    setLocation({
                      properties: {
                        full_address: search.trim(),
                        name: search.trim()
                      }
                    });
                    closeLocationModal();
                    setSeacrh("");
                  }
                }}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-blue-50 cursor-pointer border border-blue-200 bg-blue-50 mt-2 active:bg-blue-100"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 10C21 17 12 23 12 23S3 17 3 10C3 5.02944 7.02944 1 12 1C16.9706 1 21 5.02944 21 10Z" fill="#3B82F6"/>
                  <circle cx="12" cy="10" r="3" fill="white"/>
                </svg>
                <div className="flex-1">
                  <span className="text-blue-800 text-sm font-medium">Use: "{search}"</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-400 py-4">
              Type to search for locations...
            </div>
          )}
        </div>
      </div>
    </BottomModal>
  );
}