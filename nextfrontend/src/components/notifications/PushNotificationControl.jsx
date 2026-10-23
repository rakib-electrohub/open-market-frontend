"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { apiClient } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

function decodeApplicationServerKey(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export default function PushNotificationControl({ className = "" }) {
  const [state, setState] = useState("checking");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    const checkStatus = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        if (active) setState("unsupported");
        return;
      }

      try {
        const config = await apiClient.notifications.getPushConfiguration();
        if (!active) return;
        if (!config.enabled) {
          setState("unavailable");
          return;
        }
        if (Notification.permission === "denied") {
          setState("blocked");
          return;
        }
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          await apiClient.notifications.savePushSubscription(subscription.toJSON());
        }
        setState(subscription ? "enabled" : "disabled");
      } catch (error) {
        console.error("Could not check push notification support:", error);
        if (active) setState("unavailable");
      }
    };
    checkStatus();
    return () => { active = false; };
  }, []);

  const enableNotifications = async () => {
    setBusy(true);
    try {
      const config = await apiClient.notifications.getPushConfiguration();
      if (!config.enabled || !config.publicKey) {
        throw new Error("Live alerts are not configured on the server yet.");
      }
      const permission = Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
      if (permission !== "granted") {
        throw new Error("Allow browser notifications to receive live alerts.");
      }

      const registration = await navigator.serviceWorker.register("/marketplace-sw.js");
      const subscription = await registration.pushManager.getSubscription()
        || await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeApplicationServerKey(config.publicKey),
        });
      await apiClient.notifications.savePushSubscription(subscription.toJSON());
      setState("enabled");
      toast({ title: "Live alerts enabled" });
    } catch (error) {
      console.error("Could not enable live alerts:", error);
      toast({ title: error.message || "Could not enable live alerts", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const labels = {
    checking: "Checking live alerts",
    unsupported: "Browser alerts are not supported",
    unavailable: "Live alerts are unavailable",
    blocked: "Browser notifications are blocked",
    disabled: "Enable live alerts",
    enabled: "Live alerts enabled",
  };
  const isDisabled = ["checking", "unsupported", "unavailable", "blocked", "enabled"].includes(state) || busy;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={enableNotifications}
      disabled={isDisabled}
      title={state === "unavailable" ? "Ask the site administrator to configure Web Push keys." : undefined}
    >
      {busy || state === "checking"
        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        : state === "enabled" ? <BellRing className="mr-2 h-4 w-4" /> : <Bell className="mr-2 h-4 w-4" />}
      {labels[state]}
    </Button>
  );
}
