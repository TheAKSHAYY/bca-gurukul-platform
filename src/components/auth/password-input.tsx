import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  onCapsLockChange?: (on: boolean) => void;
};

export const PasswordInput = forwardRef<HTMLInputElement, Props>(function PasswordInput(
  { className, onCapsLockChange, onKeyUp, onKeyDown, ...rest },
  ref,
) {
  const [show, setShow] = useState(false);

  function handleCaps(e: React.KeyboardEvent<HTMLInputElement>) {
    const on = e.getModifierState?.("CapsLock") ?? false;
    onCapsLockChange?.(on);
  }

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={show ? "text" : "password"}
        className={cn("pr-10", className)}
        onKeyUp={(e) => {
          handleCaps(e);
          onKeyUp?.(e);
        }}
        onKeyDown={(e) => {
          handleCaps(e);
          onKeyDown?.(e);
        }}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
        aria-label={show ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
});
