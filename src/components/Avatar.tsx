interface AvatarProps {
  src?: string | null;
  name?: string | null;
  /** Tailwind size + optional extra classes applied to both img and fallback div */
  className?: string;
}

/**
 * Shows a circular avatar image, or a cyan initial fallback when there's no picture.
 */
export default function Avatar({ src, name, className = 'w-9 h-9 text-sm' }: AvatarProps) {
  const initial = name?.[0]?.toUpperCase() ?? '?';

  if (src) {
    return (
      <img
        src={src}
        alt={name ?? ''}
        className={`rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div className={`rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}>
      {initial}
    </div>
  );
}
