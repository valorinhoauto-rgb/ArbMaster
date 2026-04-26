import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, RotateCcw, Edit2, Landmark, History, TrendingUp, DollarSign, Ban, Info, RefreshCw } from 'lucide-react';
import { Bookmaker, Operation } from '@/src/types';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'motion/react';
import { cn, formatCurrency } from '@/lib/utils';

interface BookmakersProps {
  bookmakers: Bookmaker[];
  operations: Operation[];
  onAdd: (name: string, balance: number) => void;
  onUpdate: (id: string, updates: Partial<Bookmaker>) => void;
  onDelete: (id: string) => void;
  onTransaction: (bookmakerId: string, amount: number, type: 'deposit' | 'withdrawal' | 'adjustment') => void;
  onTransfer: (fromId: string, toId: string, amount: number) => void;
}

export default function Bookmakers({ bookmakers, operations, onAdd, onUpdate, onDelete, onTransaction, onTransfer }: BookmakersProps) {
  const [newName, setNewName] = React.useState('');
  const [newBalance, setNewBalance] = React.useState('');
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isTransferOpen, setIsTransferOpen] = React.useState(false);

  const [transactionAmount, setTransactionAmount] = React.useState('');
  const [adjustmentType, setAdjustmentType] = React.useState<'loss' | 'profit'>('loss');
  const [activeTransaction, setActiveTransaction] = React.useState<{ id: string, type: 'deposit' | 'withdrawal' | 'adjustment' } | null>(null);

  const [transferData, setTransferData] = React.useState({
    fromId: '',
    toId: '',
    amount: ''
  });

  const activeBookies = bookmakers.filter(b => !b.isLimited);
  const limitedBookies = bookmakers.filter(b => b.isLimited);

  const getBookieStats = (bookieId: string) => {
    const bookieOps = operations.filter(op => op.bookmaker1Id === bookieId || op.bookmaker2Id === bookieId);
    
    // Volume is the stake in THIS bookmaker
    const volume = bookieOps.reduce((acc, op) => {
      if (op.bookmaker1Id === bookieId) return acc + op.stake1;
      if (op.bookmaker2Id === bookieId) return acc + op.stake2;
      return acc;
    }, 0);

    const completedOps = bookieOps.filter(op => op.status === 'completed');
    
    // Profit is the sum of operation profits (whole operation)
    const totalProfit = completedOps.reduce((acc, op) => acc + op.profit, 0);
    
    // Total investment in these operations (whole operation)
    const totalInvestment = completedOps.reduce((acc, op) => acc + (op.stake1 + op.stake2), 0);
    
    const roi = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;

    return { volume, profit: totalProfit, roi, count: bookieOps.length };
  };

  const handleAdd = () => {
    if (newName && newBalance) {
      onAdd(newName, parseFloat(newBalance));
      setNewName('');
      setNewBalance('');
      setIsAddOpen(false);
    }
  };

  const handleTransaction = () => {
    if (activeTransaction && transactionAmount) {
      let amount = parseFloat(transactionAmount);
      if (activeTransaction.type === 'adjustment' && adjustmentType === 'profit') {
        // App.tsx subtracts 'adjustment' amount, so to add we send negative
        amount = -amount;
      }
      onTransaction(activeTransaction.id, amount, activeTransaction.type);
      setTransactionAmount('');
      setActiveTransaction(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight">Casas de Aposta</h2>
          <p className="text-gray-400">Gerencie suas bancas e casas limitadas.</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 gap-2"
            onClick={() => setIsTransferOpen(true)}
          >
            <RefreshCw size={18} />
            Transferência
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={
            <Button className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
              <Plus size={18} />
              Nova Casa
            </Button>
          } />
          <DialogContent className="bg-[#0f0f0f] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Adicionar Casa de Aposta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Casa</Label>
                <Input 
                  id="name" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Bet365, Pinnacle"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="balance">Banca Inicial (R$)</Label>
                <Input 
                  id="balance" 
                  type="number"
                  value={newBalance} 
                  onChange={(e) => setNewBalance(e.target.value)}
                  placeholder="0.00"
                  className="bg-white/5 border-white/10"
                />
              </div>
              <Button onClick={handleAdd} className="w-full bg-purple-600 hover:bg-purple-700">
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeBookies.map((bookie) => (
          <motion.div key={bookie.id} layout>
            <Card className="bg-[#0f0f0f] border-white/10 hover:border-purple-500/50 transition-colors group">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-400">
                    <Landmark size={20} />
                  </div>
                  <div className="flex flex-col">
                    <CardTitle className="text-lg font-bold">{bookie.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const stats = getBookieStats(bookie.id);
                        return (
                          <>
                            <span className={cn("text-[10px] font-bold", stats.profit >= 0 ? "text-green-400" : "text-red-400")}>
                              R$ {formatCurrency(stats.profit)}
                            </span>
                            <span className="text-[10px] text-gray-500">•</span>
                            <span className={cn("text-[10px] font-bold", stats.roi >= 0 ? "text-purple-400" : "text-red-400")}>
                              {stats.roi.toFixed(1)}% ROI
                            </span>
                            <span className="text-[10px] text-gray-500">•</span>
                            <span className="text-[10px] text-gray-500 font-bold">{stats.count} bets</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-red-400/10" 
                    onClick={() => onUpdate(bookie.id, { isLimited: true })}
                    title="Marcar como Limitada"
                  >
                    <Ban size={16} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-600/10" 
                    onClick={() => onDelete(bookie.id)}
                    title="Excluir Permanentemente"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Banca Atual</span>
                    <div className="text-2xl font-bold text-white">R$ {formatCurrency(bookie.balance)}</div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10 h-9 text-[10px] sm:text-xs"
                      onClick={() => setActiveTransaction({ id: bookie.id, type: 'deposit' })}
                    >
                      Depósito
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 h-9 text-[10px] sm:text-xs"
                      onClick={() => setActiveTransaction({ id: bookie.id, type: 'withdrawal' })}
                    >
                      Saque
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 border-purple-500/30 text-purple-400 hover:bg-purple-500/10 h-9 text-[10px] sm:text-xs"
                      onClick={() => setActiveTransaction({ id: bookie.id, type: 'adjustment' })}
                    >
                      Ajuste
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="bg-[#0f0f0f] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Transferência entre Casas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Saída (De)</Label>
              <Select value={transferData.fromId} onValueChange={(v) => setTransferData({...transferData, fromId: v})}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Selecione a casa de origem" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                  {activeBookies.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name} (R$ {formatCurrency(b.balance)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Entrada (Para)</Label>
              <Select value={transferData.toId} onValueChange={(v) => setTransferData({...transferData, toId: v})}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Selecione a casa de destino" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                  {activeBookies.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name} (R$ {formatCurrency(b.balance)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transferAmount">Valor (R$)</Label>
              <Input 
                id="transferAmount" 
                type="number"
                value={transferData.amount} 
                onChange={(e) => setTransferData({...transferData, amount: e.target.value})}
                placeholder="0.00"
                className="bg-white/5 border-white/10"
              />
            </div>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                const amount = parseFloat(transferData.amount);
                if (transferData.fromId && transferData.toId && !isNaN(amount) && amount > 0) {
                  if (transferData.fromId === transferData.toId) {
                    toast.error("Selecione casas diferentes para a transferência.");
                    return;
                  }
                  onTransfer(transferData.fromId, transferData.toId, amount);
                  setTransferData({ fromId: '', toId: '', amount: '' });
                  setIsTransferOpen(false);
                }
              }}
            >
              Realizar Transferência
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!activeTransaction} onOpenChange={(open) => !open && setActiveTransaction(null)}>
        <DialogContent className="bg-[#0f0f0f] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>
              {activeTransaction?.type === 'deposit' ? 'Realizar Depósito' : 
               activeTransaction?.type === 'withdrawal' ? 'Realizar Saque' : 'Ajuste de Banca'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {activeTransaction?.type === 'adjustment' && (
              <div className="space-y-2">
                <Label>Tipo de Ajuste</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={adjustmentType === 'profit' ? 'default' : 'outline'}
                    className={cn(
                      "flex-1 gap-2",
                      adjustmentType === 'profit' ? "bg-green-600 hover:bg-green-700" : "border-green-500/30 text-green-400"
                    )}
                    onClick={() => setAdjustmentType('profit')}
                  >
                    <TrendingUp size={16} />
                    Lucro / Bônus
                  </Button>
                  <Button
                    type="button"
                    variant={adjustmentType === 'loss' ? 'default' : 'outline'}
                    className={cn(
                      "flex-1 gap-2",
                      adjustmentType === 'loss' ? "bg-red-600 hover:bg-red-700" : "border-red-500/30 text-red-400"
                    )}
                    onClick={() => setAdjustmentType('loss')}
                  >
                    <TrendingUp size={16} className="rotate-180" />
                    Prejuízo
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input 
                id="amount" 
                type="number"
                value={transactionAmount} 
                onChange={(e) => setTransactionAmount(e.target.value)}
                placeholder="0.00"
                className="bg-white/5 border-white/10"
              />
            </div>
            <Button 
              onClick={handleTransaction} 
              className={`w-full ${
                activeTransaction?.type === 'deposit' ? 'bg-green-600 hover:bg-green-700' : 
                activeTransaction?.type === 'withdrawal' ? 'bg-blue-600 hover:bg-blue-700' : 
                adjustmentType === 'profit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              Confirmar {
                activeTransaction?.type === 'deposit' ? 'Depósito' : 
                activeTransaction?.type === 'withdrawal' ? 'Saque' : 
                adjustmentType === 'profit' ? 'Lucro/Bônus' : 'Prejuízo'
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {limitedBookies.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-red-900/20 pb-4">
            <h3 className="text-xl font-bold text-red-400 flex items-center gap-2">
              <History size={24} />
              Histórico de Casas Limitadas
            </h3>
            <Badge variant="outline" className="border-red-900/30 text-red-400">
              {limitedBookies.length} {limitedBookies.length === 1 ? 'Casa' : 'Casas'}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {limitedBookies.map((bookie) => {
              const stats = getBookieStats(bookie.id);
              return (
                <Card key={bookie.id} className="bg-[#0f0f0f]/80 border-red-900/20 hover:border-red-500/30 transition-all group overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full bg-red-500/5 blur-3xl group-hover:bg-red-500/10 transition-all" />
                  
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-bold text-gray-200">{bookie.name}</CardTitle>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase font-bold">
                        <span>{new Date(bookie.createdAt).toLocaleDateString('pt-BR')}</span>
                        <span>•</span>
                        <span className="text-red-400">{bookie.limitedAt ? new Date(bookie.limitedAt).toLocaleDateString('pt-BR') : 'Limitada'}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-green-400 hover:bg-green-400/10" onClick={() => onUpdate(bookie.id, { isLimited: false })}>
                        <RotateCcw size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-400 hover:bg-red-400/10" onClick={() => onDelete(bookie.id)}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <p className="text-[9px] text-gray-500 uppercase font-bold flex items-center gap-1">
                          <TrendingUp size={10} /> Volume
                        </p>
                        <p className="text-xs font-bold text-white">R$ {formatCurrency(stats.volume)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] text-gray-500 uppercase font-bold flex items-center gap-1">
                          <DollarSign size={10} /> Lucro
                        </p>
                        <p className={cn("text-xs font-bold", stats.profit >= 0 ? "text-green-400" : "text-red-400")}>
                          R$ {formatCurrency(stats.profit)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] text-gray-500 uppercase font-bold flex items-center gap-1">
                          <TrendingUp size={10} /> ROI
                        </p>
                        <p className={cn("text-xs font-bold", stats.roi >= 0 ? "text-purple-400" : "text-red-400")}>
                          {stats.roi.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                      <span className="text-[10px] text-gray-500 font-bold uppercase">Total de Apostas</span>
                      <Badge variant="secondary" className="bg-white/5 text-gray-400 border-white/10">
                        {stats.count}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
