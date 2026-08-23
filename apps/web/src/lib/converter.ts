/* eslint-disable @typescript-eslint/no-unused-vars */
export function formatTimestamp(timestamp: string): string {
  const parts = timestamp.split(" ");
  const datePart = parts[0]; // "2025-03-19"
  const timePart = parts[1]; // "17:24:58.462839"

  const date = new Date(datePart + "T" + timePart); // Convert to Date object

  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true, // For AM/PM format
  };

  return date
    .toLocaleString("en-US", options)
    .replace(",", "") // Remove extra comma
    .replace(" AM", "am")
    .replace(" PM", "pm");
}

// Example usage
const input = "2025-03-19 17:24:58.462839 +0100 WAT m=+8.955026334";
//(formatTimestamp(input)); // Expected output: "Mar 19, 2025 05:24pm"

export function formatTimeAgos(timestamp: string): string {
  const parts = timestamp.split(" ");
  const datePart = parts[0]; // "2025-03-19"
  const timePart = parts[1]; // "17:24:58.462839"

  const date = new Date(`${datePart}T${timePart}Z`); // Convert to Date object
  const now = new Date();

  const diffMs = now.getTime() - date.getTime(); // Difference in milliseconds
  const diffMinutes = Math.floor(diffMs / (1000 * 60)); // Convert to minutes
  const diffHours = Math.floor(diffMinutes / 60); // Convert to hours

  if (diffMinutes < 60) {
    return `${diffMinutes} minutes ago`;
  }

  // Format time as "hh:mmam/pm"
  const options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true, // Ensures AM/PM format
  };

  return date
    .toLocaleString("en-US", options)
    .replace(" AM", "am")
    .replace(" PM", "pm"); // Format "10:50am/pm"
}

//(formatTimeAgos(input));
