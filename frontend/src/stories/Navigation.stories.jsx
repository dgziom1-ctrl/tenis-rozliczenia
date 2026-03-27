import { useState } from 'react';
import Navigation from '../components/layout/Navigation';

export default {
  title: 'Layout/Navigation',
  component: Navigation,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};

export const Default = {
  render: function Render() {
    const [activeTab, setActiveTab] = useState('dashboard');
    return (
      <div style={{ minHeight: '100px', position: 'relative' }}>
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    );
  },
};
