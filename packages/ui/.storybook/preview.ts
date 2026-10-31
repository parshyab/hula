import type { Preview } from '@storybook/react-vite';
import '../src/tokens.css';

const preview: Preview = {
  parameters: {
    backgrounds: { disable: true },
    controls: { matchers: { color: /(background|color)$/i } },
  },
  decorators: [
    (Story) => {
      document.body.style.background = 'var(--color-bg)';
      document.body.style.color = 'var(--color-text)';
      document.body.style.padding = '2rem';
      return Story();
    },
  ],
};

export default preview;
