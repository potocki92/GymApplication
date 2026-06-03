"use client";

import { toast } from "sonner";
import {
  CheckCircle2,
  Copy,
  HeartPulse,
  Plug,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useDictionary } from "@/hooks/use-dictionary";
import { useAppleHealthIntegrationStore } from "@/store";

export function AppleHealthCard() {
  const t = useDictionary();
  const ah = t.integrations.appleHealth;
  const integration = useAppleHealthIntegrationStore((s) => s.integration);
  const recentSamples = useAppleHealthIntegrationStore((s) => s.recentSamples);
  const recentLogs = useAppleHealthIntegrationStore((s) => s.recentLogs);
  const ingestUrl = useAppleHealthIntegrationStore((s) => s.ingestUrl);
  const working = useAppleHealthIntegrationStore((s) => s.working);
  const connect = useAppleHealthIntegrationStore((s) => s.connect);
  const disconnect = useAppleHealthIntegrationStore((s) => s.disconnect);

  const status = integration?.status ?? "disconnected";
  const token = integration?.token ?? null;
  const isConnected = status === "connected" && Boolean(token);

  const handleGenerate = async () => {
    const hadToken = Boolean(token);
    const ok = await connect();
    if (ok) {
      toast.success(hadToken ? ah.regenerateSuccess : ah.generateSuccess);
    } else {
      toast.error(ah.generateError);
    }
  };

  const handleDisconnect = async () => {
    const ok = await disconnect();
    if (ok) toast.success(ah.disconnected);
  };

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(ah.copied);
    } catch {
      toast.error(ah.copyError);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted">
            <HeartPulse className="size-7 text-rose-500" />
          </div>
          <div className="min-w-0">
            <CardTitle>{ah.name}</CardTitle>
            <CardDescription className="mt-1">{ah.description}</CardDescription>
          </div>
        </div>
        <StatusBadge connected={isConnected} dict={t} />
      </CardHeader>

      <CardContent className="space-y-5">
        {isConnected ? (
          <>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {ah.connectedAt}
                </dt>
                <dd className="mt-0.5">
                  {integration?.connectedAt
                    ? formatRelativeDate(integration.connectedAt)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {ah.lastSync}
                </dt>
                <dd className="mt-0.5">
                  {integration?.lastSyncAt
                    ? formatRelativeDate(integration.lastSyncAt)
                    : ah.lastSyncNever}
                </dd>
              </div>
            </dl>

            {/* Ingest URL + token to copy into the Shortcut */}
            <div className="space-y-3">
              <CopyField
                label={ah.ingestUrlLabel}
                value={ingestUrl}
                buttonLabel={ah.copyUrl}
                onCopy={handleCopy}
              />
              <CopyField
                label={ah.tokenLabel}
                value={token ?? ""}
                buttonLabel={ah.copyToken}
                onCopy={handleCopy}
              />
              <p className="text-xs text-muted-foreground">{ah.tokenHint}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleGenerate} disabled={working}>
                <RefreshCw className={working ? "size-4 animate-spin" : "size-4"} />
                {working ? ah.generating : ah.regenerate}
              </Button>
              <Button variant="outline" onClick={handleDisconnect} disabled={working}>
                <XCircle className="size-4" />
                {working ? ah.disconnecting : ah.disconnect}
              </Button>
            </div>
          </>
        ) : (
          <Button onClick={handleGenerate} disabled={working}>
            <Plug className="size-4" />
            {working ? ah.generating : ah.generate}
          </Button>
        )}

        <Instructions title={ah.instructionsTitle} steps={ah.instructions} />

        {isConnected ? (
          <>
            <Separator />
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">{ah.samplesTitle}</h3>
              {recentSamples.length === 0 ? (
                <p className="text-sm text-muted-foreground">{ah.samplesEmpty}</p>
              ) : (
                <ul className="divide-y divide-border rounded-md border border-border">
                  {recentSamples.slice(0, 8).map((sample) => (
                    <li
                      key={sample.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{ah.metrics[sample.metric]}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatRelativeDate(sample.startTime)}
                        </p>
                      </div>
                      <span className="shrink-0 tabular-nums">
                        {formatValue(sample.value)}
                        {sample.unit ? ` ${sample.unit}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">{ah.ingestHistoryTitle}</h3>
              {recentLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {ah.ingestHistoryEmpty}
                </p>
              ) : (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {recentLogs.map((log) => (
                    <li key={log.id} className="flex items-center gap-2">
                      {log.status === "error" ? (
                        <XCircle className="size-3 text-destructive" />
                      ) : (
                        <CheckCircle2 className="size-3 text-green-500" />
                      )}
                      <span>{formatRelativeDate(log.receivedAt)}</span>
                      <span>·</span>
                      <span>
                        {ah.ingestCount.replace(
                          "{count}",
                          String(log.samplesIngested),
                        )}
                      </span>
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

function CopyField({
  label,
  value,
  buttonLabel,
  onCopy,
}: {
  label: string;
  value: string;
  buttonLabel: string;
  onCopy: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <Input value={value} readOnly className="font-mono text-xs" />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={buttonLabel}
          title={buttonLabel}
          onClick={() => onCopy(value)}
        >
          <Copy className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function Instructions({
  title,
  steps,
}: {
  title: string;
  steps: readonly string[];
}) {
  return (
    <details className="rounded-md border border-border bg-card/40 px-3 py-2">
      <summary className="cursor-pointer text-sm font-medium">{title}</summary>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </details>
  );
}

function StatusBadge({
  connected,
  dict,
}: {
  connected: boolean;
  dict: ReturnType<typeof useDictionary>;
}) {
  const ah = dict.integrations.appleHealth;
  return connected ? (
    <Badge variant="default">{ah.statusConnected}</Badge>
  ) : (
    <Badge variant="secondary">{ah.statusDisconnected}</Badge>
  );
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
