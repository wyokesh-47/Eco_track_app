import { useCallback, useEffect, useRef, useState } from 'react';

const SENSOR_BIN_ID = 'bin-01';
const POLL_INTERVAL_MS = 2000;
const REQUEST_TIMEOUT_MS = 5000;

function normalizeReadingUrl(input) {
  const value = input.trim();
  if (!value) throw new Error('Enter the ESP32 IP address first.');

  let url;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `http://${value}`);
  } catch {
    throw new Error('Enter a valid ESP32 IP address, such as 192.168.1.25.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('The sensor URL must use HTTP or HTTPS.');
  }
  if (url.pathname === '/') url.pathname = '/reading';
  return url.toString();
}

function validateReading(reading) {
  if (reading?.ok !== true) {
    throw new Error(reading?.error || 'ESP32 did not return a valid sensor reading.');
  }
  if (reading.bin !== SENSOR_BIN_ID) throw new Error('The reading is not for Bin 01.');
  if (!Number.isFinite(reading.distanceCm) || reading.distanceCm <= 0 || reading.distanceCm > 400) {
    throw new Error('ESP32 returned an invalid distance.');
  }
  if (!Number.isFinite(reading.fillPercent) || reading.fillPercent < 0 || reading.fillPercent > 100) {
    throw new Error('ESP32 returned an invalid fill percentage.');
  }
  if (typeof reading.alert !== 'boolean') throw new Error('ESP32 returned an invalid alert status.');

  return {
    distanceCm: reading.distanceCm,
    fillPercent: reading.fillPercent,
    alert: reading.alert,
    receivedAt: Date.now()
  };
}

export function useBinWifiSensor(enabled) {
  const [endpoint, setEndpoint] = useState('');
  const [status, setStatus] = useState('disconnected');
  const [error, setError] = useState('');
  const [reading, setReading] = useState(null);
  const attemptRef = useRef(0);

  const connect = useCallback((input) => {
    let url;
    try {
      url = normalizeReadingUrl(input);
    } catch (validationError) {
      attemptRef.current += 1;
      setEndpoint('');
      setReading(null);
      setStatus('error');
      setError(validationError.message);
      return;
    }

    attemptRef.current += 1;
    setEndpoint(url);
    setReading(null);
    setStatus('connecting');
    setError('');
  }, []);

  const disconnect = useCallback(() => {
    attemptRef.current += 1;
    setEndpoint('');
    setStatus('disconnected');
    setError('');
    setReading(null);
  }, []);

  useEffect(() => {
    if (!endpoint || !enabled) {
      if (endpoint && !enabled) setStatus('disconnected');
      return undefined;
    }

    const attempt = ++attemptRef.current;
    let disposed = false;
    let requestInProgress = false;
    let activeController = null;
    setStatus('connecting');

    const poll = async () => {
      if (disposed || requestInProgress || attempt !== attemptRef.current) return;
      requestInProgress = true;
      const controller = new AbortController();
      activeController = controller;
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(endpoint, { signal: controller.signal });
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body?.error || `ESP32 returned HTTP ${response.status}.`);
        }
        const nextReading = validateReading(body);
        if (disposed || attempt !== attemptRef.current) return;
        setReading(nextReading);
        setStatus('connected');
        setError('');
      } catch (pollError) {
        if (disposed || attempt !== attemptRef.current) return;
        setStatus('error');
        setError(pollError.name === 'AbortError'
          ? 'No response from the ESP32. Check the IP and Wi-Fi network.'
          : pollError.message || 'Could not read the sensor.');
      } finally {
        clearTimeout(timeoutId);
        activeController = null;
        requestInProgress = false;
      }
    };

    poll();
    const intervalId = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      disposed = true;
      clearInterval(intervalId);
      activeController?.abort();
    };
  }, [endpoint, enabled]);

  return { endpoint, status, error, reading, connect, disconnect };
}
