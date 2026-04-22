import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, RefreshCcw, ShieldAlert, Key, Save, CheckCircle2, Target } from 'lucide-react';
import { motion } from 'motion/react';

interface SettingsProps {
  onReset: () => Promise<void>;
  geminiKey: string;
  onSaveGeminiKey: (key: string) => Promise<void>;
}

export default function Settings({ onReset, geminiKey, onSaveGeminiKey }: SettingsProps) {
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [tempKey, setTempKey] = React.useState(geminiKey);
  const [isSavingKey, setIsSavingKey] = React.useState(false);

  React.useEffect(() => {
    setTempKey(geminiKey);
  }, [geminiKey]);

  const handleReset = async () => {
    setIsLoading(true);
    try {
      await onReset();
      setIsConfirming(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveKey = async () => {
    setIsSavingKey(true);
    try {
      await onSaveGeminiKey(tempKey);
    } finally {
      setIsSavingKey(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
        <p className="text-gray-400">Gerencie sua conta e preferências de dados.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-[#0f0f0f] border-white/10">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Key className="text-purple-400" size={20} />
              Integração Gemini AI
            </CardTitle>
            <CardDescription className="text-gray-500 text-xs">
              Configure sua chave de API para leitura de prints.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Chave API (Opcional)</label>
              <div className="flex gap-2">
                <Input 
                  type="password"
                  placeholder="Cole sua chave API aqui..."
                  className="bg-white/5 border-white/10 h-10 focus:border-purple-500/50"
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                />
                <Button 
                  className="bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                  onClick={handleSaveKey}
                  disabled={isSavingKey || tempKey === geminiKey}
                >
                  {isSavingKey ? <RefreshCcw className="animate-spin" size={18} /> : <Save size={18} />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f0f0f] border-white/10">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Target className="text-blue-400" size={20} />
              Sobre as Metas
            </CardTitle>
            <CardDescription className="text-gray-500 text-xs">
              O sistema de metas agora está em uma aba dedicada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 leading-relaxed">
              Dúvidas sobre como funciona? Suas metas ativas dividem o lucro de cada operação finalizada igualmente. 
              Você pode gerenciar tudo na nova aba <strong>Metas</strong> no menu lateral.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#0f0f0f] border-white/10 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ShieldAlert className="text-red-400" size={20} />
              Zona de Perigo
            </CardTitle>
            <CardDescription className="text-gray-500">
              Ações irreversíveis que afetam todos os seus dados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-xl bg-red-400/5 border border-red-400/10 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-red-400 shrink-0 mt-1" size={18} />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-red-400">Resetar Dados da Conta</p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Esta ação irá excluir permanentemente todas as suas **Operações** e **Transações**. 
                    As **Casas de Aposta** cadastradas serão mantidas, mas seus saldos serão zerados.
                  </p>
                </div>
              </div>

              {!isConfirming ? (
                <Button 
                  variant="outline" 
                  className="w-full border-red-400/30 text-red-400 hover:bg-red-400/10 hover:text-red-400"
                  onClick={() => setIsConfirming(true)}
                >
                  <RefreshCcw className="mr-2" size={16} />
                  Resetar Tudo
                </Button>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <p className="text-xs font-bold text-center text-red-400 uppercase tracking-wider">Você tem certeza?</p>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      className="flex-1 text-gray-400 hover:text-white"
                      onClick={() => setIsConfirming(false)}
                      disabled={isLoading}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                      onClick={handleReset}
                      disabled={isLoading}
                    >
                      {isLoading ? "Resetando..." : "Sim, Resetar"}
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
