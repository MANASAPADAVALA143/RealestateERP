import { Link } from 'react-router-dom';
import { Building2 } from 'lucide-react';

export function Logo({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const estateColor = variant === 'light' ? 'text-white' : 'text-navy';
  return (
    <Link to="/" className="flex items-center gap-2 select-none">
      <Building2 className={variant === 'light' ? 'text-gold' : 'text-gold'} size={24} strokeWidth={2.2} />
      <span className={`text-xl font-bold tracking-tight ${estateColor}`}>
        Estate<span className="text-gold">CFO</span>
      </span>
    </Link>
  );
}
