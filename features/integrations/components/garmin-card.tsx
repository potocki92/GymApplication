"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { CheckCircle2, Plug, RefreshCw, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useDictionary } from "@/hooks/use-dictionary";
import { useGarminIntegrationStore } from "@/store";
import { formatGarminActivity } from "@/lib/garmin/format";

export function GarminCard() {
  const t = useDictionary();
  const integration = useGarminIntegrationStore((s) => s.integration);
  const recentActivities = useGarminIntegrationStore((s) => s.recentActivities);
  const recentLogs = useGarminIntegrationStore((s) => s.recentLogs);
  const syncing = useGarminIntegrationStore((s) => s.syncing);
  const sync = useGarminIntegrationStore((s) => s.sync);
  const disconnect = useGarminIntegrationStore((s) => s.disconnect);
  const [disconnecting, setDisconnecting] = useState(false);

  const status = integration?.status ?? "disconnected";
  const isConnected = status === "connected";

  const handleSync = async () => {
    const result = await sync();
    if (result) {
      toast.success(
        t.integrations.garmin.syncSuccess.replace(
          "{count}",
          String(result.activitiesSynced),
        ),
      );
    } else {
      toast.error(t.integrations.garmin.syncError);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    const ok = await disconnect();
    setDisconnecting(false);
    if (ok) toast.success(t.integrations.garmin.disconnected);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Image
              src="/integrations/garmin.svg"
              alt="Garmin"
              width={32}
              height={32}
            />
          </div>
          <div className="min-w-0">
            <CardTitle>{t.integrations.garmin.name}</CardTitle>
            <CardDescription className="mt-1">
              {t.integrations.garmin.description}
            </CardDescription>
          </div>
        </div>
        <StatusBadge status={status} dict={t} />
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Metadata row */}
        {isConnected ? (
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t.integrations.garmin.connectedAt}
              </dt>
              <dd className="mt-0.5">
                {integration?.connectedAt
                  ? formatRelativeDate(integration.connectedAt)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t.integrations.garmin.lastSync}
              </dt>
              <dd className="mt-0.5">
                {integration?.lastSyncAt
                  ? formatRelativeDate(integration.lastSyncAt)
                  : t.integrations.garmin.lastSyncNever}
              </dd>
            </div>
          </dl>
        ) : null}

        {/* CTAs */}
        <div className="flex flex-wrap gap-2">
          {!isConnected ? (
            <Button asChild>
              {/* Plain anchor — must be a full-page navigation so the route handler
                  can set httpOnly OAuth cookies and redirect to Garmin. */}
              <a href="/api/integrations/garmin/connect">
                <Plug className="size-4" />
                {t.integrations.garmin.connect}
              </a>
            </Button>
          ) : (
            <>
              <Button onClick={handleSync} disabled={syncing}>
                <RefreshCw className={syncing ? "size-4 animate-spin" : "size-4"} />
                {syncing
                  ? t.integrations.garmin.syncing
                  : t.integrations.garmin.sync}
              </Button>
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                <XCircle className="size-4" />
                {disconnecting
                  ? t.integrations.garmin.disconnecting
                  : t.integrations.garmin.disconnect}
              </Button>
            </>
          )}
        </div>

        {/* Recent activities */}
        {isConnected ? (
          <>
            <Separator />
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">
                {t.integrations.garmin.recentActivitiesTitle}
              </h3>
              {recentActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t.integrations.garmin.recentActivitiesEmpty}
                </p>
              ) : (
                <ul className="divide-y divide-border rounded-md border border-border">
                  {recentActivities.slice(0, 5).map((activity) => {
                    const summary = formatGarminActivity(activity);
                    const typeLabel =
                      t.integrations.garmin.activityTypes[
                        activity.activityType as keyof typeof t.integrations.garmin.activityTypes
                      ] ?? t.integrations.garmin.activityTypes.other;
                    return (
                      <li
                        key={activity.id}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">{typeLabel}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {formatRelativeDate(activity.startTime)}
                            {summary.distance ? ` · ${summary.distance}` : ""}
                            {summary.duration ? ` · ${summary.duration}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {summary.avgHr ? <span>♥ {summary.avgHr}</span> : null}
                          {summary.calories ? <span>{summary.calories}</span> : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">
                {t.integrations.garmin.syncHistoryTitle}
              </h3>
              {recentLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t.integrations.garmin.syncHistoryEmpty}
                </p>
              ) : (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {recentLogs.map((log) => (
                    <li key={log.id} className="flex items-center gap-2">
                      {log.status === "success" ? (
                        <CheckCircle2 className="size-3 text-green-500" />
                      ) : log.status === "error" ? (
                        <XCircle className="size-3 text-destructive" />
                      ) : (
                        <RefreshCw className="size-3" />
                      )}
                      <span>{formatRelativeDate(log.startedAt)}</span>
                      <span>·</span>
                      <span>{log.activitiesSynced} aktywności</span>
                      {log.errorMessage ? (
                        <span className="text-destructive">· {log.errorMessage.split(":")[0]}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StatusBadge({
  status,
  dict,
}: {
  status: "connected" | "disconnected" | "error" | "expired";
  dict: ReturnType<typeof useDictionary>;
}) {
  switch (status) {
    case "connected":
      return <Badge variant="default">{dict.integrations.garmin.statusConnected}</Badge>;
    case "error":
      return <Badge variant="destructive">{dict.integrations.garmin.statusError}</Badge>;
    case "expired":
      return <Badge variant="destructive">{dict.integrations.garmin.statusExpired}</Badge>;
    case "disconnected":
    default:
      return <Badge variant="secondary">{dict.integrations.garmin.statusDisconnected}</Badge>;
  }
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
