/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import InputField from "@vibaar/ui/common/InputField";
import { FaLocationDot } from "@vibaar/ui/icons";
import LocationModal from "@/hooks/locationmodal";

interface AddressInputProps {
  data: {
    country: string;
    state: string;
    address?: string;
  };
  error: {
    country?: string;
    state?: string;
    address?: string;
  };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setAddress: (address: string) => void;
  setCountry: (country: string) => void;
}

const AddressInput = ({ 
  data, 
  error, 
  handleInputChange, 
  setAddress, 
  setCountry 
}: AddressInputProps) => {
  const [location, setLocation] = useState<any>({});
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const openLocationModal = () => setIsLocationModalOpen(true);
  const closeLocationModal = () => setIsLocationModalOpen(false);

  // Set Nigeria as default country
  if (!data.country) {
    setCountry("Nigeria");
  }

  return (
    <>
      <div className="space-y-4">
        {/* Country - Fixed to Nigeria, no dropdown */}
        <div>
          <label className="block text-body font-medium text-foreground-secondary mb-2">
            Country
          </label>
          <div className={`flex relative w-full px-4 h-[52px] rounded-field border ${
            error.country ? "border-error-border" : "border-outline-strong"
          } justify-between items-center text-body text-foreground-primary font-medium bg-surface-subtle`}>
            <div className="flex items-center">
              <span className="mr-3">🇳🇬</span>
              <p>Nigeria</p>
            </div>
          </div>
          {error.country && <p className="text-error-foreground text-body-sm mt-1">{error.country}</p>}
        </div>

        {/* State/Province */}
        <div>
          <label className="block text-body font-medium text-foreground-secondary mb-2">
            State/Province
          </label>
          <InputField
            type="text"
            name="state"
            value={data.state}
            onChange={handleInputChange}
            placeholder="Enter state or province"
            error={error.state}
          />
        </div>

        {/* Store Address - Opens location modal on click */}
        <div>
          <label className="block text-body font-medium text-foreground-secondary mb-2">
            Store Address
          </label>
          <div 
            onClick={openLocationModal}
            className={`flex relative w-full px-4 h-[52px] rounded-field border ${
              error.address ? "border-error-border" : "border-outline-strong"
            } focus-within:ring-1 focus-within:ring-black justify-between items-center text-body font-medium cursor-pointer`}
          >
            <p className={data.address ? "text-foreground-primary" : "text-foreground-muted"}>
              {data.address || "Search for store address"}
            </p>
            <FaLocationDot size={20} className="text-foreground-muted" />
          </div>
          {error.address && <p className="text-error-foreground text-body-sm mt-1">{error.address}</p>}
        </div>
      </div>

      {/* Location Modal */}
      <LocationModal
        isLocationModalOpen={isLocationModalOpen}
        closeLocationModal={closeLocationModal}
        setLoading={() => {}}
        setLocation={setLocation}
        location={location}
        setAddress={setAddress}
      />
    </>
  );
};

export default AddressInput;
