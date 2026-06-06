// useToast: wrapper around react-hot-toast for typed admin notifications
import toast from 'react-hot-toast';

export const useToast = () => ({
  success: (msg: string) => toast.success(msg),
  error: (msg: string) => toast.error(msg),
  info: (msg: string) => toast(msg, { icon: 'ℹ️' }),
  loading: (msg: string) => toast.loading(msg),
  dismiss: (id?: string) => toast.dismiss(id),
  promise: <T>(promise: Promise<T>, msgs: { loading: string; success: string; error: string }) =>
    toast.promise(promise, msgs),
});
