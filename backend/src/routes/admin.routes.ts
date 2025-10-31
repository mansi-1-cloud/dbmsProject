import { Router, Response } from 'express';
// Corrected path: ../services/QueueManager.js
import { queueManager } from '../services/QueueManager.js';
// Corrected path: ../middleware/auth.js
import { authenticate } from '../middleware/auth.js';
// Corrected path: ../types/index.js
import { AuthRequest } from '../types/index.js';
// Corrected path: ../services/strategyRegistry.js
import { strategyRegistry } from '../services/strategyRegistry.js';

const router = Router();

/**
 * 🚀 GET /strategy
 * Get the name of the current scheduling strategy.
 */
router.get('/strategy', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const strategy = queueManager.getStrategy();
    
    // Check if a strategy is set
    if (!strategy) {
      console.error('No strategy is currently set on the QueueManager.');
      return res.status(500).json({ error: 'Internal server error: Strategy not configured' });
    }
    
    res.json({ strategy: strategy.name });

  } catch (error) {
    console.error('Failed to get strategy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 🔄 POST /strategy
 * Change the active scheduling strategy.
 */
router.post('/strategy', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { strategy: strategyName } = req.body;

    // === 1. Client Error Handling (4xx) ===
    if (!strategyName || typeof strategyName !== 'string') {
      return res.status(400).json({ error: 'Strategy name required and must be a string' });
    }
    
    const upperCaseStrategyName = strategyName.toUpperCase();

    // Use the registry to find the strategy constructor
    const StrategyConstructor = strategyRegistry.get(upperCaseStrategyName);

    if (!StrategyConstructor) {
      return res.status(400).json({ error: `Invalid or unsupported strategy name: ${strategyName}` });
    }

    // === 2. Business Logic ===
    const newStrategy = new StrategyConstructor();
    queueManager.setStrategy(newStrategy);

    res.json({
      message: 'Strategy updated successfully',
      strategy: newStrategy.name,
    });

  } catch (error) {
    // === 3. Server Error Handling (5xx) ===
    console.error('Failed to set new strategy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;