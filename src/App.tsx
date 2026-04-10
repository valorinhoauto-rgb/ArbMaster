/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Toaster, toast } from 'sonner';
import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc } from './firebase';
import type { User } from './firebase';
import { Bookmaker, Operation, Transaction } from './types';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Bookmakers from './components/Bookmakers';
import Operations from './components/Operations';
import MonthlyHistory from './components/MonthlyHistory';
import Settings from './components/Settings';
import Login from './components/Login';
import { writeBatch } from './firebase';

export default function App() {
  const [user, setUser] = React.useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const [bookmakers, setBookmakers] = React.useState<Bookmaker[]>([]);
  const [operations, setOperations] = React.useState<Operation[]>([]);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [geminiKey, setGeminiKey] = React.useState<string>('');

  // Auth Listener
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
      if (!user) setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  // Data Listeners
  React.useEffect(() => {
    if (!user) return;

    setIsLoading(true);

    const qBookies = query(collection(db, 'bookmakers'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubBookies = onSnapshot(qBookies, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bookmaker));
      setBookmakers(data);
    }, (error) => {
      console.error("Error fetching bookmakers:", error);
      toast.error("Erro ao carregar casas de aposta.");
    });

    const qOps = query(collection(db, 'operations'), where('userId', '==', user.uid), orderBy('date', 'desc'));
    const unsubOps = onSnapshot(qOps, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Operation));
      setOperations(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching operations:", error);
      toast.error("Erro ao carregar operações.");
      setIsLoading(false);
    });

    const qTrans = query(collection(db, 'transactions'), where('userId', '==', user.uid), orderBy('date', 'desc'));
    const unsubTrans = onSnapshot(qTrans, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(data);
    }, (error) => {
      console.error("Error fetching transactions:", error);
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setGeminiKey(snapshot.data().geminiKey || '');
      }
    }, (error) => {
      console.error("Error fetching settings:", error);
    });

    return () => {
      unsubBookies();
      unsubOps();
      unsubTrans();
      unsubSettings();
    };
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("Login realizado com sucesso!");
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Erro ao entrar com Google.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Sessão encerrada.");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Bookmaker Actions
  const addBookmaker = async (name: string, balance: number) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'bookmakers'), {
        name,
        balance,
        isLimited: false,
        createdAt: Date.now(),
        userId: user.uid
      });
      toast.success("Casa de aposta adicionada!");
    } catch (error) {
      console.error("Error adding bookmaker:", error);
      toast.error("Erro ao adicionar casa.");
    }
  };

  const updateBookmaker = async (id: string, updates: Partial<Bookmaker>) => {
    try {
      const finalUpdates = { ...updates };
      if (updates.isLimited === true) {
        finalUpdates.limitedAt = Date.now();
      } else if (updates.isLimited === false) {
        // If unlimiting, we might want to clear limitedAt or keep it? 
        // Let's clear it to indicate it's active again.
        finalUpdates.limitedAt = undefined;
      }
      
      await updateDoc(doc(db, 'bookmakers', id), finalUpdates as any);
      toast.success("Casa atualizada!");
    } catch (error) {
      console.error("Error updating bookmaker:", error);
      toast.error("Erro ao atualizar casa.");
    }
  };

  const deleteBookmaker = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'bookmakers', id));
      toast.success("Casa removida permanentemente.");
    } catch (error) {
      console.error("Error deleting bookmaker:", error);
      toast.error("Erro ao remover casa.");
    }
  };

  const handleTransaction = async (bookmakerId: string, amount: number, type: 'deposit' | 'withdrawal' | 'adjustment') => {
    if (!user) return;
    try {
      const bookie = bookmakers.find(b => b.id === bookmakerId);
      if (!bookie) return;

      let newBalance = bookie.balance;
      if (type === 'deposit') newBalance += amount;
      else if (type === 'withdrawal' || type === 'adjustment') newBalance -= amount;
      
      await updateDoc(doc(db, 'bookmakers', bookmakerId), { balance: newBalance });
      
      await addDoc(collection(db, 'transactions'), {
        type,
        amount,
        bookmakerId,
        date: Date.now(),
        userId: user.uid
      });

      const labels = {
        deposit: 'Depósito',
        withdrawal: 'Saque',
        adjustment: 'Ajuste/Prejuízo'
      };

      toast.success(`${labels[type]} realizado com sucesso!`);
    } catch (error) {
      console.error("Error processing transaction:", error);
      toast.error("Erro ao processar transação.");
    }
  };

  // Operation Actions
  const addOperation = async (op: Omit<Operation, 'id' | 'userId'>) => {
    if (!user) return;
    try {
      // Deduct stakes from bookmakers immediately
      const b1 = bookmakers.find(b => b.id === op.bookmaker1Id);
      const b2 = bookmakers.find(b => b.id === op.bookmaker2Id);
      
      if (b1) await updateDoc(doc(db, 'bookmakers', b1.id), { balance: b1.balance - op.stake1 });
      if (b2) await updateDoc(doc(db, 'bookmakers', b2.id), { balance: b2.balance - op.stake2 });

      await addDoc(collection(db, 'operations'), {
        ...op,
        userId: user.uid
      });
      toast.success("Operação registrada e saldos atualizados!");
    } catch (error) {
      console.error("Error adding operation:", error);
      toast.error("Erro ao registrar operação.");
    }
  };

  const settleOperation = async (id: string, result: 'win1' | 'win2' | 'void') => {
    try {
      const op = operations.find(o => o.id === id);
      if (!op) return;

      const b1 = bookmakers.find(b => b.id === op.bookmaker1Id);
      const b2 = bookmakers.find(b => b.id === op.bookmaker2Id);

      if (result === 'win1' && b1) {
        await updateDoc(doc(db, 'bookmakers', b1.id), { balance: b1.balance + (op.stake1 * op.odds1) });
      } else if (result === 'win2' && b2) {
        await updateDoc(doc(db, 'bookmakers', b2.id), { balance: b2.balance + (op.stake2 * op.odds2) });
      } else if (result === 'void') {
        if (b1) await updateDoc(doc(db, 'bookmakers', b1.id), { balance: b1.balance + op.stake1 });
        if (b2) await updateDoc(doc(db, 'bookmakers', b2.id), { balance: b2.balance + op.stake2 });
      }

      await updateDoc(doc(db, 'operations', id), { 
        status: result === 'void' ? 'void' : 'completed',
        result 
      });

      toast.success("Operação finalizada e banca atualizada!");
    } catch (error) {
      console.error("Error settling operation:", error);
      toast.error("Erro ao finalizar operação.");
    }
  };

  const deleteOperation = async (id: string) => {
    try {
      const op = operations.find(o => o.id === id);
      if (!op) return;

      // If pending, return stakes to bookmakers
      if (op.status === 'pending') {
        const b1 = bookmakers.find(b => b.id === op.bookmaker1Id);
        const b2 = bookmakers.find(b => b.id === op.bookmaker2Id);
        if (b1) await updateDoc(doc(db, 'bookmakers', b1.id), { balance: b1.balance + op.stake1 });
        if (b2) await updateDoc(doc(db, 'bookmakers', b2.id), { balance: b2.balance + op.stake2 });
      }

      await deleteDoc(doc(db, 'operations', id));
      toast.success("Operação removida.");
    } catch (error) {
      console.error("Error deleting operation:", error);
      toast.error("Erro ao remover operação.");
    }
  };

  const updateOperation = async (id: string, updates: Partial<Operation>) => {
    try {
      await updateDoc(doc(db, 'operations', id), updates);
      toast.success("Operação atualizada!");
    } catch (error) {
      console.error("Error updating operation:", error);
      toast.error("Erro ao atualizar operação.");
    }
  };

  const handleReset = async () => {
    if (!user) return;
    try {
      const batch = writeBatch(db);

      // Delete all operations
      operations.forEach(op => {
        batch.delete(doc(db, 'operations', op.id));
      });

      // Delete all transactions
      transactions.forEach(tr => {
        batch.delete(doc(db, 'transactions', tr.id));
      });

      // Reset bookmaker balances
      bookmakers.forEach(bk => {
        batch.update(doc(db, 'bookmakers', bk.id), { balance: 0 });
      });

      await batch.commit();
      toast.success("Todos os dados foram resetados com sucesso!");
      setActiveTab('dashboard');
    } catch (error) {
      console.error("Error resetting data:", error);
      toast.error("Erro ao resetar dados.");
    }
  };

  const saveGeminiKey = async (key: string) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'settings', user.uid), { geminiKey: key }, { merge: true });
      toast.success("Chave Gemini salva com sucesso!");
    } catch (error) {
      console.error("Error saving Gemini key:", error);
      toast.error("Erro ao salvar chave.");
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-600/20 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Login onLogin={handleLogin} isLoading={false} />
        <Toaster position="top-right" theme="dark" />
      </>
    );
  }

  return (
    <>
      <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userEmail={user.email} 
        onLogout={handleLogout}
      >
        {activeTab === 'dashboard' && <Dashboard bookmakers={bookmakers} operations={operations} transactions={transactions} />}
        {activeTab === 'bookmakers' && (
          <Bookmakers 
            bookmakers={bookmakers} 
            operations={operations}
            onAdd={addBookmaker} 
            onUpdate={updateBookmaker} 
            onDelete={deleteBookmaker} 
            onTransaction={handleTransaction}
          />
        )}
        {activeTab === 'operations' && (
          <Operations 
            operations={operations} 
            bookmakers={bookmakers} 
            onAdd={addOperation} 
            onUpdate={updateOperation} 
            onSettle={settleOperation}
            onDelete={deleteOperation}
            geminiKey={geminiKey}
          />
        )}
        {activeTab === 'history' && (
          <MonthlyHistory 
            operations={operations}
            transactions={transactions}
          />
        )}
        {activeTab === 'settings' && (
          <Settings 
            onReset={handleReset} 
            geminiKey={geminiKey}
            onSaveGeminiKey={saveGeminiKey}
          />
        )}
      </Layout>
      <Toaster position="top-right" theme="dark" />
    </>
  );
}

