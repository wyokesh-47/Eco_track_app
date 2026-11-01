import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useBinWifiSensor } from './useBinWifiSensor';

export default function App() {
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'alerts' | 'bins'
  const [sensorAddress, setSensorAddress] = useState('');
  const wifiSensor = useBinWifiSensor(activeTab === 'home');
  const [bins, setBins] = useState([
    { id: 'bin-01', name: 'Bin 01', address: 'Main Road', waste: 'Dry waste', fill: 0, state: 'normal', time: 'Waiting for sensor' },
    { id: 'bin-02', name: 'Bin 02', address: 'TRP Area', waste: 'Wet waste', fill: 42, state: 'normal', time: 'Now' },
    { id: 'bin-03', name: 'Bin 03', address: 'Science Block', waste: 'Wet waste', fill: 12, state: 'collected', time: '10:30 AM' }
  ]);
  const [collectedCount, setCollectedCount] = useState(16);
  const [notice, setNotice] = useState('');

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [binName, setBinName] = useState('');
  const [binAddress, setBinAddress] = useState('');
  const [wasteType, setWasteType] = useState('Dry waste');
  const [fillPercent, setFillPercent] = useState('0');

  useEffect(() => {
    if (!wifiSensor.reading) return;
    setBins(previousBins => previousBins.map(bin => bin.id === 'bin-01'
      ? {
          ...bin,
          fill: Math.round(wifiSensor.reading.fillPercent),
          state: wifiSensor.reading.alert ? 'alert' : 'normal',
          time: 'Just now'
        }
      : bin
    ));
  }, [wifiSensor.reading]);

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 4000);
  };

  const handleSimulateAlert = () => {
    if (wifiSensor.status === 'connected' || wifiSensor.status === 'connecting') {
      showNotice('Disconnect the live sensor before using the demo alert action.');
      return;
    }
    setBins(prev => prev.map(bin => {
      if (bin.id === 'bin-01') {
        return { ...bin, fill: 85, state: 'alert', time: 'Just now' };
      }
      return bin;
    }));
    showNotice('Bin 01 reached 85%. Sensor alert triggered.');
  };

  const handleCollect = () => {
    if (wifiSensor.status === 'connected' || wifiSensor.status === 'connecting') {
      showNotice('Disconnect the live sensor before using the demo collection action.');
      return;
    }
    setBins(prev => prev.map(bin => {
      if (bin.id === 'bin-01') {
        return { ...bin, fill: 12, state: 'collected', time: 'Just now' };
      }
      return bin;
    }));
    setCollectedCount(c => c + 1);
    showNotice('Bin 01 collection completed at Main Road. Sensor reset to 12%.');
  };

  const handleStartEdit = (bin) => {
    setEditingId(bin.id);
    setBinName(bin.name);
    setBinAddress(bin.address);
    setWasteType(bin.waste);
    setFillPercent(String(bin.fill));
    setActiveTab('bins');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setBinName('');
    setBinAddress('');
    setWasteType('Dry waste');
    setFillPercent('0');
  };

  const handleDeleteBin = (id, name) => {
    Alert.alert('Delete Bin', `Are you sure you want to delete ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setBins(prev => prev.filter(b => b.id !== id));
          if (editingId === id) handleCancelEdit();
          showNotice(`${name} deleted.`);
        }
      }
    ]);
  };

  const handleSaveBin = () => {
    if (!binName.trim() || !binAddress.trim()) {
      Alert.alert('Required', 'Please enter bin name and address.');
      return;
    }
    const fillVal = Math.max(0, Math.min(100, parseInt(fillPercent, 10) || 0));
    const stateVal = fillVal >= 80 ? 'alert' : fillVal <= 15 ? 'collected' : 'normal';

    if (editingId) {
      setBins(prev => prev.map(b => (b.id === editingId ? {
        ...b,
        name: binName.trim(),
        address: binAddress.trim(),
        waste: wasteType,
        fill: fillVal,
        state: stateVal,
        time: 'Just updated'
      } : b)));
      showNotice(`${binName} updated.`);
    } else {
      const newBin = {
        id: 'bin-' + Date.now(),
        name: binName.trim(),
        address: binAddress.trim(),
        waste: wasteType,
        fill: fillVal,
        state: stateVal,
        time: 'Just added'
      };
      setBins(prev => [newBin, ...prev]);
      showNotice(`${binName} added at ${binAddress}.`);
    }
    handleCancelEdit();
  };

  const highFillBins = bins.filter(b => b.fill >= 80);
  const heroBin = bins.find(bin => bin.id === 'bin-01') ||
    [...bins].sort((a, b) => b.fill - a.fill)[0] || {
    name: 'No bins',
    address: 'Campus',
    waste: 'None',
    fill: 0,
    state: 'normal'
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f6f2" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.leafIcon}>
            <View style={styles.leafVein} />
          </View>
          <Text style={styles.brandTitle}>EcoTrack</Text>
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {notice ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}

        {/* 1. DASHBOARD SCREEN */}
        {activeTab === 'home' && (
          <View>
            <View style={styles.welcome}>
              <Text style={styles.welcomeSub}>CAMPUS WASTE MONITORING</Text>
              <Text style={styles.welcomeMain}>Good morning, Team</Text>
            </View>

            {/* Status Card */}
            <View style={styles.statusCard}>
              <View style={styles.statusTop}>
                <Text style={styles.statusTopText}>Bin status</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {wifiSensor.status === 'connected'
                      ? heroBin.fill >= 80 ? 'Collection alert' : 'Live monitoring'
                      : wifiSensor.status === 'error' ? 'Sensor read error'
                      : wifiSensor.reading ? 'Last reading · disconnected'
                      : 'Sensor not connected'}
                  </Text>
                </View>
              </View>

              <View style={styles.statusMain}>
                <View style={styles.gauge}>
                  <View style={styles.gaugeInner}>
                    <Text style={styles.gaugeValue}>{wifiSensor.reading ? `${heroBin.fill}%` : '--'}</Text>
                    <Text style={styles.gaugeLabel}>Bin full</Text>
                  </View>
                </View>
                <View style={styles.statusCopy}>
                  <Text style={styles.statusTitle}>
                    {wifiSensor.status === 'connected'
                      ? heroBin.fill >= 80 ? `${heroBin.name} needs collection` : `${heroBin.name} is normal`
                      : wifiSensor.reading ? `${heroBin.name} · last reading` : 'Connect Bin 01 sensor'}
                  </Text>
                  <Text style={styles.statusDesc}>
                    {wifiSensor.reading
                      ? `${heroBin.address} · ${heroBin.waste}. ${heroBin.fill >= 80 ? 'The bin is over the 80% alert threshold.' : 'Fill level from the sensor.'}`
                      : 'Enter the ESP32 IP below. The fill percentage appears after the first sensor reading.'}
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: wifiSensor.reading ? `${heroBin.fill}%` : '0%' }]} />
              </View>
            </View>

            <View style={styles.sensorCard}>
              <View style={styles.sensorHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sensorTitle}>Connect Bin 01 over Wi-Fi</Text>
                  <Text style={styles.sensorStatus}>
                    {wifiSensor.status === 'connecting' ? 'Connecting to the ESP32…'
                      : wifiSensor.status === 'connected' ? 'Connected · live updates every 2 seconds'
                      : wifiSensor.status === 'error' ? 'Sensor connection/read error'
                      : wifiSensor.reading ? 'Disconnected · showing last received reading'
                      : 'Not connected · no sensor reading yet'}
                  </Text>
                </View>
                <Text style={styles.sensorValue}>
                  {wifiSensor.reading ? `${Math.round(wifiSensor.reading.fillPercent)}%` : '--'}
                </Text>
              </View>
              {wifiSensor.reading ? (
                <Text style={styles.sensorDistance}>
                  Distance: {wifiSensor.reading.distanceCm.toFixed(1)} cm · Last reading: {new Date(wifiSensor.reading.receivedAt).toLocaleTimeString()}
                </Text>
              ) : null}
              {wifiSensor.error ? <Text style={styles.sensorError}>{wifiSensor.error}</Text> : null}
              <Text style={styles.sensorHelp}>
                Keep this phone and the ESP32 on the same Wi-Fi network. Enter the ESP32 IP shown in Serial Monitor.
              </Text>
              <Text style={styles.sensorInputLabel}>ESP32 IP address or /reading URL</Text>
              <TextInput
                style={styles.sensorInput}
                value={sensorAddress}
                onChangeText={setSensorAddress}
                placeholder="Example: 192.168.1.25"
                placeholderTextColor="#99a69f"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={wifiSensor.status !== 'connected' && wifiSensor.status !== 'connecting'}
              />
              <View style={styles.sensorActions}>
                <TouchableOpacity
                  style={[styles.sensorButton, wifiSensor.status === 'connecting' || wifiSensor.status === 'connected' ? styles.sensorButtonDisabled : null]}
                  onPress={() => wifiSensor.connect(sensorAddress)}
                  disabled={wifiSensor.status === 'connecting' || wifiSensor.status === 'connected'}
                >
                  <Text style={styles.sensorButtonText}>
                    {wifiSensor.status === 'error' ? 'Try again' : 'Connect sensor'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sensorButton, styles.sensorDisconnectButton, wifiSensor.status === 'disconnected' ? styles.sensorButtonDisabled : null]}
                  onPress={() => {
                    wifiSensor.disconnect();
                  }}
                  disabled={wifiSensor.status === 'disconnected'}
                >
                  <Text style={[styles.sensorButtonText, styles.sensorDisconnectText]}>Disconnect</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Summary Metrics */}
            <View style={styles.summaryRow}>
              <View style={styles.metricCard}>
                <View style={styles.metricIconWrap}>
                  <Text style={styles.metricIconEmoji}>🗑️</Text>
                </View>
                <Text style={styles.metricLabel}>Active bins</Text>
                <Text style={styles.metricValue}>{String(bins.length).padStart(2, '0')}</Text>
              </View>
              <View style={styles.metricCard}>
                <View style={styles.metricIconWrap}>
                  <Text style={styles.metricIconEmoji}>✅</Text>
                </View>
                <Text style={styles.metricLabel}>Today collected</Text>
                <Text style={styles.metricValue}>{collectedCount}</Text>
              </View>
            </View>

            {/* Recent Activity */}
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Recent activity</Text>
              <TouchableOpacity onPress={() => setActiveTab('alerts')}>
                <Text style={styles.sectionAction}>View alerts</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.activityList}>
              {bins.map((bin, index) => (
                <View key={bin.id} style={[styles.activityItem, index === bins.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={[styles.activityIconCircle, bin.fill >= 80 && styles.activityAlertCircle]}>
                    <Text style={[styles.activityIconText, bin.fill >= 80 && { color: '#b56d1c' }]}>
                      {bin.state === 'collected' ? '✓' : bin.fill >= 80 ? '!' : '●'}
                    </Text>
                  </View>
                  <View style={styles.activityDetails}>
                    <Text style={styles.activityTitle}>
                      {bin.id === 'bin-01' && !wifiSensor.reading
                        ? 'Waiting for a live sensor reading'
                        : bin.state === 'collected' ? `Collected – ${bin.waste}` : bin.fill >= 80 ? `Alert – ${bin.name} is ${bin.fill}% full` : `${bin.name} is normal`}
                    </Text>
                    <Text style={styles.activitySub}>
                      {bin.waste} · {bin.id === 'bin-01' && !wifiSensor.reading ? 'No reading' : `Sensor: ${bin.fill}%`}
                    </Text>
                    <Text style={styles.activityLocation}>Location: {bin.address}</Text>
                  </View>
                  <Text style={styles.activityTime}>{bin.time}</Text>
                </View>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleSimulateAlert}>
                <Text style={styles.secondaryBtnText}>Simulate 80% alert</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleCollect}>
                <Text style={styles.primaryBtnText}>Mark as collected</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 2. ALERTS SCREEN */}
        {activeTab === 'alerts' && (
          <View>
            <View style={styles.welcome}>
              <Text style={styles.welcomeSub}>LIVE MONITORING · CAMPUS NETWORK</Text>
              <Text style={styles.welcomeMain}>Alerts</Text>
            </View>

            <View style={styles.alertOverviewCard}>
              <View style={styles.alertOverviewIcon}>
                <Text style={{ fontSize: 20, color: '#b56d1c', fontWeight: 'bold' }}>!</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertOverviewTitle}>
                  {highFillBins.length ? `${highFillBins.length} bin(s) need attention` : 'All clear'}
                </Text>
                <Text style={styles.alertOverviewSub}>
                  {highFillBins.length ? 'Collection routes recommended.' : 'Campus bins are within safe capacity.'}
                </Text>
              </View>
            </View>

            {highFillBins.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No active fill alerts. All campus bins are looking good!</Text>
              </View>
            ) : (
              highFillBins.map(bin => (
                <View key={bin.id} style={styles.alertCard}>
                  <View style={styles.alertCardTop}>
                    <View style={styles.alertCardIcon}>
                      <Text style={{ color: '#b56d1c', fontWeight: 'bold', fontSize: 16 }}>!</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.alertCardName}>{bin.name} · {bin.fill}% full</Text>
                      <Text style={styles.alertCardDesc}>{bin.address} · {bin.waste}</Text>
                    </View>
                    <View style={styles.alertBadge}>
                      <Text style={styles.alertBadgeText}>HIGH FILL</Text>
                    </View>
                  </View>
                  <View style={styles.alertProgressTrack}>
                    <View style={[styles.alertProgressFill, { width: `${bin.fill}%` }]} />
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* 3. BINS SCREEN */}
        {activeTab === 'bins' && (
          <View>
            <View style={styles.welcome}>
              <Text style={styles.welcomeSub}>CAMPUS ASSETS</Text>
              <Text style={styles.welcomeMain}>Bins Management</Text>
            </View>

            {/* Bin Cards List */}
            {bins.map(bin => (
              <View key={bin.id} style={styles.binCard}>
                <View style={styles.binDot}>
                  <Text style={{ fontSize: 18 }}>♲</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.binCardTitle}>{bin.name}</Text>
                  <Text style={styles.binCardSub}>{bin.address} · {bin.waste}</Text>
                </View>
                <Text style={[styles.binCardPercent, bin.fill >= 80 && { color: '#c77a28' }]}>
                  {bin.id === 'bin-01' && !wifiSensor.reading ? '--' : `${bin.fill}%`}
                </Text>
                
                <View style={{ flexDirection: 'row', marginLeft: 10 }}>
                  <TouchableOpacity onPress={() => handleStartEdit(bin)} style={styles.miniBtn}>
                    <Text style={{ fontSize: 12, color: '#14734f', fontWeight: 'bold' }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteBin(bin.id, bin.name)} style={[styles.miniBtn, { marginLeft: 6 }]}>
                    <Text style={{ fontSize: 12, color: '#bb493c', fontWeight: 'bold' }}>Del</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Add / Edit Form */}
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>{editingId ? `Edit ${binName || 'Bin'}` : 'Add a new bin'}</Text>
              
              <Text style={styles.formLabel}>Bin name</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Example: Bin 04"
                value={binName}
                onChangeText={setBinName}
                placeholderTextColor="#99a69f"
              />

              <Text style={styles.formLabel}>Location / Address</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Example: Science Library"
                value={binAddress}
                onChangeText={setBinAddress}
                placeholderTextColor="#99a69f"
              />

              <Text style={styles.formLabel}>Waste Type</Text>
              <View style={styles.typeSelector}>
                {['Dry waste', 'Wet waste', 'Recyclables', 'Hazardous'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typePill, wasteType === type && styles.typePillActive]}
                    onPress={() => setWasteType(type)}
                  >
                    <Text style={[styles.typePillText, wasteType === type && styles.typePillTextActive]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>Sensor fill percentage (0-100)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="0"
                keyboardType="numeric"
                value={fillPercent}
                onChangeText={setFillPercent}
                placeholderTextColor="#99a69f"
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveBin}>
                <Text style={styles.submitBtnText}>{editingId ? 'Save Changes' : 'Add Bin Details'}</Text>
              </TouchableOpacity>

              {editingId ? (
                <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelEdit}>
                  <Text style={styles.cancelBtnText}>Cancel Edit</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FLOATING PILL BOTTOM NAVIGATION (EXACT SCREENSHOT DESIGN) */}
      <View style={styles.bottomNavContainer}>
        <View style={styles.bottomNav}>
          {/* Dashboard Tab */}
          <TouchableOpacity
            style={[styles.navItem, activeTab === 'home' && styles.navItemActive]}
            onPress={() => setActiveTab('home')}
            activeOpacity={0.8}
          >
            <View style={styles.navIcon}>
              <Svg width={22} height={22} viewBox="0 0 48 48">
                <Path
                  d="m5 21 19-16 19 16M10 19v23h28V19M19 42V29h10v13"
                  fill="none"
                  stroke="#288c5c"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M19 34c1-8 7-12 16-11-1 8-6 13-16 12m3-1 9-8"
                  fill="#63b947"
                  stroke="#fff"
                  strokeWidth={0.8}
                />
              </Svg>
            </View>
            <Text style={[styles.navText, activeTab === 'home' && styles.navTextActive]}>
              Dashboard
            </Text>
          </TouchableOpacity>

          {/* Alerts Tab */}
          <TouchableOpacity
            style={[styles.navItem, activeTab === 'alerts' && styles.navItemActive]}
            onPress={() => setActiveTab('alerts')}
            activeOpacity={0.8}
          >
            <View style={styles.navIcon}>
              <Svg width={22} height={22} viewBox="0 0 48 48">
                <Path
                  d="m10 11-4-3m4 10-5-1m28-6 4-4m-4 14 5-2"
                  fill="none"
                  stroke="#79bf42"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                <Path
                  d="M14 30c2-3 2-7 2-12a8 8 0 0 1 16 0c0 5 0 9 2 12l3 4H11zm9 4a3 3 0 0 0 6 0M22 8a2 2 0 0 1 4 0"
                  fill="none"
                  stroke="#526660"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <Text style={[styles.navText, activeTab === 'alerts' && styles.navTextActive]}>
              Alerts
            </Text>
          </TouchableOpacity>

          {/* Bins Tab */}
          <TouchableOpacity
            style={[styles.navItem, activeTab === 'bins' && styles.navItemActive]}
            onPress={() => setActiveTab('bins')}
            activeOpacity={0.8}
          >
            <View style={styles.navIcon}>
              <Svg width={22} height={22} viewBox="0 0 48 48">
                <Path
                  d="M9 15h30l-3 28H12zm-3-4h36v4H6zm10-5h16l3 5H13z"
                  fill="#36a16b"
                />
                <Path
                  d="m19 25 3-5 3 1m5 2 3 5-3 1m-9 4h-5l-1-4m5 3 3-5m1 3 3 4h-6"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M36 9c0-5 4-8 9-8 0 6-3 10-9 10m-1 3c-4-3-4-7-2-11 5 3 6 7 3 11"
                  fill="#79bf42"
                />
              </Svg>
            </View>
            <Text style={[styles.navText, activeTab === 'bins' && styles.navTextActive]}>
              Bins
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f6f2',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center'
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  leafIcon: {
    width: 15,
    height: 11,
    borderTopLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: '#47ad58',
    transform: [{ rotate: '-33deg' }],
    marginRight: 8,
    position: 'relative'
  },
  leafVein: {
    width: 2,
    height: 13,
    backgroundColor: '#e1f2e3',
    left: 7,
    top: -1,
    transform: [{ rotate: '35deg' }]
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#14734f',
    letterSpacing: -1.2
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 10
  },
  welcome: {
    marginVertical: 14
  },
  welcomeSub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#718078',
    letterSpacing: 0.6,
    textTransform: 'uppercase'
  },
  welcomeMain: {
    fontSize: 28,
    fontWeight: '800',
    color: '#172b22',
    letterSpacing: -1.2,
    marginTop: 2
  },
  statusCard: {
    backgroundColor: '#14734f',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#0e5639',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4
  },
  sensorCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#e6ece7'
  },
  sensorHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  sensorTitle: {
    fontSize: 14,
    fontWeight: '750',
    color: '#172b22'
  },
  sensorStatus: {
    fontSize: 11,
    color: '#718078',
    marginTop: 3
  },
  sensorValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#14734f',
    marginLeft: 12
  },
  sensorDistance: {
    fontSize: 11,
    color: '#718078',
    marginTop: 10
  },
  sensorError: {
    fontSize: 11,
    lineHeight: 16,
    color: '#bb493c',
    marginTop: 8
  },
  sensorHelp: {
    fontSize: 11,
    lineHeight: 16,
    color: '#718078',
    marginTop: 10
  },
  sensorInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#718078',
    marginTop: 12,
    marginBottom: 5
  },
  sensorInput: {
    height: 42,
    borderWidth: 1,
    borderColor: '#d6e2db',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#172b22'
  },
  sensorActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12
  },
  sensorButton: {
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#14734f',
    borderRadius: 11,
    paddingHorizontal: 10
  },
  sensorButtonDisabled: {
    opacity: 0.45
  },
  sensorButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '750'
  },
  sensorDisconnectButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#c9ddcf'
  },
  sensorDisconnectText: {
    color: '#14734f'
  },
  statusTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statusTopText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700'
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700'
  },
  statusMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18
  },
  gauge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  gaugeInner: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#176448',
    justifyContent: 'center',
    alignItems: 'center'
  },
  gaugeValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800'
  },
  gaugeLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 9,
    marginTop: 2
  },
  statusCopy: {
    flex: 1,
    marginLeft: 18
  },
  statusTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4
  },
  statusDesc: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    lineHeight: 16
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#d8f1d9',
    borderRadius: 999
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e6ece7'
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#edf5ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  metricIconEmoji: {
    fontSize: 16
  },
  metricLabel: {
    fontSize: 11,
    color: '#718078',
    fontWeight: '600'
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#172b22',
    marginTop: 2
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '750',
    color: '#172b22'
  },
  sectionAction: {
    fontSize: 12,
    fontWeight: '700',
    color: '#14734f'
  },
  activityList: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e6ece7'
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#edf1ed'
  },
  activityIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#eaf4ed',
    justifyContent: 'center',
    alignItems: 'center'
  },
  activityAlertCircle: {
    backgroundColor: '#fbf0e2'
  },
  activityIconText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#14734f'
  },
  activityDetails: {
    flex: 1,
    marginLeft: 12
  },
  activityTitle: {
    fontSize: 12,
    fontWeight: '750',
    color: '#172b22'
  },
  activitySub: {
    fontSize: 10.5,
    color: '#718078',
    marginTop: 2
  },
  activityLocation: {
    fontSize: 10,
    color: '#909f98',
    marginTop: 1
  },
  activityTime: {
    fontSize: 10,
    color: '#909f98'
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#c9ddcf',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center'
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '750',
    color: '#14734f'
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#14734f',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center'
  },
  primaryBtnText: {
    fontSize: 12,
    fontWeight: '750',
    color: '#fff'
  },
  noticeBox: {
    backgroundColor: '#e8f4ec',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12
  },
  noticeText: {
    color: '#0c5037',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center'
  },
  alertOverviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffaf3',
    borderWidth: 1,
    borderColor: '#f0dfc7',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12
  },
  alertOverviewIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fbefdf',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  alertOverviewTitle: {
    fontSize: 14,
    fontWeight: '750',
    color: '#172b22'
  },
  alertOverviewSub: {
    fontSize: 11,
    color: '#718078',
    marginTop: 2
  },
  alertCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f0e5d7',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10
  },
  alertCardTop: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  alertCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fbf0e2',
    justifyContent: 'center',
    alignItems: 'center'
  },
  alertCardName: {
    fontSize: 13,
    fontWeight: '750',
    color: '#172b22'
  },
  alertCardDesc: {
    fontSize: 11,
    color: '#718078',
    marginTop: 2
  },
  alertBadge: {
    backgroundColor: '#fff3e4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999
  },
  alertBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#a76516'
  },
  alertProgressTrack: {
    height: 4,
    backgroundColor: '#f4ede3',
    borderRadius: 999,
    marginTop: 12,
    overflow: 'hidden'
  },
  alertProgressFill: {
    height: '100%',
    backgroundColor: '#d5903e',
    borderRadius: 999
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center'
  },
  emptyText: {
    color: '#718078',
    fontSize: 13,
    textAlign: 'center'
  },
  binCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e6ece7',
    marginBottom: 8
  },
  binDot: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#e8f4ec',
    justifyContent: 'center',
    alignItems: 'center'
  },
  binCardTitle: {
    fontSize: 13,
    fontWeight: '750',
    color: '#172b22'
  },
  binCardSub: {
    fontSize: 11,
    color: '#718078',
    marginTop: 2
  },
  binCardPercent: {
    fontSize: 15,
    fontWeight: '800',
    color: '#14734f'
  },
  miniBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#f6f8f5'
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#e6ece7'
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '750',
    color: '#172b22',
    marginBottom: 12
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#718078',
    marginBottom: 4,
    marginTop: 10
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#d6e2db',
    borderRadius: 10,
    height: 42,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#172b22'
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d6e2db',
    backgroundColor: '#fff'
  },
  typePillActive: {
    backgroundColor: '#eaf5ed',
    borderColor: '#14734f'
  },
  typePillText: {
    fontSize: 11,
    color: '#55675f'
  },
  typePillTextActive: {
    color: '#14734f',
    fontWeight: '750'
  },
  submitBtn: {
    backgroundColor: '#14734f',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '750'
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 6
  },
  cancelBtnText: {
    color: '#718078',
    fontSize: 12,
    fontWeight: '600'
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center'
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    width: '90%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: 'rgba(220, 230, 224, 0.7)',
    shadowColor: '#172b22',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999
  },
  navItemActive: {
    backgroundColor: '#eaf5ed'
  },
  navIcon: {
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center'
  },
  navText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#55675f',
    marginLeft: 7
  },
  navTextActive: {
    color: '#14734f',
    fontWeight: '800'
  }
});
