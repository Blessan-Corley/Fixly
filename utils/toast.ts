import { toast } from 'sonner';

export { toastMessages } from './toast.messages';
import { toastMessages } from './toast.messages';

export const showToast = {
  success: (message: string, description?: string) => toast.success(message, { description }),
  error: (message: string, description?: string) => toast.error(message, { description }),
  info: (message: string, description?: string) => toast.info(message, { description }),
  warning: (message: string, description?: string) => toast.warning(message, { description }),
  loading: (message: string) => toast.loading(message),
  promise: <T>(promise: Promise<T>, messages: Parameters<typeof toast.promise>[1]) =>
    toast.promise(promise, messages),
};

export const contextToast = (context: string, action: string, data: unknown = {}) => {
  const contextMessages = toastMessages[context as keyof typeof toastMessages];
  const actionHandler = contextMessages?.[action as keyof typeof contextMessages] as
    | ((payload?: unknown) => string | number)
    | undefined;

  if (typeof actionHandler === 'function') {
    return actionHandler(data);
  }

  return toastMessages.error.generic();
};

export default toastMessages;
