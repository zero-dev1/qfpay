import { motion } from 'framer-motion';
import { EASE_OUT_EXPO } from '../../lib/animations';

const AVATAR_GRADIENTS: Record<string, [string, string]> = {
  alice:   ['#6366F1', '#A78BFA'],
  bob:     ['#F59E0B', '#F97316'],
  dev:     ['#0040FF', '#38BDF8'],
  spin:    ['#10B981', '#34D399'],
  satoshi: ['#8B5CF6', '#EC4899'],
  memechi: ['#F43F5E', '#FB923C'],
};

interface IdentityAnchorProps {
  name: string;
  size?: number;
  delay?: number;
  impacting?: boolean;
  dimmed?: boolean;
}

export const IdentityAnchor = ({
  name,
  size = 32,
  delay = 0,
  impacting = false,
  dimmed = false,
}: IdentityAnchorProps) => {
  const [c1, c2] = AVATAR_GRADIENTS[name] || ['#6366F1', '#A78BFA'];
  const gradId = `ceremony-av-${name}`;

  return (
    <motion.div
      className="relative flex items-center gap-2.5 py-2 pl-2 pr-4 rounded-full"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        border: impacting
          ? '1px solid rgba(0, 209, 121, 0.4)'
          : '1px solid rgba(255, 255, 255, 0.08)',
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{
        opacity: dimmed ? 0.5 : 1,
        y: 0,
        boxShadow: impacting
          ? '0 0 20px rgba(0, 209, 121, 0.15)'
          : '0 0 0px rgba(0, 0, 0, 0)',
      }}
      transition={{ delay, duration: 0.5, ease: EASE_OUT_EXPO }}
    >
      {/* Impact ring — green expansion on receive */}
      {impacting && (
        <motion.div
          className="absolute inset-0 rounded-full"
          initial={{ boxShadow: '0 0 0 0px rgba(0, 209, 121, 0)' }}
          animate={{
            boxShadow: [
              '0 0 0 0px rgba(0, 209, 121, 0)',
              '0 0 0 4px rgba(0, 209, 121, 0.25)',
              '0 0 0 8px rgba(0, 209, 121, 0)',
            ],
          }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      )}

      {/* Avatar */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        className="flex-shrink-0 rounded-full"
      >
        <defs>
          <linearGradient
            id={gradId}
            x1="0" y1="0" x2="32" y2="32"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor={c1} />
            <stop offset="1" stopColor={c2} />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="16" fill={`url(#${gradId})`} />
        <text
          x="16" y="16"
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontFamily="'Clash Display', sans-serif"
          fontWeight="600"
          fontSize="13"
        >
          {name[0].toUpperCase()}
        </text>
      </svg>

      {/* Name label */}
      <div className="flex items-baseline gap-0.5 whitespace-nowrap">
        <span className="font-satoshi font-medium text-sm text-qfpay-text-secondary">
          {name}
        </span>
        <span className="font-satoshi font-medium text-sm text-qfpay-blue">
          .qf
        </span>
      </div>
    </motion.div>
  );
};
