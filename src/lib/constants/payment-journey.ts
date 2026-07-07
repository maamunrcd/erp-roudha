export type JourneyMilestone =
  | "journey_started"
  | "steady_progress"
  | "halfway"
  | "almost_there"
  | "destination";

export interface JourneyStage {
  emoji: string;
  title: { en: string; bn: string };
  message: { en: string; bn: string };
  nextHint: { en: string; bn: string };
}

export const JOURNEY_ORDER: JourneyMilestone[] = [
  "journey_started",
  "steady_progress",
  "halfway",
  "almost_there",
  "destination",
];

export const JOURNEY_STAGES: Record<JourneyMilestone, JourneyStage> = {
  journey_started: {
    emoji: "😅",
    title: { en: "Wallet is sweating", bn: "পকেট ঘামছে" },
    message: {
      en: "The journey of hardship has begun. Every payment is a step toward peace.",
      bn: "কষ্টের যাত্রা শুরু! প্রতিটি কিস্তি আপনাকে সুস্থির দিকে এক ধাপ এগিয়ে নিচ্ছে।",
    },
    nextHint: {
      en: "Keep paying — soon you'll be climbing the hill with confidence.",
      bn: "কিস্তি চালিয়ে যান — শিগগিরই পাহাড়ে উঠার পর্ব আসবে।",
    },
  },
  steady_progress: {
    emoji: "🚶",
    title: { en: "Climbing the hill", bn: "পাহাড়ে উঠছেন" },
    message: {
      en: "Still tough, still going. Your future self will thank you for this pain.",
      bn: "এখনো কষ্ট, কিন্তু থামেননি। এই কষ্টের পরেই আসবে সুস্থি।",
    },
    nextHint: {
      en: "At 50% you become a halfway hero — the view gets better!",
      bn: "৫০% এ পৌঁছলে অর্ধেক পথে বীর — সামনে আরও সহজ লাগবে!",
    },
  },
  halfway: {
    emoji: "💪",
    title: { en: "Halfway hero", bn: "অর্ধেক পথে বীর" },
    message: {
      en: "You survived half the mountain. The hardest part is behind you!",
      bn: "পাহাড়ের অর্ধেক পার! বাকিটা এখন সহজ লাগবে।",
    },
    nextHint: {
      en: "Push to 75% — you'll start smelling peace from here.",
      bn: "৭৫% এ গেলে সুস্থির গন্ধ পেতে শুরু করবেন।",
    },
  },
  almost_there: {
    emoji: "🏃",
    title: { en: "Can smell peace", bn: "সুস্থি গন্ধ পাচ্ছেন" },
    message: {
      en: "So close to the goal! A little more hardship, then full relief.",
      bn: "লক্ষ্য খুব কাছে! আর কিছুটা কষ্ট, তারপর পূর্ণ সুস্থি।",
    },
    nextHint: {
      en: "Final stretch! One last push to 🏡 সুস্থি.",
      bn: "শেষ ল্যাপ! আর একটু হলেই 🏡 সুস্থিতে পৌঁছাবেন।",
    },
  },
  destination: {
    emoji: "🎉",
    title: { en: "Goal reached — সুস্থি!", bn: "লক্ষ্যে পৌঁছেছেন — সুস্থি!" },
    message: {
      en: "All payments done. You made it through the hardship. Enjoy your peace!",
      bn: "সব পরিশোধ সম্পন্ন! কষ্টের পর সুস্থি — আপনি পৌঁছে গেছেন!",
    },
    nextHint: {
      en: "You did it. No more installments — enjoy your ownership!",
      bn: "আপনি পার করেছেন! আর কিস্তি নেই — মালিকানা উপভোগ করুন!",
    },
  },
};

export function getJourneyStage(milestone: string): JourneyStage {
  const key = milestone as JourneyMilestone;
  return JOURNEY_STAGES[key] ?? JOURNEY_STAGES.journey_started;
}

export function getJourneyMilestone(progressPercent: number): JourneyMilestone {
  if (progressPercent >= 100) return "destination";
  if (progressPercent >= 75) return "almost_there";
  if (progressPercent >= 50) return "halfway";
  if (progressPercent >= 25) return "steady_progress";
  return "journey_started";
}

export type JourneyStepStatus = "done" | "current" | "upcoming";

export function getJourneyTimeline(milestone: string, progressPercent: number) {
  const currentIndex =
    progressPercent >= 100
      ? JOURNEY_ORDER.length
      : JOURNEY_ORDER.indexOf(milestone as JourneyMilestone);

  return JOURNEY_ORDER.map((id, index) => {
    let status: JourneyStepStatus = "upcoming";
    if (progressPercent >= 100 || index < currentIndex) status = "done";
    else if (index === currentIndex) status = "current";

    const stage = JOURNEY_STAGES[id];
    const threshold = index === 0 ? 0 : index === 1 ? 25 : index === 2 ? 50 : index === 3 ? 75 : 100;

    return { id, status, threshold, ...stage };
  });
}

export function getNextJourneyStep(milestone: string, progressPercent: number) {
  if (progressPercent >= 100) return null;
  const currentIndex = JOURNEY_ORDER.indexOf(milestone as JourneyMilestone);
  const nextId = JOURNEY_ORDER[currentIndex + 1];
  if (!nextId) return null;
  return JOURNEY_STAGES[nextId];
}
