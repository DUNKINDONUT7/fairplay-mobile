import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { eventDisplayDate } from '@/services/eventService';
import type { EventRow, ScoreRow, TournamentMatch, TournamentRow } from '@/types/organizer';

type LeaderboardEntry = { contestantName: string; totalScore: number; scoreCount: number };

// Ranks contestants by summed total_score across every judge that scored
// them — there's no separate "final ranking" column anywhere in the schema,
// so this is computed fresh from the same `scores` rows the Scoring tab
// already fetches, grouped by contestant_id (falling back to contestant_name
// for older rows that predate the id column).
function computeLeaderboard(scores: ScoreRow[]): LeaderboardEntry[] {
  const byContestant = new Map<string, { name: string; total: number; count: number }>();

  scores.forEach((score) => {
    const key = String(score.contestant_id ?? score.contestant_name ?? '');
    if (!key) return;

    const name = score.contestant_name || 'Unknown';
    const total = score.total_score ?? 0;
    const existing = byContestant.get(key);

    if (existing) {
      existing.total += total;
      existing.count += 1;
    } else {
      byContestant.set(key, { name, total, count: 1 });
    }
  });

  return Array.from(byContestant.values())
    .map((entry) => ({ contestantName: entry.name, totalScore: entry.total, scoreCount: entry.count }))
    .sort((a, b) => b.totalScore - a.totalScore);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderBracketSection(tournaments: TournamentRow[]): string {
  if (tournaments.length === 0) return '';

  return tournaments
    .map((tournament) => {
      const matches = tournament.matches || [];
      const rounds = new Map<number, TournamentMatch[]>();
      matches.forEach((match) => {
        const roundNumber = match.round ?? 0;
        const list = rounds.get(roundNumber) || [];
        list.push(match);
        rounds.set(roundNumber, list);
      });
      const sortedRounds = Array.from(rounds.entries()).sort(([a], [b]) => a - b);

      const roundsHtml = sortedRounds
        .map(([roundNumber, roundMatches]) => {
          const rows = roundMatches
            .map((match) => {
              const nameA = escapeHtml(match.team1?.name || 'TBD');
              const nameB = escapeHtml(match.team2?.name || 'TBD');
              const winnerId = match.winner?.id;
              const aWin = winnerId != null && winnerId === match.team1?.id;
              const bWin = winnerId != null && winnerId === match.team2?.id;
              return `
                <tr>
                  <td style="${aWin ? 'font-weight:700;color:#16a34a;' : ''}">${nameA}${match.score1 != null ? ` (${match.score1})` : ''}</td>
                  <td style="${bWin ? 'font-weight:700;color:#16a34a;' : ''}">${nameB}${match.score2 != null ? ` (${match.score2})` : ''}</td>
                </tr>`;
            })
            .join('');
          return `<h4>Round ${roundNumber}</h4><table>${rows}</table>`;
        })
        .join('');

      const championHtml = tournament.champion?.name
        ? `<p class="champion">Champion: ${escapeHtml(tournament.champion.name)}</p>`
        : '';

      return `<div class="section"><h3>${escapeHtml(tournament.title || tournament.name || 'Bracket')}</h3>${championHtml}${roundsHtml}</div>`;
    })
    .join('');
}

function renderLeaderboardSection(scores: ScoreRow[]): string {
  const leaderboard = computeLeaderboard(scores);
  if (leaderboard.length === 0) return '';

  const rows = leaderboard
    .map(
      (entry, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(entry.contestantName)}</td>
          <td>${entry.totalScore.toFixed(1)}</td>
          <td>${entry.scoreCount}</td>
        </tr>`
    )
    .join('');

  return `
    <div class="section">
      <h3>Scoring Leaderboard</h3>
      <table>
        <thead><tr><th>Rank</th><th>Contestant</th><th>Total Score</th><th>Judges Scored</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function buildResultsHtml({ event, tournaments, scores }: { event: EventRow; tournaments: TournamentRow[]; scores: ScoreRow[] }): string {
  const leaderboardHtml = renderLeaderboardSection(scores);
  const bracketHtml = renderBracketSection(tournaments);

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #0F172A; padding: 24px; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          .meta { color: #64748B; font-size: 13px; margin-bottom: 20px; }
          .section { margin-bottom: 28px; }
          h3 { font-size: 16px; border-bottom: 2px solid #2563EB; padding-bottom: 6px; }
          h4 { font-size: 13px; color: #2563EB; text-transform: uppercase; margin: 14px 0 6px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #E2E8F0; }
          th { color: #64748B; text-transform: uppercase; font-size: 11px; }
          .champion { font-weight: 700; color: #B45309; margin: 6px 0 12px; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(event.title)}</h1>
        <div class="meta">${escapeHtml(eventDisplayDate(event))}${event.location ? ` &middot; ${escapeHtml(event.location)}` : ''}</div>
        ${leaderboardHtml}
        ${bracketHtml}
        ${!leaderboardHtml && !bracketHtml ? '<p>No results are available for this event yet.</p>' : ''}
      </body>
    </html>`;
}

// Generates a PDF summary (scoring leaderboard + bracket standings) and opens
// the OS share sheet so an organizer can send it straight to participants or
// sponsors right after an event, without anyone needing web access.
export async function exportEventResults({
  event,
  tournaments,
  scores,
}: {
  event: EventRow;
  tournaments: TournamentRow[];
  scores: ScoreRow[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    const html = buildResultsHtml({ event, tournaments, scores });
    const { uri } = await Print.printToFileAsync({ html });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      return { success: false, error: 'Sharing is not available on this device.' };
    }

    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${event.title} - Results` });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unable to export results.' };
  }
}
