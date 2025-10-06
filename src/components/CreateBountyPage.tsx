import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { SimpleTooltip } from './ui/SimpleTooltip';
import { BountySuccessModal } from './BountySuccessModal';
import { useWallet } from './WalletContext';
import { validateWord } from '../utils/dictionary';
import { createBounty, validateWordInDictionary, updateBountyTransactionInfo, getRandomWords } from '../utils/supabase/api';
import { EscrowService } from '../contracts/EscrowService';
import {
  Target,
  Trophy,
  Clock,
  Shuffle,
  Shield,
  Plus,
  Trash2,
  Info,
  Loader2,
  AlertCircle,
  Check
} from 'lucide-react';

type BountyType = 'Simple' | 'Multistage' | 'Time-based' | 'Random words' | 'Limited trials';
type PrizeDistribution = 'winner-take-all' | 'split-winners';
type WinnerCriteria = 'first-to-solve' | 'time' | 'attempts' | 'words-correct';

interface BountyForm {
  name: string;
  description: string;
  type: BountyType;
  words: string[];
  prizeAmount: string;
  prizeDistribution: PrizeDistribution;
  duration: string;
  winnerCriteria: WinnerCriteria;
  maxParticipants: string;
  maxAttempts: string;
  timeLimitSeconds: string;
  hints: string[];
  isPublic: boolean;
  requiresRegistration: boolean;
}

interface CreatedBountyData {
  name: string;
  type: string;
  prizeAmount: string;
  shareableLink: string;
}

export function CreateBountyPage() {
  const { isConnected, walletAddress, getEthersSigner, refreshBalance } = useWallet();
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdBounty, setCreatedBounty] = useState<CreatedBountyData | null>(null);
  const [wordErrors, setWordErrors] = useState<string[]>([]);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  const [form, setForm] = useState<BountyForm>({
    name: '',
    description: '',
    type: 'Simple',
    words: [''],
    prizeAmount: '',
    prizeDistribution: 'winner-take-all',
    duration: '24',
    winnerCriteria: 'attempts',
    maxParticipants: '50',
    maxAttempts: '',
    timeLimitSeconds: '',
    hints: [''],
    isPublic: true,
    requiresRegistration: false
  });

  const updateForm = (field: keyof BountyForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Get tooltip text for Prize Distribution
  const getPrizeDistributionTooltip = () => {
    switch (form.prizeDistribution) {
      case 'winner-take-all':
        return 'One winner receives the full bounty prize.';
      case 'split-winners':
        return 'Prize is shared evenly among all winners.';
      default:
        return 'Select how the prize will be distributed.';
    }
  };

  // Get tooltip text for Winning Criteria
  const getWinnerCriteriaTooltip = () => {
    switch (form.winnerCriteria) {
      case 'first-to-solve':
        return 'The first participant to solve the bounty wins instantly.';
      case 'time':
        return 'Whoever completes the bounty in the shortest time wins.';
      case 'attempts':
        return 'Winner is the one who solves with the fewest attempts.';
      case 'words-correct':
        return 'Winner has the highest number of correct answers.';
      default:
        return 'Select how winners will be determined.';
    }
  };


  const validateWords = async () => {
    // Skip validation for Random words type
    if (form.type === 'Random words') {
      return true;
    }

    const errors: string[] = [];

    for (let index = 0; index < form.words.length; index++) {
      const word = form.words[index];
      if (word.trim()) {
        if (word.length > 10) {
          errors[index] = 'Word cannot be longer than 10 characters';
        } else if (word.length < 4) {
          errors[index] = 'Word must be at least 4 characters';
        } else {
          // First do basic validation
          const validation = validateWord(word);
          if (!validation.isValid && validation.message !== 'Not a valid English word') {
            errors[index] = validation.message || 'Invalid word';
          } else {
            // Then check against database dictionary
            const isValid = await validateWordInDictionary(word);
            if (!isValid) {
              errors[index] = 'Not a valid English word';
            }
          }
        }
      }
    }

    setWordErrors(errors);
    return errors.filter(error => error).length === 0;
  };

  const handleCreateBounty = async () => {
    if (!isConnected || !walletAddress) {
      alert('Please connect your wallet first');
      return;
    }

    // Validate words
    const isValid = await validateWords();
    if (!isValid) {
      alert('Please fix the word errors before creating the bounty');
      return;
    }

    setIsCreating(true);
    setPaymentStatus('idle');
    setPaymentError(null);

    let createdBountyData: any = null;
    let transactionHash: string | null = null;
    let contractAddress: string | null = null;

    try {
      // For Random words type, fetch random words from dictionary
      let finalWords = form.words.filter(word => word.trim()).map(w => w.toUpperCase());
      if (form.type === 'Random words') {
        console.log('Fetching random words from dictionary...');
        const randomWords = await getRandomWords(form.words.length, 5); // 5-letter words by default
        if (randomWords.length > 0) {
          finalWords = randomWords.map(w => w.toUpperCase());
          console.log('Random words selected:', finalWords);
        } else {
          throw new Error('Failed to fetch random words from dictionary');
        }
      }

      const prizeAmount = parseFloat(form.prizeAmount) || 0;

      // STEP 1: If prize > 0, process payment FIRST (before database)
      if (prizeAmount > 0) {
        console.log('💰 Processing payment first: Depositing', prizeAmount, 'HBAR to escrow contract...');
        setPaymentStatus('processing');

        // Get signer from connected wallet
        if (!getEthersSigner) {
          throw new Error('Wallet not properly connected - cannot get signer');
        }

        const signer = await getEthersSigner();
        const signerAddress = await signer.getAddress();
        console.log('✅ Got signer from wallet:', signerAddress);

        // Verify signer matches connected wallet
        if (signerAddress.toLowerCase() !== walletAddress?.toLowerCase()) {
          throw new Error(`Wallet address mismatch. Connected: ${walletAddress}, Signer: ${signerAddress}`);
        }

        // Initialize escrow service with the connected wallet's signer
        const escrowService = new EscrowService();
        await escrowService.initialize(signer);

        // FIRST: Create bounty in database to get UUID
        console.log('📝 Creating bounty in database first to get UUID...');
        const bountyData = {
          creator_id: walletAddress,
          name: form.name,
          description: form.description,
          bounty_type: form.type,
          words: finalWords,
          hints: form.hints.filter(h => h.trim()),
          prize_amount: parseFloat(form.prizeAmount) || 0,
          prize_distribution: form.prizeDistribution,
          prize_currency: 'HBAR',
          max_participants: form.maxParticipants ? parseInt(form.maxParticipants) : null,
          max_attempts_per_user: form.maxAttempts ? parseInt(form.maxAttempts) : null,
          time_limit_seconds: form.timeLimitSeconds ? parseInt(form.timeLimitSeconds) : null,
          winner_criteria: form.winnerCriteria,
          duration_hours: parseInt(form.duration),
          status: 'active',
          is_public: form.isPublic,
          requires_registration: form.requiresRegistration
        };

        createdBountyData = await createBounty(bountyData);
        const bountyUUID = createdBountyData.id;
        console.log('✅ Bounty created in database with UUID:', bountyUUID);

        // NOW: Use the UUID for the smart contract
        const solutionWord = finalWords[0];

        console.log('📤 Sending transaction to smart contract with UUID:', bountyUUID);
        const tx = await escrowService.createBounty(
          bountyUUID,  // Use the database UUID instead of temp ID
          solutionWord,
          prizeAmount,
          parseInt(form.duration),
          bountyUUID // Store UUID in metadata too
        );

        console.log('⏳ Transaction sent:', tx.hash, '- Waiting for confirmation...');

        // Wait for transaction confirmation with timeout
        const receipt = await Promise.race([
          tx.wait(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Transaction timeout - please check your wallet')), 120000)
          )
        ]);

        transactionHash = receipt?.hash || tx.hash;
        contractAddress = await escrowService.getContract()?.getAddress() || '';

        console.log('✅ Transaction confirmed:', transactionHash);
        setPaymentStatus('success');

        // Refresh wallet balance after transaction
        console.log('💰 Refreshing balance after bounty creation...');
        await refreshBalance();
      }

      // STEP 2: Update database with transaction info if payment was made
      // (Bounty was already created before the smart contract call to get the UUID)
      if (transactionHash && contractAddress) {
        console.log('📝 Updating bounty with transaction info...');
        await updateBountyTransactionInfo(
          createdBountyData.id,
          transactionHash,
          contractAddress
        );
        console.log('✅ Transaction info updated in database');
      }

      setPaymentStatus('success');
      setCreatedBounty({
        name: form.name,
        type: form.type,
        prizeAmount: form.prizeAmount,
        shareableLink: `${window.location.origin}?bounty=${createdBountyData.id}`
      });
      setShowSuccessModal(true);

      // Reset form
      setForm({
        name: '',
        description: '',
        type: 'Simple',
        words: [''],
        prizeAmount: '',
        prizeDistribution: 'winner-take-all',
        duration: '24',
        winnerCriteria: 'attempts',
        maxParticipants: '50',
        maxAttempts: '',
        timeLimitSeconds: '',
        hints: [''],
        isPublic: true,
        requiresRegistration: false
      });
      setCurrentStep(1);
      setWordErrors([]);
    } catch (error) {
      console.error('❌ Error creating bounty:', error);
      setPaymentStatus('error');

      // Determine which stage failed
      let errorMessage = 'Failed to create bounty';
      if (error instanceof Error) {
        errorMessage = error.message;

        // Provide helpful context based on the error
        if (errorMessage.includes('insufficient funds')) {
          errorMessage = `Insufficient HBAR balance. You need at least ${form.prizeAmount} HBAR to create this bounty.`;
        } else if (errorMessage.includes('user rejected') || errorMessage.includes('User rejected')) {
          errorMessage = 'Transaction was rejected in your wallet. Please approve the transaction to create the bounty.';
        } else if (errorMessage.includes('timeout')) {
          errorMessage = 'Transaction timeout. Please check your wallet and try again.';
        } else if (errorMessage.includes('network') || errorMessage.includes('Network')) {
          errorMessage = 'Network error. Please ensure you are connected to Hedera Testnet and try again.';
        }
      }

      setPaymentError(errorMessage);

      // Alert user with clear message
      alert(`❌ Bounty Creation Failed\n\n${errorMessage}\n\n${
        transactionHash
          ? '⚠️ Payment was processed but database creation failed. Please contact support with this transaction hash: ' + transactionHash
          : '✅ No payment was made. You can safely try again.'
      }`);
    } finally {
      setIsCreating(false);
    }
  };

  const addWord = () => {
    setForm(prev => ({
      ...prev,
      words: [...prev.words, '']
    }));
    setWordErrors(prev => [...prev, '']);
  };

  const removeWord = (index: number) => {
    if (form.words.length > 1) {
      setForm(prev => ({
        ...prev,
        words: prev.words.filter((_, i) => i !== index)
      }));
      setWordErrors(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateWord = (index: number, value: string) => {
    setForm(prev => ({
      ...prev,
      words: prev.words.map((word, i) => i === index ? value.toUpperCase() : word)
    }));
    
    // Clear error when user starts typing
    if (wordErrors[index]) {
      const newErrors = [...wordErrors];
      newErrors[index] = '';
      setWordErrors(newErrors);
    }
  };

  const addHint = () => {
    setForm(prev => ({
      ...prev,
      hints: [...prev.hints, '']
    }));
  };

  const removeHint = (index: number) => {
    if (form.hints.length > 1) {
      setForm(prev => ({
        ...prev,
        hints: prev.hints.filter((_, i) => i !== index)
      }));
    }
  };

  const updateHint = (index: number, value: string) => {
    setForm(prev => ({
      ...prev,
      hints: prev.hints.map((hint, i) => i === index ? value : hint)
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        // For Random words, just need name and word count
        if (form.type === 'Random words') {
          return form.name.trim() && form.words.length > 0;
        }
        // For other types, need name and at least one non-empty word
        return form.name.trim() && form.words.some(word => word.trim());
      case 2:
        return form.prizeAmount && form.duration;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const getBountyTypeIcon = (type: BountyType) => {
    switch (type) {
      case 'Simple': return <Target className="h-5 w-5" />;
      case 'Multistage': return <Trophy className="h-5 w-5" />;
      case 'Time-based': return <Clock className="h-5 w-5" />;
      case 'Random words': return <Shuffle className="h-5 w-5" />;
      case 'Limited trials': return <Shield className="h-5 w-5" />;
    }
  };

  const bountyTypes: BountyType[] = ['Simple', 'Multistage', 'Time-based', 'Random words', 'Limited trials'];

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="bounty-name">Bounty Name</Label>
        <Input
          id="bounty-name"
          placeholder="Enter a catchy name for your bounty"
          value={form.name}
          onChange={(e) => updateForm('name', e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          placeholder="Describe what participants can expect from this bounty..."
          value={form.description}
          onChange={(e) => updateForm('description', e.target.value)}
          rows={3}
        />
      </div>

      <div>
        <Label>Bounty Type</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          {bountyTypes.map((type) => {
            const isSelected = form.type === type;
            return (
              <Card 
                key={type}
                className={`cursor-pointer transition-all ${
                  isSelected ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'
                }`}
                onClick={() => updateForm('type', type)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {getBountyTypeIcon(type)}
                    <div>
                      <div className="font-medium">{type}</div>
                      <div className="text-sm text-muted-foreground">
                        {type === 'Simple' && 'Single word challenge'}
                        {type === 'Multistage' && 'Multiple words to solve'}
                        {type === 'Time-based' && 'Race against the clock'}
                        {type === 'Random words' && 'System picks the word'}
                        {type === 'Limited trials' && 'Limited number of attempts'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <Label>Secret Words</Label>
            {form.type === 'Random words' ? (
              <p className="text-sm text-muted-foreground">
                System will randomly select {form.words.length || 1} word(s) from the dictionary
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Maximum 10 characters per word</p>
            )}
          </div>
          {form.type === 'Random words' ? (
            <div className="flex items-center gap-2">
              <Label className="text-sm">Number of words:</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={form.words.length}
                onChange={(e) => {
                  const count = parseInt(e.target.value) || 1;
                  const newWords = Array(count).fill('RANDOM');
                  setForm(prev => ({ ...prev, words: newWords }));
                }}
                className="w-20"
              />
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addWord}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Word
            </Button>
          )}
        </div>

        {form.type === 'Random words' ? (
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">
                  <strong>Random Words Mode:</strong> The system will automatically select {form.words.length} random word(s)
                  from the dictionary when the bounty starts. Players won't know the word(s) in advance.
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {form.words.map((word, index) => (
              <div key={index} className="space-y-1">
                <div className="flex gap-2">
                  <Input
                    placeholder={`Word ${index + 1}`}
                    value={word}
                    onChange={(e) => updateWord(index, e.target.value)}
                    maxLength={10}
                    className={wordErrors[index] ? 'border-red-500' : ''}
                  />
                  {form.words.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeWord(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {wordErrors[index] && (
                  <p className="text-sm text-red-500">{wordErrors[index]}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {form.type === 'Multistage' && (
          <p className="text-sm text-muted-foreground mt-2">
            For multistage bounties, add multiple words that players must solve in sequence.
          </p>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="prize-amount">Prize Amount (HBAR)</Label>
          <Input
            id="prize-amount"
            type="number"
            placeholder="0"
            value={form.prizeAmount}
            onChange={(e) => updateForm('prizeAmount', e.target.value)}
            min="0"
            step="0.01"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Set to 0 for a practice bounty with no prize
          </p>
        </div>

        <div>
          <Label htmlFor="duration">Duration (Hours)</Label>
          <Select
            value={form.duration}
            onValueChange={(value) => updateForm('duration', value)}
            disabled={form.winnerCriteria === 'first-to-solve'}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Hour</SelectItem>
              <SelectItem value="6">6 Hours</SelectItem>
              <SelectItem value="12">12 Hours</SelectItem>
              <SelectItem value="24">24 Hours</SelectItem>
              <SelectItem value="48">48 Hours</SelectItem>
              <SelectItem value="72">72 Hours</SelectItem>
              <SelectItem value="168">1 Week</SelectItem>
            </SelectContent>
          </Select>
          {form.winnerCriteria === 'first-to-solve' && (
            <p className="text-sm text-blue-600 mt-1 flex items-start gap-1">
              <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>Bounty will automatically end once a participant solves it first.</span>
            </p>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Label>Prize Distribution</Label>
          <SimpleTooltip content={getPrizeDistributionTooltip()}>
            <Info
              className="h-4 w-4 text-muted-foreground cursor-help animate-pulse"
            />
          </SimpleTooltip>
        </div>
        <Select value={form.prizeDistribution} onValueChange={(value) => updateForm('prizeDistribution', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="winner-take-all">Winner Takes All</SelectItem>
            <SelectItem value="split-winners">Split Payment</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="max-participants">Max Participants</Label>
          <Input
            id="max-participants"
            type="number"
            placeholder="50"
            value={form.maxParticipants}
            onChange={(e) => updateForm('maxParticipants', e.target.value)}
            min="1"
          />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Label>Winning Criteria</Label>
            <SimpleTooltip content={getWinnerCriteriaTooltip()}>
              <Info
                className="h-4 w-4 text-muted-foreground cursor-help animate-pulse"
              />
            </SimpleTooltip>
          </div>
          <Select value={form.winnerCriteria} onValueChange={(value) => updateForm('winnerCriteria', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="first-to-solve">First To Solve</SelectItem>
              <SelectItem value="time">Fastest Time</SelectItem>
              <SelectItem value="attempts">Fewest Tries</SelectItem>
              <SelectItem value="words-correct">Most Words Correct</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bounty Type-Specific Fields */}
      {form.type === 'Limited trials' && (
        <div>
          <Label htmlFor="max-attempts">Max Attempts Per User</Label>
          <Input
            id="max-attempts"
            type="number"
            placeholder="6"
            value={form.maxAttempts}
            onChange={(e) => updateForm('maxAttempts', e.target.value)}
            min="1"
            max="10"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Limit the number of attempts each player can make
          </p>
        </div>
      )}

      {form.type === 'Time-based' && (
        <div>
          <Label htmlFor="time-limit">Time Limit (Seconds)</Label>
          <Input
            id="time-limit"
            type="number"
            placeholder="300"
            value={form.timeLimitSeconds}
            onChange={(e) => updateForm('timeLimitSeconds', e.target.value)}
            min="30"
            step="30"
          />
          <p className="text-sm text-muted-foreground mt-1">
            Set a time limit for solving each word (e.g., 300 = 5 minutes)
          </p>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>Hints (Optional)</Label>
          {(form.type === 'Multistage' || form.type === 'Time-based' || form.type === 'Limited trials') && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addHint}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Hint
            </Button>
          )}
        </div>
        
        <div className="space-y-3">
          {form.hints.map((hint, index) => (
            <div key={index} className="flex gap-2">
              <Textarea
                placeholder={`Hint ${index + 1}`}
                value={hint}
                onChange={(e) => updateHint(index, e.target.value)}
                rows={2}
              />
              {form.hints.length > 1 && (form.type === 'Multistage' || form.type === 'Time-based' || form.type === 'Limited trials') && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeHint(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        
        {(form.type === 'Multistage' || form.type === 'Time-based' || form.type === 'Limited trials') && (
          <p className="text-sm text-muted-foreground mt-2">
            For advanced bounty types, you can add multiple hints to help participants.
          </p>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <Label>Make Public</Label>
            <p className="text-sm text-muted-foreground">
              Allow anyone to discover and join this bounty
            </p>
          </div>
          <Switch
            checked={form.isPublic}
            onCheckedChange={(checked) => updateForm('isPublic', checked)}
          />
        </div>

        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <Label>Require Registration</Label>
            <p className="text-sm text-muted-foreground">
              Players must register before joining
            </p>
          </div>
          <Switch
            checked={form.requiresRegistration}
            onCheckedChange={(checked) => updateForm('requiresRegistration', checked)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            Bounty Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm">Name</span>
            <span className="text-sm font-medium">{form.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Type</span>
            <Badge variant="outline">{form.type}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Prize</span>
            <span className="text-sm font-medium">{form.prizeAmount || '0'} HBAR</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Duration</span>
            <span className="text-sm">{form.duration} hours</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Words</span>
            <span className="text-sm">{form.words.filter(w => w.trim()).length}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1>Create New Bounty</h1>
        <p className="text-muted-foreground">
          Set up a new Wordle bounty challenge for the community
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
              ${currentStep >= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
            `}>
              {step}
            </div>
            {step < 3 && (
              <div className={`w-12 h-px ml-2 ${currentStep > step ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {currentStep === 1 && 'Basic Information'}
            {currentStep === 2 && 'Prize & Rules'}
            {currentStep === 3 && 'Settings & Review'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
        >
          Previous
        </Button>
        
        {currentStep < 3 ? (
          <Button
            onClick={() => setCurrentStep(currentStep + 1)}
            disabled={!canProceed()}
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={handleCreateBounty}
            disabled={!canProceed() || isCreating || !isConnected}
            className="gap-2"
          >
            {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
            {paymentStatus === 'processing' ? 'Processing Payment...' :
             isCreating ? 'Creating...' :
             parseFloat(form.prizeAmount) > 0 ? `Create Bounty (Deposit ${form.prizeAmount} HBAR)` :
             'Create Bounty'}
          </Button>
        )}
      </div>

      {!isConnected && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <p className="text-sm text-yellow-800">
              Please connect your wallet to create a bounty.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Payment Status Alerts */}
      {paymentError && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-800">
            Payment Error: {paymentError}
          </AlertDescription>
        </Alert>
      )}

      {paymentStatus === 'processing' && (
        <Alert className="bg-blue-50 border-blue-200">
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription className="text-blue-800">
            Processing HBAR deposit for bounty creation... This may take a few moments.
          </AlertDescription>
        </Alert>
      )}

      {paymentStatus === 'success' && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="h-4 w-4" />
          <AlertDescription className="text-green-800">
            Bounty created successfully! Prize amount has been deposited to escrow.
          </AlertDescription>
        </Alert>
      )}

      {/* Success Modal */}
      {showSuccessModal && createdBounty && (
        <BountySuccessModal
          open={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          bountyData={createdBounty}
        />
      )}
    </div>
  );
}