import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, Star, Target, Sparkles, Plus, 
  MessageSquare, CheckCircle, Circle, Briefcase, 
  BrainCircuit, X, Loader2, CalendarHeart, Trash2, Edit2, Settings,
  Timer, Play, Pause, RotateCcw, History
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import type { Goal, GoalType, UserState, TimerState } from './types';

const INITIAL_STATE: Omit<UserState, 'simulatedDate' | 'lastDailyGoalDate'> = {
  level: 1,
  xp: 0,
  xpToNextLevel: 1000,
  totalEarned: 0,
  timer: { isRunning: false, startTime: null, elapsed: 0 },
  goals: [
    {
      id: 'habit-1', title: 'Napisz maila do 5 klientów', description: 'Cold mailing - outreach B2B.', type: 'HABIT', xpReward: 100, completed: false, createdAt: Date.now()
    },
    {
      id: 'habit-2', title: 'Zrób trening', description: 'Zdrowe ciało to zdrowy umysł.', type: 'HABIT', xpReward: 50, completed: false, createdAt: Date.now()
    },
    {
      id: 'habit-3', title: 'Koduj/ucz się', description: 'Rozwój w automatyzacjach Make/Zapier/kodowanie.', type: 'HABIT', xpReward: 200, completed: false, createdAt: Date.now()
    },
    {
      id: 'initial-1', title: 'Zdobądź pierwszego klienta na automatyzację', description: 'Zarób pierwsze pieniądze, sprzedając prostą automatyzację za minimum 500 PLN.', type: 'MAIN', xpReward: 1500, completed: false, createdAt: Date.now()
    }
  ]
};

type TabType = GoalType | 'TIMER';

export default function App() {
  const [state, setState] = useState<UserState>(() => {
    const saved = localStorage.getItem('rpg_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.simulatedDate) {
          parsed.simulatedDate = new Date().toISOString().split('T')[0];
        }
        if (!parsed.startDate) {
          parsed.startDate = parsed.simulatedDate;
        }
        if (!parsed.fourMonthGoalStatus) {
          parsed.fourMonthGoalStatus = 'PENDING';
        }
        if (!parsed.timer) {
          parsed.timer = { isRunning: false, startTime: null, elapsed: 0 };
        }
        return parsed;
      } catch (e) {}
    }
    return { 
      ...INITIAL_STATE, 
      simulatedDate: new Date().toISOString().split('T')[0],
      startDate: new Date().toISOString().split('T')[0],
      fourMonthGoalStatus: 'PENDING'
    };
  });

  const [activeTab, setActiveTab] = useState<TabType>('MAIN');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [newGoal, setNewGoal] = useState({ title: '', description: '', xpReward: 100, type: 'SIDE' as GoalType });
  const [aiMessage, setAiMessage] = useState('');
  
  // Real-time tick for timer
  const [now, setNow] = useState(Date.now());

  // Save state on change
  useEffect(() => {
    localStorage.setItem('rpg_state', JSON.stringify(state));
  }, [state]);

  // AI Daily Side Goal & Habit Reset logic
  useEffect(() => {
    const today = state.simulatedDate || new Date().toISOString().split('T')[0];
    if (state.lastDailyGoalDate !== today) {
      generateDailyGoals(today);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.simulatedDate, state.lastDailyGoalDate]);

  // Timer Tick logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state.timer?.isRunning) {
      interval = setInterval(() => {
        setNow(Date.now());
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [state.timer?.isRunning]);

  const addXp = (amount: number) => {
    setState(prev => {
      let newXp = prev.xp + amount;
      let newLevel = prev.level;
      let newXpToNext = prev.xpToNextLevel;

      if (amount > 0) {
        while (newXp >= newXpToNext) {
          newXp -= newXpToNext;
          newLevel += 1;
          newXpToNext = Math.floor(newXpToNext * 1.5);
        }
      } else {
        // Handle negative XP (level down)
        const getXpForLevel = (lvl: number) => {
          let req = 1000;
          for (let i = 1; i < lvl; i++) req = Math.floor(req * 1.5);
          return req;
        };

        while (newXp < 0 && newLevel > 1) {
          newLevel -= 1;
          newXpToNext = getXpForLevel(newLevel);
          newXp += newXpToNext;
        }
        
        if (newXp < 0) {
          newXp = 0; // Prevent going below 0 XP on level 1
        }
      }

      return {
        ...prev,
        xp: newXp,
        level: newLevel,
        xpToNextLevel: newXpToNext
      };
    });
  };

  const toggleGoal = (id: string) => {
    const goal = state.goals.find(g => g.id === id);
    if (!goal) return;

    const isCompleting = !goal.completed;
    addXp(isCompleting ? goal.xpReward : -goal.xpReward);

    setState(prev => {
      const updatedGoals = prev.goals.map(g => 
        g.id === id ? { ...g, completed: isCompleting } : g
      );
      return { ...prev, goals: updatedGoals };
    });
  };

  const deleteGoal = (id: string) => {
    setState(prev => ({
      ...prev,
      goals: prev.goals.filter(g => g.id !== id)
    }));
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const targetData = editingGoal || newGoal;
    if (!targetData.title.trim()) return;

    if (editingGoal) {
      setState(prev => ({
        ...prev,
        goals: prev.goals.map(g => g.id === editingGoal.id ? editingGoal : g)
      }));
    } else {
      setState(prev => ({
        ...prev,
        goals: [
          {
            ...newGoal,
            id: `manual-${Date.now()}`,
            completed: false,
            createdAt: Date.now()
          },
          ...prev.goals
        ]
      }));
    }
    closeForm();
  };

  const closeForm = () => {
    setIsAddModalOpen(false);
    setEditingGoal(null);
    setNewGoal({ title: '', description: '', xpReward: 100, type: 'SIDE' });
  };

  const generateDailyGoals = async (today: string) => {
    try {
      const response = await fetch('/api/ai/daily-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userLevel: state.level })
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        const generatedGoals: Goal[] = data.map(g => ({
          ...g,
          id: `daily-${Date.now()}-${Math.random()}`,
          completed: false,
          createdAt: Date.now()
        }));

        setState(prev => ({
          ...prev,
          lastDailyGoalDate: today,
          goals: [...generatedGoals, ...prev.goals]
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const generateAIGoals = async (customPrompt?: string) => {
    setIsAiLoading(true);
    try {
      const response = await fetch('/api/ai/suggest-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userLevel: state.level,
          xp: state.xp,
          customMessage: customPrompt || ''
        })
      });
      
      const data = await response.json();
      if (Array.isArray(data)) {
        const generatedGoals: Goal[] = data.map(g => ({
          ...g,
          id: `ai-${Date.now()}-${Math.random()}`,
          completed: false,
          createdAt: Date.now()
        }));

        setState(prev => ({
          ...prev,
          goals: [...generatedGoals, ...prev.goals]
        }));
        setAiMessage('');
      }
    } catch (e) {
      console.error(e);
      alert('Nie udało się wygenerować celów. Spróbuj ponownie.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // ADMIN TOOL: Simulate Forward
  const simulateNextDay = () => {
    setState(prev => {
      const current = new Date(prev.simulatedDate || new Date().toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
      const nextDate = current.toISOString().split('T')[0];
      
      return {
        ...prev,
        simulatedDate: nextDate,
        goals: prev.goals.map(g => g.type === 'HABIT' ? { ...g, completed: false } : g)
      };
    });
  };

  // ADMIN TOOL: Simulate Backward
  const simulatePrevDay = () => {
    setState(prev => {
      const current = new Date(prev.simulatedDate || new Date().toISOString().split('T')[0]);
      current.setDate(current.getDate() - 1);
      const prevDate = current.toISOString().split('T')[0];
      
      return {
        ...prev,
        simulatedDate: prevDate,
        goals: prev.goals.map(g => g.type === 'HABIT' ? { ...g, completed: false } : g)
      };
    });
  };

  // ADMIN TOOL: Simulate Forward Month
  const simulateNextMonth = () => {
    setState(prev => {
      const current = new Date(prev.simulatedDate || new Date().toISOString().split('T')[0]);
      current.setMonth(current.getMonth() + 1);
      const nextDate = current.toISOString().split('T')[0];
      
      return {
        ...prev,
        simulatedDate: nextDate,
        goals: prev.goals.map(g => g.type === 'HABIT' ? { ...g, completed: false } : g)
      };
    });
  };

  // ADMIN TOOL: Simulate Backward Month
  const simulatePrevMonth = () => {
    setState(prev => {
      const current = new Date(prev.simulatedDate || new Date().toISOString().split('T')[0]);
      current.setMonth(current.getMonth() - 1);
      const prevDate = current.toISOString().split('T')[0];
      
      return {
        ...prev,
        simulatedDate: prevDate,
        goals: prev.goals.map(g => g.type === 'HABIT' ? { ...g, completed: false } : g)
      };
    });
  };

  // TIMER LOGIC
  const getElapsedSeconds = () => {
    if (!state.timer) return 0;
    let totalMs = state.timer.elapsed;
    if (state.timer.isRunning && state.timer.startTime) {
      totalMs += (now - state.timer.startTime);
    }
    return Math.floor(totalMs / 1000);
  };

  const toggleTimer = () => {
    setState(prev => {
      const timer = prev.timer || { isRunning: false, startTime: null, elapsed: 0 };
      if (timer.isRunning) {
        return {
          ...prev,
          timer: {
            isRunning: false,
            startTime: null,
            elapsed: timer.elapsed + (Date.now() - (timer.startTime || Date.now()))
          }
        };
      } else {
        return {
          ...prev,
          timer: {
            ...timer,
            isRunning: true,
            startTime: Date.now()
          }
        };
      }
    });
  };

  const resetTimer = () => {
    if (confirm('Czy na pewno chcesz zresetować timer bez odbierania nagrody?')) {
      setState(prev => ({
        ...prev,
        timer: { isRunning: false, startTime: null, elapsed: 0 }
      }));
    }
  };

  const claimTimerXp = () => {
     const seconds = getElapsedSeconds();
     const minutes = Math.floor(seconds / 60);
     if (minutes > 0) {
        setState(prev => {
          let newXp = prev.xp + (minutes * 10);
          let newLevel = prev.level;
          let newXpToNext = prev.xpToNextLevel;

          while (newXp >= newXpToNext) {
            newXp -= newXpToNext;
            newLevel += 1;
            newXpToNext = Math.floor(newXpToNext * 1.5);
          }

          return {
            ...prev,
            xp: newXp,
            level: newLevel,
            xpToNextLevel: newXpToNext,
            timer: { isRunning: false, startTime: null, elapsed: 0 }
          };
        });
        alert(`Świetna praca! Otrzymujesz ${minutes * 10} XP za ${minutes} min skupienia.`);
     } else {
        alert('Musisz skupić się na co najmniej 1 pełną minutę, aby zdobyć XP.');
     }
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = Math.min(100, (state.xp / state.xpToNextLevel) * 100);
  const currentGoals = state.goals.filter(g => g.type === activeTab);

  const isModalOpen = isAddModalOpen || editingGoal !== null;
  const modalTitle = editingGoal ? 'Edytuj Cel/Nawyk' : 'Dodaj Cel/Nawyk';
  const formData = editingGoal || newGoal;

  const updateFormData = (updates: Partial<Goal>) => {
    if (editingGoal) {
      setEditingGoal({ ...editingGoal, ...updates });
    } else {
      setNewGoal({ ...newGoal, ...updates } as typeof newGoal);
    }
  };

  const isFourMonthsPassed = () => {
    if (!state.startDate || !state.simulatedDate) return false;
    const start = new Date(state.startDate);
    const current = new Date(state.simulatedDate);
    start.setMonth(start.getMonth() + 4);
    return current >= start;
  };

  const handleFourMonthGoalResponse = (success: boolean) => {
    setState(prev => ({
      ...prev,
      fourMonthGoalStatus: success ? 'SUCCESS' : 'FAILED'
    }));
    if (success) {
      addXp(5000);
      alert('Gratulacje! Otrzymujesz 5000 XP za osiągnięcie głównego celu!');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-indigo-500/30 pb-20">
      
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <Briefcase size={20} />
            </div>
            <span className="font-semibold text-lg tracking-tight hidden sm:block text-white">Kreator: Milioner</span>
          </div>

          <div className="flex items-center gap-6">
            <PWAInstallButton />
            <div className="flex items-center gap-2">
              <Target size={18} className="text-emerald-400" />
              <div className="flex flex-col">
                <span className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">Cel: 40k (4 mies.)</span>
                <span className="text-sm font-medium">Automatyzacje</span>
              </div>
            </div>
            
            <div className="h-8 w-px bg-neutral-800 hidden sm:block"></div>

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">Poziom {state.level}</span>
                <span className="text-sm font-medium text-indigo-400">{state.xp} / {state.xpToNextLevel} XP</span>
              </div>
              <div className="relative w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center ring-2 ring-indigo-500/30 shrink-0">
                <Trophy size={18} className="text-indigo-400" />
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle 
                    cx="20" cy="20" r="19" 
                    fill="transparent" stroke="currentColor" strokeWidth="2" 
                    className="text-neutral-800" 
                  />
                  <circle 
                    cx="20" cy="20" r="19" 
                    fill="transparent" stroke="currentColor" strokeWidth="2" 
                    strokeDasharray={120}
                    strokeDashoffset={120 - (120 * progressPercent) / 100}
                    className="text-indigo-500 transition-all duration-1000 ease-out" 
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-[1fr_380px] gap-8">
        
        {/* Left Column: Goals & Timer */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h1 className="text-3xl font-light tracking-tight">Twoja Ścieżka</h1>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-medium hover:bg-neutral-200 transition-colors"
            >
              <Plus size={16} /> Dodaj Własny
            </button>
          </div>

          <div className="flex flex-wrap bg-neutral-900 rounded-xl p-1 w-full border border-neutral-800">
            <button 
              onClick={() => setActiveTab('MAIN')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'MAIN' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
              }`}
            >
              <Star size={16} className={activeTab === 'MAIN' ? "text-amber-400" : ""} />
              Główne
            </button>
            <button 
              onClick={() => setActiveTab('SIDE')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'SIDE' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
              }`}
            >
              <Target size={16} className={activeTab === 'SIDE' ? "text-indigo-400" : ""} />
              Poboczne
            </button>
            <button 
              onClick={() => setActiveTab('HABIT')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'HABIT' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
              }`}
            >
              <CalendarHeart size={16} className={activeTab === 'HABIT' ? "text-emerald-400" : ""} />
              Nawyki
            </button>
            <button 
              onClick={() => setActiveTab('TIMER')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'TIMER' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
              }`}
            >
              <Timer size={16} className={activeTab === 'TIMER' ? "text-rose-400" : ""} />
              Timer Sesji
            </button>
          </div>

          <div className="space-y-3">
            {activeTab === 'TIMER' ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 text-center border border-neutral-800 rounded-3xl bg-neutral-900/50 flex flex-col items-center justify-center min-h-[400px]"
              >
                <h2 className="text-2xl font-light mb-2">Skupienie = XP</h2>
                <p className="text-neutral-400 text-sm mb-8 max-w-md">Włącz timer na czas pracy lub nauki. Timer działa w tle nawet po zamknięciu karty przeglądarki. Zdobędziesz 10 XP za każdą pełną minutę.</p>
                
                <div className="w-56 h-56 rounded-full border border-neutral-800 flex items-center justify-center mb-8 relative bg-neutral-950 shadow-inner">
                  {state.timer?.isRunning && (
                     <div className="absolute inset-0 rounded-full border-4 border-rose-500/50 border-t-rose-500 animate-spin" style={{ animationDuration: '3s' }}></div>
                  )}
                  <span className="text-6xl font-mono tracking-wider font-light text-white">
                    {formatTime(getElapsedSeconds())}
                  </span>
                </div>
                
                <div className="flex gap-4 mb-8">
                  <button 
                    onClick={toggleTimer}
                    className={`flex items-center gap-2 px-8 py-3 rounded-xl font-medium transition-colors text-lg ${
                      state.timer?.isRunning 
                        ? 'bg-neutral-800 text-amber-400 hover:bg-neutral-700'
                        : 'bg-rose-600 text-white hover:bg-rose-500 shadow-lg shadow-rose-900/50'
                    }`}
                  >
                    {state.timer?.isRunning ? <><Pause size={20} /> Pauza</> : <><Play size={20} /> Start</>}
                  </button>
                  
                  <button 
                    onClick={resetTimer}
                    title="Zresetuj timer"
                    className="flex items-center justify-center w-14 rounded-xl font-medium bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors"
                  >
                    <RotateCcw size={20} />
                  </button>
                </div>

                <div className="mt-2">
                   <button 
                     onClick={claimTimerXp}
                     className="text-sm text-emerald-400 hover:text-emerald-300 font-medium flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl transition-colors border border-emerald-500/20"
                   >
                     <Sparkles size={18} /> Zakończ i odbierz XP
                   </button>
                </div>
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
                {currentGoals.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-8 text-center border border-dashed border-neutral-800 rounded-2xl bg-neutral-900/50"
                  >
                    <Target className="mx-auto text-neutral-600 mb-3" size={32} />
                    <p className="text-neutral-400 font-medium">Brak elementów w tej kategorii.</p>
                    <p className="text-sm text-neutral-500 mt-1">Poproś AI o wygenerowanie nowych lub dodaj własne.</p>
                  </motion.div>
                ) : (
                  currentGoals.map(goal => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={goal.id}
                      className={`p-5 rounded-2xl border transition-all group ${
                        goal.completed 
                          ? 'bg-neutral-900/40 border-neutral-800/50 opacity-60' 
                          : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/80 cursor-pointer'
                      }`}
                      onClick={() => !goal.completed && toggleGoal(goal.id)}
                    >
                      <div className="flex gap-4 items-start">
                        <button 
                          className="shrink-0 mt-0.5 text-neutral-500 hover:text-indigo-400 transition-colors"
                          onClick={(e) => { e.stopPropagation(); toggleGoal(goal.id); }}
                        >
                          {goal.completed ? <CheckCircle size={24} className="text-emerald-500" /> : <Circle size={24} />}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <h3 className={`font-medium text-lg leading-snug ${goal.completed ? 'line-through text-neutral-500' : 'text-neutral-100'}`}>
                              {goal.title}
                            </h3>
                            <span className={`shrink-0 flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md ${
                              goal.type === 'MAIN' ? 'bg-amber-500/10 text-amber-400' : 
                              goal.type === 'HABIT' ? 'bg-emerald-500/10 text-emerald-400' :
                              'bg-indigo-500/10 text-indigo-400'
                            }`}>
                              +{goal.xpReward} XP
                            </span>
                          </div>
                          <p className="text-neutral-400 text-sm leading-relaxed">{goal.description}</p>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex gap-1 transition-opacity shrink-0">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setEditingGoal(goal); }}
                            className="p-1.5 text-neutral-500 hover:text-indigo-400 rounded-md hover:bg-neutral-800 transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteGoal(goal.id); }}
                            className="p-1.5 text-neutral-500 hover:text-red-400 rounded-md hover:bg-neutral-800 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Right Column: AI Assistant */}
        <div className="space-y-6">
          <div className="bg-neutral-900 rounded-3xl border border-neutral-800 p-6 flex flex-col h-[600px] sticky top-24 shadow-2xl">
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center shrink-0">
                <BrainCircuit size={20} className="text-indigo-400" />
              </div>
              <div>
                <h2 className="font-semibold text-white">Mentor AI</h2>
                <p className="text-xs text-neutral-400">Gemini Pro • Zawsze online</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-thin scrollbar-thumb-neutral-800">
              <div className="bg-neutral-800/50 p-4 rounded-2xl rounded-tl-sm text-sm text-neutral-300 leading-relaxed border border-neutral-800">
                <p>Witaj. Z każdym nowym dniem przygotowuję dla Ciebie 1 mały cel poboczny na rozgrzewkę.</p>
                <p className="mt-2">Pamiętaj też o codziennych nawykach. Dyscyplina to podstawa w drodze do miliona.</p>
                <p className="mt-2">Możesz też poprosić mnie o wygenerowanie większej strategii, podając specyfikę zadania poniżej.</p>
              </div>
            </div>

            <div className="mt-auto space-y-3 pt-4 border-t border-neutral-800">
              <button 
                disabled={isAiLoading}
                onClick={() => generateAIGoals()}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white py-3 px-4 rounded-xl font-medium transition-colors"
              >
                {isAiLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                Wygeneruj plan zadań
              </button>
              
              <div className="relative">
                <input 
                  type="text" 
                  value={aiMessage}
                  onChange={(e) => setAiMessage(e.target.value)}
                  placeholder="Poproś o konkretny cel..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-neutral-200 placeholder-neutral-600"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && aiMessage.trim() && !isAiLoading) {
                      generateAIGoals(aiMessage);
                    }
                  }}
                />
                <button 
                  disabled={isAiLoading || !aiMessage.trim()}
                  onClick={() => generateAIGoals(aiMessage)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-neutral-500 hover:text-indigo-400 disabled:opacity-50 transition-colors"
                >
                  <MessageSquare size={16} />
                </button>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Admin Tool Widget */}
      <div className="fixed bottom-4 right-4 bg-neutral-900 border border-neutral-700 p-4 rounded-2xl shadow-2xl z-40 flex flex-col gap-3 w-[280px]">
        <div className="flex items-center justify-between text-neutral-400">
          <div className="flex items-center gap-2">
            <Settings size={16} className="animate-[spin_4s_linear_infinite]" />
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">Admin Tool</span>
          </div>
        </div>
        <div className="flex items-center justify-between bg-neutral-950 px-3 py-2 rounded-lg border border-neutral-800">
          <span className="text-xs text-neutral-500 font-medium">Data Systemu:</span>
          <span className="text-sm text-indigo-400 font-mono">{state.simulatedDate}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={simulatePrevDay}
            className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs px-2 py-2.5 rounded-lg transition-colors border border-neutral-700 font-medium flex items-center justify-center gap-1.5"
          >
            <History size={14} className="text-amber-400" />
            -1 Dzień
          </button>
          <button 
            onClick={simulateNextDay}
            className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs px-2 py-2.5 rounded-lg transition-colors border border-neutral-700 font-medium flex items-center justify-center gap-1.5"
          >
            <CalendarHeart size={14} className="text-emerald-400" />
            +1 Dzień
          </button>
          <button 
            onClick={simulatePrevMonth}
            className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs px-2 py-2.5 rounded-lg transition-colors border border-neutral-700 font-medium flex items-center justify-center gap-1.5"
          >
            <History size={14} className="text-amber-400" />
            -1 Miesiąc
          </button>
          <button 
            onClick={simulateNextMonth}
            className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs px-2 py-2.5 rounded-lg transition-colors border border-neutral-700 font-medium flex items-center justify-center gap-1.5"
          >
            <CalendarHeart size={14} className="text-emerald-400" />
            +1 Miesiąc
          </button>
        </div>
      </div>

      {/* Add / Edit Goal Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="flex justify-between items-center p-6 border-b border-neutral-800">
                <h3 className="text-xl font-medium">{modalTitle}</h3>
                <button onClick={closeForm} className="text-neutral-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSaveGoal} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1.5">Tytuł</label>
                  <input 
                    required
                    autoFocus
                    type="text" 
                    value={formData.title}
                    onChange={(e) => updateFormData({ title: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-white"
                    placeholder="np. Napisz post na LinkedIn"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1.5">Opis (opcjonalnie)</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => updateFormData({ description: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-white min-h-[80px]"
                    placeholder="Więcej szczegółów..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-1.5">Typ</label>
                    <select 
                      value={formData.type}
                      onChange={(e) => updateFormData({ type: e.target.value as GoalType })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-white appearance-none"
                    >
                      <option value="MAIN">Cel Główny</option>
                      <option value="SIDE">Cel Poboczny</option>
                      <option value="HABIT">Nawyk</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-400 mb-1.5">Nagroda XP</label>
                    <input 
                      type="number" 
                      min="10"
                      step="10"
                      value={formData.xpReward}
                      onChange={(e) => updateFormData({ xpReward: parseInt(e.target.value) || 0 })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-white"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={closeForm}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-800 text-neutral-300 font-medium hover:bg-neutral-800 transition-colors"
                  >
                    Anuluj
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white text-black font-medium hover:bg-neutral-200 transition-colors"
                  >
                    Zapisz
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4-Month Check Modal */}
      <AnimatePresence>
        {isFourMonthsPassed() && state.fourMonthGoalStatus === 'PENDING' && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-8 text-center"
            >
              <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy size={40} className="text-indigo-400" />
              </div>
              <h2 className="text-3xl font-light mb-4">Czas na podsumowanie</h2>
              <p className="text-neutral-300 text-lg mb-8">Minęły 4 miesiące odkąd zacząłeś. Czy udało Ci się osiągnąć główny cel: <span className="font-semibold text-white">40k w 4 miesiące</span>?</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                  onClick={() => handleFourMonthGoalResponse(false)}
                  className="px-6 py-4 rounded-xl border border-neutral-700 text-neutral-300 font-medium hover:bg-neutral-800 transition-colors text-lg"
                >
                  Nie, jeszcze nie
                </button>
                <button 
                  onClick={() => handleFourMonthGoalResponse(true)}
                  className="px-6 py-4 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/50 text-lg flex items-center justify-center gap-2"
                >
                  <Sparkles size={20} />
                  Tak, udało się!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
