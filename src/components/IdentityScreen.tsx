import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useWalletStore } from '../stores/walletStore';
import { usePaymentStore } from '../stores/paymentStore';
import { getQFBalance, formatQF, getAvatar, truncateAddress } from '../utils/qfpay';
import { ArrowRight } from 'lucide-react';

export const IdentityScreen = () => {
  const { qnsName, address, ss58Address } = useWalletStore();
  const { goToRecipient } = usePaymentStore();
  const [balance, setBalance] = useState<bigint>(0n);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarLoaded, setAvatarLoaded] = useState(false);

  useEffect(() => {
    if (ss58Address) {
      getQFBalance(ss58Address).then(setBalance);
    }
  }, [ss58Address]);

  useEffect(() => {
    if (qnsName) {
      getAvatar(qnsName).then(url => {
        if (url) setAvatar(url);
      });
    }
  }, [qnsName]);

  const hasQNS = !!qnsName;

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-6"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5 }}
    >
      {hasQNS ? (
        <>
          {/* Avatar */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            {avatar ? (
              <img
                src={avatar}
                alt={qnsName}
                className={`w-24 h-24 rounded-full object-cover border-2 border-white/10 transition-opacity duration-300 ${avatarLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setAvatarLoaded(true)}
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-qfpay-blue/20 flex items-center justify-center border-2 border-white/10">
                <span className="font-clash font-bold text-3xl text-qfpay-blue">
                  {qnsName[0].toUpperCase()}
                </span>
              </div>
            )}
          </motion.div>

          {/* Name */}
          <motion.h1
            className="font-clash font-bold text-5xl sm:text-6xl md:text-7xl text-white mb-3 tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {qnsName}.qf
          </motion.h1>

          {/* Balance */}
          <motion.p
            className="font-mono text-xl text-white/40 mb-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            {formatQF(balance)} QF
          </motion.p>

          {/* Get started arrow */}
          <motion.button
            className="group"
            onClick={goToRecipient}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <motion.div
              className="w-16 h-16 rounded-full bg-qfpay-blue flex items-center justify-center"
              animate={{
                scale: [1, 1.08, 1],
                boxShadow: [
                  '0 0 0 0 rgba(0, 82, 255, 0.4)',
                  '0 0 0 12px rgba(0, 82, 255, 0)',
                  '0 0 0 0 rgba(0, 82, 255, 0)',
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowRight className="w-7 h-7 text-white" />
            </motion.div>
          </motion.button>
        </>
      ) : (
        <>
          {/* No QNS name — gate */}
          <motion.div
            className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-8 border border-white/10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <span className="font-mono text-2xl text-white/30">?</span>
          </motion.div>

          <motion.h2
            className="font-clash font-bold text-3xl sm:text-4xl text-white mb-3 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            You need a .qf name
          </motion.h2>

          <motion.p
            className="font-satoshi text-white/40 text-center mb-2 max-w-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            QFPay uses your QNS identity to send and receive payments.
          </motion.p>

          <motion.p
            className="font-mono text-sm text-white/20 mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            {truncateAddress(address || '')}  ·  {formatQF(balance)} QF
          </motion.p>

          <motion.a
            href="https://dotqf.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-qfpay-blue hover:bg-qfpay-blue-hover text-white font-satoshi font-semibold text-lg px-10 py-4 rounded-2xl transition-colors inline-block"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Get your .qf name
          </motion.a>
        </>
      )}
    </motion.div>
  );
};
