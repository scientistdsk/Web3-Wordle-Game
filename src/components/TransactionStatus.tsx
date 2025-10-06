import { toast } from 'sonner';
import { ExternalLink, CheckCircle2, XCircle, Loader2, Copy, Check } from 'lucide-react';
import { useState } from 'react';

const HASHSCAN_BASE_URL = import.meta.env.VITE_HEDERA_NETWORK === 'mainnet'
  ? 'https://hashscan.io/mainnet'
  : 'https://hashscan.io/testnet';

interface TransactionToastProps {
  hash: string;
  network?: 'testnet' | 'mainnet';
}

function TransactionSuccessContent({ hash, network = 'testnet' }: TransactionToastProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hashScanUrl = `${network === 'mainnet' ? 'https://hashscan.io/mainnet' : 'https://hashscan.io/testnet'}/transaction/${hash}`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <span className="font-semibold">Transaction Confirmed</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <code className="text-xs bg-muted px-2 py-1 rounded">
          {hash.slice(0, 10)}...{hash.slice(-8)}
        </code>
        <button
          onClick={handleCopy}
          className="hover:text-foreground transition-colors"
          title="Copy transaction hash"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
      <a
        href={hashScanUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-sm text-primary hover:underline"
      >
        View on HashScan
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

function TransactionErrorContent({ error }: { error: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <XCircle className="h-4 w-4 text-red-500" />
        <span className="font-semibold">Transaction Failed</span>
      </div>
      <p className="text-sm text-muted-foreground">{error}</p>
    </div>
  );
}

function TransactionPendingContent({ message }: { message?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{message || 'Processing transaction...'}</span>
    </div>
  );
}

export const TransactionStatus = {
  pending: (message?: string) => {
    return toast.loading(<TransactionPendingContent message={message} />, {
      duration: Infinity,
    });
  },

  success: (hash: string, message?: string, network?: 'testnet' | 'mainnet') => {
    return toast.success(
      <div>
        {message && <p className="mb-2">{message}</p>}
        <TransactionSuccessContent hash={hash} network={network} />
      </div>,
      {
        duration: 10000,
      }
    );
  },

  error: (error: string, onRetry?: () => void) => {
    return toast.error(<TransactionErrorContent error={error} />, {
      duration: 8000,
      action: onRetry ? {
        label: 'Retry',
        onClick: onRetry,
      } : undefined,
    });
  },

  dismiss: (toastId: string | number) => {
    toast.dismiss(toastId);
  },
};
