type CountUpProps = {
  value: number;
  suffix?: string;
  durationMs?: number;
  className?: string;
};

export function CountUp({ value, suffix = "", className }: CountUpProps) {
  return (
    <span className={className}>
      {value}
      {suffix}
    </span>
  );
}
