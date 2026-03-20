"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface Props {
  onVerified: () => void;
}

export function SelfVerifyButton({ onVerified }: Props) {
  const [state, setState] = useState<"idle" | "scanning" | "verifying" | "done">("idle");

  const handleStart = () => {
    setState("scanning");
    // In production: initialize Self Protocol QR flow using @selfxyz/qrcode
    // Simulate verification for demo
    setTimeout(() => {
      setState("verifying");
      setTimeout(() => {
        setState("done");
        setTimeout(onVerified, 800);
      }, 1500);
    }, 3000);
  };

  return (
    <div className="rounded-xl bg-surface border border-border p-6 space-y-4">
      <h2 className="font-semibold text-lg">Verify Human Identity</h2>
      <p className="text-text-secondary text-sm">
        Scan the QR code with the <strong className="text-text-primary">Self app</strong> on your phone.
        A ZK proof confirms you're a real human — no personal data is stored.
      </p>

      {state === "idle" && (
        <button
          onClick={handleStart}
          className="w-full py-3 rounded-xl bg-accent-primary text-background font-semibold hover:opacity-90"
        >
          Generate QR Code
        </button>
      )}

      {state === "scanning" && (
        <div className="text-center space-y-3">
          {/* QR Placeholder — replace with <SelfQRcode> from @selfxyz/qrcode */}
          <div className="w-48 h-48 mx-auto bg-white rounded-xl flex items-center justify-center">
            <span className="text-4xl">⬛</span>
          </div>
          <p className="text-sm text-text-secondary animate-pulse">Waiting for scan...</p>
        </div>
      )}

      {state === "verifying" && (
        <div className="text-center py-4">
          <motion.div
            className="w-12 h-12 mx-auto border-4 border-accent-primary border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
          />
          <p className="mt-3 text-sm text-text-secondary">Verifying ZK proof...</p>
        </div>
      )}

      {state === "done" && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center py-4"
        >
          <p className="text-4xl">✅</p>
          <p className="mt-2 font-semibold text-accent-primary">Identity Verified</p>
        </motion.div>
      )}
    </div>
  );
}
