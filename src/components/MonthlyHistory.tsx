import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn, formatCurrency } from '@/lib/utils';
import { Operation, Transaction, HistoryAdjustment } from '@/src/types';

interface MonthlyHistoryProps {
  operations: Operation[];
  transactions: Transaction[];
  adjustments: HistoryAdjustment[];
}

export default function MonthlyHistory({ operations, transactions, adjustments }: MonthlyHistoryProps) {
  const monthlyData = React.useMemo(() => {
    const months: Record<string, {
      month: number;
      year: number;
      profit: number; // Net winnings + adjustments
      deposits: number;
      withdrawals: number;
      opCount: number;
      stakeOut: number;
      stakeIn: number;
      timestamp: number;
    }> = {};

    const ensureMonth = (d: Date) => {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!months[key]) {
        months[key] = { 
          month: d.getMonth(), 
          year: d.getFullYear(), 
          profit: 0, 
          deposits: 0, 
          withdrawals: 0, 
          opCount: 0,
          stakeOut: 0,
          stakeIn: 0,
          timestamp: new Date(d.getFullYear(), d.getMonth(), 1).getTime() 
        };
      }
      return key;
    };

    // Process operations
    operations.forEach(op => {
      const dPlaced = new Date(op.date);
      ensureMonth(dPlaced); // Ensure month exists even if op is pending
      
      const keyPlaced = `${dPlaced.getFullYear()}-${String(dPlaced.getMonth() + 1).padStart(2, '0')}`;
      months[keyPlaced].opCount += 1;

      if (op.status !== 'pending') {
        const dSettled = new Date(op.settledAt || op.date);
        const keySettled = ensureMonth(dSettled);
        months[keySettled].profit += op.profit;
      }
    });

    // Process transactions
    transactions.forEach(tr => {
      const d = new Date(tr.date);
      const key = ensureMonth(d);
      
      if (tr.type === 'deposit') {
        months[key].deposits += tr.amount;
      } else if (tr.type === 'withdrawal') {
        months[key].withdrawals += tr.amount;
      } else if (tr.type === 'adjustment') {
        months[key].profit -= tr.amount;
      }
    });

    const sortedMonths = Object.values(months)
      .sort((a, b) => a.timestamp - b.timestamp);

    let cumulativeBalance = 0;
    const history = sortedMonths.map(m => {
      const initialValue = cumulativeBalance;
      const monthKey = `${m.year}-${String(m.month + 1).padStart(2, '0')}`;
      
      const monthlyNet = m.deposits - m.withdrawals + m.profit;
      let finalValue = initialValue + monthlyNet;

      // Apply manual adjustment if exists
      const adj = adjustments.find(a => a.monthKey === monthKey);
      if (adj) {
        finalValue = adj.targetFinalValue;
      }
      
      cumulativeBalance = finalValue;

      return {
        ...m,
        monthKey,
        initialValue,
        finalValue,
        label: new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(m.year, m.month))
      };
    });

    return [...history].reverse();
  }, [operations, transactions, adjustments]);

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
                <TableHead className="text-gray-400 text-right">V. Inicial</TableHead>
                <TableHead className="text-gray-400 text-right">V. Final</TableHead>
                <TableHead className="text-gray-400 text-right">Depósitos</TableHead>
                <TableHead className="text-gray-400 text-right">Saques</TableHead>
                <TableHead className="text-gray-400 text-center">Ops</TableHead>
                <TableHead className="text-gray-400 text-right">Lucro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyData.map((data, i) => (
                <TableRow key={i} className="border-white/5 hover:bg-white/5 group">
                  <TableCell className="font-bold capitalize">{data.label}</TableCell>
                  <TableCell className="text-gray-400 text-right">R$ {formatCurrency(data.initialValue)}</TableCell>
                  <TableCell className="font-bold text-white text-right">R$ {formatCurrency(data.finalValue)}</TableCell>
                  <TableCell className="text-green-400/80 text-right">R$ {formatCurrency(data.deposits)}</TableCell>
                  <TableCell className="text-red-400/80 text-right">R$ {formatCurrency(data.withdrawals)}</TableCell>
                  <TableCell className="text-gray-400 text-center">{data.opCount}</TableCell>
                  <TableCell className="text-right">
                    <span className={`font-bold ${data.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      R$ {formatCurrency(data.profit)}
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
