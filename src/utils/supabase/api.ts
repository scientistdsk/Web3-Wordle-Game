// API service functions for interacting with the database
import { supabase } from './client';

export interface User {
  id: string;
  wallet_address: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  total_bounties_created: number;
  total_bounties_won: number;
  total_hbar_earned: number;
  total_hbar_spent: number;
}

export interface Bounty {
  id: string;
  name: string;
  description?: string;
  creator_id: string;
  bounty_type: 'Simple' | 'Multistage' | 'Time-based' | 'Random words' | 'Limited trials';
  prize_amount: number;
  prize_currency: string;
  words: string[];
  hints: string[];
  max_participants?: number;
  max_attempts_per_user?: number;
  time_limit_seconds?: number;
  winner_criteria: 'time' | 'attempts' | 'words-correct';
  start_time: string;
  end_time?: string;
  duration_hours?: number;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled' | 'expired';
  is_public: boolean;
  requires_registration: boolean;
  participant_count: number;
  completion_count: number;
  created_at: string;
  updated_at: string;
}

export interface BountyWithCreator extends Bounty {
  creator: {
    username?: string;
    display_name?: string;
    wallet_address: string;
  };
}

export interface Participation {
  id: string;
  bounty_id: string;
  user_id: string;
  status: 'registered' | 'active' | 'completed' | 'failed' | 'disqualified';
  joined_at: string;
  completed_at?: string;
  current_word_index: number;
  total_attempts: number;
  total_time_seconds: number;
  words_completed: number;
  is_winner: boolean;
  final_score?: number;
  prize_amount_won: number;
}

export interface GameAttempt {
  id: string;
  participant_id: string;
  bounty_id: string;
  word_index: number;
  attempt_number: number;
  guessed_word: string;
  target_word: string;
  result: 'correct' | 'incorrect' | 'partial';
  letter_results: any;
  time_taken_seconds?: number;
  created_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  wallet_address: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  bounties_participated: number;
  bounties_won: number;
  total_hbar_won: number;
  avg_attempts: number;
  avg_time_seconds: number;
  last_win_date?: string;
  global_rank: number;
}

// User management
export async function getOrCreateUser(walletAddress: string, username?: string, displayName?: string): Promise<User> {
  // Use the new public function that bypasses RLS
  const { data: userId, error } = await supabase.rpc('get_or_create_user', {
    wallet_addr: walletAddress,
    user_name: username || null,
    display_name: displayName || null
  });

  if (error) {
    console.error('Error in get_or_create_user:', error);
    throw error;
  }

  // Get the full user record
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError) {
    console.error('Error fetching user:', userError);
    throw userError;
  }
  return user;
}

export async function getUserByWallet(walletAddress: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updateUserProfile(walletAddress: string, updates: Partial<Pick<User, 'username' | 'display_name' | 'avatar_url'>>): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('wallet_address', walletAddress)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Bounty management
export async function getBounties(filters?: {
  status?: string;
  bounty_type?: string;
  is_public?: boolean;
  creator_id?: string;
  limit?: number;
  offset?: number;
}): Promise<BountyWithCreator[]> {
  let query = supabase
    .from('bounties')
    .select(`
      *,
      creator:users!creator_id (
        username,
        display_name,
        wallet_address
      )
    `)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.bounty_type) {
    query = query.eq('bounty_type', filters.bounty_type);
  }
  if (filters?.is_public !== undefined) {
    query = query.eq('is_public', filters.is_public);
  }
  if (filters?.creator_id) {
    query = query.eq('creator_id', filters.creator_id);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  console.log('Fetching bounties with filters:', filters);
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching bounties:', error);
    throw error;
  }
  console.log('Fetched bounties:', data);
  return data || [];
}

export async function getBountyById(id: string, walletAddress?: string): Promise<any> {
  const { data, error } = await supabase.rpc('get_bounty_details', {
    bounty_uuid: id,
    wallet_addr: walletAddress
  });

  if (error) throw error;
  return data;
}

export async function createBounty(bountyData: any): Promise<Bounty> {
  // Extract wallet address from creator_id
  const walletAddress = bountyData.creator_id;

  if (!walletAddress) {
    throw new Error('Creator wallet address is required');
  }

  // Use the new function that handles user creation and bounty creation
  const { data: bountyId, error } = await supabase.rpc('create_bounty_with_wallet', {
    wallet_addr: walletAddress,
    bounty_data: {
      name: bountyData.name,
      description: bountyData.description || null,
      bounty_type: bountyData.bounty_type,
      prize_amount: bountyData.prize_amount || 0,
      prize_currency: bountyData.prize_currency || 'HBAR',
      words: bountyData.words || ['WORDLE'],
      hints: bountyData.hints || [],
      max_participants: bountyData.max_participants || null,
      max_attempts_per_user: bountyData.max_attempts_per_user || null,
      time_limit_seconds: bountyData.time_limit_seconds || null,
      winner_criteria: bountyData.winner_criteria || 'attempts',
      duration_hours: bountyData.duration_hours || null,
      status: bountyData.status || 'active',
      is_public: bountyData.is_public !== false,
      requires_registration: bountyData.requires_registration || false
    }
  });

  if (error) {
    console.error('Bounty creation error:', error);
    throw error;
  }

  // Fetch and return the created bounty
  const { data: bounty, error: fetchError } = await supabase
    .from('bounties')
    .select('*')
    .eq('id', bountyId)
    .single();

  if (fetchError) {
    console.error('Error fetching created bounty:', fetchError);
    throw fetchError;
  }

  return bounty;
}

export async function updateBounty(id: string, updates: Partial<Bounty>): Promise<Bounty> {
  const { data, error } = await supabase
    .from('bounties')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBounty(id: string): Promise<void> {
  const { error } = await supabase
    .from('bounties')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Participation management
export async function joinBounty(bountyId: string, walletAddress: string): Promise<string> {
  console.log('🔍 joinBounty called:', { bountyId, walletAddress });

  // First ensure user exists
  console.log('🔍 Step 1: Getting or creating user...');
  const user = await getOrCreateUser(walletAddress);
  console.log('✅ Step 1: User found/created:', user.id);

  // Check if already participating
  console.log('🔍 Step 2: Checking existing participation...');
  const { data: existing, error: existingError } = await supabase
    .from('bounty_participants')
    .select('id')
    .eq('bounty_id', bountyId)
    .eq('user_id', user.id)
    .maybeSingle();

  // If user already participating, return existing participation ID
  if (existing) {
    console.log('✅ Step 2: User already participating:', existing.id);
    return existing.id;
  }

  console.log('✅ Step 2: No existing participation found, proceeding to join...');

  // If there was an error other than "no rows found", throw it
  if (existingError && existingError.code !== 'PGRST116') {
    console.error('Error checking existing participation:', existingError);
    throw existingError;
  }

  // Join the bounty
  console.log('🔍 Step 3: Creating new participation...');
  const { data, error } = await supabase
    .from('bounty_participants')
    .insert([{
      bounty_id: bountyId,
      user_id: user.id,
      status: 'active',
      joined_at: new Date().toISOString()
    }])
    .select('id')
    .single();

  if (error) {
    console.error('❌ Step 3: Error joining bounty:', error);
    throw error;
  }

  console.log('✅ Step 3: Successfully joined bounty, participation ID:', data.id);
  return data.id;
}

/**
 * Complete a bounty with a winner
 * Updates bounty status, records winner, and triggers prize distribution
 */
export async function completeBounty(
  bountyId: string,
  winnerWalletAddress: string,
  solutionWord: string,
  transactionHash?: string
): Promise<void> {
  console.log('🔍 completeBounty called:', { bountyId, winnerWalletAddress });

  // Get winner user ID
  const winner = await getOrCreateUser(winnerWalletAddress);
  console.log('✅ Winner user found:', winner.id);

  // Update bounty status to completed and set winner
  const { error: bountyError } = await supabase
    .from('bounties')
    .update({
      status: 'completed',
      winner_id: winner.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', bountyId);

  if (bountyError) {
    console.error('❌ Error updating bounty:', bountyError);
    throw bountyError;
  }

  // Update winner's participation status
  const { error: participationError } = await supabase
    .from('bounty_participants')
    .update({
      status: 'won',
      completed_at: new Date().toISOString()
    })
    .eq('bounty_id', bountyId)
    .eq('user_id', winner.id);

  if (participationError) {
    console.error('❌ Error updating participation:', participationError);
    throw participationError;
  }

  // Update winner's stats
  const bounty = await getBountyById(bountyId);
  if (bounty) {
    const { error: statsError } = await supabase
      .from('users')
      .update({
        total_bounties_won: (winner.total_bounties_won || 0) + 1,
        total_hbar_earned: (winner.total_hbar_earned || 0) + parseFloat(bounty.prize_amount.toString()),
        updated_at: new Date().toISOString()
      })
      .eq('id', winner.id);

    if (statsError) {
      console.error('❌ Error updating winner stats:', statsError);
      // Don't throw - this is not critical
    }
  }

  // Record transaction if provided
  if (transactionHash) {
    const { error: txError } = await supabase
      .from('payment_transactions')
      .insert({
        bounty_id: bountyId,
        user_id: winner.id,
        amount: bounty?.prize_amount || 0,
        currency: 'HBAR',
        transaction_type: 'prize_payment',
        status: 'completed',
        transaction_hash: transactionHash,
        created_at: new Date().toISOString()
      });

    if (txError) {
      console.error('❌ Error recording transaction:', txError);
      // Don't throw - this is not critical
    }
  }

  console.log('✅ Bounty completed successfully');
}

export async function getUserParticipations(walletAddress: string): Promise<(Participation & { bounty: BountyWithCreator })[]> {
  // First get user ID
  const user = await getUserByWallet(walletAddress);
  if (!user) throw new Error('User not found');

  const { data, error } = await supabase
    .from('bounty_participants')
    .select(`
      *,
      bounty:bounties (
        *,
        creator:users!creator_id (
          username,
          display_name,
          wallet_address
        )
      )
    `)
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getBountyParticipants(bountyId: string): Promise<(Participation & { user: User })[]> {
  const { data, error } = await supabase
    .from('bounty_participants')
    .select(`
      *,
      user:users (*)
    `)
    .eq('bounty_id', bountyId)
    .order('joined_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Game attempts
export async function submitAttempt(
  bountyId: string,
  walletAddress: string,
  wordIndex: number,
  guessedWord: string,
  timeTaken?: number
): Promise<any> {
  const { data, error } = await supabase.rpc('submit_attempt', {
    bounty_uuid: bountyId,
    wallet_addr: walletAddress,
    word_idx: wordIndex,
    guessed_word: guessedWord,
    time_taken: timeTaken
  });

  if (error) throw error;
  return data;
}

export async function getUserAttempts(walletAddress: string, bountyId?: string): Promise<GameAttempt[]> {
  // First get user ID
  const user = await getUserByWallet(walletAddress);
  if (!user) throw new Error('User not found');

  // Get participant IDs
  let participantQuery = supabase
    .from('bounty_participants')
    .select('id')
    .eq('user_id', user.id);

  if (bountyId) {
    participantQuery = participantQuery.eq('bounty_id', bountyId);
  }

  const { data: participants, error: partError } = await participantQuery;
  if (partError) throw partError;

  if (!participants || participants.length === 0) return [];

  const participantIds = participants.map(p => p.id);

  const { data, error } = await supabase
    .from('game_attempts')
    .select('*')
    .in('participant_id', participantIds)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// Leaderboard
export async function getLeaderboard(limit = 100): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('get_leaderboard', {
    limit_count: limit
  });

  if (error) throw error;
  return data || [];
}

export async function getUserLeaderboardPosition(walletAddress: string): Promise<LeaderboardEntry | null> {
  const { data, error } = await supabase.rpc('get_user_leaderboard_position', {
    wallet_addr: walletAddress
  });

  if (error) throw error;
  return data?.[0] || null;
}

export async function getBountyLeaderboard(bountyId: string): Promise<any[]> {
  const { data, error } = await supabase.rpc('get_bounty_leaderboard', {
    bounty_uuid: bountyId
  });

  if (error) throw error;
  return data || [];
}

// Top creators leaderboard
export interface TopCreator {
  user_id: string;
  wallet_address: string;
  username?: string;
  display_name?: string;
  bounties_created: number;
  total_prize_pool: number;
  total_participants: number;
  completed_bounties: number;
  avg_participants: number;
}

export async function getTopCreators(limit = 10): Promise<TopCreator[]> {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      wallet_address,
      username,
      display_name,
      total_bounties_created
    `)
    .order('total_bounties_created', { ascending: false })
    .limit(limit);

  if (error) throw error;

  // For each user, get their bounty statistics
  const creatorsWithStats = await Promise.all(
    (data || []).map(async (user) => {
      const { data: bounties } = await supabase
        .from('bounties')
        .select('prize_amount, participant_count, status')
        .eq('creator_id', user.id);

      const totalPrizePool = bounties?.reduce((sum, b) => sum + Number(b.prize_amount), 0) || 0;
      const totalParticipants = bounties?.reduce((sum, b) => sum + (b.participant_count || 0), 0) || 0;
      const completedBounties = bounties?.filter(b => b.status === 'completed').length || 0;
      const avgParticipants = bounties && bounties.length > 0
        ? totalParticipants / bounties.length
        : 0;

      return {
        user_id: user.id,
        wallet_address: user.wallet_address,
        username: user.username,
        display_name: user.display_name,
        bounties_created: user.total_bounties_created || 0,
        total_prize_pool: totalPrizePool,
        total_participants: totalParticipants,
        completed_bounties: completedBounties,
        avg_participants: avgParticipants
      };
    })
  );

  return creatorsWithStats;
}

// Payment and transaction management
export interface PaymentTransaction {
  id: string;
  bounty_id: string;
  user_id: string;
  transaction_type: 'deposit' | 'prize_payment' | 'refund';
  amount: number;
  currency: string;
  transaction_hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  created_at: string;
  confirmed_at?: string;
}

export async function recordTransaction(
  bountyId: string,
  userId: string,
  type: 'deposit' | 'prize_payment' | 'refund',
  amount: number,
  currency: string,
  transactionHash: string
): Promise<PaymentTransaction> {
  // Use the new public function that bypasses RLS
  const { data: transactionId, error } = await supabase.rpc('record_payment_transaction', {
    bounty_uuid: bountyId,
    user_uuid: userId,
    tx_type: type,
    tx_amount: amount,
    tx_currency: currency,
    tx_hash: transactionHash
  });

  if (error) {
    console.error('Error in record_payment_transaction:', error);
    throw error;
  }

  // Get the full transaction record
  const { data: transaction, error: transactionError } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (transactionError) {
    console.error('Error fetching transaction:', transactionError);
    throw transactionError;
  }

  return transaction;
}

export async function confirmTransaction(transactionId: string): Promise<void> {
  // Use the new public function that bypasses RLS
  const { error } = await supabase.rpc('confirm_payment_transaction', {
    transaction_uuid: transactionId
  });

  if (error) {
    console.error('Error in confirm_payment_transaction:', error);
    throw error;
  }
}

export async function markBountyCompleted(
  bountyId: string,
  winnerId: string,
  prizeAmount: number
): Promise<void> {
  const { error } = await supabase.rpc('complete_bounty', {
    bounty_uuid: bountyId,
    winner_user_id: winnerId,
    prize_amount: prizeAmount
  });

  if (error) throw error;
}

export async function distributePrize(
  bountyId: string,
  participantId: string,
  prizeAmount: number,
  transactionHash: string
): Promise<void> {
  const { error } = await supabase
    .from('bounty_participants')
    .update({
      prize_amount_won: prizeAmount,
      prize_paid_at: new Date().toISOString(),
      prize_transaction_hash: transactionHash,
      is_winner: true
    })
    .eq('id', participantId);

  if (error) throw error;
}

// Utility functions
export async function refreshLeaderboard(): Promise<void> {
  const { error } = await supabase.rpc('refresh_leaderboard');
  if (error) throw error;
}

// Search bounties
export async function searchBounties(query: string, filters?: {
  bounty_type?: string;
  status?: string;
  min_prize?: number;
  max_prize?: number;
}): Promise<BountyWithCreator[]> {
  let dbQuery = supabase
    .from('bounties')
    .select(`
      *,
      creator:users!creator_id (
        username,
        display_name,
        wallet_address
      )
    `)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .order('created_at', { ascending: false });

  if (filters?.bounty_type) {
    dbQuery = dbQuery.eq('bounty_type', filters.bounty_type);
  }
  if (filters?.status) {
    dbQuery = dbQuery.eq('status', filters.status);
  }
  if (filters?.min_prize) {
    dbQuery = dbQuery.gte('prize_amount', filters.min_prize);
  }
  if (filters?.max_prize) {
    dbQuery = dbQuery.lte('prize_amount', filters.max_prize);
  }

  const { data, error } = await dbQuery;
  if (error) throw error;
  return data || [];
}

// Helper function for updating bounty transaction info
export async function updateBountyTransactionInfo(
  bountyId: string,
  transactionHash: string,
  escrowAddress: string
): Promise<void> {
  const { error } = await supabase.rpc('update_bounty_transaction_info', {
    bounty_uuid: bountyId,
    tx_hash: transactionHash,
    escrow_addr: escrowAddress
  });

  if (error) {
    console.error('Error updating bounty transaction info:', error);
    throw error;
  }
}

// Dictionary validation functions
export async function validateWordInDictionary(word: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('validate_word', {
      check_word: word.toUpperCase()
    });

    if (error) {
      console.error('Error validating word:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Dictionary validation error:', error);
    return false;
  }
}

export async function validateMultipleWords(words: string[]): Promise<Map<string, boolean>> {
  try {
    const { data, error } = await supabase.rpc('validate_words', {
      check_words: words.map(w => w.toUpperCase())
    });

    if (error) {
      console.error('Error validating words:', error);
      return new Map();
    }

    const validationMap = new Map<string, boolean>();
    if (data) {
      data.forEach((result: { word: string; is_valid: boolean }) => {
        validationMap.set(result.word, result.is_valid);
      });
    }

    return validationMap;
  } catch (error) {
    console.error('Dictionary validation error:', error);
    return new Map();
  }
}

export async function incrementWordUsage(word: string): Promise<void> {
  try {
    await supabase.rpc('increment_word_usage', {
      used_word: word.toUpperCase()
    });
  } catch (error) {
    // Non-critical error, just log it
    console.warn('Could not increment word usage:', error);
  }
}

export async function getPopularWords(wordLength?: number, limit = 10): Promise<{ word: string; usage_count: number }[]> {
  try {
    const { data, error } = await supabase.rpc('get_popular_words', {
      word_len: wordLength,
      limit_count: limit
    });

    if (error) {
      console.error('Error getting popular words:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Popular words error:', error);
    return [];
  }
}

export async function getRandomWords(count: number = 1, wordLength?: number): Promise<string[]> {
  try {
    let query = supabase
      .from('dictionary')
      .select('word');

    if (wordLength) {
      query = query.eq('word_length', wordLength);
    }

    // Get random words using a random ordering
    // Note: This is not perfectly uniform but works for our use case
    const { data, error } = await query
      .limit(count * 10); // Get more than needed

    if (error) {
      console.error('Error getting random words:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Shuffle and take the requested count
    const shuffled = data.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(row => row.word);
  } catch (error) {
    console.error('Random words error:', error);
    return [];
  }
}