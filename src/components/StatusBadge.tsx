type Status =
  | "online"
  | "offline"
  | "unknown"
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "stopped"
  | "inactive"
  | "active"
  | "partially_completed";

const STYLES: Record<string, string> = {
  online: "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.25)]",
  offline: "bg-[hsl(var(--danger)/0.1)] text-[hsl(var(--danger))] border border-[hsl(var(--danger)/0.25)]",
  unknown: "bg-[hsl(var(--text-tertiary)/0.1)] text-[hsl(var(--text-secondary))] border border-[hsl(var(--text-tertiary)/0.25)]",
  pending: "bg-[hsl(var(--text-tertiary)/0.1)] text-[hsl(var(--text-secondary))] border border-[hsl(var(--text-tertiary)/0.25)]",
  running: "bg-[hsl(var(--info)/0.1)] text-[hsl(var(--info))] border border-[hsl(var(--info)/0.25)]",
  completed: "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.25)]",
  failed: "bg-[hsl(var(--danger)/0.1)] text-[hsl(var(--danger))] border border-[hsl(var(--danger)/0.25)]",
  stopped: "bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))] border border-[hsl(var(--warning)/0.25)]",
  inactive: "bg-[hsl(var(--text-tertiary)/0.1)] text-[hsl(var(--text-secondary))] border border-[hsl(var(--text-tertiary)/0.25)]",
  active: "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.25)]",
  partially_completed: "bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))] border border-[hsl(var(--warning)/0.25)]",
};

const LABELS: Record<string, string> = {
  online: "在线",
  offline: "离线",
  unknown: "未知",
  pending: "等待中",
  running: "运行中",
  completed: "已完成",
  failed: "失败",
  stopped: "已停止",
  inactive: "未激活",
  active: "已激活",
  partially_completed: "部分完成",
};

const DOT_COLORS: Record<string, string> = {
  online: "bg-[hsl(var(--success))]",
  offline: "bg-[hsl(var(--danger))]",
  unknown: "bg-[hsl(var(--text-tertiary))]",
  pending: "bg-[hsl(var(--text-tertiary))]",
  running: "bg-[hsl(var(--info))]",
  completed: "bg-[hsl(var(--success))]",
  failed: "bg-[hsl(var(--danger))]",
  stopped: "bg-[hsl(var(--warning))]",
  inactive: "bg-[hsl(var(--text-tertiary))]",
  active: "bg-[hsl(var(--success))]",
  partially_completed: "bg-[hsl(var(--warning))]",
};

interface StatusBadgeProps {
  status: Status;
  /** 自定义标签文本 */
  label?: string;
  /** 是否显示圆点，默认 true */
  showDot?: boolean;
  /** 额外类名 */
  className?: string;
}

export default function StatusBadge({
  status,
  label,
  showDot = true,
  className = "",
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${STYLES[status]} ${className}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${DOT_COLORS[status]}`}
        />
      )}
      {label ?? LABELS[status]}
    </span>
  );
}

/**
 * 简单的文本状态徽章（无背景，仅颜色）
 * 用于表格内联显示
 */
export function StatusText({
  status,
  children,
}: {
  status: "success" | "danger" | "warning" | "info";
  children: React.ReactNode;
}) {
  const colorClass = {
    success: "text-[hsl(var(--success))]",
    danger: "text-[hsl(var(--danger))]",
    warning: "text-[hsl(var(--warning))]",
    info: "text-[hsl(var(--info))]",
  }[status];

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${colorClass}`}>
      {children}
    </span>
  );
}
