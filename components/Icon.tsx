// Icon: maps named icons to lucide-react glyphs, plus a custom badminton
// "shuttle" brand mark that Lucide doesn't ship. Stroke defaults to 1.7.
import {
  Flag,
  LayoutGrid,
  Clock,
  User,
  RefreshCw,
  Bell,
  Calendar,
  Check,
  Send,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  X,
  Zap,
  Flame,
  MapPin,
  Activity,
  Trophy,
  Sun,
  Moon,
  Circle,
  type LucideIcon,
} from "lucide-react";

export type IconName =
  | "flag"
  | "court"
  | "clock"
  | "player"
  | "refresh"
  | "bell"
  | "calendar"
  | "grid"
  | "check"
  | "send"
  | "sparkle"
  | "arrow"
  | "chevron"
  | "chevronDown"
  | "x"
  | "bolt"
  | "warm"
  | "pin"
  | "signal"
  | "trophy"
  | "sun"
  | "moon"
  | "dot"
  | "shuttle";

const MAP: Record<Exclude<IconName, "shuttle">, LucideIcon> = {
  flag: Flag,
  court: LayoutGrid,
  clock: Clock,
  player: User,
  refresh: RefreshCw,
  bell: Bell,
  calendar: Calendar,
  grid: LayoutGrid,
  check: Check,
  send: Send,
  sparkle: Sparkles,
  arrow: ArrowRight,
  chevron: ChevronRight,
  chevronDown: ChevronDown,
  x: X,
  bolt: Zap,
  warm: Flame,
  pin: MapPin,
  signal: Activity,
  trophy: Trophy,
  sun: Sun,
  moon: Moon,
  dot: Circle,
};

type IconProps = {
  name: IconName;
  size?: number;
  stroke?: number;
  fill?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export function Icon({
  name,
  size = 18,
  stroke = 1.7,
  fill = false,
  className,
  style,
}: IconProps) {
  if (name === "shuttle") {
    // Custom badminton-shuttle brand mark (not shipped by Lucide).
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
        aria-hidden="true"
      >
        <path d="M12 13m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0M11 10 8 3M13 10l3-7M10.5 11 3 9M13.5 11l7.5-2" />
      </svg>
    );
  }

  const Glyph = MAP[name];
  return (
    <Glyph
      size={size}
      strokeWidth={stroke}
      fill={fill ? "currentColor" : "none"}
      className={className}
      style={style}
      aria-hidden="true"
    />
  );
}
