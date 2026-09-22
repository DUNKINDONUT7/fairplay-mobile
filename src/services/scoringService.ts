import { supabase } from '@/config/supabase';
import type { EventRow, JudgeAssignmentRow, JudgeRow, ScoreRow } from '@/types/organizer';

export async function fetchScoresForEvent(eventId: number): Promise<ScoreRow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase.from('scores').select('*').eq('event_id', eventId);

  if (error) throw error;
  return (data || []) as ScoreRow[];
}

export function subscribeToScores(eventId: number, onChange: () => void) {
  const client = supabase;
  if (!client) return () => {};

  const channel = client
    .channel(`fairplay-mobile-scores-${eventId}-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'scores', filter: `event_id=eq.${eventId}` }, onChange)
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

export type JudgeScoringProgress = {
  judgeId: number;
  judgeName: string;
  scoredCount: number;
  contestantCount: number;
  done: boolean;
};

// Mirrors src/pages/organizer/OrganizerScoring.jsx `judgeProgress`: "submitted"
// means this judge has at least one score row for a given contestant; done
// means every contestant on the event has been scored by this judge.
export function computeJudgeProgress(
  event: EventRow,
  assignments: JudgeAssignmentRow[],
  judges: JudgeRow[],
  scores: ScoreRow[]
): JudgeScoringProgress[] {
  const contestantCount = Array.isArray(event.contestants) ? event.contestants.length : 0;
  const judgesById = new Map(judges.map((judge) => [judge.id, judge]));

  return assignments
    .map((assignment) => judgesById.get(assignment.judge_id))
    .filter((judge): judge is JudgeRow => Boolean(judge))
    .map((judge) => {
      const scoredContestants = new Set(
        scores
          .filter((score) => {
            const scoreJudgeKey = String(score.judge_id ?? '').toLowerCase();
            const scoreJudgeName = String(score.judge_name ?? '').toLowerCase();
            return (
              scoreJudgeKey === String(judge.id).toLowerCase() ||
              (judge.email && scoreJudgeKey === judge.email.toLowerCase()) ||
              scoreJudgeName === judge.name.toLowerCase()
            );
          })
          .map((score) => score.contestant_id)
      );

      return {
        judgeId: judge.id,
        judgeName: judge.name,
        scoredCount: scoredContestants.size,
        contestantCount,
        done: contestantCount > 0 && scoredContestants.size >= contestantCount,
      };
    });
}
