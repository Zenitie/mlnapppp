export type GoalType = 'MAIN' | 'SIDE' | 'HABIT';

export interface Goal {
  id: string;
  title: string;
  description: string;
  type: GoalType;
  xpReward: number;
  completed: boolean;
  createdAt: number;
}

export interface TimerState {
  isRunning: boolean;
  startTime: number | null;
  elapsed: number; // accumulated time in ms when paused
}

export interface UserState {
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalEarned: number;
  goals: Goal[];
  lastDailyGoalDate?: string;
  simulatedDate?: string;
  startDate?: string;
  fourMonthGoalStatus?: 'PENDING' | 'SUCCESS' | 'FAILED';
  timer?: TimerState;
}
