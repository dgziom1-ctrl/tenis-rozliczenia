import { useState } from 'react';
import Navigation from '../components/layout/Navigation';

export default {
  title: 'Layout/Navigation',
  component: Navigation,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};

export const Default = {
  render: () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    return (
      <div style={{ minHeight: '100px', position: 'relative' }}>
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    );
  },
};
