import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  ExternalLink,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  Calendar
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { getTransactionUrl, getCurrentNetwork, truncateHash, copyToClipboard } from '../utils/hashscan';

interface Transaction {
  id: string;
  transaction_hash: string;
  transaction_type: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  bounty?: {
    name: string;
  };
}

interface TransactionHistoryProps {
  walletAddress: string;
}

export function TransactionHistory({ walletAddress }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    if (walletAddress) {
      fetchTransactions();
    }
  }, [walletAddress, currentPage, filterType, filterStatus]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      // Get user ID first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('wallet_address', walletAddress)
        .single();

      if (userError || !userData) {
        console.error('User not found:', userError);
        setTransactions([]);
        setTotalCount(0);
        return;
      }

      // Build query
      let query = supabase
        .from('payment_transactions')
        .select(`
          *,
          bounty:bounties (
            name
          )
        `, { count: 'exact' })
        .eq('user_id', userData.id);

      // Apply filters
      if (filterType !== 'all') {
        query = query.eq('transaction_type', filterType);
      }

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      // Pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching transactions:', error);
        return;
      }

      setTransactions(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error in fetchTransactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyHash = async (hash: string) => {
    const success = await copyToClipboard(hash);
    if (success) {
      setCopiedHash(hash);
      setTimeout(() => setCopiedHash(null), 2000);
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'deposit': 'Deposit',
      'prize_payment': 'Prize Won',
      'prize_distribution': 'Prize Won',
      'refund': 'Refund',
      'bounty_creation': 'Bounty Created',
      'expired_refund': 'Expired Refund'
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const isIncoming = (type: string) => {
    return ['prize_payment', 'prize_distribution', 'refund', 'expired_refund'].includes(type);
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  if (loading && transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>Transaction History</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="deposit">Deposits</SelectItem>
                <SelectItem value="bounty_creation">Bounty Created</SelectItem>
                <SelectItem value="prize_payment">Prizes</SelectItem>
                <SelectItem value="prize_distribution">Prizes</SelectItem>
                <SelectItem value="refund">Refunds</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No transactions found</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex flex-col gap-2 p-4 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">
                          {getTransactionTypeLabel(tx.transaction_type)}
                        </span>
                        <Badge
                          variant="outline"
                          className={getStatusColor(tx.status)}
                        >
                          {tx.status}
                        </Badge>
                      </div>
                      {tx.bounty?.name && (
                        <p className="text-sm text-muted-foreground">
                          "{tx.bounty.name}"
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-lg font-semibold ${
                          isIncoming(tx.transaction_type)
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {isIncoming(tx.transaction_type) ? '+' : '-'}
                        {parseFloat(tx.amount.toString()).toFixed(2)} {tx.currency}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                      {truncateHash(tx.transaction_hash, 10, 8)}
                    </code>
                    <button
                      onClick={() => handleCopyHash(tx.transaction_hash)}
                      className="p-1 hover:bg-muted rounded transition-colors"
                      title={copiedHash === tx.transaction_hash ? 'Copied!' : 'Copy hash'}
                    >
                      {copiedHash === tx.transaction_hash ? (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                    <a
                      href={getTransactionUrl(tx.transaction_hash, getCurrentNetwork())}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-muted rounded transition-colors"
                      title="View on HashScan"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} transactions
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="text-sm font-medium">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
