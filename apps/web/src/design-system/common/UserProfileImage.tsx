"use client";

import Avatar from "./Avatar";

interface UserProfileImageProps {
  src?: string | null;
  userName?: string;
  firstName?: string;
  lastName?: string;
  size?: number;
  className?: string;
  onClick?: () => void;
  editable?: boolean;
}

/** User profile image = the shared Avatar preset for people (editable overlay). (W3.7) */
const UserProfileImage = ({
  src,
  userName = "User",
  firstName = "",
  lastName = "",
  size = 48,
  className = "",
  onClick,
  editable = false,
}: UserProfileImageProps) => (
  <Avatar
    src={src}
    name={userName}
    firstName={firstName}
    lastName={lastName}
    size={size}
    className={className}
    onClick={onClick}
    editable={editable}
  />
);

export default UserProfileImage;
