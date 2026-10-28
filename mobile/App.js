import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle } from 'react-native-svg';

const COLORS = {
  green: '#14734f',
  greenDark: '#0c5037',
  ink: '#172b22',
  muted: '#718078',
  line: '#e6ece7',
  mint: '#e8f4ec',
  surface: '#f3f6f2',
  orange: '#b56d1c',
  red: '#bb493c',
  white: '#ffffff',
};

const WASTE_TYPES = ['Dry waste', 'Wet waste', 'Recyclables', 'Hazardous waste'];
const INITIAL_BINS = [
  { id: 'bin-01', name: 'Bin 01', address: 'Main Road', waste: 'Dry waste', fill: 85, state: 'alert', time: 'Now' },
  { id: 'bin-02', name: 'Bin 02', address: 'TRP Area', waste: 'Wet waste', fill: 42, state: 'normal', time: 'Now' },
  { id: 'bin-03', name: 'Bin 03', address: 'Science Block', waste: 'Wet waste', fill: 12, state: 'collected', time: '10:30 AM' },
];

function Icon({ name, size = 20, color = COLORS.muted, family = 'ion' }) {
  const IconSet = family === 'material' ? MaterialCommunityIcons : Ionicons;
  return <IconSet name={name} size={size} color={color} />;
}

function SectionHeading({ title, action, onAction }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.textAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function FillGauge({ fill }) {
  const radius = 43;
  const circumference = 2 * Math.PI * radius;
  return (
    <View style={styles.gauge}>
      <Svg width={102} height={102} viewBox="0 0 102 102" style={StyleSheet.absoluteFill}>
        <Circle cx="51" cy="51" r={radius} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
        <Circle
          cx="51"
          cy="51"
          r={radius}
          fill="none"
          stroke="#d8f1d9"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - fill / 100)}
          rotation="-90"
          origin="51, 51"
        />
      </Svg>
      <View style={styles.gaugeInner}>
        <Text style={styles.gaugeValue}>{fill}%</Text>
        <Text style={styles.gaugeLabel}>BIN FULL</Text>
      </View>
    </View>
  );
}

function MetricCard({ icon, label, value }) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}>
        <Icon name={icon} size={17} color={COLORS.green} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function BinFormModal({ visible, initialBin, onClose, onSave }) {
  const [name, setName] = useState(initialBin?.name || '');
  const [address, setAddress] = useState(initialBin?.address || '');
  const [waste, setWaste] = useState(initialBin?.waste || WASTE_TYPES[0]);
  const [fill, setFill] = useState(String(initialBin?.fill ?? 0));

  function save() {
    const trimmedName = name.trim();
    const trimmedAddress = address.trim();
    const fillNumber = Number(fill);
    if (!trimmedName || !trimmedAddress) {
      Alert.alert('Missing details', 'Add a bin name and location to continue.');
      return;
    }
    if (!Number.isFinite(fillNumber) || fillNumber < 0 || fillNumber > 100) {
      Alert.alert('Invalid fill level', 'Enter a fill percentage from 0 to 100.');
      return;
    }
    onSave({
      name: trimmedName,
      address: trimmedAddress,
      waste,
      fill: fillNumber,
      state: fillNumber >= 80 ? 'alert' : fillNumber <= 15 ? 'collected' : 'normal',
      time: initialBin ? 'Just updated' : 'Just added',
    });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.formSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeading}>
            <View>
              <Text style={styles.eyebrow}>BIN DETAILS</Text>
              <Text style={styles.sheetTitle}>{initialBin ? 'Edit bin' : 'Add a bin'}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton} accessibilityLabel="Close form">
              <Icon name="close" size={20} color={COLORS.muted} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Bin name</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Example: Bin 04" placeholderTextColor="#9aa59f" style={styles.input} />
            <Text style={styles.fieldLabel}>Location / address</Text>
            <TextInput value={address} onChangeText={setAddress} placeholder="Example: Library Entrance" placeholderTextColor="#9aa59f" style={styles.input} />
            <Text style={styles.fieldLabel}>Waste type</Text>
            <View style={styles.choiceWrap}>
              {WASTE_TYPES.map((type) => (
                <Pressable key={type} onPress={() => setWaste(type)} style={[styles.choice, waste === type && styles.choiceSelected]}>
                  <Text style={[styles.choiceText, waste === type && styles.choiceTextSelected]}>{type}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Sensor fill percentage</Text>
            <View style={styles.percentInputWrap}>
              <TextInput value={fill} onChangeText={setFill} keyboardType="number-pad" maxLength={3} style={styles.percentInput} />
              <Text style={styles.percentUnit}>%</Text>
            </View>
            <Pressable style={styles.saveButton} onPress={save}>
              <Text style={styles.saveButtonText}>{initialBin ? 'Save changes' : 'Add bin details'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function EcoTrackApp() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('home');
  const [bins, setBins] = useState(INITIAL_BINS);
  const [collectedCount, setCollectedCount] = useState(16);
  const [notice, setNotice] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [editingBin, setEditingBin] = useState(null);
  const activeAlerts = useMemo(() => bins.filter((bin) => bin.fill >= 80), [bins]);
  const hero = useMemo(() => [...bins].sort((a, b) => b.fill - a.fill)[0], [bins]);

  function updateBin(id, changes) {
    setBins((current) => current.map((bin) => (bin.id === id ? { ...bin, ...changes } : bin)));
  }

  function showBinActions(bin) {
    Alert.alert(bin.name, `${bin.address} · ${bin.waste}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Edit bin', onPress: () => { setEditingBin(bin); setFormVisible(true); } },
      { text: 'Delete bin', style: 'destructive', onPress: () => {
        Alert.alert('Delete bin?', `${bin.name} will be removed from this preview.`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => {
            setBins((current) => current.filter((item) => item.id !== bin.id));
            setNotice(`${bin.name} deleted.`);
          } },
        ]);
      } },
    ]);
  }

  function handleSaveBin(data) {
    if (editingBin) {
      updateBin(editingBin.id, data);
      setNotice(`${data.name} updated.`);
    } else {
      setBins((current) => [...current, { id: `bin-${Date.now()}`, ...data }]);
      setNotice(`${data.name} added at ${data.address}.`);
    }
    setFormVisible(false);
    setEditingBin(null);
  }

  function simulateAlert() {
    const bin = bins.find((item) => item.id === 'bin-01') || bins[0];
    if (!bin) {
      setNotice('Add a bin to preview a fill alert.');
      return;
    }
    updateBin(bin.id, { fill: 85, state: 'alert', time: 'Just now' });
    setNotice(`${bin.name} reached 85%. This is a front-end alert preview.`);
  }

  function markCollected() {
    const bin = bins.find((item) => item.id === 'bin-01') || bins[0];
    if (!bin) {
      setNotice('Add a bin before marking it collected.');
      return;
    }
    updateBin(bin.id, { fill: 12, state: 'collected', time: 'Just now' });
    setCollectedCount((count) => count + 1);
    setNotice(`${bin.name} collection completed. Sensor reset to 12%.`);
  }

  function renderDashboard() {
    return (
      <>
        <View style={styles.welcome}>
          <Text style={styles.eyebrow}>CAMPUS WASTE MONITORING</Text>
          <Text style={styles.pageTitle}>Good morning, Team</Text>
        </View>
        {hero ? (
          <View style={styles.statusCard}>
            <View style={styles.statusTop}>
              <Text style={styles.statusLabel}>Bin status</Text>
              <View style={styles.statusBadge}><Text style={styles.statusBadgeText}>{hero.fill >= 80 ? 'Collection alert' : hero.state === 'collected' ? 'Collected' : 'Monitoring'}</Text></View>
            </View>
            <View style={styles.statusMain}>
              <FillGauge fill={hero.fill} />
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>{hero.fill >= 80 ? `${hero.name} needs collection` : hero.state === 'collected' ? `${hero.name} is ready again` : `${hero.name} is monitoring normally`}</Text>
                <Text style={styles.heroDescription}>{hero.address} · {hero.waste}. {hero.fill >= 80 ? 'The bin is over the 80% alert threshold.' : 'Sensor status is normal.'}</Text>
              </View>
            </View>
            <View style={styles.progressTrack}><View style={[styles.progressValue, { width: `${hero.fill}%` }]} /></View>
          </View>
        ) : (
          <View style={styles.emptyCard}><Text style={styles.emptyTitle}>No bins added yet</Text><Text style={styles.emptyText}>Add a bin to start monitoring your campus.</Text><Pressable style={styles.saveButton} onPress={() => { setEditingBin(null); setFormVisible(true); }}><Text style={styles.saveButtonText}>Add your first bin</Text></Pressable></View>
        )}
        <View style={styles.metricsRow}>
          <MetricCard icon="trash-outline" label="Active bins" value={String(bins.length).padStart(2, '0')} />
          <MetricCard icon="checkmark-circle-outline" label="Today collected" value={String(collectedCount)} />
        </View>
        <SectionHeading title="Recent activity" action="View alerts" onAction={() => { setTab('alerts'); setNotice(''); }} />
        {bins.length ? (
          <View style={styles.activityList}>
            {bins.map((bin) => {
              const isAlert = bin.fill >= 80;
              const isCollected = bin.state === 'collected';
              return (
                <View key={bin.id} style={styles.activityRow}>
                  <View style={[styles.activityIcon, isAlert && styles.activityIconAlert, isCollected && styles.activityIconCollected]}>
                    <Icon name={isAlert ? 'alert' : isCollected ? 'checkmark' : 'ellipse'} size={17} color={isAlert ? COLORS.orange : COLORS.green} />
                  </View>
                  <View style={styles.activityCopy}>
                    <Text style={styles.activityTitle}>{isCollected ? `Collected · ${bin.waste}` : isAlert ? `Alert · ${bin.name} is ${bin.fill}% full` : `${bin.name} is monitoring normally`}</Text>
                    <Text style={styles.activitySub}>{bin.address} · {bin.waste}</Text>
                  </View>
                  <Text style={styles.activityTime}>{bin.time}</Text>
                </View>
              );
            })}
          </View>
        ) : <Text style={styles.emptyText}>No recent activity.</Text>}
        <View style={styles.actionRow}>
          <Pressable style={styles.secondaryButton} onPress={simulateAlert}><Text style={styles.secondaryButtonText}>Simulate alert</Text></Pressable>
          <Pressable style={styles.primaryButton} onPress={markCollected}><Text style={styles.primaryButtonText}>Mark collected</Text></Pressable>
        </View>
        {notice ? <Text style={styles.notice} accessibilityRole="alert">{notice}</Text> : null}
      </>
    );
  }

  function renderAlerts() {
    return (
      <>
        <View style={styles.welcome}>
          <Text style={styles.eyebrow}>LIVE MONITORING · CAMPUS NETWORK</Text>
          <Text style={styles.pageTitle}>Alerts</Text>
        </View>
        <View style={styles.alertOverview}>
          <View style={styles.alertOverviewIcon}><Icon name={activeAlerts.length ? 'alert' : 'checkmark'} size={21} color={activeAlerts.length ? COLORS.orange : COLORS.green} /></View>
          <View style={styles.alertOverviewCopy}>
            <Text style={styles.alertOverviewTitle}>{activeAlerts.length ? `${activeAlerts.length} bin${activeAlerts.length === 1 ? '' : 's'} need${activeAlerts.length === 1 ? 's' : ''} attention` : 'All clear'}</Text>
            <Text style={styles.alertOverviewSubtitle}>Bins that need attention appear here.</Text>
          </View>
        </View>
        {activeAlerts.length ? activeAlerts.map((bin) => (
          <View key={bin.id} style={styles.alertCard}>
            <View style={styles.alertCardTop}>
              <View style={styles.alertCardIcon}><Icon name="alert" size={19} color={COLORS.orange} /></View>
              <View style={styles.alertCardCopy}>
                <Text style={styles.alertCardTitle}>{bin.name} · {bin.fill}% full</Text>
                <Text style={styles.alertCardSubtitle}>{bin.address} · {bin.waste} · Collection needed</Text>
              </View>
              <View style={styles.alertPill}><Text style={styles.alertPillText}>HIGH FILL</Text></View>
            </View>
            <View style={styles.alertMeter}><View style={[styles.alertMeterValue, { width: `${bin.fill}%` }]} /></View>
          </View>
        )) : <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Your campus bins are looking good.</Text><Text style={styles.emptyText}>There are no active fill alerts right now.</Text></View>}
      </>
    );
  }

  function renderBins() {
    return (
      <>
        <View style={styles.welcome}>
          <Text style={styles.eyebrow}>CREATE AND MANAGE BIN DETAILS</Text>
          <Text style={styles.pageTitle}>Bins</Text>
        </View>
        <Pressable style={styles.addButton} onPress={() => { setEditingBin(null); setFormVisible(true); }}>
          <Icon name="add" size={20} color={COLORS.white} />
          <Text style={styles.addButtonText}>Add a bin</Text>
        </Pressable>
        {bins.length ? bins.map((bin) => (
          <Pressable key={bin.id} onPress={() => showBinActions(bin)} style={styles.binCard}>
            <View style={styles.binIcon}><Icon name="recycle" family="material" size={21} color={COLORS.green} /></View>
            <View style={styles.binCardCopy}>
              <Text style={styles.binName}>{bin.name}</Text>
              <Text style={styles.binDetail}>{bin.address} · {bin.waste}</Text>
            </View>
            <Text style={[styles.binPercent, bin.fill >= 80 && styles.binPercentWarning]}>{bin.fill}%</Text>
            <Icon name="ellipsis-vertical" size={18} color={COLORS.muted} />
          </Pressable>
        )) : <View style={styles.emptyCard}><Text style={styles.emptyTitle}>No bins yet</Text><Text style={styles.emptyText}>Add a bin to see its sensor status here.</Text></View>}
        <Text style={styles.helperText}>Tap a bin to edit or delete it.</Text>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      </>
    );
  }

  const tabs = [
    { key: 'home', title: 'Dashboard', icon: 'home-outline' },
    { key: 'alerts', title: 'Alerts', icon: 'notifications-outline' },
    { key: 'bins', title: 'Bins', icon: 'recycle', family: 'material' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={styles.brandBar}>
        <View style={styles.brandMark}><Icon name="leaf" size={18} color={COLORS.white} /></View>
        <Text style={styles.brandText}>EcoTrack</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {tab === 'home' ? renderDashboard() : tab === 'alerts' ? renderAlerts() : renderBins()}
      </ScrollView>
      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {tabs.map((item) => {
          const active = tab === item.key;
          return (
            <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => { setTab(item.key); setNotice(''); }} style={[styles.navItem, active && styles.navItemActive]}>
              <Icon name={item.icon} family={item.family} size={20} color={active ? COLORS.green : '#63746e'} />
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.title}</Text>
            </Pressable>
          );
        })}
      </View>
      <BinFormModal
        key={editingBin?.id || (formVisible ? 'new-bin' : 'closed')}
        visible={formVisible}
        initialBin={editingBin}
        onClose={() => { setFormVisible(false); setEditingBin(null); }}
        onSave={handleSaveBin}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <EcoTrackApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.surface },
  brandBar: { height: 54, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20 },
  brandMark: { width: 29, height: 29, borderRadius: 10, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center' },
  brandText: { color: COLORS.green, fontSize: 20, fontWeight: '800', letterSpacing: -0.8 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 22 },
  welcome: { marginTop: 7, marginBottom: 19 },
  eyebrow: { color: COLORS.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.05, marginBottom: 7 },
  pageTitle: { color: COLORS.ink, fontSize: 29, lineHeight: 35, fontWeight: '800', letterSpacing: -1 },
  statusCard: { padding: 20, borderRadius: 23, backgroundColor: COLORS.green, overflow: 'hidden' },
  statusTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusLabel: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  statusBadge: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(255,255,255,0.12)', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 30 },
  statusBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: '700' },
  statusMain: { flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 18 },
  gauge: { width: 102, height: 102, borderRadius: 51, alignItems: 'center', justifyContent: 'center' },
  gaugeInner: { alignItems: 'center' },
  gaugeValue: { color: COLORS.white, fontSize: 23, fontWeight: '800', letterSpacing: -0.7 },
  gaugeLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 8, fontWeight: '700', marginTop: 4, letterSpacing: 0.6 },
  heroCopy: { flex: 1 },
  heroTitle: { color: COLORS.white, fontSize: 17, lineHeight: 22, fontWeight: '700', marginBottom: 6 },
  heroDescription: { color: 'rgba(255,255,255,0.82)', fontSize: 11, lineHeight: 17 },
  progressTrack: { height: 5, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  progressValue: { height: '100%', backgroundColor: '#d8f1d9', borderRadius: 5 },
  metricsRow: { flexDirection: 'row', gap: 11, marginTop: 15 },
  metricCard: { flex: 1, minHeight: 118, backgroundColor: COLORS.white, borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, padding: 14 },
  metricIcon: { width: 31, height: 31, borderRadius: 10, backgroundColor: COLORS.mint, alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
  metricLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '600' },
  metricValue: { color: COLORS.ink, fontSize: 23, fontWeight: '800', letterSpacing: -0.7, marginTop: 3 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 11 },
  sectionTitle: { color: COLORS.ink, fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  textAction: { color: COLORS.green, fontSize: 11, fontWeight: '700', padding: 4 },
  activityList: { backgroundColor: COLORS.white, borderRadius: 18, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 13 },
  activityRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.line },
  activityIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: COLORS.mint, alignItems: 'center', justifyContent: 'center' },
  activityIconAlert: { backgroundColor: '#fbf0e2' },
  activityIconCollected: { backgroundColor: '#edf4f5' },
  activityCopy: { flex: 1 },
  activityTitle: { color: COLORS.ink, fontSize: 11, lineHeight: 15, fontWeight: '700' },
  activitySub: { color: COLORS.muted, fontSize: 9, lineHeight: 14, marginTop: 3 },
  activityTime: { color: COLORS.muted, fontSize: 9 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 15 },
  secondaryButton: { flex: 1, minHeight: 43, borderRadius: 12, borderWidth: 1, borderColor: '#c9ddcf', backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: COLORS.green, fontSize: 11, fontWeight: '700' },
  primaryButton: { flex: 1, minHeight: 43, borderRadius: 12, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
  notice: { color: COLORS.greenDark, backgroundColor: COLORS.mint, borderRadius: 11, padding: 11, fontSize: 11, lineHeight: 16, marginTop: 11 },
  bottomNav: { minHeight: 59, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 6, paddingTop: 7, paddingHorizontal: 8, borderTopWidth: 1, borderColor: COLORS.line, backgroundColor: 'rgba(255,255,255,0.98)' },
  navItem: { flex: 1, height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 13 },
  navItemActive: { backgroundColor: COLORS.mint },
  navLabel: { color: '#63746e', fontSize: 10, fontWeight: '600' },
  navLabelActive: { color: COLORS.green, fontWeight: '800' },
  alertOverview: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 17, borderWidth: 1, borderColor: '#f0dfc7', backgroundColor: '#fffaf3', padding: 15, marginBottom: 13 },
  alertOverviewIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#fbefdf', alignItems: 'center', justifyContent: 'center' },
  alertOverviewCopy: { flex: 1 },
  alertOverviewTitle: { color: COLORS.ink, fontSize: 13, fontWeight: '700' },
  alertOverviewSubtitle: { color: COLORS.muted, fontSize: 10, marginTop: 4 },
  alertCard: { backgroundColor: COLORS.white, borderRadius: 17, borderWidth: 1, borderColor: '#f0e5d7', padding: 14, marginBottom: 11 },
  alertCardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  alertCardIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#fbf0e2', alignItems: 'center', justifyContent: 'center' },
  alertCardCopy: { flex: 1 },
  alertCardTitle: { color: COLORS.ink, fontSize: 12, fontWeight: '700' },
  alertCardSubtitle: { color: COLORS.muted, fontSize: 9, lineHeight: 14, marginTop: 4 },
  alertPill: { backgroundColor: '#fff3e4', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 6 },
  alertPillText: { color: COLORS.orange, fontSize: 8, fontWeight: '800' },
  alertMeter: { height: 4, borderRadius: 4, backgroundColor: '#f4ede3', overflow: 'hidden', marginTop: 13 },
  alertMeterValue: { height: '100%', borderRadius: 4, backgroundColor: '#d5903e' },
  addButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, backgroundColor: COLORS.green, marginBottom: 13 },
  addButtonText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  binCard: { minHeight: 69, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, borderRadius: 16, paddingHorizontal: 12, marginBottom: 9 },
  binIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: COLORS.mint, alignItems: 'center', justifyContent: 'center' },
  binCardCopy: { flex: 1 },
  binName: { color: COLORS.ink, fontSize: 12, fontWeight: '700' },
  binDetail: { color: COLORS.muted, fontSize: 9, lineHeight: 14, marginTop: 4 },
  binPercent: { color: COLORS.green, fontSize: 14, fontWeight: '800' },
  binPercentWarning: { color: COLORS.orange },
  helperText: { color: COLORS.muted, fontSize: 10, marginTop: 4, textAlign: 'center' },
  emptyCard: { backgroundColor: COLORS.white, borderColor: COLORS.line, borderWidth: 1, borderRadius: 17, padding: 18, marginTop: 4 },
  emptyTitle: { color: COLORS.ink, fontSize: 13, fontWeight: '700' },
  emptyText: { color: COLORS.muted, fontSize: 11, lineHeight: 17, marginTop: 5 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,35,25,0.38)' },
  formSheet: { maxHeight: '90%', backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 28 },
  sheetHandle: { width: 38, height: 4, borderRadius: 4, backgroundColor: '#cbd5cd', alignSelf: 'center', marginVertical: 11 },
  sheetHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { color: COLORS.ink, fontSize: 23, fontWeight: '800', letterSpacing: -0.5 },
  closeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { color: COLORS.ink, fontSize: 11, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  input: { height: 45, borderRadius: 11, borderWidth: 1, borderColor: '#d6e2db', backgroundColor: COLORS.white, paddingHorizontal: 12, color: COLORS.ink, fontSize: 12 },
  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choice: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line },
  choiceSelected: { backgroundColor: COLORS.mint, borderColor: '#b9dbc9' },
  choiceText: { color: COLORS.muted, fontSize: 10, fontWeight: '600' },
  choiceTextSelected: { color: COLORS.green, fontWeight: '700' },
  percentInputWrap: { height: 45, flexDirection: 'row', alignItems: 'center', borderRadius: 11, borderWidth: 1, borderColor: '#d6e2db', backgroundColor: COLORS.white, paddingHorizontal: 12 },
  percentInput: { flex: 1, color: COLORS.ink, fontSize: 13, paddingVertical: 0 },
  percentUnit: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  saveButton: { height: 46, borderRadius: 12, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center', marginTop: 18, marginBottom: 8 },
  saveButtonText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
});
