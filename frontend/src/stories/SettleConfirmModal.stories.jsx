import SettleConfirmModal from '../components/dashboard/SettleConfirmModal';
import { useThemeTokens } from '../context/ThemeContext';

function Wrapper(args) {
  const T = useThemeTokens();
  return <SettleConfirmModal {...args} T={T} />;
}

export default {
  title: 'Dashboard/SettleConfirmModal',
  component: Wrapper,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    onConfirm: { action: 'confirm' },
    onCancel:  { action: 'cancel'  },
  },
};

export const Default = {
  args: { playerName: 'Marcin', debt: 87.5 },
};

export const LargeDebt = {
  args: { playerName: 'Bartosz', debt: 312 },
};
