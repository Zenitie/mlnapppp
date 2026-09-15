import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/handleError';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, collection, getDocs, writeBatch, deleteDoc, serverTimestamp } from 'firebase/firestore';
import type { Goal, GoalType, UserState, TimerState } from '../types';

const INITIAL_STATE: Omit<UserState, 'simulatedDate' | 'lastDailyGoalDate'> = {
  level: 1,
  xp: 0,
  xpToNextLevel: 1000,
  totalEarned: 0,
  timer: { isRunning: false, startTime: null, elapsed: 0 },
  lastClaimedMilestone: 0,
  milestones: {
    5: 'Wyjście na dobrą kolację',
    10: 'Kupno nowej gry',
    15: 'Cały dzień na relaks',
    20: 'Nowy gadżet'
  },
  goals: []
};

export function useRPGState() {
  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [state, setLocalState] = useState<UserState>(() => {
    const saved = localStorage.getItem('rpg_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.simulatedDate) parsed.simulatedDate = new Date().toISOString().split('T')[0];
        if (!parsed.startDate) parsed.startDate = parsed.simulatedDate;
        if (!parsed.fourMonthGoalStatus) parsed.fourMonthGoalStatus = 'PENDING';
        if (!parsed.timer) parsed.timer = { isRunning: false, startTime: null, elapsed: 0 };
        if (parsed.lastClaimedMilestone === undefined) parsed.lastClaimedMilestone = 0;
        if (!parsed.milestones) {
          parsed.milestones = { 5: 'Wyjście na dobrą kolację', 10: 'Kupno nowej gry', 15: 'Cały dzień na relaks', 20: 'Nowy gadżet' };
        }
        return parsed;
      } catch (e) {}
    }
    return { 
      ...INITIAL_STATE, 
      level: 1,
      xp: 0,
      xpToNextLevel: 1000,
      lastClaimedMilestone: 0,
      simulatedDate: new Date().toISOString().split('T')[0],
      startDate: new Date().toISOString().split('T')[0],
      fourMonthGoalStatus: 'PENDING'
    };
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const userRef = doc(db, 'users', u.uid);
          const docSnap = await getDoc(userRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            const goalsSnap = await getDocs(collection(db, 'users', u.uid, 'goals'));
            const goals = goalsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Goal));
            
            setLocalState(prev => ({
              ...prev,
              level: data.level,
              xp: data.xp,
              xpToNextLevel: data.xpToNextLevel,
              totalEarned: data.totalEarned || 0,
              lastDailyGoalDate: data.lastDailyGoalDate || '',
              simulatedDate: data.simulatedDate || prev.simulatedDate,
              startDate: data.startDate || prev.startDate,
              fourMonthGoalStatus: data.fourMonthGoalStatus || 'PENDING',
              timer: data.timer || { isRunning: false, startTime: null, elapsed: 0 },
              milestones: data.milestones || prev.milestones,
              lastClaimedMilestone: data.lastClaimedMilestone || 0,
              goals: goals.sort((a, b) => b.createdAt - a.createdAt)
            }));
          } else {
            // First time login, migrate local state to Firebase
            await setDoc(userRef, {
              level: state.level,
              xp: state.xp,
              xpToNextLevel: state.xpToNextLevel,
              totalEarned: state.totalEarned,
              lastDailyGoalDate: state.lastDailyGoalDate || '',
              simulatedDate: state.simulatedDate || '',
              startDate: state.startDate || '',
              fourMonthGoalStatus: state.fourMonthGoalStatus || 'PENDING',
              timer: state.timer || { isRunning: false, startTime: null, elapsed: 0 },
              milestones: state.milestones || {},
              lastClaimedMilestone: state.lastClaimedMilestone || 0,
              updatedAt: serverTimestamp()
            });

            const batch = writeBatch(db);
            state.goals.forEach(g => {
              const gRef = doc(collection(db, 'users', u.uid, 'goals'), g.id);
              batch.set(gRef, {
                title: g.title,
                description: g.description,
                type: g.type,
                xpReward: g.xpReward,
                completed: g.completed,
                createdAt: g.createdAt
              });
            });
            await batch.commit();
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, 'users');
        }
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []); // Only run once on mount

  // Sync user profile changes
  const syncProfile = async (newState: UserState) => {
    if (!user) {
      localStorage.setItem('rpg_state', JSON.stringify(newState));
      return;
    }
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        level: newState.level,
        xp: newState.xp,
        xpToNextLevel: newState.xpToNextLevel,
        totalEarned: newState.totalEarned,
        lastDailyGoalDate: newState.lastDailyGoalDate || '',
        simulatedDate: newState.simulatedDate || '',
        startDate: newState.startDate || '',
        fourMonthGoalStatus: newState.fourMonthGoalStatus || 'PENDING',
        timer: newState.timer || { isRunning: false, startTime: null, elapsed: 0 },
        milestones: newState.milestones || {},
        lastClaimedMilestone: newState.lastClaimedMilestone || 0,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const setState = (updater: (prev: UserState) => UserState) => {
    setLocalState(prev => {
      const nextState = updater(prev);
      
      // We don't sync goals array in syncProfile, they are handled individually.
      // But we still want to persist the rest of the profile.
      syncProfile(nextState);
      
      return nextState;
    });
  };

  // Helper methods to also update Firestore goals subcollection
  const syncAddGoals = async (goals: Goal[]) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      goals.forEach(g => {
        const gRef = doc(collection(db, 'users', user.uid, 'goals'), g.id);
        batch.set(gRef, {
          title: g.title,
          description: g.description,
          type: g.type,
          xpReward: g.xpReward,
          completed: g.completed,
          createdAt: g.createdAt
        });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'users/goals');
    }
  };

  const syncUpdateGoal = async (goal: Goal) => {
    if (!user) return;
    try {
      const gRef = doc(db, 'users', user.uid, 'goals', goal.id);
      await setDoc(gRef, {
        title: goal.title,
        description: goal.description,
        type: goal.type,
        xpReward: goal.xpReward,
        completed: goal.completed,
        createdAt: goal.createdAt
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users/goals');
    }
  };

  const syncDeleteGoal = async (goalId: string) => {
    if (!user) return;
    try {
      const gRef = doc(db, 'users', user.uid, 'goals', goalId);
      await deleteDoc(gRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'users/goals');
    }
  };

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return {
    state,
    setState,
    user,
    isAuthLoading,
    login,
    logout,
    syncAddGoals,
    syncUpdateGoal,
    syncDeleteGoal
  };
}
