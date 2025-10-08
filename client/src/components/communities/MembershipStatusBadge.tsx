import { Crown, Shield, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MembershipStatusBadgeProps {
  status: 'active' | 'pending';
  role?: 'owner' | 'moderator' | 'member';
  showIcon?: boolean;
}

export function MembershipStatusBadge({
  status,
  role = 'member',
  showIcon = true,
}: MembershipStatusBadgeProps) {
  if (status === 'pending') {
    return (
      <Badge variant="outline" className="gap-1">
        {showIcon && <User className="h-3 w-3" />}
        Pending
      </Badge>
    );
  }

  // Active membership
  const roleConfig = {
    owner: {
      icon: Crown,
      label: 'Owner',
      variant: 'default' as const,
      className: 'bg-yellow-600 hover:bg-yellow-700',
    },
    moderator: {
      icon: Shield,
      label: 'Moderator',
      variant: 'secondary' as const,
      className: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    member: {
      icon: User,
      label: 'Member',
      variant: 'outline' as const,
      className: '',
    },
  };

  const config = roleConfig[role];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`gap-1 ${config.className}`}>
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}
