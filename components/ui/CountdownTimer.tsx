"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  endDate: string;
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(endDate: string): TimeLeft {
  const diff = Math.max(0, new Date(endDate).getTime() - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function CountdownTimer({ endDate, className }: CountdownTimerProps) {
  const [time, setTime] = useState<TimeLeft>(() => getTimeLeft(endDate));

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft(endDate)), 1000);
    return () => clearInterval(id);
  }, [endDate]);

  return (
    <span
      className={cn(
        "font-[family-name:var(--font-ibm-mono)] text-sm tabular-nums tracking-wider",
        className
      )}
    >
      {time.days > 0 && (
        <>
          <span>{pad(time.days)}</span>
          <span className="opacity-40 mx-0.5">D</span>
        </>
      )}
      <span>{pad(time.hours)}</span>
      <span className="opacity-40 mx-0.5">:</span>
      <span>{pad(time.minutes)}</span>
      <span className="opacity-40 mx-0.5">:</span>
      <span>{pad(time.seconds)}</span>
    </span>
  );
}
