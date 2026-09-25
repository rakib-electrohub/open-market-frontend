import { useState, useEffect } from "react";
import { Zap } from "lucide-react";

function pad(n) { return String(n).padStart(2, "0"); }

export default function FlashSaleTimer({ endTime, label = "Flash Sale Ends In" }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    const calc = () => {
      const diff = new Date(endTime) - new Date();
      if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true };
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      return { hours, minutes, seconds, expired: false };
    };
    setTimeLeft(calc());
    const interval = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  if (timeLeft.expired) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 text-xs text-white/80 font-medium">
        <Zap className="w-3.5 h-3.5 text-yellow-300" />
        <span>{label}:</span>
      </div>
      <div className="flex items-center gap-1">
        {[timeLeft.hours, timeLeft.minutes, timeLeft.seconds].map((val, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="bg-white/20 backdrop-blur text-white font-poppins font-bold text-sm px-2 py-0.5 rounded countdown-pulse min-w-[2rem] text-center">
              {pad(val)}
            </span>
            {i < 2 && <span className="text-white font-bold text-sm">:</span>}
          </span>
        ))}
      </div>
    </div>
  );
}