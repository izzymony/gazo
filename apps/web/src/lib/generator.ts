export function generateRandomHexId(length: number) {
  const characters = "0123456789abcdef"; // Hex characters
  let result = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }

  return result;
}

//(generateRandomHexId(10)); // Example usage, will generate a random ID of length 10

export function formatPhoneNumber(phoneNumber: string, countryCode = "+234") {
  // Remove spaces, dashes, and parentheses
  phoneNumber = phoneNumber.replace(/[\s()-]/g, "");

  // Check if the phone number already starts with the country code
  if (!phoneNumber.startsWith(countryCode)) {
    // Remove leading zeros to avoid cases like "+1123456" when "+1" is prepended
    phoneNumber = phoneNumber.replace(/^0+/, "");
    return countryCode + phoneNumber;
  }

  return phoneNumber;
}

// Example usage
//(formatPhoneNumber('2345678901', '+1')); // +12345678901
//(formatPhoneNumber('+442345678901', '+44')); // +442345678901
//(formatPhoneNumber('08123456789', '+234')); // +2348123456789
//(formatPhoneNumber('07012345678', '+234')); // +2347012345678
