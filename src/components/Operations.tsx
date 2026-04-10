import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Image as ImageIcon, Loader2, Check, X, AlertCircle, TrendingUp, Calendar, ArrowRight, History, ChevronUp, ChevronDown } from 'lucide-react';
import { Bookmaker, Operation } from '@/src/types';
import { extractOperationFromImage, ExtractedOperation } from '@/src/services/geminiService';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface OperationsProps {
  operations: Operation[];
  bookmakers: Bookmaker[];
  onAdd: (op: Omit<Operation, 'id' | 'userId'>) => void;
  onUpdate: (id: string, updates: Partial<Operation>) => void;
  onSettle: (id: string, result: 'win1' | 'win2' | 'void') => void;
  onDelete: (id: string) => void;
  geminiKey?: string;
}

export default function Operations({ operations, bookmakers, onAdd, onUpdate, onSettle, onDelete, geminiKey }: OperationsProps) {
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isAiLoading, setIsAiLoading] = React.useState(false);
  const [extractedOps, setExtractedOps] = React.useState<(ExtractedOperation & { tempId: string })[]>([]);
  const [selectedOp, setSelectedOp] = React.useState<Operation | null>(null);
  const [showAllMonths, setShowAllMonths] = React.useState(false);
  const [sortConfig, setSortConfig] = React.useState<{ key: 'date' | 'profit', direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

  const getDefaultDate = () => new Date().toISOString().slice(0, 16);

  // Manual Form State
  const [manualOp, setManualOp] = React.useState({
    event: '',
    market: '',
    date: getDefaultDate(),
    bookmaker1Id: '',
    bookmaker2Id: '',
    selection1: '',
    selection2: '',
    odds1: '',
    odds2: '',
    stake1: '',
    stake2: ''
  });

  const manualCalculations = React.useMemo(() => {
    const s1 = parseFloat(manualOp.stake1) || 0;
    const s2 = parseFloat(manualOp.stake2) || 0;
    const o1 = parseFloat(manualOp.odds1) || 0;
    const total = s1 + s2;
    const profit = total > 0 ? (s1 * o1) - total : 0;
    const roi = total > 0 ? (profit / total) * 100 : 0;
    return { profit, roi, total };
  }, [manualOp.stake1, manualOp.stake2, manualOp.odds1]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const filteredOperations = React.useMemo(() => {
    let result = operations;
    if (!showAllMonths) {
      result = operations.filter(op => {
        const d = new Date(op.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
    }

    return [...result].sort((a, b) => {
      if (sortConfig.key === 'profit') {
        return sortConfig.direction === 'desc' 
          ? b.profitPercentage - a.profitPercentage 
          : a.profitPercentage - b.profitPercentage;
      }
      return sortConfig.direction === 'desc' 
        ? b.date - a.date 
        : a.date - b.date;
    });
  }, [operations, showAllMonths, currentMonth, currentYear, sortConfig]);

  const completedOps = filteredOperations.filter(op => op.status === 'completed');
  const totalProfit = completedOps.reduce((acc, op) => acc + op.profit, 0);

  // Calculate averages based on ALL operations that have a profit (completed)
  const dailyAverage = React.useMemo(() => {
    if (completedOps.length === 0) return 0;
    const uniqueDays = new Set(completedOps.map(op => new Date(op.date).toDateString())).size;
    return uniqueDays > 0 ? totalProfit / uniqueDays : 0;
  }, [completedOps, totalProfit]);

  const monthlyProjection = React.useMemo(() => {
    if (completedOps.length === 0) return 0;
    
    const totalProfitMonth = completedOps.reduce((acc, op) => acc + op.profit, 0);
    const uniqueDaysMonth = new Set(completedOps.map(op => new Date(op.date).toDateString())).size;
    
    if (uniqueDaysMonth === 0) return 0;
    
    const dailyAvgMonth = totalProfitMonth / uniqueDaysMonth;
    
    // Days in current month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Find first day of betting in current month
    const firstOpDate = new Date(Math.min(...completedOps.map(op => new Date(op.date).getTime())));
    const startDay = firstOpDate.getDate();
    
    // Days available for betting in the month (from start day to end of month)
    const totalBettingDays = daysInMonth - startDay + 1;
    
    return dailyAvgMonth * totalBettingDays;
  }, [completedOps, currentMonth, currentYear]);

  const handleSort = (key: 'date' | 'profit') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const SortIcon = ({ column }: { column: 'date' | 'profit' }) => {
    if (sortConfig.key !== column) return null;
    return sortConfig.direction === 'desc' ? <ChevronDown size={14} className="ml-1" /> : <ChevronUp size={14} className="ml-1" />;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    await processFiles(Array.from(files));
  };

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setIsAiLoading(true);
    const newExtracted: (ExtractedOperation & { tempId: string })[] = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;

      const reader = new FileReader();
      const promise = new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
      });
      reader.readAsDataURL(file);
      const base64 = await promise;
      
      const result = await extractOperationFromImage(base64, file.type, geminiKey);
      if (result) {
        newExtracted.push({ ...result, tempId: Math.random().toString(36).substring(7) });
        toast.success(`Operação identificada: ${result.bookmaker1} vs ${result.bookmaker2}`);
      } else {
        toast.error(`Não foi possível ler o print: ${file.name}`);
      }
    }

    setExtractedOps(prev => [...prev, ...newExtracted]);
    setIsAiLoading(false);
  };

  const handleCreateFromAi = (op: ExtractedOperation & { tempId: string }) => {
    const b1 = bookmakers.find(b => b.name.toLowerCase().includes(op.bookmaker1.toLowerCase()));
    const b2 = bookmakers.find(b => b.name.toLowerCase().includes(op.bookmaker2.toLowerCase()));

    if (!b1 || !b2) {
      toast.error(`Uma ou mais casas não encontradas: ${op.bookmaker1}, ${op.bookmaker2}. Cadastre-as primeiro.`);
      return;
    }

    onAdd({
      date: op.date,
      bookmaker1Id: b1.id,
      bookmaker2Id: b2.id,
      event: op.event,
      market: op.market,
      selection1: op.selection1,
      selection2: op.selection2,
      odds1: op.odds1,
      odds2: op.odds2,
      stake1: op.stake1,
      stake2: op.stake2,
      profit: op.profit,
      profitPercentage: op.profitPercentage,
      status: 'pending'
    });

    setExtractedOps(prev => prev.filter(item => item.tempId !== op.tempId));
    toast.success("Operação criada com sucesso!");
  };

  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        processFiles(files);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight">Operações</h2>
          <p className="text-gray-400">
            {showAllMonths ? 'Histórico completo de operações.' : 'Operações do mês atual.'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="ghost" 
            className={cn(
              "gap-2 border border-white/10",
              showAllMonths ? "bg-white/10 text-white" : "text-gray-400"
            )}
            onClick={() => setShowAllMonths(!showAllMonths)}
          >
            <History size={18} />
            {showAllMonths ? 'Ver Mês Atual' : 'Ver Tudo'}
          </Button>
          <div className="relative">
            <input
              type="file"
              multiple
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleFileUpload}
              disabled={isAiLoading}
            />
            <Button variant="outline" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10 gap-2">
              {isAiLoading ? <Loader2 className="animate-spin" size={18} /> : <ImageIcon size={18} />}
              Identificar Prints (IA)
            </Button>
          </div>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white gap-2" onClick={() => setIsAddOpen(true)}>
            <Plus size={18} />
            Nova Operação
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-[#0f0f0f] border-white/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full bg-green-400/10 blur-2xl group-hover:bg-green-400/20 transition-all" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Média Diária</CardTitle>
            <TrendingUp className="text-green-400" size={18} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">R$ {dailyAverage.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-gray-500 mt-1">Baseado em dias com operações</p>
          </CardContent>
        </Card>

        <Card className="bg-[#0f0f0f] border-white/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full bg-blue-400/10 blur-2xl group-hover:bg-blue-400/20 transition-all" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Projeção Mensal</CardTitle>
            <Calendar className="text-blue-400" size={18} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">R$ {monthlyProjection.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-gray-500 mt-1">Prospecção baseada na média diária</p>
          </CardContent>
        </Card>
      </div>

      {extractedOps.length > 0 && (
        <Card className="bg-purple-600/5 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="text-purple-400" size={20} />
              Operações Identificadas pela IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              {extractedOps.map((op) => (
                <div key={op.tempId} className="p-6 rounded-xl bg-white/5 border border-white/10 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-purple-600">{op.bookmaker1}</Badge>
                      <ArrowRight size={14} className="text-gray-500" />
                      <Badge className="bg-purple-600">{op.bookmaker2}</Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExtractedOps(prev => prev.filter(item => item.tempId !== op.tempId))}>
                      <X size={18} />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500 uppercase font-bold">Evento</p>
                      <p className="font-bold text-lg">{op.event}</p>
                      <p className="text-sm text-gray-400">{op.market}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 uppercase font-bold">Lucro R$</p>
                        <p className="text-green-400 font-bold text-lg">R$ {op.profit.toFixed(2)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 uppercase font-bold">ROI %</p>
                        <p className="text-purple-400 font-bold text-lg">{op.profitPercentage}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5">
                    <div className="p-3 rounded-lg bg-white/5 space-y-1">
                      <p className="text-xs text-gray-500 font-bold">{op.bookmaker1}</p>
                      <p className="text-sm">{op.selection1}</p>
                      <div className="flex justify-between text-xs">
                        <span>Odd: <span className="text-white font-bold">{op.odds1}</span></span>
                        <span>Stake: <span className="text-white font-bold">R$ {op.stake1}</span></span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5 space-y-1">
                      <p className="text-xs text-gray-500 font-bold">{op.bookmaker2}</p>
                      <p className="text-sm">{op.selection2}</p>
                      <div className="flex justify-between text-xs">
                        <span>Odd: <span className="text-white font-bold">{op.odds2}</span></span>
                        <span>Stake: <span className="text-white font-bold">R$ {op.stake2}</span></span>
                      </div>
                    </div>
                  </div>

                  <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={() => handleCreateFromAi(op)}>
                    Confirmar e Registrar Operação
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-[#0f0f0f] border-white/10">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead 
                  className="text-gray-400 w-[120px] cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center">
                    Data
                    <SortIcon column="date" />
                  </div>
                </TableHead>
                <TableHead className="text-gray-400">Evento</TableHead>
                <TableHead className="text-gray-400 text-center w-[220px]">Casas</TableHead>
                <TableHead className="text-gray-400 w-[120px]">Investimento</TableHead>
                <TableHead 
                  className="text-gray-400 w-[140px] cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('profit')}
                >
                  <div className="flex items-center">
                    Lucro
                    <SortIcon column="profit" />
                  </div>
                </TableHead>
                <TableHead className="text-gray-400 w-[100px]">Status</TableHead>
                <TableHead className="text-gray-400 text-right w-[220px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOperations.map((op) => (
                <TableRow key={op.id} className="border-white/5 hover:bg-white/5">
                  <TableCell className="font-medium">{new Date(op.date).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold">{op.event}</span>
                      <span className="text-xs text-gray-500">{op.market}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 w-full max-w-[220px] mx-auto">
                      <div className="flex justify-end">
                        <Badge variant="outline" className="border-white/10 truncate max-w-[90px] justify-center">
                          {bookmakers.find(b => b.id === op.bookmaker1Id)?.name}
                        </Badge>
                      </div>
                      <span className="text-gray-600 text-[10px] font-bold uppercase">vs</span>
                      <div className="flex justify-start">
                        <Badge variant="outline" className="border-white/10 truncate max-w-[90px] justify-center">
                          {bookmakers.find(b => b.id === op.bookmaker2Id)?.name}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>R$ {(op.stake1 + op.stake2).toLocaleString('pt-BR')}</TableCell>
                  <TableCell>
                    <span className={op.profit >= 0 ? "text-green-400" : "text-red-400"}>
                      R$ {op.profit.toLocaleString('pt-BR')} ({op.profitPercentage}%)
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={op.status === 'completed' ? "bg-green-500/20 text-green-400" : op.status === 'void' ? "bg-gray-500/20 text-gray-400" : "bg-yellow-500/20 text-yellow-400"}>
                      {op.status === 'completed' ? 'Concluída' : op.status === 'void' ? 'Anulada' : 'Pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {op.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 border-green-500/30 text-green-400 hover:bg-green-500/10 px-1.5 text-[10px]"
                            onClick={() => onSettle(op.id, 'win1')}
                            title={`Venceu na ${bookmakers.find(b => b.id === op.bookmaker1Id)?.name}`}
                          >
                            W1
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 px-1.5 text-[10px]"
                            onClick={() => onSettle(op.id, 'win2')}
                            title={`Venceu na ${bookmakers.find(b => b.id === op.bookmaker2Id)?.name}`}
                          >
                            W2
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 border-gray-500/30 text-gray-400 hover:bg-gray-500/10 px-1.5 text-[10px]"
                            onClick={() => onSettle(op.id, 'void')}
                            title="Anulada / Reembolso"
                          >
                            V
                          </Button>
                        </div>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 text-gray-400 hover:text-white"
                        onClick={() => setSelectedOp(op)}
                        title="Detalhes"
                      >
                        <AlertCircle size={14} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 text-red-400/50 hover:text-red-400 hover:bg-red-400/10"
                        onClick={() => onDelete(op.id)}
                        title="Excluir"
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="bg-[#0f0f0f] border-white/10 text-white !max-w-[800px] !w-[95vw] max-h-[98vh] overflow-y-auto p-0 gap-0 shadow-2xl shadow-purple-500/20">
          <DialogHeader className="p-4 border-b border-white/10 bg-white/[0.02]">
            <DialogTitle className="text-lg font-bold tracking-tight uppercase">Nova Operação Manual</DialogTitle>
          </DialogHeader>
          
          <div className="p-5 space-y-4">
            {/* Top Info Grid - 3 Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-gray-500 text-[9px] uppercase tracking-wider font-bold">Evento / Jogo</Label>
                <Input 
                  placeholder="Ex: Flamengo vs Palmeiras" 
                  className="bg-white/5 border-white/10 h-9 text-xs focus:ring-purple-500/50 transition-all rounded-lg"
                  value={manualOp.event}
                  onChange={(e) => setManualOp({...manualOp, event: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-500 text-[9px] uppercase tracking-wider font-bold">Mercado / Campeonato</Label>
                <Input 
                  placeholder="Ex: Brasileirão - AH 0.0" 
                  className="bg-white/5 border-white/10 h-9 text-xs focus:ring-purple-500/50 transition-all rounded-lg"
                  value={manualOp.market}
                  onChange={(e) => setManualOp({...manualOp, market: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-500 text-[9px] uppercase tracking-wider font-bold">Data e Hora</Label>
                <Input 
                  type="datetime-local"
                  className="bg-white/5 border-white/10 h-9 text-xs text-white scheme-dark focus:ring-purple-500/50 transition-all rounded-lg"
                  value={manualOp.date}
                  onChange={(e) => setManualOp({...manualOp, date: e.target.value})}
                />
              </div>
            </div>

            {/* Entries Grid - 2 Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Bookmaker 1 */}
              <div className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-purple-500/30 transition-all relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-purple-600" />
                <h3 className="font-bold text-[11px] uppercase text-purple-500">Entrada 01</h3>
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-gray-500 text-[9px] font-bold uppercase">Casa de Aposta</Label>
                    <Select value={manualOp.bookmaker1Id} onValueChange={(v) => setManualOp({...manualOp, bookmaker1Id: v})}>
                      <SelectTrigger className="bg-white/5 border-white/10 h-8 text-xs rounded-lg">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                        {bookmakers.map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-500 text-[9px] font-bold uppercase">Seleção</Label>
                    <Input 
                      placeholder="Ex: Flamengo" 
                      className="bg-white/5 border-white/10 h-8 text-xs rounded-lg"
                      value={manualOp.selection1}
                      onChange={(e) => setManualOp({...manualOp, selection1: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-gray-500 text-[9px] font-bold uppercase">Odd</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        className="bg-white/5 border-white/10 h-8 text-xs font-bold rounded-lg"
                        value={manualOp.odds1}
                        onChange={(e) => setManualOp({...manualOp, odds1: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-gray-500 text-[9px] font-bold uppercase">Stake (R$)</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        className="bg-white/5 border-white/10 h-8 text-xs font-bold text-green-400 rounded-lg"
                        value={manualOp.stake1}
                        onChange={(e) => setManualOp({...manualOp, stake1: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bookmaker 2 */}
              <div className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-blue-500/30 transition-all relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-600" />
                <h3 className="font-bold text-[11px] uppercase text-blue-500">Entrada 02</h3>
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-gray-500 text-[9px] font-bold uppercase">Casa de Aposta</Label>
                    <Select value={manualOp.bookmaker2Id} onValueChange={(v) => setManualOp({...manualOp, bookmaker2Id: v})}>
                      <SelectTrigger className="bg-white/5 border-white/10 h-8 text-xs rounded-lg">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                        {bookmakers.map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-gray-500 text-[9px] font-bold uppercase">Seleção</Label>
                    <Input 
                      placeholder="Ex: Palmeiras" 
                      className="bg-white/5 border-white/10 h-8 text-xs rounded-lg"
                      value={manualOp.selection2}
                      onChange={(e) => setManualOp({...manualOp, selection2: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-gray-500 text-[9px] font-bold uppercase">Odd</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        className="bg-white/5 border-white/10 h-8 text-xs font-bold rounded-lg"
                        value={manualOp.odds2}
                        onChange={(e) => setManualOp({...manualOp, odds2: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-gray-500 text-[9px] font-bold uppercase">Stake (R$)</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        className="bg-white/5 border-white/10 h-8 text-xs font-bold text-green-400 rounded-lg"
                        value={manualOp.stake2}
                        onChange={(e) => setManualOp({...manualOp, stake2: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Card - Ultra Compact */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-purple-600/10 to-blue-600/10 border border-white/10 flex justify-between items-center">
              <div>
                <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Lucro Previsto</p>
                <p className="text-xl font-black text-green-400">
                  R$ {manualCalculations.profit.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">ROI Estimado</p>
                <p className="text-xl font-black text-purple-400">
                  {manualCalculations.roi.toFixed(2)}%
                </p>
              </div>
            </div>

            <Button 
              className="w-full h-11 text-xs font-bold bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-600/20 transition-all active:scale-[0.98] rounded-lg uppercase tracking-widest"
              onClick={() => {
                const s1 = parseFloat(manualOp.stake1);
                const s2 = parseFloat(manualOp.stake2);
                const o1 = parseFloat(manualOp.odds1);
                const o2 = parseFloat(manualOp.odds2);
                
                if (!manualOp.event || !manualOp.bookmaker1Id || !manualOp.bookmaker2Id || isNaN(s1) || isNaN(s2) || isNaN(o1) || isNaN(o2)) {
                  toast.error("Preencha todos os campos obrigatórios corretamente.");
                  return;
                }

                onAdd({
                  date: new Date(manualOp.date).getTime(),
                  event: manualOp.event,
                  market: manualOp.market,
                  bookmaker1Id: manualOp.bookmaker1Id,
                  bookmaker2Id: manualOp.bookmaker2Id,
                  selection1: manualOp.selection1,
                  selection2: manualOp.selection2,
                  odds1: o1,
                  odds2: o2,
                  stake1: s1,
                  stake2: s2,
                  profit: manualCalculations.profit,
                  profitPercentage: parseFloat(manualCalculations.roi.toFixed(2)),
                  status: 'pending'
                });

                setIsAddOpen(false);
                setManualOp({
                  event: '', market: '', date: getDefaultDate(),
                  bookmaker1Id: '', bookmaker2Id: '',
                  selection1: '', selection2: '', odds1: '', odds2: '', stake1: '', stake2: ''
                });
                toast.success("Operação manual registrada!");
              }}
            >
              REGISTRAR OPERAÇÃO
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedOp} onOpenChange={(open) => !open && setSelectedOp(null)}>
        <DialogContent className="bg-[#0f0f0f] border-white/10 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Operação</DialogTitle>
          </DialogHeader>
          {selectedOp && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase font-bold">Evento</p>
                  <p className="text-lg font-bold">{selectedOp.event}</p>
                  <p className="text-sm text-gray-400">{selectedOp.market}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-xs text-gray-500 uppercase font-bold">Data</p>
                  <p className="text-lg font-bold">{new Date(selectedOp.date).toLocaleString('pt-BR')}</p>
                  <Badge className={selectedOp.status === 'completed' ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}>
                    {selectedOp.status === 'completed' ? 'Concluída' : 'Pendente'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-purple-400">{bookmakers.find(b => b.id === selectedOp.bookmaker1Id)?.name}</p>
                    {selectedOp.result === 'win1' && <Badge className="bg-green-500">VENCEDORA</Badge>}
                  </div>
                  <p className="text-sm">{selectedOp.selection1}</p>
                  <div className="flex justify-between text-sm pt-2 border-t border-white/5">
                    <span className="text-gray-400">Odd: <span className="text-white font-bold">{selectedOp.odds1}</span></span>
                    <span className="text-gray-400">Stake: <span className="text-white font-bold">R$ {selectedOp.stake1}</span></span>
                  </div>
                  <div className="text-sm text-right pt-1">
                    <span className="text-gray-400">Retorno: <span className="text-white font-bold">R$ {(selectedOp.stake1 * selectedOp.odds1).toFixed(2)}</span></span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-purple-400">{bookmakers.find(b => b.id === selectedOp.bookmaker2Id)?.name}</p>
                    {selectedOp.result === 'win2' && <Badge className="bg-green-500">VENCEDORA</Badge>}
                  </div>
                  <p className="text-sm">{selectedOp.selection2}</p>
                  <div className="flex justify-between text-sm pt-2 border-t border-white/5">
                    <span className="text-gray-400">Odd: <span className="text-white font-bold">{selectedOp.odds2}</span></span>
                    <span className="text-gray-400">Stake: <span className="text-white font-bold">R$ {selectedOp.stake2}</span></span>
                  </div>
                  <div className="text-sm text-right pt-1">
                    <span className="text-gray-400">Retorno: <span className="text-white font-bold">R$ {(selectedOp.stake2 * selectedOp.odds2).toFixed(2)}</span></span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-purple-600/10 border border-purple-500/20 flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">Lucro Previsto</p>
                  <p className="text-2xl font-bold text-green-400">R$ {selectedOp.profit.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase font-bold">ROI</p>
                  <p className="text-2xl font-bold text-purple-400">{selectedOp.profitPercentage}%</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
