// Web stub for expo-document-picker
// Uses the native HTML file input on web; on mobile the real package is used.

export const getDocumentAsync = async (options = {}) => {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';

    const mimeType = options.type;
    if (mimeType && mimeType !== '*/*') {
      input.accept = Array.isArray(mimeType) ? mimeType.join(',') : mimeType;
    }
    if (options.multiple) input.multiple = true;

    input.onchange = (e) => {
      const files = Array.from(e.target?.files || []);
      if (files.length === 0) {
        resolve({ canceled: true, assets: null });
        return;
      }
      const assets = files.map((file) => ({
        uri: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        mimeType: file.type,
        file,
      }));
      resolve({ canceled: false, assets });
    };

    // User dismissed the picker
    window.addEventListener('focus', function onFocus() {
      window.removeEventListener('focus', onFocus);
      setTimeout(() => {
        if (!input.files?.length) resolve({ canceled: true, assets: null });
      }, 500);
    });

    input.click();
  });
};

export const DocumentPickerAsset = {};
export default { getDocumentAsync };
