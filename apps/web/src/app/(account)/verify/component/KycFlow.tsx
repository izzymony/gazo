/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import StepNavigation from "@vibaar/ui/common/StepNavigation";
import Button from "@vibaar/ui/common/Button";
import InputField from "@vibaar/ui/common/InputField";
import useBusinessStore from "@/store/businessStore";
import KycHero from "./KycHero";
import {
  Camera,
  IdentityCard,
  Book,
  Check,
  CircleCheck,
  AiOutlineInfoCircle,
  Shield,
  User,
} from "@vibaar/ui/icons";
import Loader from "@vibaar/ui/common/Loader";

const ID_TYPES = [
  { value: "nin", label: "NIN slip", sub: "National Identification Number", Icon: IdentityCard },
  { value: "national_id", label: "National ID card", sub: "Your NIMC card", Icon: IdentityCard },
  { value: "passport", label: "International passport", sub: "The photo/data page", Icon: Book },
  { value: "drivers_license", label: "Driver's licence", sub: "Front of the card", Icon: IdentityCard },
] as const;

type FileSlot = { file: File; preview: string } | null;
type Phase = "intro" | "wizard" | "processing" | "error";

/**
 * The seller KYC verification flow (KYC1 §7). Self-contained wizard on the app's
 * PageShell + step-nav + footerAction system: intro → choose ID → capture ID →
 * selfie → confirm → submit, with the KycHero illustration keyed to each state
 * (processing / awaiting / verified / rejected / error) + explicit error+retry.
 */
export default function KycFlow() {
  const router = useRouter();
  const { kycStatus, fetchKycStatus, submitKyc } = useBusinessStore();

  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState(1); // 1..4
  const [documentType, setDocumentType] = useState<string>("");
  const [doc, setDoc] = useState<FileSlot>(null);
  const [selfie, setSelfie] = useState<FileSlot>(null);
  const [legalName, setLegalName] = useState("");
  const [bvn, setBvn] = useState("");
  const [consent, setConsent] = useState(false);

  const docInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchKycStatus().finally(() => setReady(true));
  }, [fetchKycStatus]);

  const status = kycStatus?.status;
  const hasStatusScreen =
    status === "pending" || status === "approved" || status === "rejected";

  const pickFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    set: (v: FileSlot) => void,
    current: FileSlot
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (current?.preview) URL.revokeObjectURL(current.preview);
    set({ file, preview: URL.createObjectURL(file) });
  };

  const handleSubmit = async () => {
    if (!doc || !selfie || !documentType) return;
    if (!legalName.trim()) {
      toast.error("Enter your legal name (as on your ID).");
      return;
    }
    if (!consent) {
      toast.error("Please accept the consent to continue.");
      return;
    }
    const fd = new FormData();
    fd.append("document", doc.file);
    fd.append("selfie", selfie.file);
    fd.append("document_type", documentType);
    fd.append("legal_name", legalName.trim());
    if (bvn.trim()) fd.append("bvn", bvn.trim());

    setPhase("processing");
    try {
      await submitKyc(fd);
      // kycStatus is now "pending" → the awaiting status screen renders.
      setPhase("intro");
    } catch {
      setPhase("error"); // store already toasted the reason
    }
  };

  const back = () => {
    if (step > 1) setStep((s) => s - 1);
    else setPhase("intro");
  };

  // ---- loading ----
  if (!ready) {
    return (
      <Loader />
    );
  }

  // ---- existing submission (pending / approved / rejected) ----
  if (hasStatusScreen) {
    return (
      <StatusScreen
        status={status as string}
        reason={kycStatus?.reason}
        onDone={() => router.push("/dashboard")}
        onResubmit={() => {
          setPhase("wizard");
          setStep(1);
          useBusinessStore.setState({ kycStatus: null });
        }}
      />
    );
  }

  // ---- processing (upload in flight) ----
  if (phase === "processing") {
    return (
      <CenteredState
        hero={<KycHero icon={User} pulse />}
        title="Submitting your verification…"
        subtitle="Please wait — this can take a moment on a slow connection."
      />
    );
  }

  // ---- submit failed ----
  if (phase === "error") {
    return (
      <PageShell
        header={<Header
                  onBack={() => setPhase("wizard")}
                  title="Verification"
                />}
        footerAction={<Button onClick={handleSubmit}>Try again</Button>}>
        <div className="flex flex-col items-center gap-4 pt-10 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand/10">
            <AiOutlineInfoCircle size={44} className="text-brandDeep" />
          </span>
          <div>
            <h1 className="text-h1 font-medium text-foreground-primary">Something went wrong</h1>
            <p className="mx-auto mt-2 max-w-[280px] text-body-sm text-foreground-secondary">
              We couldn&apos;t submit your verification. Check your connection and
              try again — your photos are still here.
            </p>
          </div>
        </div>
      </PageShell>
    );
  }

  // ---- intro ----
  if (phase === "intro") {
    return (
      <PageShell
        header={<Header
                  onBack={() => router.back()}
                  title="Get verified"
                />}
        footerAction={
          <Button onClick={() => { setPhase("wizard"); setStep(1); }}>
            Start verification
          </Button>
        }>
        <div className="flex flex-col gap-6 pt-4">
          <KycHero icon={User} badge={{ label: "Verified", tone: "brand" }} />
          <div className="text-center">
            <h1 className="text-h1 font-medium text-foreground-primary">Get verified</h1>
            <p className="mt-1 text-body-sm text-foreground-secondary">
              Confirm your identity to build buyer trust and keep your withdrawals flowing.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Benefit Icon={CircleCheck} title="Earn your Verified badge" sub="Win buyer trust and sell more." />
            <Benefit Icon={Shield} title="Withdraw anytime" sub="No holds on your earnings once you're verified." />
          </div>
          <p className="text-center text-caption text-foreground-muted">
            You&apos;ll need a government ID and a selfie. Takes about 2 minutes.
          </p>
        </div>
      </PageShell>
    );
  }

  // ---- wizard ----
  const stepHeader = (
    <Header
      onBack={back}
      title="Verify your identity"
      progress={<StepNavigation step={step} totalSteps={4} />}
    />
  );

  if (step === 1) {
    return (
      <PageShell
        header={stepHeader}
        footerAction={
          <Button disabled={!documentType} onClick={() => setStep(2)}>
            Continue
          </Button>
        }>
        <div className="flex flex-col gap-5 pt-2">
          <KycHero icon={IdentityCard} size={150} />
          <h2 className="text-center text-body-lg font-medium text-foreground-primary">
            Which ID will you use?
          </h2>
          <div className="flex flex-col gap-3">
            {ID_TYPES.map(({ value, label, sub, Icon }) => {
              const selected = documentType === value;
              return (
                <button
                  key={value}
                  onClick={() => setDocumentType(value)}
                  className={`flex items-center gap-3 rounded-card border p-3 text-left transition-colors ${
                    selected ? "border-brandDeep bg-brand/5" : "border-outline"
                  }`}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10">
                    <Icon size={22} className="text-brandDeep" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-body font-medium text-foreground-primary">{label}</span>
                    <span className="block text-caption text-foreground-secondary">{sub}</span>
                  </span>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                      selected ? "border-brandDeep bg-brand" : "border-outline-emphasis"
                    }`}>
                    {selected && <Check size={13} className="text-brandInk" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </PageShell>
    );
  }

  if (step === 2) {
    return (
      <PageShell
        header={stepHeader}
        footerAction={<Button disabled={!doc} onClick={() => setStep(3)}>Continue</Button>}>
        <CaptureStep
          title={`Upload your ${ID_TYPES.find((t) => t.value === documentType)?.label ?? "ID"}`}
          hint="Good lighting · all four corners visible · no glare."
          slot={doc}
          inputRef={docInputRef}
          capture="environment"
          onPick={(e) => pickFile(e, setDoc, doc)}
          placeholderIcon={<IdentityCard size={30} className="text-foreground-muted" />}
          placeholderText="Tap to take a photo or upload"
        />
      </PageShell>
    );
  }

  if (step === 3) {
    return (
      <PageShell
        header={stepHeader}
        footerAction={<Button disabled={!selfie} onClick={() => setStep(4)}>Continue</Button>}>
        <CaptureStep
          title="Take a quick selfie"
          hint="So we can match your face to your ID."
          slot={selfie}
          inputRef={selfieInputRef}
          capture="user"
          round
          onPick={(e) => pickFile(e, setSelfie, selfie)}
          placeholderIcon={<Camera size={30} className="text-foreground-muted" />}
          placeholderText="Tap to take a selfie"
        />
      </PageShell>
    );
  }

  // step 4 — confirm & submit
  return (
    <PageShell
      header={stepHeader}
      footerAction={<Button onClick={handleSubmit}>Submit for verification</Button>}>
      <div className="flex flex-col gap-5 pt-4">
        <h2 className="text-body-lg font-medium text-foreground-primary">Confirm your details</h2>

        <div>
          <label className="mb-1 block text-body-sm font-medium text-foreground-primary">Legal name</label>
          <InputField
            name="legalName"
            type="text"
            placeholder="Full name as it appears on your ID"
            value={legalName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLegalName(e.target.value)}
          />
          <p className="mt-1 text-caption text-foreground-muted">Must match your ID and payout account.</p>
        </div>

        <div>
          <label className="mb-1 block text-body-sm font-medium text-foreground-primary">
            BVN <span className="font-normal text-foreground-muted">(optional)</span>
          </label>
          <InputField
            name="bvn"
            type="text"
            placeholder="11-digit BVN"
            value={bvn}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBvn(e.target.value)}
          />
          <p className="mt-1 text-caption text-foreground-muted">Speeds up future payouts.</p>
        </div>

        <div className="flex gap-3">
          {doc && <Thumb label="Document" preview={doc.preview} onEdit={() => setStep(2)} />}
          {selfie && <Thumb label="Selfie" preview={selfie.preview} onEdit={() => setStep(3)} />}
        </div>

        <div className="flex cursor-pointer items-start gap-2" onClick={() => setConsent((c) => !c)}>
          <span
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
              consent ? "border-brandDeep bg-brand" : "border-outline-emphasis"
            }`}>
            {consent && <Check size={13} className="text-brandInk" />}
          </span>
          <p className="text-body-sm text-foreground-secondary">
            I consent to Vibaar verifying my identity.
          </p>
        </div>
      </div>
    </PageShell>
  );
}

/* ---------- presentational helpers ---------- */

function CenteredState({
  hero,
  title,
  subtitle,
}: {
  hero: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      {hero}
      <div>
        <h1 className="text-h1 font-medium text-foreground-primary">{title}</h1>
        <p className="mx-auto mt-2 max-w-[280px] text-body-sm text-foreground-secondary">{subtitle}</p>
      </div>
    </div>
  );
}

function Benefit({
  Icon,
  title,
  sub,
}: {
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-card bg-surface-subtle p-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10">
        <Icon size={22} className="text-brandDeep" />
      </span>
      <div>
        <p className="text-body font-medium text-foreground-primary">{title}</p>
        <p className="text-caption text-foreground-secondary">{sub}</p>
      </div>
    </div>
  );
}

function CaptureStep({
  title,
  hint,
  slot,
  inputRef,
  capture,
  round,
  onPick,
  placeholderIcon,
  placeholderText,
}: {
  title: string;
  hint: string;
  slot: FileSlot;
  inputRef: React.RefObject<HTMLInputElement>;
  capture: "environment" | "user";
  round?: boolean;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholderIcon: React.ReactNode;
  placeholderText: string;
}) {
  return (
    <div className="flex flex-col gap-4 pt-4">
      <div>
        <h2 className="text-body-lg font-medium text-foreground-primary">{title}</h2>
        <p className="mt-1 text-caption text-foreground-secondary">{hint}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={capture}
        className="hidden"
        onChange={onPick}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 border border-dashed border-outline-strong bg-surface-subtle ${
          round ? "mx-auto aspect-square w-56 rounded-full" : "aspect-[4/3] w-full rounded-card"
        } overflow-hidden`}>
        {slot ? (
          <img src={slot.preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <>
            {placeholderIcon}
            <span className="text-body-sm text-foreground-muted">{placeholderText}</span>
          </>
        )}
      </button>
      {slot && (
        <button
          onClick={() => inputRef.current?.click()}
          className="mx-auto text-body-sm font-medium text-brandDeep">
          Retake
        </button>
      )}
    </div>
  );
}

function Thumb({
  label,
  preview,
  onEdit,
}: {
  label: string;
  preview: string;
  onEdit: () => void;
}) {
  return (
    <button onClick={onEdit} className="flex flex-col items-center gap-1">
      <img src={preview} alt={label} className="h-16 w-16 rounded-field object-cover" />
      <span className="text-caption text-brandDeep">{label}</span>
    </button>
  );
}

function StatusScreen({
  status,
  reason,
  onDone,
  onResubmit,
}: {
  status: string;
  reason?: string;
  onDone: () => void;
  onResubmit: () => void;
}) {
  const approved = status === "approved";
  const rejected = status === "rejected";

  return (
    <PageShell
      header={<Header title="Verification" />}
      footerAction={
        rejected ? (
          <Button onClick={onResubmit}>Resubmit</Button>
        ) : (
          <Button onClick={onDone}>{approved ? "Done" : "Back to dashboard"}</Button>
        )
      }>
      <div className="flex flex-col items-center gap-4 pt-6 text-center">
        {rejected ? (
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand/10">
            <AiOutlineInfoCircle size={44} className="text-brandDeep" />
          </span>
        ) : (
          <KycHero
            icon={User}
            badge={
              approved
                ? { label: "Verified", tone: "brand" }
                : { label: "Awaiting approval", tone: "warning" }
            }
          />
        )}
        <div>
          <h1 className="text-h1 font-medium text-foreground-primary">
            {approved
              ? "You're verified! 🎉"
              : rejected
              ? "We couldn't verify your ID"
              : "KYC verification complete!"}
          </h1>
          <p className="mx-auto mt-2 max-w-[300px] text-body-sm text-foreground-secondary">
            {approved
              ? "Your Verified badge is now live and withdrawals are unlocked."
              : rejected
              ? "Use a clear photo and make sure the name matches your ID."
              : "Our team will review your submission. You'll be notified within 24 hours — keep selling in the meantime."}
          </p>
        </div>
        {rejected && reason && (
          <div className="w-full rounded-card border border-brandDeep/30 bg-brand/5 p-3 text-left">
            <p className="text-caption font-medium text-foreground-secondary">Reason</p>
            <p className="text-body-sm text-foreground-primary">{reason}</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
