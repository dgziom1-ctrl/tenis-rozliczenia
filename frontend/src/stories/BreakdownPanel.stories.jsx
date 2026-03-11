import BreakdownPanel from '../components/dashboard/BreakdownPanel';

export default {
  title: 'Dashboard/BreakdownPanel',
  component: BreakdownPanel,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    onRemovePayment: { action: 'removePayment' },
  },
};

const breakdown = {
  sessions: [
    { date: '2025-01-08', amount: 25 },
    { date: '2025-01-15', amount: 25 },
  ],
  payments: [
    { id: 'p1', date: '2025-01-12', amount: 5 },
  ],
  totalSessions: 50,
  totalPaid:     5,
  balance:       45,
};

export const Open = {
  args: { playerName: 'Marcin', open: true, breakdown },
};

export const Closed = {
  args: { playerName: 'Marcin', open: false, breakdown },
};

export const NoPayments = {
  args: {
    playerName: 'Marcin',
    open: true,
    breakdown: { ...breakdown, payments: [], totalPaid: 0, balance: 50 },
  },
};
