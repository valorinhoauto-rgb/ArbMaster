import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Operation, Transaction } from '@/src/types';

interface MonthlyHistoryProps {
  operations: Operation[];
  transactions: Transaction[];
}

export default function MonthlyHistory({ operations, transactions }: MonthlyHistoryProps) {
  const monthlyData = React.useMemo(() => {
    const months: Record<string, {
      month: number;
      year: number;
      profit: number;
      deposits: number;
      withdrawals: number;
      opCount: number;
      timestamp: number;
    }> = {};

    // Process operations
    operations.filter(op => op.status === 'completed').forEach(op => {
      const d = new Date(op.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!months[key]) {
        months[key] = { 
          month: d.getMonth(), 
          year: d.getFullYear(), 
          profit: 0, 
          deposits: 0, 
          withdrawals: 0, 
          opCount: 0, 
          timestamp: new Date(d.getFullYear(), d.getMonth(), 1).getTime() 
        };
      }
      months[key].profit += op.profit;
      months[key].opCount += 1;
    });

    // Process transactions
    transactions.forEach(tr => {
      const d = new Date(tr.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!months[key]) {
        months[key] = { 
          month: d.getMonth(), 
          year: d.getFullYear(), 
          profit: 0, 
          deposits: 0, 
          withdrawals: 0, 
          opCount: 0, 
          timestamp: new Date(d.getFullYear(), d.getMonth(), 1).getTime() 
        };
      }
      if (tr.type === 'deposit') {
        months[key].deposits += tr.amount;
      } else if (tr.type === 'withdrawal') {
        months[key].withdrawals += tr.amount;
      } else if (tr.type === 'adjustment') {
        // Adjustments are treated as manual losses/prejuízos
        months[key].profit -= tr.amount;
      }
    });

    const sortedMonths = Object.values(months).sort((a, b) => b.timestamp - a.timestamp);

    // Calculate initial and final values
    return sortedMonths.map(m => {
      const beforeThisMonthOps = operations.filter(op => op.status === 'completed' && new Date(op.date).getTime() < m.timestamp);
      const beforeThisMonthTrans = transactions.filter(tr => new Date(tr.date).getTime() < m.timestamp);
      
      const initialValue = beforeThisMonthTrans.reduce((acc, tr) => {
        if (tr.type === 'deposit') return acc + tr.amount;
        if (tr.type === 'withdrawal') return acc - tr.amount;
        if (tr.type === 'adjustment') return acc - tr.amount;
        return acc;
      }, 0) + beforeThisMonthOps.reduce((acc, op) => acc + op.profit, 0);
      
      const finalValue = initialValue + m.deposits - m.withdrawals + m.profit;

      return {
        ...m,
        initialValue,
        finalValue,
        label: new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(m.year, m.month))
      };
    });
  }, [operations, transactions]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Histórico Mensal</h2>
        <p className="text-gray-400">Resumo consolidado de performance por mês.</p>
      </div>

      <Card className="bg-[#0f0f0f] border-white/10">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-gray-400">Mês</TableHead>
                <TableHead className="text-gray-400">V. Inicial</TableHead>
                <TableHead className="text-gray-400">V. Final</TableHead>
                <TableHead className="text-gray-400">Depósitos</TableHead>
                <TableHead className="text-gray-400">Saques</TableHead>
                <TableHead className="text-gray-400">Ops</TableHead>
                <TableHead className="text-gray-400 text-right">Lucro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyData.map((data, i) => (
                <TableRow key={i} className="border-white/5 hover:bg-white/5">
                  <TableCell className="font-bold capitalize">{data.label}</TableCell>
                  <TableCell className="text-gray-400">R$ {data.initialValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className="font-bold text-white">R$ {data.finalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-green-400/80">R$ {data.deposits.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-red-400/80">R$ {data.withdrawals.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-gray-400">{data.opCount}</TableCell>
                  <TableCell className="text-right">
                    <span className={`font-bold ${data.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      R$ {data.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {monthlyData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                    Nenhum dado histórico disponível ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
