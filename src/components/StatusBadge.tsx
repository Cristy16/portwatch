// src/components/StatusBadge.tsx
import type { TripStatus } from "@/lib/status";

const STATUS_STYLES: Record<TripStatus, string> = {
  NORMAL: "bg-green-100 text-green-800 border-green-300",
  MONITOR: "bg-amber-100 text-amber-800 border-amber-300",
  DISRUPTED: "bg-red-100 text-red-800 border-red-300",
  UNKNOWN: "bg-gray-100 text-gray-600 border-gray-300",
};

const STATUS_DOT: Record<TripStatus, string> = {
  NORMAL: "bg-green-600",
  MONITOR: "bg-amber-600",
  DISRUPTED: "bg-red-600",
  UNKNOWN: "bg-gray-500",
};

const STATUS_LABELS: Record<TripStatus, string> = {
  NORMAL: "Normal",
  MONITOR: "Monitor",
  DISRUPTED: "Disrupted",
  UNKNOWN: "Unknown",
};

interface StatusBadgeProps {
  status: TripStatus;
  className?: string;
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${STATUS_STYLES[status]} ${className}`}
    >
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}