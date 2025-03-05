// app/(auth)/sign-in/page.tsx
"use client";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import Script from "next/script";
import TelegramForm from "@/components/TelegramForm";
import { useEffect, useState } from "react";

export default function POFirstSaleTelBot() {
  const [isWebAppReady, setIsWebAppReady] = useState(false);

  useEffect(() => {
    const webapp = window.Telegram?.WebApp;
    if (webapp) {
      webapp.ready();
      webapp.expand();

      webapp.MainButton.setText("Submit Form").show();

      setIsWebAppReady(true);
    }
  }, []);

  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
        onLoad={() => setIsWebAppReady(true)}
      />

      <Suspense
        fallback={
          <div className="flex-center size-full">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        }
      >
        <section
          className="flex-center size-full max-sm:px-6"
          style={
            {
              "--tg-viewport-height": "100vh",
              "--tg-viewport-stable-height": "100vh",
            } as React.CSSProperties
          }
        >
          {isWebAppReady && <TelegramForm />}
        </section>
      </Suspense>
    </>
  );
}
