import React from 'react';
import Badge from "./Badge";

interface ComingSoonPillProps {
  /** Override the label — "Soon" was hardcoded, so "Coming soon" needed a second component. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * "Not yet available" marker = the shared `Badge` preset for unreleased
 * surfaces. `info` rather than `warning`: nothing is wrong, it simply is not
 * here yet.
 */
const ComingSoonPill: React.FC<ComingSoonPillProps> = ({ children = "Soon", className = '' }) => (
  <Badge tone="info" size="md" className={className}>
    {children}
  </Badge>
);

export default ComingSoonPill;
