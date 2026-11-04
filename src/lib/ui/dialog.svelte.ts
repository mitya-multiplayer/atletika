// One app-wide modal dialog, rendered by DialogHost. Screens await the answer.

type DialogRequest = {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  resolve: (confirmed: boolean) => void;
};

export const dialog = $state<{ current: DialogRequest | null }>({ current: null });

/** Ask before a destructive action. Resolves true when the user confirms. */
export function confirmAction(options: {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
}): Promise<boolean> {
  dialog.current?.resolve(false);
  return new Promise((resolve) => {
    dialog.current = { cancelLabel: 'Отмена', ...options, resolve };
  });
}

/** Show information with a single acknowledge button. */
export function showMessage(title: string, message?: string): Promise<void> {
  dialog.current?.resolve(false);
  return new Promise((resolve) => {
    dialog.current = { title, message, confirmLabel: 'Понятно', resolve: () => resolve() };
  });
}
