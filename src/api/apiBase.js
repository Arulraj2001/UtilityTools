const envValue = (name) => (
  typeof import.meta !== 'undefined' ? import.meta.env?.[name] : undefined
);

export const getApiBase = () => String(envValue('VITE_API_URL') || '').replace(/\/$/, '');

export const buildApiUrl = (path) => {
  if (/^https?:\/\//i.test(path)) return path;
  const base = getApiBase();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalizedPath}` : normalizedPath;
};
