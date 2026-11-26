import { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';

interface MenuItemPhotoProps {
  image: string | null;
  name: string;
  className?: string;
}

/** A menu photo with a neutral food icon when the owner has not added a photo yet. */
export function MenuItemPhoto({ image, name, className = '' }: MenuItemPhotoProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-control bg-background ${className}`}
    >
      {image && !failed ? (
        <img
          src={image}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <UtensilsCrossed aria-hidden className="h-8 w-8 text-text-secondary/60" />
      )}
    </div>
  );
}
