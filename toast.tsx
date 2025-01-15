// ... existing imports and constants ...

interface ToastParameters {
  message: string;
  linkText: string;
  linkUrl: string;
  onCancel?: () => void;
  onLinkClick: () => void;
  options?: ToastOptions;
  id?: string;  // Added optional id parameter
}

const success = (parameters: ToastParameters) => {
  toast.custom((t) => (
    <CustomToast
      type="success"
      message={parameters.message}
      linkText={parameters.linkText}
      onLinkClick={parameters.onLinkClick}
      onCancel={() => {
        toast.dismiss(t.id);
        parameters.onCancel?.();
      }}
    />
  ), { ...parameters.options, duration: TOAST_DURATION, id: parameters.id });
};

const error = (parameters: ToastParameters) => {
  toast.custom((t) => (
    <CustomToast
      type="error"
      message={parameters.message}
      linkText={parameters.linkText}
      onLinkClick={parameters.onLinkClick}
      onCancel={() => {
        toast.dismiss(t.id);
        parameters.onCancel?.();
      }}
    />
  ), { ...parameters.options, duration: TOAST_DURATION, id: parameters.id });
};

// ... existing exports ...
