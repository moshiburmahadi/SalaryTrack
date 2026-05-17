import React from 'react';
import { motion } from 'motion/react';

export default function LoadingScreen() {
  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 z-[500] bg-black flex flex-center items-center justify-center overflow-hidden"
    >
      {/* Background Decorative Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gold-accent/5 rounded-full blur-[120px]" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-gold-accent/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold-accent/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Animated Logo Icon */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            duration: 1, 
            ease: "easeOut",
            scale: { type: "spring", stiffness: 100, damping: 15 }
          }}
          className="mb-8"
        >
          <div className="w-24 h-24 border-2 border-gold-accent flex items-center justify-center relative">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border border-gold-accent/30 -m-3"
            />
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border border-gold-accent/10 -m-6"
            />
            <span className="text-4xl font-black gold-accent serif select-none">S</span>
          </div>
        </motion.div>

        {/* Animated Text */}
        <div className="overflow-hidden">
          <motion.h1 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-4xl md:text-5xl font-black text-white serif tracking-tighter mb-2"
          >
            SalaryTrack<span className="gold-accent">.</span>
          </motion.h1>
        </div>

        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
          className="h-[1px] bg-gold-accent w-full max-w-[200px] opacity-50"
        />

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="text-[10px] uppercase tracking-[0.4em] text-stone-500 font-bold mt-6"
        >
          Precision Engineering
        </motion.p>
      </div>

      {/* Decorative scanline effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-10" />
    </motion.div>
  );
}
