import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { useWallet } from './WalletContext';
import { useCreateBountyWithPayment, useCompleteBounty, useVerifyTransaction } from '../utils/payment/payment-hooks';
import { PaymentService } from '../utils/payment/payment-service';
import { NotificationService } from '../utils/notifications/notification-service';
import {
  TestTube,
  Play,
  CheckCircle,
  XCircle,
  Loader2,
  Coins,
  Trophy,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  data?: any;
}

export function PaymentTestPage() {
  const { isConnected, walletAddress, sendHBAR } = useWallet();
  const { createBountyWithDeposit, loading: creatingBounty } = useCreateBountyWithPayment();
  const { completeBounty, loading: completingBounty } = useCompleteBounty();
  const { verifyTransaction, loading: verifying } = useVerifyTransaction();

  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testBountyId, setTestBountyId] = useState<string | null>(null);
  const [prizeAmount, setPrizeAmount] = useState('10');

  const updateTestResult = (name: string, status: TestResult['status'], message?: string, data?: any) => {
    setTestResults(prev => {
      const existing = prev.find(r => r.name === name);
      if (existing) {
        existing.status = status;
        existing.message = message;
        existing.data = data;
        return [...prev];
      } else {
        return [...prev, { name, status, message, data }];
      }
    });
  };

  const runFullWorkflowTest = async () => {
    if (!isConnected || !walletAddress || !sendHBAR) {
      NotificationService.system.walletNotConnected();
      return;
    }

    setIsRunningTests(true);
    setTestResults([]);
    setTestBountyId(null);

    try {
      // Test 1: Create bounty with HBAR deposit
      updateTestResult('Bounty Creation', 'running', 'Creating test bounty with HBAR deposit...');

      const testBountyData = {
        name: `Test Bounty ${Date.now()}`,
        description: 'Test bounty for payment workflow verification',
        creator_id: walletAddress,
        bounty_type: 'Simple' as const,
        prize_amount: parseFloat(prizeAmount),
        prize_currency: 'HBAR',
        words: ['TESTS'],
        hints: ['What we are running'],
        max_participants: 10,
        duration_hours: 24,
        winner_criteria: 'attempts' as const,
        is_public: true,
        requires_registration: false,
        status: 'active' as const
      };

      try {
        const bountyResult = await createBountyWithDeposit(testBountyData);

        if (bountyResult && bountyResult.bounty) {
          setTestBountyId(bountyResult.bounty.id);
          updateTestResult(
            'Bounty Creation',
            'success',
            `Bounty created with ID: ${bountyResult.bounty.id.slice(0, 8)}...`,
            {
              bountyId: bountyResult.bounty.id,
              transactionHash: bountyResult.depositResult.transactionHash
            }
          );

          // Test 2: Verify deposit transaction
          if (bountyResult.depositResult.transactionHash) {
            updateTestResult('Deposit Verification', 'running', 'Verifying deposit transaction...');

            const isVerified = await verifyTransaction(bountyResult.depositResult.transactionHash);
            updateTestResult(
              'Deposit Verification',
              isVerified ? 'success' : 'error',
              isVerified ? 'Deposit transaction verified' : 'Deposit verification failed',
              { transactionHash: bountyResult.depositResult.transactionHash }
            );
          }

          // Test 3: Complete bounty and distribute prize
          updateTestResult('Bounty Completion', 'running', 'Completing bounty and distributing prize...');

          try {
            const completionResult = await completeBounty(bountyResult.bounty.id, walletAddress);

            if (completionResult.success) {
              updateTestResult(
                'Bounty Completion',
                'success',
                `Prize distributed: ${completionResult.winner.prizeAmount} HBAR`,
                {
                  transactionHash: completionResult.transactionHash,
                  prizeAmount: completionResult.winner.prizeAmount
                }
              );

              // Test 4: Verify prize transaction
              if (completionResult.transactionHash) {
                updateTestResult('Prize Verification', 'running', 'Verifying prize transaction...');

                const isPrizeVerified = await verifyTransaction(completionResult.transactionHash);
                updateTestResult(
                  'Prize Verification',
                  isPrizeVerified ? 'success' : 'error',
                  isPrizeVerified ? 'Prize transaction verified' : 'Prize verification failed',
                  { transactionHash: completionResult.transactionHash }
                );
              }
            } else {
              updateTestResult(
                'Bounty Completion',
                'error',
                completionResult.error || 'Bounty completion failed'
              );
            }
          } catch (completionError) {
            updateTestResult(
              'Bounty Completion',
              'error',
              completionError instanceof Error ? completionError.message : 'Unknown completion error'
            );
          }
        } else {
          updateTestResult(
            'Bounty Creation',
            'error',
            bountyResult?.depositResult?.error || 'Bounty creation failed - no bounty returned'
          );
        }
      } catch (creationError) {
        updateTestResult(
          'Bounty Creation',
          'error',
          creationError instanceof Error ? creationError.message : 'Unknown creation error'
        );
      }

      // Test 5: Platform statistics
      updateTestResult('Platform Stats', 'running', 'Fetching platform statistics...');

      try {
        const totalPrizePool = await PaymentService.getTotalPrizePool();
        updateTestResult(
          'Platform Stats',
          'success',
          `Total active prize pool: ${totalPrizePool} HBAR`,
          { totalPrizePool }
        );
      } catch (statsError) {
        updateTestResult(
          'Platform Stats',
          'error',
          statsError instanceof Error ? statsError.message : 'Stats fetch failed'
        );
      }

    } catch (error) {
      console.error('Test workflow failed:', error);
      updateTestResult(
        'Workflow',
        'error',
        error instanceof Error ? error.message : 'Unknown workflow error'
      );
    } finally {
      setIsRunningTests(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-4 h-4 rounded-full bg-gray-300" />;
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending': return 'text-gray-500';
      case 'running': return 'text-blue-600';
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2">
          <TestTube className="h-6 w-6" />
          Payment System Testing
        </h1>
        <p className="text-muted-foreground">
          Test the complete bounty-to-payment workflow with real HBAR transactions
        </p>
      </div>

      {!isConnected && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-yellow-800">
            Please connect your wallet to run payment tests.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Test Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="prize-amount">Test Prize Amount (HBAR)</Label>
              <Input
                id="prize-amount"
                type="number"
                value={prizeAmount}
                onChange={(e) => setPrizeAmount(e.target.value)}
                placeholder="10"
                min="0"
                step="0.1"
              />
            </div>
            <div>
              <Label>Connected Wallet</Label>
              <div className="p-2 bg-gray-50 rounded text-sm font-mono">
                {walletAddress ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-6)}` : 'Not connected'}
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex gap-2">
            <Button
              onClick={runFullWorkflowTest}
              disabled={!isConnected || isRunningTests}
              className="gap-2"
            >
              {isRunningTests ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isRunningTests ? 'Running Tests...' : 'Run Full Workflow Test'}
            </Button>

            {testResults.length > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  setTestResults([]);
                  setTestBountyId(null);
                }}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Clear Results
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{result.name}</span>
                      <Badge
                        variant={result.status === 'success' ? 'default' :
                                result.status === 'error' ? 'destructive' : 'secondary'}
                      >
                        {result.status}
                      </Badge>
                    </div>
                    {result.message && (
                      <p className={`text-sm mt-1 ${getStatusColor(result.status)}`}>
                        {result.message}
                      </p>
                    )}
                    {result.data && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          View Details
                        </summary>
                        <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Bounty Info */}
      {testBountyId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Test Bounty Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bounty ID:</span>
                <span className="font-mono">{testBountyId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prize Amount:</span>
                <span>{prizeAmount} HBAR</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline">Test Bounty</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}