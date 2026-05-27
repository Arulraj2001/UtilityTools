const API_BASE = (import.meta.env.VITE_CONVERSION_API_BASE || '').replace(/\/$/, '');

export function startDocumentConversion({
  endpoint,
  file,
  mode,
  onUploadProgress,
}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    formData.append('file', file);
    if (mode) formData.append('mode', mode);

    xhr.open('POST', buildUrl(endpoint));
    xhr.responseType = 'json';

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onUploadProgress) return;
      onUploadProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      const payload = normalizeJsonResponse(xhr);
      if (xhr.status >= 200 && xhr.status < 300) {
        if (!payload?.jobId) {
          reject(new Error('Conversion service did not return a job id. Check the API deployment.'));
          return;
        }
        resolve(payload);
        return;
      }
      reject(apiErrorFromPayload(payload, xhr.status));
    };

    xhr.onerror = () => {
      reject(new Error('Could not reach the document conversion service.'));
    };

    xhr.onabort = () => {
      reject(new Error('Upload was cancelled.'));
    };

    xhr.send(formData);
  });
}

export async function getDocumentConversionStatus(jobId) {
  const response = await fetch(buildUrl(`/api/convert/status/${encodeURIComponent(jobId)}`), {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw apiErrorFromPayload(payload, response.status);
  }

  if (!payload?.jobId) {
    throw new Error('Conversion service did not return a job status. Check the API deployment.');
  }

  return payload;
}

function buildUrl(path) {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

function normalizeJsonResponse(xhr) {
  if (xhr.response && typeof xhr.response === 'object') return xhr.response;
  try {
    return JSON.parse(xhr.responseText || '{}');
  } catch {
    return {};
  }
}

function apiErrorFromPayload(payload, status) {
  const message =
    payload?.error?.message ||
    payload?.message ||
    `Conversion service returned HTTP ${status}.`;
  const error = new Error(message);
  error.code = payload?.error?.code || payload?.code || 'CONVERSION_API_ERROR';
  error.status = status;
  return error;
}
