"use client";

import React, { useEffect, useState } from "react";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@/design-system/common/Header";
import Button from "@/design-system/common/Button";
import Section from "@/design-system/common/Section";
import Card from "@/design-system/common/Card";
import Switch from "@/design-system/common/Switch";
import InputField from "@/design-system/common/InputField";
import Dialog from "@/design-system/common/Dialog";
import {
  DeliveryTruck,
  StoreLocation,
  Globe,
  FaLocationDot,
  ChevronRight,
  AiOutlineInfoCircle,
} from "@/design-system/icons";
import { useRouter } from "next/navigation";
import useBusinessStore from "@/store/businessStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ZoneKey = "local" | "interstate" | "international";
// A zone's stored shape (maps 1:1 onto backend ZoneRate). "Configured" is
// DERIVED (rate > 0 && eta set) — never a stored flag — so turning a zone off
// only flips `enabled` and never loses the rate/eta.
type ZoneState = { enabled: boolean; rate: number; eta: string };
type Zones = Record<ZoneKey, ZoneState>;

const ALL_ETAS = ["Same day", "1-2 days", "3-5 days", "1 week", "2+ weeks"];
// International can't be same-day; everything else can.
const etasFor = (k: ZoneKey) =>
  k === "international" ? ["3-5 days", "1 week", "2+ weeks"] : ALL_ETAS;
// Fallback ETA for legacy rows that carry a rate but no saved eta yet.
const DEFAULT_ETA: Record<ZoneKey, string> = {
  local: "1-2 days",
  interstate: "3-5 days",
  international: "1 week",
};

const isConfigured = (z: ZoneState) => z.rate > 0 && !!z.eta;
const formatNaira = (n: number) => "₦" + n.toLocaleString("en-US");
const digitsOnly = (s: string) => s.replace(/[^\d]/g, "");
const serialize = (z: Zones, partner: boolean) => JSON.stringify({ z, partner });

// A quiet leading icon in a rounded container, shared by every row so the
// screen reads as one system.
const RowIcon = ({ icon: Icon }: { icon: typeof DeliveryTruck }) => (
  <div className="shrink-0 w-9 h-9 rounded-field bg-ink-3 flex items-center justify-center">
    <Icon size={18} className="text-ink-60" />
  </div>
);

// Delivery-time estimate — a single-select radiogroup (arrow-key navigable). The
// stored string is shown verbatim on the buyer's option + order timeline.
const EtaPresets = ({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) => {
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const i = options.indexOf(value);
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown")
      next = i < 0 ? 0 : (i + 1) % options.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = i < 0 ? options.length - 1 : (i - 1 + options.length) % options.length;
    if (next >= 0) {
      e.preventDefault();
      onChange(options[next]);
    }
  };
  return (
    <div
      role="radiogroup"
      aria-label="Delivery time"
      className="flex flex-wrap gap-2"
      onKeyDown={onKeyDown}>
      {options.map((preset, idx) => {
        const selected = value === preset;
        return (
          <button
            key={preset}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected || (!value && idx === 0) ? 0 : -1}
            onClick={() => onChange(preset)}
            className={cn(
              "h-9 px-3 rounded-full border text-body-sm transition-colors",
              selected
                ? "border-brand bg-brand/5 text-brand font-medium"
                : "border-ink-10 text-ink-60"
            )}>
            {preset}
          </button>
        );
      })}
    </div>
  );
};

const CovPill = ({
  label,
  tone,
}: {
  label: string;
  tone: "ok" | "off" | "warn";
}) => (
  <span
    className={cn(
      "text-caption font-medium px-2.5 py-1 rounded-full shrink-0",
      tone === "ok" && "bg-green-50 text-green-700",
      tone === "off" && "bg-ink-3 text-ink-60",
      tone === "warn" && "bg-orange-50 text-orange-600"
    )}>
    {label}
  </span>
);

// The outcome, up top: what checkout will actually offer, derived from the SAME
// predicate the backend uses (`enabled && rate > 0`) so it can't over-promise.
const CoverageStrip = ({
  sellerState,
  zones,
  partnerEnabled,
}: {
  sellerState: string;
  zones: Zones;
  partnerEnabled: boolean;
}) => {
  const localOk = isConfigured(zones.local);
  const interSelf = zones.interstate.enabled && isConfigured(zones.interstate);
  const intlSelf = zones.international.enabled && isConfigured(zones.international);

  // A region is reachable if the seller's own delivery covers it OR partner
  // couriers are on — Shipbubble quotes per address, nationwide + international.
  const via = (self: boolean) =>
    self
      ? partnerEnabled
        ? "Your delivery + couriers"
        : "Your delivery"
      : "Couriers";
  const interCovered = interSelf || partnerEnabled;
  const intlCovered = intlSelf || partnerEnabled;

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <DeliveryTruck size={18} className="text-ink-90" />
        <p className="text-body font-medium text-ink-90">Where buyers can order</p>
      </div>
      <div className="divide-y divide-ink-5">
        <div className="flex items-center justify-between gap-3 py-2">
          <div className="min-w-0">
            <p className="text-body-sm text-ink-90">In {sellerState}</p>
            {localOk && <p className="text-caption text-ink-40">{via(true)}</p>}
          </div>
          {localOk ? (
            <CovPill label="Covered" tone="ok" />
          ) : (
            <CovPill label="Set your rate" tone="warn" />
          )}
        </div>
        <div className="flex items-center justify-between gap-3 py-2">
          <div className="min-w-0">
            <p className="text-body-sm text-ink-90">Other states</p>
            {interCovered && (
              <p className="text-caption text-ink-40">{via(interSelf)}</p>
            )}
          </div>
          {interCovered ? (
            <CovPill label="Covered" tone="ok" />
          ) : (
            <CovPill label="Not covered" tone="warn" />
          )}
        </div>
        <div className="flex items-center justify-between gap-3 py-2">
          <div className="min-w-0">
            <p className="text-body-sm text-ink-90">International</p>
            {intlCovered && (
              <p className="text-caption text-ink-40">{via(intlSelf)}</p>
            )}
          </div>
          {intlCovered ? (
            <CovPill label="Covered" tone="ok" />
          ) : (
            <CovPill label="Not covered" tone="warn" />
          )}
        </div>
      </div>
      {!interCovered && (
        <div className="mt-3 flex items-start gap-2 bg-orange-50 text-orange-600 rounded-field px-3 py-2">
          <AiOutlineInfoCircle size={15} className="mt-0.5 shrink-0" />
          <p className="text-caption">
            Buyers outside {sellerState} can&apos;t check out — turn on courier
            partners or your own Interstate delivery.
          </p>
        </div>
      )}
    </Card>
  );
};

type Draft = { rate: string; eta: string };

const ZoneRow = ({
  zoneKey,
  title,
  icon: Icon,
  required,
  state,
  expanded,
  draft,
  onOpen,
  onToggle,
  onDraftRate,
  onDraftEta,
  onDone,
  onRemove,
}: {
  zoneKey: ZoneKey;
  title: string;
  icon: typeof DeliveryTruck;
  required: boolean;
  state: ZoneState;
  expanded: boolean;
  draft: Draft | null;
  onOpen: () => void;
  onToggle: () => void;
  onDraftRate: (v: string) => void;
  onDraftEta: (v: string) => void;
  onDone: () => void;
  onRemove: () => void;
}) => {
  const configured = isConfigured(state);
  const summary = configured ? `${formatNaira(state.rate)} · ${state.eta}` : "Not set up";
  const editLabel = `${configured || required ? "Edit" : "Set up"} ${title} delivery`;
  const canDone = Number(digitsOnly(draft?.rate ?? "")) > 0 && !!draft?.eta;

  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        {/* Edit target — a button; the toggle is a SIBLING, never nested. */}
        <button
          type="button"
          onClick={onOpen}
          aria-expanded={expanded}
          aria-label={editLabel}
          className="flex-1 min-w-0 flex items-center gap-3 text-left">
          <RowIcon icon={Icon} />
          <div className="flex-1 min-w-0">
            <p className="text-body font-medium text-ink-90 truncate">{title}</p>
            <p
              className={cn(
                "text-body-sm mt-0.5",
                configured ? "text-ink-60" : "text-ink-40"
              )}>
              {summary}
            </p>
          </div>
          {required && (
            <span className="text-caption text-ink-40 shrink-0">Required</span>
          )}
          {!required && !configured && (
            <span className="text-body-sm font-medium text-brand shrink-0 flex items-center gap-0.5">
              Set up
              <ChevronRight size={16} />
            </span>
          )}
          {(required || configured) && (
            <ChevronRight size={18} className="text-ink-20 shrink-0" />
          )}
        </button>
        {!required && configured && (
          <Switch
            name={`${zoneKey}_enabled`}
            ariaLabel={`Offer ${title}`}
            checked={state.enabled}
            onChange={onToggle}
          />
        )}
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-dashed border-ink-10">
          <p className="text-caption text-ink-60 mb-1.5">Delivery rate</p>
          <InputField
            type="text"
            inputMode="numeric"
            name={`${zoneKey}_rate`}
            value={draft?.rate ?? ""}
            onChange={(e) => onDraftRate(e.target.value)}
            placeholder="0"
            showNairaSymbol
          />
          <p className="text-caption text-ink-60 mb-2 mt-4">Delivery time</p>
          <EtaPresets
            value={draft?.eta ?? ""}
            onChange={onDraftEta}
            options={etasFor(zoneKey)}
          />
          <div className="flex items-center gap-4 mt-5">
            <Button onClick={onDone} disabled={!canDone}>
              Done
            </Button>
            {configured && !required && (
              <button
                type="button"
                onClick={onRemove}
                className="text-body-sm text-ink-40 shrink-0">
                Remove
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Page = () => {
  const router = useRouter();
  const { store, getAuthenticatedUserStore, updateShippingSettings, isLoading } =
    useBusinessStore();

  // Self "Local" is anchored to the seller's own state, never hardcoded.
  const sellerState = store?.address?.province || "your state";

  const [zones, setZones] = useState<Zones>({
    local: { enabled: true, rate: 0, eta: "" },
    interstate: { enabled: false, rate: 0, eta: "" },
    international: { enabled: false, rate: 0, eta: "" },
  });
  const [partnerEnabled, setPartnerEnabled] = useState(true);
  const [editing, setEditing] = useState<ZoneKey | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [showDiscard, setShowDiscard] = useState(false);

  // Hydrate ONCE per mount (guarded on savedSnapshot === null) so a background
  // store refresh — e.g. the getAuthenticatedUserStore fired after a save — can
  // never clobber in-progress edits. Falls back to the legacy flat
  // shipping_amount for the Local rate on first migration.
  useEffect(() => {
    if (!store || savedSnapshot !== null) return;
    const bs = store.business_setting;
    const build = (key: ZoneKey, fallbackRate = 0): ZoneState => {
      const z = bs?.self_zones?.[key];
      const rate = z?.rate || fallbackRate;
      const eta = z?.eta || (rate > 0 ? DEFAULT_ETA[key] : "");
      const enabled = key === "local" ? true : z?.enabled ?? false;
      return { enabled, rate, eta };
    };
    const hydrated: Zones = {
      local: build("local", bs?.shipping_amount || 0),
      interstate: build("interstate"),
      international: build("international"),
    };
    const partner = bs?.partner_enabled ?? true;
    setZones(hydrated);
    setPartnerEnabled(partner);
    setSavedSnapshot(serialize(hydrated, partner));
  }, [store, savedSnapshot]);

  const dirty =
    savedSnapshot !== null && serialize(zones, partnerEnabled) !== savedSnapshot;

  // Guard against losing staged edits on a browser refresh / tab close.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const openZone = (key: ZoneKey) => {
    if (editing === key) {
      setEditing(null);
      setDraft(null);
      return;
    }
    setEditing(key);
    setDraft({
      rate: zones[key].rate ? zones[key].rate.toLocaleString("en-US") : "",
      eta: zones[key].eta,
    });
  };

  const setDraftRate = (v: string) => {
    const d = digitsOnly(v);
    setDraft((p) => ({
      rate: d ? Number(d).toLocaleString("en-US") : "",
      eta: p?.eta ?? "",
    }));
  };
  const setDraftEta = (eta: string) =>
    setDraft((p) => ({ rate: p?.rate ?? "", eta }));

  // Commit the draft into staged state. `enabled` is deliberately untouched —
  // a first-time setup therefore lands OFF (it starts false), and the seller
  // turns it on from the list toggle when ready.
  const commitDraft = (key: ZoneKey) => {
    if (!draft) return;
    const rate = Number(digitsOnly(draft.rate));
    if (!(rate > 0) || !draft.eta) return;
    setZones((z) => ({ ...z, [key]: { ...z[key], rate, eta: draft.eta } }));
    setEditing(null);
    setDraft(null);
  };

  const removeZone = (key: ZoneKey) => {
    setZones((z) => ({ ...z, [key]: { enabled: false, rate: 0, eta: "" } }));
    setEditing(null);
    setDraft(null);
  };

  const toggleZone = (key: ZoneKey) =>
    setZones((z) => ({ ...z, [key]: { ...z[key], enabled: !z[key].enabled } }));

  const handleSave = () => {
    if (!isConfigured(zones.local)) {
      toast.error("Set your local delivery rate and time — it's required.");
      if (editing !== "local") openZone("local");
      return;
    }
    if (!store?.id) return;
    const committed = serialize(zones, partnerEnabled);
    updateShippingSettings(
      store.id,
      {
        partner_enabled: partnerEnabled,
        self_zones: {
          local: { enabled: true, rate: zones.local.rate, eta: zones.local.eta },
          interstate: {
            enabled: zones.interstate.enabled,
            rate: zones.interstate.rate,
            eta: zones.interstate.eta,
          },
          international: {
            enabled: zones.international.enabled,
            rate: zones.international.rate,
            eta: zones.international.eta,
          },
        },
      },
      // Callback fires only on success: mark clean immediately (closes the dirty
      // cue without waiting for the refetch), then refresh the store via getMe —
      // NOT getStoreById, which hits the public list that strips shipping config.
      () => {
        setSavedSnapshot(committed);
        getAuthenticatedUserStore();
      }
    );
  };

  const handleBack = () => {
    if (dirty) setShowDiscard(true);
    else router.back();
  };

  const ZONE_META: {
    key: ZoneKey;
    title: string;
    icon: typeof DeliveryTruck;
    required: boolean;
  }[] = [
    {
      key: "local",
      title: `Local · within ${sellerState}`,
      icon: StoreLocation,
      required: true,
    },
    { key: "interstate", title: "Interstate", icon: FaLocationDot, required: false },
    { key: "international", title: "International", icon: Globe, required: false },
  ];

  return (
    <PageShell
      header={
        <Header showBack onBackClick={handleBack} customText="Shipping Method" />
      }
      footerAction={
        <div className="w-full">
          {dirty && (
            <p className="text-caption text-orange-600 text-center mb-2 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
              Unsaved changes
            </p>
          )}
          <Button onClick={handleSave} loading={isLoading} disabled={!dirty}>
            {dirty ? "Save changes" : "Saved"}
          </Button>
        </div>
      }>
      <p className="text-body-sm text-ink-60">
        Set how you deliver. Buyers see the right option at checkout based on where
        they are.
      </p>

      <CoverageStrip
        sellerState={sellerState}
        zones={zones}
        partnerEnabled={partnerEnabled}
      />

      <Section title="Your delivery">
        <Card>
          <div className="divide-y divide-ink-5">
            {ZONE_META.map((m) => (
              <ZoneRow
                key={m.key}
                zoneKey={m.key}
                title={m.title}
                icon={m.icon}
                required={m.required}
                state={zones[m.key]}
                expanded={editing === m.key}
                draft={editing === m.key ? draft : null}
                onOpen={() => openZone(m.key)}
                onToggle={() => toggleZone(m.key)}
                onDraftRate={setDraftRate}
                onDraftEta={setDraftEta}
                onDone={() => commitDraft(m.key)}
                onRemove={() => removeZone(m.key)}
              />
            ))}
          </div>
        </Card>
      </Section>

      <Section title="Courier partners">
        <Card>
          <div className="flex items-center gap-3">
            <RowIcon icon={DeliveryTruck} />
            <div className="flex-1 min-w-0">
              <p className="text-body font-medium text-ink-90">Courier partners</p>
              <p className="text-body-sm text-ink-60">
                Live, tracked courier rates, quoted per address
              </p>
            </div>
            <Switch
              name="partner_enabled"
              ariaLabel="Offer courier partners"
              checked={partnerEnabled}
              onChange={(e) => setPartnerEnabled(e.target.checked)}
            />
          </div>
        </Card>
      </Section>

      <Dialog
        isOpen={showDiscard}
        onClose={() => setShowDiscard(false)}
        ariaLabel="Discard changes">
        <div className="space-y-4">
          <div>
            <p className="text-h2 font-medium text-ink-90">Discard changes?</p>
            <p className="text-body-sm text-ink-60 mt-1">
              You&apos;ll lose the delivery details you just edited.
            </p>
          </div>
          <div className="space-y-2.5">
            <Button onClick={() => setShowDiscard(false)}>Keep editing</Button>
            <Button
              variant="bordered"
              onClick={() => {
                setShowDiscard(false);
                router.back();
              }}>
              Discard changes
            </Button>
          </div>
        </div>
      </Dialog>
    </PageShell>
  );
};

export default Page;
