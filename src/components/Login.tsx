import React from 'react';
import { Button } from '@/components/ui/button';
import { Chrome } from 'lucide-react';
import { motion } from 'motion/react';

import Logo from './Logo';

interface LoginProps {
  onLogin: () => void;
  isLoading: boolean;
}

export default function Login({ onLogin, isLoading }: LoginProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 relative z-10 dark"
      >
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-6">
            <Logo size={80} className="shadow-2xl shadow-purple-500/40 rounded-3xl" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white">ArbMaster</h1>
          <p className="text-gray-400 text-lg">A plataforma definitiva para gestão de arbitragem esportiva.</p>
        </div>

        <div className="bg-[#0f0f0f] border border-white/10 p-8 rounded-3xl shadow-2xl space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white text-center">Bem-vindo de volta</h2>
            <p className="text-sm text-gray-500 text-center">Entre com sua conta Google para acessar seu dashboard.</p>
          </div>

          <Button 
            onClick={onLogin} 
            disabled={isLoading}
            className="w-full h-14 bg-purple-600 text-white hover:bg-purple-700 rounded-2xl font-bold text-lg gap-3 transition-all active:scale-95 shadow-lg shadow-purple-500/20"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Chrome size={24} />
                Entrar com Google
              </>
            )}
          </Button>

          <p className="text-xs text-gray-600 text-center px-4">
            Ao entrar, você concorda com nossos termos de uso e política de privacidade.
          </p>
        </div>

        <div className="flex justify-center gap-8 text-gray-600 text-sm font-medium">
          <span>Seguro</span>
          <span>•</span>
          <span>Rápido</span>
          <span>•</span>
          <span>Inteligente</span>
        </div>
      </motion.div>
    </div>
  );
}
