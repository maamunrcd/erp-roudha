"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/i18n/format";
import {
  getJourneyStage,
  getJourneyTimeline,
  getNextJourneyStep,
  JOURNEY_ORDER,
  type JourneyMilestone,
} from "@/lib/constants/payment-journey";

interface PaymentJourneyCardProps {
  progressPercent: number;
  milestone: string;
  totalPaid: number;
  remaining: number;
  locale: "en" | "bn";
  paidInstallments?: number;
  totalInstallments?: number;
}

function RoadmapList({
  milestone,
  progressPercent,
  locale,
  paidInstallments,
  totalInstallments,
}: {
  milestone: string;
  progressPercent: number;
  locale: "en" | "bn";
  paidInstallments?: number;
  totalInstallments?: number;
}) {
  const timeline = getJourneyTimeline(milestone, progressPercent);

  return (
    <div className="space-y-3 border-t border-card-border pt-3">
      <ol className="space-y-2">
        {timeline.map((step) => (
          <li
            key={step.id}
            className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm ${
              step.status === "current"
                ? "bg-gold/10"
                : step.status === "done"
                  ? "opacity-70"
                  : "opacity-40"
            }`}
          >
            <span className="w-5 shrink-0 text-center">
              {step.status === "done" ? "✓" : step.emoji}
            </span>
            <div>
              <p className="font-medium">{step.title[locale]}</p>
              {step.status === "current" && (
                <p className="text-xs text-muted-text">{step.message[locale]}</p>
              )}
            </div>
          </li>
        ))}
      </ol>

      {paidInstallments != null &&
        totalInstallments != null &&
        paidInstallments < totalInstallments && (
          <p className="text-xs text-gold">
            {locale === "bn"
              ? `পরের কিস্তি: ${paidInstallments + 1}/${totalInstallments}`
              : `Next installment: ${paidInstallments + 1}/${totalInstallments}`}
          </p>
        )}
    </div>
  );
}

function MiniStepper({
  milestone,
  progressPercent,
  locale,
}: {
  milestone: string;
  progressPercent: number;
  locale: "en" | "bn";
}) {
  const timeline = getJourneyTimeline(milestone, progressPercent);

  return (
    <div className="mt-4 flex items-start justify-between gap-1">
      {timeline.map((step) => (
        <div key={step.id} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm transition-all ${
              step.status === "done"
                ? "bg-emerald/20 text-emerald"
                : step.status === "current"
                  ? "bg-gold/20 ring-2 ring-gold/60"
                  : "bg-surface-alt opacity-50"
            }`}
          >
            {step.status === "done" ? "✓" : step.emoji}
          </div>
          <p
            className={`hidden w-full truncate text-center text-[9px] leading-tight sm:block ${
              step.status === "current" ? "font-medium text-gold" : "text-muted-text"
            }`}
          >
            {step.title[locale]}
          </p>
        </div>
      ))}
    </div>
  );
}

export function PaymentJourneyCard({
  progressPercent,
  milestone,
  totalPaid,
  remaining,
  locale,
  paidInstallments,
  totalInstallments,
}: PaymentJourneyCardProps) {
  const [showRoadmap, setShowRoadmap] = useState(false);
  const stage = getJourneyStage(milestone);
  const nextStep = getNextJourneyStep(milestone, progressPercent);
  const isComplete = progressPercent >= 100;
  const currentStep =
    progressPercent >= 100
      ? JOURNEY_ORDER.length
      : JOURNEY_ORDER.indexOf(milestone as JourneyMilestone) + 1;
  const roadmapLabel =
    locale === "bn"
      ? showRoadmap
        ? "সম্পূর্ণ গল্প লুকান"
        : "সম্পূর্ণ গল্প দেখুন"
      : showRoadmap
        ? "Hide full story"
        : "View full story";

  return (
    <Card className={isComplete ? "border-emerald/30" : ""}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-text">
            {locale === "bn" ? "পেমেন্ট যাত্রা" : "Payment Journey"}
          </p>
          <p className="text-[11px] text-muted-text/80">
            {locale === "bn" ? "কষ্ট থেকে সুস্থি" : "From hardship to peace"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold text-emerald">{progressPercent}%</p>
          <p className="text-[10px] text-muted-text">
            {locale === "bn"
              ? `ধাপ ${currentStep}/${JOURNEY_ORDER.length}`
              : `Step ${currentStep}/${JOURNEY_ORDER.length}`}
          </p>
        </div>
      </div>

      <MiniStepper milestone={milestone} progressPercent={progressPercent} locale={locale} />

      <div className="relative mt-4 px-1">
        <div className="mb-1.5 flex justify-between text-[11px] text-muted-text">
          <span>😰 {locale === "bn" ? "কষ্ট" : "Hardship"}</span>
          <span>🏡 {locale === "bn" ? "সুস্থি" : "Peace"}</span>
        </div>
        <div className="relative h-3 rounded-full bg-surface-alt">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isComplete ? "bg-emerald" : "bg-linear-to-r from-gold to-emerald"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
          <span
            className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-base transition-all duration-500"
            style={{ left: `clamp(12px, ${progressPercent}%, calc(100% - 12px))` }}
            aria-hidden
          >
            {stage.emoji}
          </span>
        </div>
      </div>

      <div
        className={`mt-4 rounded-lg border p-3 ${
          isComplete ? "border-emerald/30 bg-emerald/5" : "border-card-border bg-surface-alt/40"
        }`}
      >
        <p className="text-sm font-medium">
          <span className="mr-1">{stage.emoji}</span>
          {stage.title[locale]}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-text">{stage.message[locale]}</p>

        {!isComplete && nextStep && (
          <div className="mt-2.5 border-t border-card-border/60 pt-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-emerald">
              {locale === "bn" ? "পরবর্তী" : "Up next"}
            </p>
            <p className="mt-0.5 text-xs text-muted-text">
              {nextStep.emoji} {nextStep.title[locale]} — {stage.nextHint[locale]}
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span>
          {locale === "bn" ? "জমা" : "Paid"}:{" "}
          <span className="font-medium text-emerald">{formatCurrency(totalPaid, locale)}</span>
        </span>
        <span className="text-muted-text">·</span>
        <span>
          {locale === "bn" ? "বাকি" : "Due"}:{" "}
          <span className="font-medium text-gold">{formatCurrency(remaining, locale)}</span>
        </span>
      </div>

      <button
        type="button"
        onClick={() => setShowRoadmap((v) => !v)}
        aria-expanded={showRoadmap}
        className="mt-3 flex w-full items-center justify-center py-1 text-xs text-muted-text hover:text-foreground"
      >
        <span className="inline-flex items-center gap-1">
          <ChevronDown
            size={14}
            className={`shrink-0 transition-transform duration-200 ${showRoadmap ? "rotate-180" : ""}`}
          />
          <span>{roadmapLabel}</span>
        </span>
      </button>

      <div className={showRoadmap ? "block" : "hidden"}>
        <RoadmapList
          milestone={milestone}
          progressPercent={progressPercent}
          locale={locale}
          paidInstallments={paidInstallments}
          totalInstallments={totalInstallments}
        />
      </div>
    </Card>
  );
}
