// Test component to verify database connection
import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase/client';

export function TestDatabaseConnection() {
  const [bounties, setBounties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function testConnection() {
      try {
        console.log('Testing database connection...');

        // Direct Supabase query to test connection
        const { data, error: dbError } = await supabase
          .from('bounties')
          .select(`
            id,
            name,
            bounty_type,
            prize_amount,
            status,
            participant_count,
            created_at
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (dbError) {
          console.error('Database error:', dbError);
          setError(dbError.message);
        } else {
          console.log('Database connection successful! Found bounties:', data);
          setBounties(data || []);
        }
      } catch (err) {
        console.error('Connection error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    testConnection();
  }, []);

  if (loading) {
    return <div className="p-4">Testing database connection...</div>;
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded">
        <h3 className="font-semibold text-red-800">Database Connection Error</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 border border-green-200 bg-green-50 rounded">
      <h3 className="font-semibold text-green-800">Database Connection Successful!</h3>
      <p className="text-green-600">Found {bounties.length} bounties</p>
      {bounties.length > 0 && (
        <div className="mt-2">
          <h4 className="font-medium">Sample bounties:</h4>
          <ul className="list-disc list-inside text-sm">
            {bounties.map((bounty) => (
              <li key={bounty.id}>
                {bounty.name} - {bounty.prize_amount} HBAR ({bounty.bounty_type})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}