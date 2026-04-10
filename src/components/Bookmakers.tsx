import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, RotateCcw, Edit2, Landmark } from 'lucide-react';
import { Bookmaker } from '@/src/types';
import { Badge } from '@/components/ui/badge';
import { motion } from 'motion/react';

interface BookmakersProps {
  bookmakers: Bookmaker[];
  onAdd: (name: string, balance: number) => void;
  onUpdate: (id: string, updates: Partial<Bookmaker>) => void;
  onDelete: (id: string) => void;
  onTransaction: (bookmakerId: string, amount: number, type: 'deposit' | 'withdrawal' | 'adjustment') => void;
}

export default function Bookmakers({ bookmakers, onAdd, onUpdate, onDelete, onTransaction }: BookmakersProps) {
  const [newName, setNewName] = React.useState('');
  const [newBalance, setNewBalance] = React.useState('');
  const [isAddOpen, setIsAddOpen] = React.useState(false);

  const [transactionAmount, setTransactionAmount] = React.useState('');
  const [activeTransaction, setActiveTransaction] = React.useState<{ id: string, type: 'deposit' | 'withdrawal' | 'adjustment' } | null>(null);

  const activeBookies = bookmakers.filter(b => !b.isLimited);
  const limitedBookies = bookmakers.filter(b => b.isLimited);

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
      onTransaction(activeTransaction.id, parseFloat(transactionAmount), activeTransaction.type);
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeBookies.map((bookie) => (
          <motion.div key={bookie.id} layout>
            <Card className="bg-[#0f0f0f] border-white/10 hover:border-purple-500/50 transition-colors group">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-400">
                    <Landmark size={20} />
                  </div>
                  <CardTitle className="text-lg font-bold">{bookie.name}</CardTitle>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white" onClick={() => onUpdate(bookie.id, { isLimited: true })}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Banca Atual</span>
                    <div className="text-2xl font-bold text-white">R$ {bookie.balance.toLocaleString('pt-BR')}</div>
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
                      className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 h-9 text-[10px] sm:text-xs"
                      onClick={() => setActiveTransaction({ id: bookie.id, type: 'adjustment' })}
                    >
                      Prejuízo
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={!!activeTransaction} onOpenChange={(open) => !open && setActiveTransaction(null)}>
        <DialogContent className="bg-[#0f0f0f] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>
              {activeTransaction?.type === 'deposit' ? 'Realizar Depósito' : 
               activeTransaction?.type === 'withdrawal' ? 'Realizar Saque' : 'Registrar Prejuízo'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
                'bg-red-600 hover:bg-red-700'
              }`}
            >
              Confirmar {
                activeTransaction?.type === 'deposit' ? 'Depósito' : 
                activeTransaction?.type === 'withdrawal' ? 'Saque' : 'Prejuízo'
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {limitedBookies.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-red-400 flex items-center gap-2">
            <Trash2 size={20} />
            Casas Limitadas (Lixo)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {limitedBookies.map((bookie) => (
              <Card key={bookie.id} className="bg-[#0f0f0f]/50 border-red-900/20 opacity-60 grayscale hover:grayscale-0 transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-bold text-gray-400">{bookie.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-green-400" onClick={() => onUpdate(bookie.id, { isLimited: false })}>
                      <RotateCcw size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-400" onClick={() => onDelete(bookie.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Badge variant="destructive" className="bg-red-900/20 text-red-400 border-red-900/30">Limitada</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
