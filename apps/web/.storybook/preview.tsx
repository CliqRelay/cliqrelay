import type { Preview } from "@storybook/react-vite";

import "../src/styles.css";
import { TooltipProvider } from "../src/components/ui/tooltip";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <div className="mx-auto max-w-3xl p-6">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
};

export default preview;
