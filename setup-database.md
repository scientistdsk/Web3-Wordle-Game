# Database Setup Guide

This guide will help you set up the complete database schema for the Web3 Wordle Bounty Game.

## Prerequisites

1. **Supabase Project**: You need a Supabase project set up. Get your credentials from the Supabase dashboard:
   - Project ID: Found in your project settings
   - API URL: `https://YOUR_PROJECT_ID.supabase.co`

2. **Access**: You'll need access to the Supabase dashboard or CLI to run the migrations.

## Setup Steps

### 1. Run Database Migrations

Navigate to your Supabase dashboard at: https://supabase.com/dashboard/project/YOUR_PROJECT_ID

Go to the SQL Editor and run the following migration files in order:

#### Step 1: Initial Schema
Copy and paste the content from `supabase/migrations/001_initial_schema.sql` into the SQL editor and execute it.

This will create:
- All database tables (users, bounties, bounty_participants, game_attempts, payment_transactions)
- Indexes for performance
- Triggers for automatic timestamp updates
- Materialized view for leaderboards

#### Step 2: Row Level Security
Copy and paste the content from `supabase/migrations/002_rls_policies.sql` into the SQL editor and execute it.

This will create:
- RLS policies for all tables
- Helper functions for authentication
- Security definer functions for leaderboards

#### Step 3: Sample Data
Copy and paste the content from `supabase/migrations/003_sample_data.sql` into the SQL editor and execute it.

This will create:
- Sample users and bounties for testing
- Utility functions for common operations

### 2. Verify Setup

After running all migrations, verify the setup by checking:

1. **Tables Created**: In the Table Editor, you should see:
   - `users`
   - `bounties`
   - `bounty_participants`
   - `game_attempts`
   - `payment_transactions`
   - `leaderboard` (materialized view)

2. **Sample Data**: Query the bounties table to see sample data:
   ```sql
   SELECT * FROM bounties;
   ```

3. **Functions**: Check that utility functions are available:
   ```sql
   SELECT * FROM get_leaderboard(10);
   ```

### 3. Test API Connection

Once the database is set up, test the connection from your frontend:

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to the Bounty Hunt page and verify that:
   - Real bounties are loaded (not mock data)
   - The loading state works correctly
   - No API errors in the console

### 4. Environment Variables

Ensure your `.env.local` file contains the required variables. See `.env.example` for the complete list:
```
VITE_REOWN_PROJECT_ID=your_reown_project_id_here
VITE_HEDERA_NETWORK=testnet
VITE_HEDERA_TESTNET_RPC=https://testnet.hashio.io/api
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

Refer to `.env.example` for all required configuration values.

## Database Schema Overview

### Core Tables

1. **users**: User profiles and wallet information
2. **bounties**: Bounty definitions with words, prizes, and rules
3. **bounty_participants**: Tracks user participation in bounties
4. **game_attempts**: Individual word guesses and results
5. **payment_transactions**: HBAR transactions for prizes and deposits

### Key Features

- **Row Level Security**: Users can only access their own data and public bounties
- **Materialized Leaderboard**: High-performance leaderboard queries
- **Utility Functions**: Helper functions for common operations like joining bounties
- **Comprehensive Indexes**: Optimized for performance
- **Audit Trail**: All tables include created_at/updated_at timestamps

## Troubleshooting

### Common Issues

1. **Permission Errors**: Ensure RLS policies are properly set up
2. **Function Errors**: Check that all utility functions were created successfully
3. **Missing Data**: Verify sample data was inserted correctly

### Useful Queries

Check user count:
```sql
SELECT COUNT(*) FROM users;
```

Check active bounties:
```sql
SELECT name, status, participant_count FROM bounties WHERE status = 'active';
```

View leaderboard:
```sql
SELECT * FROM get_leaderboard(10);
```

## Next Steps

After setting up the database:

1. **Test Bounty Creation**: Try creating a new bounty through the UI
2. **Test Bounty Participation**: Join a bounty and submit attempts
3. **Monitor Performance**: Check query performance in Supabase dashboard
4. **Set Up Monitoring**: Configure alerts for errors and performance issues

The database is now ready to support the full Web3 Wordle Bounty Game functionality!