const envValue = (name) => {
  if (typeof process !== 'undefined' && process.env?.[name] !== undefined) {
    return process.env[name];
  }
  const publicName = name.replace(/^VITE_/, 'NEXT_PUBLIC_');
  if (typeof process !== 'undefined' && process.env?.[publicName] !== undefined) {
    return process.env[publicName];
  }
  if (typeof window !== 'undefined' && window.__env__?.[name] !== undefined) {
    return window.__env__[name];
  }
  return typeof import.meta !== 'undefined' ? import.meta.env?.[name] : undefined;
};

export const getApiBase = () => String(envValue('VITE_API_URL') || '').replace(/\/$/, '');

export const buildApiUrl = (path) => {
  if (/^https?:\/\//i.test(path)) return path;
  const base = getApiBase();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${normalizedPath}` : normalizedPath;
};
