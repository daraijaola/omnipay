import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// In-memory invoice database
const invoices = {};

// Helper to seed some sample invoices for merchant dashboard demo
const seedInvoices = () => {
  const sample1Id = 'sample-inv-1';
  const sample2Id = 'sample-inv-2';
  invoices[sample1Id] = {
    id: sample1Id,
    recipientAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    chain: 'base',
    amount: '150.00',
    token: 'USDC',
    description: 'Landing Page UI Design',
    status: 'paid',
    txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
  };
  invoices[sample2Id] = {
    id: sample2Id,
    recipientAddress: '0xF39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    chain: 'polygon',
    amount: '45.00',
    token: 'USDT',
    description: 'Logo Illustration Mockups',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 24 hours ago
  };
};
seedInvoices();

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create an invoice
app.post('/api/invoices', (req, res) => {
  const { recipientAddress, chain, amount, token, description } = req.body;

  if (!recipientAddress || !chain || !amount || !token) {
    return res.status(400).json({ error: 'Missing required invoice parameters' });
  }

  const newInvoice = {
    id: uuidv4(),
    recipientAddress,
    chain: chain.toLowerCase(),
    amount: parseFloat(amount).toFixed(2),
    token: token.toUpperCase(),
    description: description || 'Payment Invoice',
    status: 'pending',
    createdAt: new Date().toISOString(),
    txHash: null,
  };

  invoices[newInvoice.id] = newInvoice;
  res.status(201).json(newInvoice);
});

// Get invoice by ID
app.get('/api/invoices/:id', (req, res) => {
  const invoice = invoices[req.params.id];
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }
  res.json(invoice);
});

// Get all invoices (for merchant history)
app.get('/api/invoices', (req, res) => {
  const list = Object.values(invoices).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(list);
});

// Settle / Pay invoice
app.post('/api/invoices/:id/settle', (req, res) => {
  const { txHash } = req.body;
  const invoice = invoices[req.params.id];

  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  if (!txHash) {
    return res.status(400).json({ error: 'Missing transaction hash' });
  }

  // Update status to paid and record transaction hash
  invoice.status = 'paid';
  invoice.txHash = txHash;
  invoice.settledAt = new Date().toISOString();

  res.json(invoice);
});

app.listen(PORT, () => {
  console.log(`[OmniPay Server] Running on http://localhost:${PORT}`);
});
