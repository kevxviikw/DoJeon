// Forge -- POST { title, deliverable, goalType, deadline, hoursAvailablePerDay, squadId? }
// Validates the deliverable is checkable, asks Gemini for a three-tier
// plan, runs deterministic feasibility math over whatever it proposes, and
// persists the mission + milestones. See Field Manual §01/§03.
//
// Gemini, not Claude: chosen to keep this AI call inside Gemini's free
// tier for as long as possible post-launch, since this is a club MVP with
// no revenue yet. See _shared/gemini.ts for the model-id caveat -- set
// GEMINI_MODEL explicitly before deploying, it has no silent default.

import { corsHeaders, errorResponse, handleOptions, jsonResponse } from "../_shared/cors.ts";
import { callGeminiForJSON } from "../_shared/gemini.ts";
import { checkDeliverable, assessFeasibility } from "../_shared/logic/forge.ts";
import type { TierPlan } from "../_shared/logic/types.ts";
import { currentUserId, supabaseAsUser } from "../_shared/supabaseAdmin.ts";

interface ForgeRequestBody {
  title: string;
  deliverable: string;
  goalType: string;
  deadline: string; // ISO date, e.g. "2026-10-15"
  hoursAvailablePerDay: number;
  squadId?: string | null;
}

interface GeminiTierResponse {
  minimum: { hours: number; description: string; milestones: string[] };
  target: { hours: number; description: string; milestones: string[] };
  stretch: { hours: number; description: string; milestones: string[] };
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const body = (await req.json()) as ForgeRequestBody;
    const userId = currentUserId(req);

    const deliverableCheck = checkDeliverable(body.deliverable);
    if (!deliverableCheck.checkable) {
      return errorResponse(deliverableCheck.reason ?? "Deliverable isn't checkable.", 422);
    }

    const deadlineDays = Math.max(
      1,
      Math.ceil((new Date(body.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );

    const geminiTiers = await callGeminiForJSON<GeminiTierResponse>({
      system:
        "You are Forge, DoJeon's mission-planning engine. Given a hard goal with a real " +
        "deadline, decompose it into three tiers: minimum (doable on the worst day), " +
        "target (keeps the mission on schedule), and stretch (the actual reach). Each tier " +
        "needs an estimated total hours of work to reach it from today, a one-sentence " +
        "description, and 2-5 milestone titles ordered toward the deliverable. Respond with " +
        'JSON shaped exactly like: {"minimum":{"hours":N,"description":"...","milestones":["...","..."]},' +
        '"target":{...},"stretch":{...}}',
      userMessage: `Goal: ${body.title}\nDeliverable: ${body.deliverable}\nGoal type: ${body.goalType}\nDeadline: ${body.deadline} (${deadlineDays} days from now)\nHours available per day: ${body.hoursAvailablePerDay}`,
    });

    const tiers: TierPlan = {
      minimum: { hours: geminiTiers.minimum.hours },
      target: { hours: geminiTiers.target.hours },
      stretch: { hours: geminiTiers.stretch.hours },
    };
    const feasibility = assessFeasibility(tiers, deadlineDays, body.hoursAvailablePerDay);

    const supabase = supabaseAsUser(req);
    const { data: mission, error: missionError } = await supabase
      .from("missions")
      .insert({
        user_id: userId,
        squad_id: body.squadId ?? null,
        title: body.title,
        deliverable: body.deliverable,
        goal_type: body.goalType,
        deadline: body.deadline,
        duration_days: deadlineDays,
        hours_available_per_day: body.hoursAvailablePerDay,
        tiers: geminiTiers,
        tightest_feasible_tier: feasibility.tightestFeasibleTier,
      })
      .select()
      .single();
    if (missionError) return errorResponse(missionError.message, 500);

    const milestoneRows = (["minimum", "target", "stretch"] as const).flatMap((tier, tierIdx) =>
      geminiTiers[tier].milestones.map((title, i) => ({
        mission_id: mission.id,
        tier,
        title,
        sort_order: tierIdx * 100 + i,
      }))
    );
    if (milestoneRows.length > 0) {
      const { error: milestoneError } = await supabase.from("milestones").insert(milestoneRows);
      if (milestoneError) return errorResponse(milestoneError.message, 500);
    }

    // Keeps the solo-matching index (amendment B) current with the
    // member's latest goal, without a separate profile-setup step.
    await supabase.from("goal_profiles").upsert({
      user_id: userId,
      goal_type: body.goalType,
      hours_per_day: body.hoursAvailablePerDay,
      deadline_days: deadlineDays,
      updated_at: new Date().toISOString(),
    });

    return jsonResponse({ mission, feasibility }, 201);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Unknown error", 500);
  }
});
