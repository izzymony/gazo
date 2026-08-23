/* eslint-disable @next/next/no-img-element */
"use client";

import { Loader2 } from "lucide-react";

// The KYC submission shape from GET /admin/kyc (backend domain.KYC + preloaded user).
export interface KYCSubmission {
  id: string;
  user_id: string;
  document: string;
  document_type?: string;
  selfie: string;
  legal_name?: string;
  bvn?: string;
  status: string; // pending | approved | rejected
  reason?: string;
  created_at: string;
  reviewed_at?: string;
  user?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
}

export default function KycDetailView({
  submission,
  actionLoading,
  onReview,
}: {
  submission: KYCSubmission;
  actionLoading: boolean;
  onReview: (status: "approved" | "rejected") => void;
}) {
  const pending = submission.status === "pending";

  return (
    <div className="space-y-6">
      {/* Uploaded documents (open in a new tab to zoom) */}
      <div className="grid grid-cols-2 gap-3">
        <DocImage label="ID document" src={submission.document} />
        <DocImage label="Selfie" src={submission.selfie} />
      </div>

      {/* Identity */}
      <div className="space-y-3">
        <Field label="Legal name (submitted)" value={submission.legal_name || "—"} />
        <Field
          label="Document type"
          value={submission.document_type?.replace(/_/g, " ") || "—"}
          capitalize
        />
        <Field label="BVN" value={submission.bvn || "—"} />
        <Field label="Email" value={submission.user?.email || "—"} />
        <Field label="Phone" value={submission.user?.phone || "—"} />
        <Field
          label="Submitted"
          value={submission.created_at ? new Date(submission.created_at).toLocaleString() : "—"}
        />
        <p className="text-xs text-gray-500">
          Confirm the legal name matches the ID document and the seller&apos;s
          payout account name before approving.
        </p>
      </div>

      {submission.status === "rejected" && submission.reason && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-xs font-medium text-gray-500">Rejection reason</p>
          <p className="text-sm text-gray-900">{submission.reason}</p>
        </div>
      )}

      {pending && (
        <div className="flex gap-3 border-t border-gray-200 pt-4">
          <button
            onClick={() => onReview("rejected")}
            disabled={actionLoading}
            className="flex-1 inline-flex h-11 items-center justify-center rounded-full border border-red-300 px-4 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
            Reject
          </button>
          <button
            onClick={() => onReview("approved")}
            disabled={actionLoading}
            className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-green-600 px-4 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
            {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Approve
          </button>
        </div>
      )}
    </div>
  );
}

function DocImage({ label, src }: { label: string; src?: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-gray-500">{label}</p>
      {src ? (
        <a href={src} target="_blank" rel="noopener noreferrer">
          <img
            src={src}
            alt={label}
            className="h-40 w-full rounded-lg border border-gray-200 object-cover"
          />
        </a>
      ) : (
        <div className="flex h-40 w-full items-center justify-center rounded-lg border border-dashed border-gray-200 text-xs text-gray-400">
          No image
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span
        className={`text-right text-sm font-medium text-gray-900 ${
          capitalize ? "capitalize" : ""
        }`}>
        {value}
      </span>
    </div>
  );
}
