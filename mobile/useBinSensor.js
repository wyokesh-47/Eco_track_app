import { useCallback, useEffect, useRef, useState } from 'react';
import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { Buffer } from 'buffer';
import { BleManager } from 'react-native-ble-plx';

const DEVICE_NAME = 'EcoTrack-Bin01';
const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const READING_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
const SCAN_TIMEOUT_MS = 15000;

function parseReading(encodedValue) {
  if (!encodedValue) throw new Error('The sensor sent an empty reading.');

  let reading;
  try {
    reading = JSON.parse(Buffer.from(encodedValue, 'base64').toString('utf8'));
  } catch {
    throw new Error('The sensor sent invalid JSON.');
  }

  if (reading?.ok !== true) {
    throw new Error(reading?.error || 'The sensor reported that its reading is not ready.');
  }
  if (reading.bin !== 'bin-01') throw new Error('The reading is not for Bin 01.');
  if (!Number.isFinite(reading.distanceCm) || reading.distanceCm <= 0 || reading.distanceCm > 400) {
    throw new Error('The sensor sent an invalid distance.');
  }
  if (!Number.isFinite(reading.fillPercent) || reading.fillPercent < 0 || reading.fillPercent > 100) {
    throw new Error('The sensor sent an invalid fill percentage.');
  }
  if (typeof reading.alert !== 'boolean') throw new Error('The sensor sent an invalid alert status.');

  return {
    distanceCm: reading.distanceCm,
    fillPercent: reading.fillPercent,
    alert: reading.alert,
    receivedAt: Date.now()
  };
}

async function requestBlePermissions() {
  if (Platform.OS !== 'android') return;

  const permissions = Number(Platform.Version) >= 31
    ? [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
      ]
    : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
  const results = await PermissionsAndroid.requestMultiple(permissions);
  const denied = permissions.filter(permission => results[permission] !== PermissionsAndroid.RESULTS.GRANTED);

  if (denied.length) {
    throw new Error('Bluetooth permission was denied. Allow nearby-device access in Android settings and try again.');
  }
}

export function useBinSensor() {
  const managerRef = useRef(null);
  const deviceRef = useRef(null);
  const notificationRef = useRef(null);
  const disconnectRef = useRef(null);
  const scanTimeoutRef = useRef(null);
  const attemptRef = useRef(0);
  const connectInProgressRef = useRef(false);
  const mountedRef = useRef(false);
  const [status, setStatus] = useState('disconnected');
  const [error, setError] = useState('');
  const [reading, setReading] = useState(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      attemptRef.current += 1;
      clearTimeout(scanTimeoutRef.current);
      notificationRef.current?.remove();
      disconnectRef.current?.remove();
      const manager = managerRef.current;
      managerRef.current = null;
      if (!manager) return;
      manager.stopDeviceScan().catch(scanError => {
        console.warn('Could not stop the BLE scan during cleanup:', scanError);
      });
      if (deviceRef.current) {
        manager.cancelDeviceConnection(deviceRef.current.id).catch(disconnectError => {
          console.warn('Could not close the BLE connection during cleanup:', disconnectError);
        });
        deviceRef.current = null;
      }
      manager.destroy().catch(destroyError => {
        console.warn('Could not destroy the BLE manager:', destroyError);
      });
    };
  }, []);

  const disconnect = useCallback(async (quiet = false) => {
    const manager = managerRef.current;
    const disconnectAttempt = ++attemptRef.current;
    clearTimeout(scanTimeoutRef.current);
    notificationRef.current?.remove();
    notificationRef.current = null;
    disconnectRef.current?.remove();
    disconnectRef.current = null;
    const device = deviceRef.current;
    deviceRef.current = null;

    let cleanupError = null;
    if (manager) {
      try {
        await manager.stopDeviceScan();
      } catch (stopError) {
        cleanupError = stopError;
      }
      if (device) {
        try {
          await manager.cancelDeviceConnection(device.id);
        } catch (disconnectError) {
          cleanupError = cleanupError || disconnectError;
        }
      }
    }

    if (!mountedRef.current || disconnectAttempt !== attemptRef.current) return;
    if (cleanupError) {
      if (quiet) console.warn('BLE disconnect cleanup failed:', cleanupError);
      setStatus(quiet ? 'disconnected' : 'error');
      setError(quiet ? '' : 'Could not fully disconnect the sensor: ' + cleanupError.message);
      return;
    }
    setStatus('disconnected');
    setError('');
  }, []);

  const connect = useCallback(async () => {
    if (connectInProgressRef.current) return;
    connectInProgressRef.current = true;
    const cleanup = disconnect(true);
    const cleanupAttempt = attemptRef.current;
    let attempt = null;
    try {
      await cleanup;
      if (cleanupAttempt !== attemptRef.current) return;

      attempt = ++attemptRef.current;
      if (!NativeModules.BlePlx) {
        setStatus('error');
        setError('Bluetooth is not available in this app build. Expo Go does not include BLE; install the EcoTrack development APK built with react-native-ble-plx.');
        return;
      }

      const manager = new BleManager();
      managerRef.current = manager;

      setStatus('scanning');
      setError('');

      await requestBlePermissions();
      if (attempt !== attemptRef.current) return;

      scanTimeoutRef.current = setTimeout(() => {
        if (attempt !== attemptRef.current) return;
        attemptRef.current += 1;
        manager.stopDeviceScan().catch(scanError => {
          console.warn('Could not stop the timed-out BLE scan:', scanError);
        });
        setStatus('error');
        setError('Could not find EcoTrack-Bin01. Make sure the ESP32 is powered on and nearby.');
      }, SCAN_TIMEOUT_MS);

      await manager.startDeviceScan([SERVICE_UUID], null, async (scanError, device) => {
        if (attempt !== attemptRef.current) return;
        if (scanError) {
          clearTimeout(scanTimeoutRef.current);
          attemptRef.current += 1;
          manager.stopDeviceScan().catch(stopError => {
            console.warn('Could not stop the failed BLE scan:', stopError);
          });
          setStatus('error');
          setError('Bluetooth scan failed: ' + scanError.message);
          return;
        }
        if (!device || (device.name !== DEVICE_NAME && device.localName !== DEVICE_NAME)) return;

        const connectionAttempt = ++attemptRef.current;
        clearTimeout(scanTimeoutRef.current);
        manager.stopDeviceScan().catch(stopError => {
          console.warn('Could not stop the BLE scan after finding the sensor:', stopError);
        });
        setError('');

        try {
          const connectedDevice = await device.connect({ timeout: 15000 });
          if (connectionAttempt !== attemptRef.current) {
            manager.cancelDeviceConnection(connectedDevice.id).catch(disconnectError => {
              console.warn('Could not close a stale BLE connection:', disconnectError);
            });
            return;
          }
          deviceRef.current = connectedDevice;
          if (Platform.OS === 'android') await connectedDevice.requestMTU(185);
          if (connectionAttempt !== attemptRef.current) return;
          setStatus('connecting');

          disconnectRef.current = connectedDevice.onDisconnected(disconnectError => {
            if (connectionAttempt !== attemptRef.current) return;
            attemptRef.current += 1;
            notificationRef.current?.remove();
            notificationRef.current = null;
            disconnectRef.current = null;
            deviceRef.current = null;
            setStatus(disconnectError ? 'error' : 'disconnected');
            setError(disconnectError
              ? 'Bluetooth connection lost: ' + disconnectError.message
              : 'The ESP32 disconnected.');
          });

          const discoveredDevice = await connectedDevice.discoverAllServicesAndCharacteristics();
          if (connectionAttempt !== attemptRef.current) return;

          notificationRef.current = discoveredDevice.monitorCharacteristicForService(
            SERVICE_UUID,
            READING_UUID,
            (readingError, characteristic) => {
              if (connectionAttempt !== attemptRef.current) return;
              if (readingError) {
                setStatus('error');
                setError('Could not receive sensor notifications: ' + readingError.message);
                return;
              }

              try {
                const nextReading = parseReading(characteristic?.value);
                setReading(nextReading);
                setStatus('connected');
                setError('');
              } catch (readingParseError) {
                setStatus('error');
                setError(readingParseError.message);
              }
            }
          );
        } catch (connectionError) {
          if (connectionAttempt !== attemptRef.current) return;
          notificationRef.current?.remove();
          notificationRef.current = null;
          disconnectRef.current?.remove();
          disconnectRef.current = null;
          const connectedDevice = deviceRef.current;
          deviceRef.current = null;
          let cleanupMessage = '';
          if (connectedDevice) {
            try {
              await manager.cancelDeviceConnection(connectedDevice.id);
            } catch (cleanupError) {
              cleanupMessage = ' Cleanup also failed: ' + cleanupError.message;
            }
          }
          setStatus('error');
          setError('Could not connect to the sensor: ' + connectionError.message + cleanupMessage);
        }
      });
    } catch (permissionOrScanError) {
      if (attempt !== null && attempt !== attemptRef.current) return;
      clearTimeout(scanTimeoutRef.current);
      managerRef.current?.stopDeviceScan().catch(scanError => {
        console.warn('Could not stop the BLE scan after a startup error:', scanError);
      });
      setStatus('error');
      setError(permissionOrScanError.message || 'Could not start Bluetooth scanning.');
    } finally {
      connectInProgressRef.current = false;
    }
  }, [disconnect]);

  return { status, error, reading, connect, disconnect };
}
