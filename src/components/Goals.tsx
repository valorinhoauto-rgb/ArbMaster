import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Target, Plus, Trash2, Calendar, CheckCircle2, TrendingUp, History, Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Goal } from '@/src/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface GoalsProps {
  goals: Goal[];
  onAddGoal: (name: string, targetAmount: number) => Promise<void>;
  onDeleteGoal: (id: string) => Promise<void>;
}

export default function Goals({ goals, onAddGoal, onDeleteGoal }: GoalsProps) {
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [newGoal, setNewGoal] = React.useState({ name: '', target: '' });

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  const handleAdd = async () => {
    const target = parseFloat(newGoal.target);
    if (newGoal.name && !isNaN(target) && target > 0) {
      await onAddGoal(newGoal.name, target);
      setNewGoal({ name: '', target: '' });
      setIsAddOpen(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Suas Metas</h2>
          <p className="text-gray-400">Acompanhe seu progresso e conquiste seus objetivos.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger 
            render={
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="mr-2" size={20} />
                Criar Nova Meta
              </Button>
            } 
          />
          <DialogContent className="bg-[#0f0f0f] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Nova Meta de Lucro</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="goalName">Nome da Meta</Label>
                <Input 
                  id="goalName"
                  placeholder="Ex: Viagem de Fim de Ano"
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goalTarget">Valor Objetivo (R$)</Label>
                <Input 
                  id="goalTarget"
                  type="number"
                  placeholder="0.00"
                  value={newGoal.target}
                  onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <Button onClick={handleAdd} className="w-full bg-purple-600 hover:bg-purple-700 pt-2">
                Começar Jornada
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Flag className="text-purple-400" size={20} />
          Metas em Aberto
        </h3>
        
        {activeGoals.length === 0 ? (
          <Card className="bg-[#0f0f0f] border-dashed border-white/10">
            <CardContent className="py-10 text-center text-gray-500">
              Você não tem metas ativas no momento.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {activeGoals.map((goal) => {
                const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                return (
                  <motion.div
                    key={goal.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <Card className="bg-[#0f0f0f] border-white/10 overflow-hidden group">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <CardTitle className="text-xl font-bold">{goal.name}</CardTitle>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar size={12} />
                              Iniciada em {new Date(goal.createdAt).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-gray-500 hover:text-red-400 hover:bg-red-400/10"
                            onClick={() => onDeleteGoal(goal.id)}
                          >
                            <Trash2 size={18} />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-end">
                          <div className="space-y-1">
                            <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Progresso</p>
                            <p className="text-2xl font-bold text-green-400">
                              R$ {formatCurrency(goal.currentAmount)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Objetivo</p>
                            <p className="text-lg font-semibold text-white">
                              R$ {formatCurrency(goal.targetAmount)}
                            </p>
                          </div>
                        </div>

                        <div className="relative h-3 w-full bg-white/5 rounded-full overflow-hidden p-[1px]">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className={cn(
                              "h-full rounded-full bg-gradient-to-r transition-all duration-500",
                              progress >= 100 ? "from-green-500 to-emerald-400" : "from-purple-500 to-blue-500"
                            )}
                          />
                        </div>
                        
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>{progress.toFixed(1)}% concluído</span>
                          <span>Faltam R$ {formatCurrency(Math.max(goal.targetAmount - goal.currentAmount, 0))}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {completedGoals.length > 0 && (
        <div className="space-y-4 pt-4">
          <h3 className="text-xl font-semibold flex items-center gap-2 text-gray-400">
            <CheckCircle2 className="text-green-500" size={20} />
            Concluídas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-70">
            {completedGoals.map((goal) => (
              <Card key={goal.id} className="bg-[#0f0f0f] border-green-500/20 grayscale hover:grayscale-0 transition-all">
                <CardHeader className="py-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-bold truncate pr-2">{goal.name}</CardTitle>
                    <Badge className="bg-green-600">Finalizada</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-4">
                  <p className="text-lg font-bold text-green-400">R$ {formatCurrency(goal.targetAmount)}</p>
                  <p className="text-[10px] text-gray-500 mt-2">
                    Concluída em {goal.completedAt ? new Date(goal.completedAt).toLocaleDateString('pt-BR') : '---'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
