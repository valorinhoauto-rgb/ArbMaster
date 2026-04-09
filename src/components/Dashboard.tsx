import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { Bookmaker, Operation, Transaction } from '@/src/types';

interface DashboardProps {
  bookmakers: Bookmaker[];
  operations: Operation[];
  transactions: Transaction[];
}

export default function Dashboard({ bookmakers, operations, transactions }: DashboardProps) {
  const totalBalance = bookmakers.reduce((acc, b) => acc + b.balance, 0);
  const totalProfit = operations.reduce((acc, op) => acc + (op.status === 'completed' ? op.profit : 0), 0);
  
  const pendingBankroll = operations
    .filter(op => op.status === 'pending')
    .reduce((acc, op) => acc + op.stake1 + op.stake2, 0);

  const totalDeposits = transactions
    .filter(t => t.type === 'deposit')
    .reduce((acc, t) => acc + t.amount, 0);
    
  const totalWithdrawals = transactions
    .filter(t => t.type === 'withdrawal')
    .reduce((acc, t) => acc + t.amount, 0);

  // Calculate real profit evolution from operations (last 7 days, cumulative)
  const chartData = React.useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const last7Days = [];
    
    // Get start of today in local time
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Initialize the last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      last7Days.push({
        dateStr: d.toISOString().split('T')[0],
        name: days[d.getDay()],
        profit: 0
      });
    }

    // Calculate daily profit for these specific days
    operations
      .filter(op => op.status === 'completed')
      .forEach(op => {
        const opDate = new Date(op.date).toISOString().split('T')[0];
        const dayIndex = last7Days.findIndex(d => d.dateStr === opDate);
        if (dayIndex !== -1) {
          last7Days[dayIndex].profit += op.profit;
        }
      });

    // Calculate cumulative profit
    let cumulative = 0;
    // We might want to start from the total profit before these 7 days to show true evolution
    const profitBefore = operations
      .filter(op => op.status === 'completed')
      .filter(op => new Date(op.date).toISOString().split('T')[0] < last7Days[0].dateStr)
      .reduce((acc, op) => acc + op.profit, 0);
    
    cumulative = profitBefore;

    return last7Days.map(day => {
      cumulative += day.profit;
      return {
        name: day.name,
        profit: Number(cumulative.toFixed(2))
      };
    });
  }, [operations]);

  const stats = [
    { title: 'Banca Total', value: `R$ ${totalBalance.toLocaleString('pt-BR')}`, icon: Wallet, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { title: 'Pendentes', value: `R$ ${pendingBankroll.toLocaleString('pt-BR')}`, icon: Activity, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { title: 'Lucro Total', value: `R$ ${totalProfit.toLocaleString('pt-BR')}`, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-400/10' },
    { title: 'Total Depósitos', value: `R$ ${totalDeposits.toLocaleString('pt-BR')}`, icon: ArrowUpRight, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { title: 'Total Saques', value: `R$ ${totalWithdrawals.toLocaleString('pt-BR')}`, icon: ArrowDownRight, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-gray-400">Visão geral das suas operações de arbitragem.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-[#0f0f0f] border-white/10 overflow-hidden relative group">
              <div className={cn("absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 blur-2xl transition-all group-hover:opacity-20", stat.bg)} />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">{stat.title}</CardTitle>
                <div className={cn("p-2 rounded-lg", stat.bg)}>
                  <stat.icon className={stat.color} size={18} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-[#0f0f0f] border-white/10">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Evolução do Lucro</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#666" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#666" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `R$${value}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorProfit)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-[#0f0f0f] border-white/10">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Banca por Casa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bookmakers.filter(b => !b.isLimited).slice(0, 5).map((bookie) => (
                <div key={bookie.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold">
                      {bookie.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{bookie.name}</span>
                  </div>
                  <span className="text-sm font-bold">R$ {bookie.balance.toLocaleString('pt-BR')}</span>
                </div>
              ))}
              {bookmakers.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">Nenhuma casa cadastrada.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

