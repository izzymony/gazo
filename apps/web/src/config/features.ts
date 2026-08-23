// Feature flags for controlling app functionality
// These can be easily toggled for different deployment scenarios

export const FEATURES = {
  // OTP Verification Feature
  // Set to false to completely bypass OTP verification during signup
  // Set to true to enable OTP verification (for future implementation)
  OTP_VERIFICATION_ENABLED: false,
  
  // Add other feature flags here as needed
  // SOCIAL_LOGIN_ENABLED: true,
  // GUEST_CHECKOUT_ENABLED: true,
};

export default FEATURES;