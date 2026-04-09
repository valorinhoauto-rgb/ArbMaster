export interface Bookmaker {
  id: string;
  name: string;
  balance: number;
  isLimited: boolean;
  createdAt: number;
}

export interface Operation {
  id: string;
  date: number;
  bookmaker1Id: string;
  bookmaker2Id: string;
  event: string;
  market: string;
  selection1: string;
  selection2: string;
  odds1: number;
  odds2: number;
  stake1: number;
  stake2: number;
  profit: number;
  profitPercentage: number;
  status: 'pending' | 'completed' | 'void';
  result?: 'win1' | 'win2' | 'void';
  userId: string;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'transfer';
  amount: number;
  bookmakerId: string;
  date: number;
  userId: string;
}

export interface UserSettings {
  totalBankroll: number;
  currency: string;
}
