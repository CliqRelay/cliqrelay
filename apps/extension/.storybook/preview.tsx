import type { Preview } from "@storybook/react-vite";

import "../src/entrypoints/sidepanel/styles.css";
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
        <div className="mx-auto w-[400px] p-4">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
};

export default preview;
