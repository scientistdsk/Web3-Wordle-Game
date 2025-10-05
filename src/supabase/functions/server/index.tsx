import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-d72b2276/health", (c) => {
  return c.json({ status: "ok" });
});

// Bounty endpoints
app.post("/make-server-d72b2276/bounties", async (c) => {
  try {
    const bountyData = await c.req.json();
    const bountyId = crypto.randomUUID();
    const shareableLink = `${new URL(c.req.url).origin}?bounty=${bountyId}`;
    
    const bounty = {
      id: bountyId,
      ...bountyData,
      createdAt: new Date().toISOString(),
      status: 'active',
      participants: [],
      shareableLink
    };
    
    await kv.set(`bounty:${bountyId}`, bounty);
    
    return c.json({ 
      success: true, 
      bountyId,
      shareableLink,
      message: 'Bounty created successfully!' 
    });
  } catch (error) {
    console.log('Error creating bounty:', error);
    return c.json({ 
      success: false, 
      message: 'Failed to create bounty' 
    }, 500);
  }
});

app.get("/make-server-d72b2276/bounties", async (c) => {
  try {
    const bounties = await kv.getByPrefix('bounty:');
    return c.json({ bounties: bounties.map(b => b.value) });
  } catch (error) {
    console.log('Error fetching bounties:', error);
    return c.json({ 
      success: false, 
      message: 'Failed to fetch bounties' 
    }, 500);
  }
});

app.get("/make-server-d72b2276/bounties/:id", async (c) => {
  try {
    const bountyId = c.req.param('id');
    const bounty = await kv.get(`bounty:${bountyId}`);
    
    if (!bounty) {
      return c.json({ 
        success: false, 
        message: 'Bounty not found' 
      }, 404);
    }
    
    return c.json({ bounty });
  } catch (error) {
    console.log('Error fetching bounty:', error);
    return c.json({ 
      success: false, 
      message: 'Failed to fetch bounty' 
    }, 500);
  }
});

// User profile endpoints
app.get("/make-server-d72b2276/users/:address", async (c) => {
  try {
    const address = c.req.param('address');
    const user = await kv.get(`user:${address}`);
    
    return c.json({ 
      user: user || { 
        address, 
        name: `User ${address.slice(0, 6)}...${address.slice(-4)}`,
        stats: {
          totalBountyCreated: 0,
          totalBountyEntered: 0,
          totalTries: 0,
          totalWins: 0,
          totalLosses: 0,
          successRate: 0
        }
      } 
    });
  } catch (error) {
    console.log('Error fetching user:', error);
    return c.json({ 
      success: false, 
      message: 'Failed to fetch user' 
    }, 500);
  }
});

app.put("/make-server-d72b2276/users/:address", async (c) => {
  try {
    const address = c.req.param('address');
    const userData = await c.req.json();
    
    await kv.set(`user:${address}`, userData);
    
    return c.json({ 
      success: true, 
      message: 'User updated successfully' 
    });
  } catch (error) {
    console.log('Error updating user:', error);
    return c.json({ 
      success: false, 
      message: 'Failed to update user' 
    }, 500);
  }
});

Deno.serve(app.fetch);