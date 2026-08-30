// src/components/Avatar.tsx
import type { Member } from '../types';
import type { MouseEventHandler } from 'react';

interface AvatarProps {
  member?: Partial<Member>;
  name?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  style?: React.CSSProperties;
  onMouseEnter?: MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: MouseEventHandler<HTMLDivElement>;
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({
  member, name, color, size = 'md',
  className = '', style,
  onMouseEnter, onMouseLeave,
}: AvatarProps) {
  const displayName = member?.name ?? name ?? '?';
  const bg = member?.avatarColor ?? color ?? '#9F9DF3';
  const sizeClass =
    size === 'sm' ? 'avatar-sm' :
    size === 'lg' ? 'avatar-lg' :
    size === 'xl' ? 'avatar-xl' : '';

  return (
    <div
      className={`avatar ${sizeClass} ${className}`}
      style={{ background: bg, ...style }}
      title={displayName}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {initials(displayName)}
    </div>
  );
}
