import { motion } from 'framer-motion';
import { EASE_OUT_EXPO } from '../../lib/animations';

// Unique gradient pairs per persona — same as the old PaymentVignette
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
  /** Size of the avatar circle in px */
  size?: number;
  /** Framer Motion animation delay for staggered entrance */
  delay?: number;
  /** Which side — controls text alignment */
  side: 'left' | 'right';
  /** Whether the recipient just received a payment — triggers green ring */
  impacting?: boolean;
}

export const IdentityAnchor = ({
  name,
  size = 48,
  delay = 0,
  side,
  impacting = false,
}: IdentityAnchorProps) => {
  const [c1, c2] = AVATAR_GRADIENTS[name] || ['#6366F1', '#A78BFA'];
  const gradId = `ceremony-av-${name}`;

  return (
    <motion.div
      className={`flex flex-col items-center gap-2.5 ${
        side === 'left' ? 'items-center' : 'items-center'
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: EASE_OUT_EXPO }}
    >
      {/* Avatar with optional impact ring */}
      <div className="relative">
        {/* Impact ring — green expansion on receive */}
        {impacting && (
          <motion.div
            className="absolute inset-0 rounded-full"
            initial={{ boxShadow: '0 0 0 0px rgba(0, 209, 121, 0)' }}
            animate={{
              boxShadow: [
                '0 0 0 0px rgba(0, 209, 121, 0)',
                '0 0 0 6px rgba(0, 209, 121, 0.3)',
                '0 0 0 12px rgba(0, 209, 121, 0)',
              ],
            }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        )}

        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          className="flex-shrink-0 rounded-full"
        >
          <defs>
            <linearGradient
              id={gradId}
              x1="0"
              y1="0"
              x2="48"
              y2="48"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor={c1} />
              <stop offset="1" stopColor={c2} />
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="24" fill={`url(#${gradId})`} />
          <text
            x="24"
            y="24"
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontFamily="'Clash Display', sans-serif"
            fontWeight="600"
            fontSize="18"
          >
            {name[0].toUpperCase()}
          </text>
        </svg>
      </div>

      {/* Name label */}
      <div className="flex items-baseline gap-0.5">
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
