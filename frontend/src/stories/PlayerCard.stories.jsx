import PlayerCard from '../components/dashboard/PlayerCard';

export default {
  title: 'Dashboard/PlayerCard',
  component: PlayerCard,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    onSettle:        { action: 'settle'          },
    onToggleDetails: { action: 'toggleDetails'   },
    onAddPayment:    { action: 'addPayment'       },
    onRemovePayment: { action: 'removePayment'    },
    onPin:           { action: 'pin'              },
    onUnpin:         { action: 'unpin'            },
  },
};

const base = {
  player: { name: 'Marcin', currentDebt: 45, attendanceCount: 8 },
  totalWeeks: 10,
  justSettled: false,
  openDetails: false,
  breakdown: null,
};

export const HasDebt = { args: { ...base } };

export const HasCredit = {
  args: { ...base, player: { ...base.player, name: 'Ola', currentDebt: -15 } },
};

export const SettledUp = {
  args: { ...base, player: { ...base.player, name: 'Tomek', currentDebt: 0 } },
};

export const JustSettled = {
  args: { ...base, player: { ...base.player, name: 'Kasia', currentDebt: 0 }, justSettled: true },
};

export const WithBreakdownOpen = {
  args: {
    ...base,
    openDetails: true,
    breakdown: {
      sessions: [
        { date: '2025-01-08', amount: 25 },
        { date: '2025-01-15', amount: 25 },
      ],
      payments: [
        { id: 'p1', date: '2025-01-10', amount: 5 },
      ],
      totalSessions: 50,
      totalPaid:     5,
      balance:       45,
    },
  },
};
