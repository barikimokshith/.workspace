import { useState } from "react";
import { ChalkButton, ChalkCard } from "@/components/ChalkFX";
import { LockDoodle, ArrowDoodle } from "@/components/ChalkIcons";
import { haptic } from "@/lib/haptics";
import { playSound } from "@/lib/sfx";

interface PenaltyPaymentModalProps {
  amount: number;
  escapeAmount?: number;
  onCancel: () => void;
  onPay: () => Promise<void>;
}

export function PenaltyPaymentModal({
  amount,
  escapeAmount,
  onCancel,
  onPay,
}: PenaltyPaymentModalProps) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previousEscape = escapeAmount ?? Math.round(amount / 2);

  async function handlePay() {
    setError(null);
    setProcessing(true);
    haptic("commit");
    try {
      await onPay();
      playSound("session-complete");
      haptic("complete");
    } catch (err) {
      console.error("Penalty payment failed:", err);
      setError(err instanceof Error ? err.message : "Payment failed. Please retry.");
      haptic("cancel");
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/90 chalk-texture backdrop-blur-md">
      <ChalkCard className="mx-4 w-full max-w-md anim-step-in border-2 border-chalk/40">
        <div className="flex items-center gap-3">
          <LockDoodle size={32} className="text-chalk chalk-glow" />
          <h3 className="font-sketch text-3xl chalk-text chalk-glow">Penalty due</h3>
        </div>

        <p className="mt-3 font-hand text-lg text-chalk-dim leading-relaxed">
          Your last lock-in ended with an emergency escape. You cannot start or configure any new
          sessions until this penalty is paid.
        </p>

        <div className="mt-4 rounded border border-chalk/20 bg-chalk/5 p-3">
          <div className="flex items-center justify-between font-hand text-sm text-chalk-faint">
            <span>Previous escape fee</span>
            <span>₹{previousEscape}</span>
          </div>
          <div className="mt-1 flex items-center justify-between font-hand text-sm text-chalk-faint">
            <span>Emergency multiplier</span>
            <span>2×</span>
          </div>
          <div className="mt-2 border-t border-chalk/15 pt-2 flex items-baseline justify-between">
            <span className="font-hand text-base text-chalk">Total penalty</span>
            <span className="font-sketch text-4xl chalk-text">₹{amount}</span>
          </div>
        </div>

        {error && (
          <p className="mt-3 font-hand text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <ChalkButton
            variant="ghost"
            className="press"
            onClick={() => {
              haptic("cancel");
              onCancel();
            }}
            disabled={processing}
          >
            not yet
          </ChalkButton>
          <ChalkButton
            variant="danger"
            className="press inline-flex items-center gap-2"
            disabled={processing}
            onClick={handlePay}
          >
            {processing ? "processing…" : `pay ₹${amount}`}
            {!processing && <ArrowDoodle size={16} className="text-chalk" />}
          </ChalkButton>
        </div>

        <p className="mt-4 font-hand text-xs text-chalk-faint text-center">demo: no real charge.</p>
      </ChalkCard>
    </div>
  );
}

