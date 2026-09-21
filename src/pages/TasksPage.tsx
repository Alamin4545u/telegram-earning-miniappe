import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { CheckSquare, ExternalLink, Check, Clock, Sparkles, Loader2 } from 'lucide-react';
import { triggerHaptic } from '../lib/telegram.ts';

interface TaskItem {
  id: string;
  title: string;
  description: string;
  reward_points: number;
  task_type: string;
  action_url: string;
  category: string;
  completed?: boolean;
}

export const TasksPage: React.FC = () => {
  const { profile, refreshUserData, showToast, t } = useApp();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [activeVerifyingTaskId, setActiveVerifyingTaskId] = useState<string | null>(null);
  const [verifyCountdown, setVerifyCountdown] = useState(0);
  const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks', {
        headers: { 'x-user-id': profile?.id || '' },
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [profile?.id]);

  // Verification countdown timer
  useEffect(() => {
    let interval: any;
    if (activeVerifyingTaskId && verifyCountdown > 0) {
      interval = setInterval(() => {
        setVerifyCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeVerifyingTaskId, verifyCountdown]);

  const handleStartTask = (task: TaskItem) => {
    triggerHaptic('light');
    if (task.action_url) {
      window.open(task.action_url, '_blank');
    }
    setActiveVerifyingTaskId(task.id);
    setVerifyCountdown(6); // 6s verification wait
  };

  const handleClaimTask = async (task: TaskItem) => {
    setClaimingTaskId(task.id);
    try {
      const res = await fetch('/api/tasks/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': profile?.id || '',
        },
        body: JSON.stringify({ taskId: task.id }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete task');
      }

      triggerHaptic('success');
      showToast(`+${data.rewardPoints} Points claimed for completing task!`, 'success');
      setActiveVerifyingTaskId(null);
      await fetchTasks();
      await refreshUserData();
    } catch (err: any) {
      triggerHaptic('error');
      showToast(err.message, 'error');
    } finally {
      setClaimingTaskId(null);
    }
  };

  return (
    <div className="space-y-4 pb-20 max-w-lg mx-auto px-4 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-sky-400" />
            <span>{t('tasks.title')}</span>
          </h2>
          <p className="text-xs text-slate-400">Complete official partner tasks and boost your balance</p>
        </div>
      </div>

      {loadingTasks ? (
        <div className="text-center py-12 text-slate-400 text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
          <span>Loading tasks...</span>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isCompleted = task.completed;
            const isVerifying = activeVerifyingTaskId === task.id;
            const canClaim = isVerifying && verifyCountdown === 0;

            return (
              <div
                key={task.id}
                className={`p-4 rounded-3xl border transition-all ${
                  isCompleted
                    ? 'bg-slate-950/60 border-slate-900 opacity-70'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {task.category}
                      </span>
                      <span className="text-xs font-bold text-amber-400 font-mono">
                        +{task.reward_points} PTS
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white">{task.title}</h3>
                    <p className="text-xs text-slate-400">{task.description}</p>
                  </div>

                  {/* Action Button */}
                  <div className="shrink-0 pt-1">
                    {isCompleted ? (
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Check className="w-4 h-4" />
                      </div>
                    ) : canClaim ? (
                      <button
                        onClick={() => handleClaimTask(task)}
                        disabled={claimingTaskId === task.id}
                        className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                      >
                        {claimingTaskId === task.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Claim</span>
                          </>
                        )}
                      </button>
                    ) : isVerifying ? (
                      <div className="px-3 py-1.5 bg-slate-800 text-sky-400 text-xs font-mono font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700">
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        <span>{verifyCountdown}s</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartTask(task)}
                        className="px-3.5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-sky-500/20 flex items-center gap-1"
                      >
                        <span>Start</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
