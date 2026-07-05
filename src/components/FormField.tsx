import React from "react";
import { cn } from "../lib/utils";

interface FormFieldProps {
  /** 标签文本 */
  label: string;
  /** 帮助文本 */
  helpText?: string;
  /** 错误信息 */
  error?: string;
  /** 是否必填 */
  required?: boolean;
  /** 子元素 */
  children: React.ReactNode;
  /** 额外类名 */
  className?: string;
}

/**
 * 表单字段组件
 * 统一管理 label + input + helpText/error 的布局
 */
export default function FormField({
  label,
  helpText,
  error,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <label className="block text-xs font-medium text-[hsl(var(--text-secondary))]">
        {label}
        {required && (
          <span className="text-[hsl(var(--danger))] ml-0.5">*</span>
        )}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-[hsl(var(--danger))]">{error}</p>
      ) : helpText ? (
        <p className="text-xs text-[hsl(var(--text-tertiary))]">{helpText}</p>
      ) : null}
    </div>
  );
}
