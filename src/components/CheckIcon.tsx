import React from 'react';

interface CheckIconProps {
  className?: string;
  size?: number;
}

export const CheckIcon: React.FC<CheckIconProps> = ({ className = "", size = 24 }) => {
  return (
    <img
      src="/image.png"
      alt="Check"
      width={size}
      height={size}
      className={className}
    />
  );
};