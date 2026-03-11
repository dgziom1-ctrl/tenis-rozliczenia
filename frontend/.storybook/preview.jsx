import '../src/index.css';
import { ThemeContext } from '../src/context/ThemeContext';

/** Storybook global decorator — wraps every story with ThemeContext */
export const decorators = [
  (Story, context) => {
    const theme = context.globals.theme ?? 'cyber';
    // Sync data-theme attr so CSS selectors work
    document.documentElement.dataset.theme = theme === 'cyber' ? '' : theme;
    return (
      <ThemeContext.Provider value={theme}>
        <div style={{ padding: '1.5rem' }}>
          <Story />
        </div>
      </ThemeContext.Provider>
    );
  },
];

/** Global toolbar — lets you switch theme from Storybook UI */
export const globalTypes = {
  theme: {
    description: 'Motyw aplikacji',
    defaultValue: 'cyber',
    toolbar: {
      title: 'Motyw',
      icon: 'paintbrush',
      items: [
        { value: 'cyber',  title: 'Cyber Ponk' },
        { value: 'arcade', title: 'Retro Arcade' },
        { value: 'zen',    title: 'Zen Nature' },
      ],
      dynamicTitle: true,
    },
  },
};

export const parameters = {
  backgrounds: {
    default: 'cyber',
    values: [
      { name: 'cyber',  value: '#030712' },
      { name: 'arcade', value: '#010300' },
      { name: 'zen',    value: '#f0ebe0' },
    ],
  },
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: { matchers: { color: /(background|color)$/i, date: /Date$/ } },
};
