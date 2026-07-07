import { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-12 w-full rounded-2xl border border-white/70 bg-white/75 px-4 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100",
        props.className
      )}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-32 w-full rounded-2xl border border-white/70 bg-white/75 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100",
        props.className
      )}
    />
  );
}
