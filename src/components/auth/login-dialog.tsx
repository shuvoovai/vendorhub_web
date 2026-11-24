"use client";

import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  next: string; // page to come back to after "create account"
  onSuccess?: () => void;
};

/** Login as a popup: the user stays on the page (checkout) and goes on right after logging in. */
export function LoginDialog({ open, onOpenChange, next, onSuccess }: Props) {
  const t = useTranslations("LoginDialog");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <div className="flex flex-col gap-1 pr-8">
          <DialogTitle className="type-h3 text-ink">{t("title")}</DialogTitle>
          <DialogDescription className="type-caption text-ink-muted">
            {t("text")}
          </DialogDescription>
        </div>
        <Suspense fallback={null}>
          {open && (
            <LoginForm
              next={next}
              onSuccess={() => {
                onOpenChange(false);
                onSuccess?.();
              }}
            />
          )}
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}
