"use client";

import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

export function AnimatedCounter({ 
  value, 
  isCurrency = false,
  prefix = "" 
}: { 
  value: number; 
  isCurrency?: boolean;
  prefix?: string;
}) {
  // Spring physics for smooth, luxurious number ticking
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
  
  const displayValue = useTransform(spring, (current) => {
    if (isCurrency) {
      return prefix + Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(current).replace("₹", "₹ ");
    }
    return prefix + Math.round(current).toLocaleString();
  });

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span className="inline-block">{displayValue}</motion.span>;
}