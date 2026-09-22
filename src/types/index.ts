export type UserRole = 'judge' | 'participant' | 'scorer';

export type EventSummary = {
  id: string | number;
  title: string;
  location?: string;
  startDate?: string;
  startTime?: string;
  endTime?: string;
  eventType?: string;
};

export type JudgeAssignment = {
  id: string | number;
  eventId: string | number;
  judgeId: string | number;
  status?: string;
};

export type JudgeInviteRow = {
  id: string | number;
  eventId: string | number;
  judgeName: string;
  judgeEmail: string;
  status: string;
  claimedAt?: string;
};
