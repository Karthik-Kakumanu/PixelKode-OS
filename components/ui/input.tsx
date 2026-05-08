import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      suppressHydrationWarning
      className={cn(
        "flex h-11 w-full rounded-2xl border border-violet-200 bg-white/60 px-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-200",
        className
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";

Input.Password = function PasswordInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => { setHydrated(true); }, []);
  return (
    <div className="relative">
      <input
        suppressHydrationWarning
        type={show ? "text" : "password"}
        className={cn(
          "flex h-11 w-full rounded-2xl border border-violet-200 bg-white/60 px-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-200 pr-12",
          className
        )}
        {...props}
      />
      {hydrated && (
        <button
          type="button"
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 2.25 12c2.036 3.772 6.099 6.75 9.75 6.75 1.563 0 3.06-.362 4.396-1.02M21.75 12c-.512-.948-1.246-1.988-2.146-2.977m-3.102-2.684A9.716 9.716 0 0 0 12 3.75c-1.563 0-3.06.362-4.396 1.02m8.292 1.569A6.75 6.75 0 0 0 12 6.75c-3.651 0-7.714 2.978-9.75 6.75.512.948 1.246 1.988 2.146 2.977m3.102 2.684A9.716 9.716 0 0 0 12 20.25c1.563 0 3.06-.362 4.396-1.02m-8.292-1.569A6.75 6.75 0 0 0 12 17.25c3.651 0 7.714-2.978 9.75-6.75-.512-.948-1.246-1.988-2.146-2.977" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9.75 12 13.5m0 0-3.75-3.75m3.75 3.75V6.75m0 6.75c-3.651 0-7.714-2.978-9.75-6.75C4.286 5.228 8.349 2.25 12 2.25c3.651 0 7.714 2.978 9.75 6.75-2.036 3.772-6.099 6.75-9.75 6.75z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
};
