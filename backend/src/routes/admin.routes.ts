import { Router, Response } from 'express';
import { queueManager } from '../services/QueueManager.js';
import { FIFOStrategy } from '../services/scheduling/FIFOStrategy.js';
import { authenticate } from '../middleware/auth.js';
import { AuthRequest } from '../types/index.js';

const router = Router();

// Get current scheduling strategy
router.get('/strategy', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const strategy = queueManager.getStrategy();
    res.json({ strategy: strategy.name });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Change scheduling strategy
router.post('/strategy', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { strategy } = req.body;

    if (!strategy) {
      return res.status(400).json({ error: 'Strategy name required' });
    }

    switch (strategy.toUpperCase()) {
      case 'FIFO':
        queueManager.setStrategy(new FIFOStrategy());
        break;
      // Add more strategies here in the future
      default:
        return res.status(400).json({ error: 'Invalid strategy name' });
    }

    res.json({ message: 'Strategy updated', strategy: queueManager.getStrategy().name });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
