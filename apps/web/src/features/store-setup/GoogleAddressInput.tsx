"use client";
import { useEffect, useRef, useState } from 'react';

interface AddressDetails {
    lat: number;
    lng: number;
    place_id: string;
    formatted_address: string;
}

interface GoogleAddressInputProps {
    onAddressSelect: (address: string, details: AddressDetails | null) => void;
    placeholder?: string;
    defaultValue?: string;
}

declare global {
    interface Window {
        google: any;
    }
}

const GoogleAddressInput = ({
    onAddressSelect,
    placeholder = "Search for store address",
    defaultValue = ""
}: GoogleAddressInputProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [manualEntry, setManualEntry] = useState(false);
    const [inputValue, setInputValue] = useState(defaultValue);

    useEffect(() => {
        if (typeof window !== 'undefined' && !window.google) {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
            script.async = true;
            script.defer = true;
            script.onload = () => setIsLoaded(true);
            script.onerror = () => {
                console.error('Failed to load Google Maps');
                setManualEntry(true);
            };
            document.head.appendChild(script);
        } else if (window.google) {
            setIsLoaded(true);
        }
    }, []);

    useEffect(() => {
        if (isLoaded && inputRef.current && window.google?.maps?.places) {
            try {
                const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
                    componentRestrictions: { country: 'NG' },
                    fields: ['formatted_address', 'geometry', 'place_id'],
                    types: ['establishment', 'geocode']
                });

                const handlePlaceChanged = () => {
                    const place = autocomplete.getPlace();
                    if (place?.formatted_address && place?.geometry?.location) {
                        try {
                            onAddressSelect(place.formatted_address, {
                                lat: place.geometry.location.lat(),
                                lng: place.geometry.location.lng(),
                                place_id: place.place_id || '',
                                formatted_address: place.formatted_address
                            });
                        } catch (error) {
                            console.error('Error processing place:', error);
                        }
                    }
                };

                autocomplete.addListener('place_changed', handlePlaceChanged);

                return () => {
                    if (window.google?.maps?.event) {
                        window.google.maps.event.clearInstanceListeners(autocomplete);
                    }
                };
            } catch (error) {
                console.error('Error initializing autocomplete:', error);
            }
        }
    }, [isLoaded, onAddressSelect]);

    const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);
    };

    const handleManualSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            onAddressSelect(inputValue.trim(), null);
        }
    };

    return (
        <div className="w-full">
            <input
                ref={inputRef}
                type="text"
                className="w-full px-4 h-[52px] rounded-field border border-outline-strong focus:ring-1 focus:ring-outline-contrast text-body text-foreground-primary font-medium bg-surface outline-none"
                placeholder={manualEntry ? `${placeholder} (Press Enter to confirm)` : placeholder}
                defaultValue={defaultValue}
                onChange={manualEntry ? handleManualInput : undefined}
                onKeyDown={manualEntry ? handleManualSubmit : undefined}
                value={manualEntry ? inputValue : undefined}
            />
            {manualEntry && (
                <p className="text-body-sm text-foreground-muted mt-1">
                    Google Maps unavailable. Enter address manually and press Enter.
                </p>
            )}
            {!manualEntry && isLoaded && (
                <button
                    type="button"
                    onClick={() => setManualEntry(true)}
                    className="text-body-sm text-brandDeep hover:opacity-80 mt-1 underline"
                >
                    Can't find your address? Enter manually
                </button>
            )}
        </div>
    );
};

export default GoogleAddressInput;