export const firefoxBrowser = browser as typeof browser & {
  sidebarAction: {
    open: () => Promise<void>;
  };
};
