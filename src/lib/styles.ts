/**
 * 集中管理的样式常量
 * 用于保持整个应用的视觉一致性
 */

/** 输入框样式 */
export const inputClass =
  "px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--bg-input))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)_/_0.4)]";

/** 主要按钮样式 */
export const btnClass =
  "px-5 py-2 rounded-lg text-sm font-medium text-white bg-[hsl(var(--accent))] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed";

/** 次要按钮样式 */
export const btnSecondaryClass =
  "px-4 py-2 rounded-lg text-xs border border-[hsl(var(--border))] hover:bg-[hsl(var(--bg-hover))] transition-colors";

/** 表单标签样式 */
export const labelClass =
  "block text-xs font-medium text-[hsl(var(--text-secondary))] mb-1";

/** 页面标题样式 */
export const pageTitleClass =
  "text-sm font-semibold mb-3";

/** 卡片样式 */
export const cardClass =
  "bg-[hsl(var(--bg-card))] border border-[hsl(var(--border))] rounded-lg shadow-sm p-5";

/** 表格容器样式 */
export const tableContainerClass =
  "overflow-hidden rounded-lg border border-[hsl(var(--border))]";

/** 表头样式 */
export const tableHeaderClass =
  "bg-[hsl(var(--muted))] text-left px-3 py-2 font-medium text-[hsl(var(--text-secondary))] text-xs";

/** 表格单元格样式 */
export const tableCellClass =
  "px-3 py-2 border-t border-[hsl(var(--border))]";

/** 等宽字体样式 (用于 IP、端口等) */
export const monoClass =
  "font-mono text-xs";

/** 错误文本样式 */
export const errorClass =
  "text-sm text-[hsl(var(--danger))]";

/** 帮助文本样式 */
export const helpTextClass =
  "text-xs text-[hsl(var(--text-tertiary))]";
