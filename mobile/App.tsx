import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Circle, Marker, PROVIDER_DEFAULT, Region } from 'react-native-maps';

type Category = 'pericolo' | 'furto' | 'evento' | 'sanitario';
type Report = {
  id: string;
  coord: { latitude: number; longitude: number };
  category: Category;
  createdAt: number;
  kind: 'report' | 'sos';
  address: string;
  note: string;
  viewedBy: number;
  seenByMe: boolean;
  mine: boolean;
  confirmedBy: number;
  disputedBy: number;
};
type Toast = { message: string; actionLabel?: string; onAction?: () => void } | null;
type Screen = 'login' | 'onboarding' | 'spid' | 'map';
type PlaceLabel = 'Casa' | 'Ufficio' | 'Casa vacanza' | 'Altro';
type SavedPlace = {
  id: string;
  label: PlaceLabel;
  address: string;
  coord: { latitude: number; longitude: number };
  notificationsEnabled: boolean;
};
type NominatimAddress = {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  postcode?: string;
  country?: string;
};
type Suggestion = {
  display_name: string;
  lat: string;
  lon: string;
  address?: NominatimAddress;
  enrichedDisplay?: string;
  hasCivic?: boolean;
};
type SpidProvider = { id: string; name: string; color: string };
type ContactStatus = 'invited' | 'verified' | 'pending';
type TrustedContact = {
  id: string;
  name: string;
  email: string;
  status: ContactStatus;
  canVerifyAddresses: boolean;
};

const FALLBACK_POS = { latitude: 41.9028, longitude: 12.4964 };
const ALERT_RADIUS_M = 50;
const NOTIFICATION_AREA_M = 80;

const CATEGORY_COLOR: Record<Category, string> = {
  pericolo: '#E53935',
  furto: '#FB8C00',
  evento: '#1E88E5',
  sanitario: '#43A047',
};

const CATEGORY_LABEL: Record<Category, string> = {
  pericolo: 'Pericolo',
  furto: 'Furto',
  evento: 'Evento',
  sanitario: 'Sanitario',
};

const CATEGORY_ICON: Record<Category, keyof typeof Ionicons.glyphMap> = {
  pericolo: 'warning',
  furto: 'alert-circle',
  evento: 'megaphone',
  sanitario: 'medkit',
};

const PLACE_LABELS: PlaceLabel[] = ['Casa', 'Ufficio', 'Casa vacanza', 'Altro'];
const PLACE_LABEL_ICON: Record<PlaceLabel, keyof typeof Ionicons.glyphMap> = {
  Casa: 'home',
  Ufficio: 'briefcase',
  'Casa vacanza': 'airplane',
  Altro: 'location',
};

const SPID_PROVIDERS: SpidProvider[] = [
  { id: 'aruba', name: 'Aruba ID', color: '#1F8A3E' },
  { id: 'poste', name: 'PosteID', color: '#003DA5' },
  { id: 'tim', name: 'TIM id', color: '#0066CC' },
  { id: 'infocert', name: 'InfoCert ID', color: '#E4002B' },
  { id: 'namirial', name: 'Namirial ID', color: '#223A70' },
  { id: 'sielte', name: 'Sielte ID', color: '#F15A22' },
];

const INITIAL_TRUSTED: TrustedContact[] = [
  {
    id: 't1',
    name: 'Giulia Rossi',
    email: 'giulia.rossi@email.it',
    status: 'verified',
    canVerifyAddresses: true,
  },
  {
    id: 't2',
    name: 'Marco Bianchi',
    email: 'marco.b@email.com',
    status: 'pending',
    canVerifyAddresses: false,
  },
];

function buildInitialReports(center: { latitude: number; longitude: number }): Report[] {
  const base = Date.now();
  return [
    {
      id: '1',
      coord: { latitude: center.latitude + 0.0002, longitude: center.longitude + 0.0002 },
      category: 'pericolo',
      createdAt: base - 8 * 60 * 1000,
      kind: 'report',
      address: 'Via del Corso 112, Roma',
      note: 'Gruppo sospetto vicino al parcheggio, sembrano controllare le auto parcheggiate.',
      viewedBy: 12,
      seenByMe: false,
      mine: false,
      confirmedBy: 0,
      disputedBy: 0,
    },
    {
      id: '2',
      coord: { latitude: center.latitude - 0.0003, longitude: center.longitude - 0.0004 },
      category: 'furto',
      createdAt: base - 45 * 60 * 1000,
      kind: 'report',
      address: 'Piazza Venezia 5, Roma',
      note: 'Tentativo di furto ad una bici legata al palo di fronte al bar.',
      viewedBy: 34,
      seenByMe: false,
      mine: false,
      confirmedBy: 0,
      disputedBy: 0,
    },
    {
      id: '3',
      coord: { latitude: center.latitude + 0.0018, longitude: center.longitude + 0.0022 },
      category: 'evento',
      createdAt: base - 2 * 60 * 60 * 1000,
      kind: 'report',
      address: 'Piazza del Popolo, Roma',
      note: 'Assembramento per concerto, attenzione al traffico e ai vicoli laterali bloccati.',
      viewedBy: 0,
      seenByMe: false,
      mine: false,
      confirmedBy: 0,
      disputedBy: 0,
    },
    {
      id: '4',
      coord: { latitude: center.latitude + 0.0009, longitude: center.longitude - 0.0012 },
      category: 'sanitario',
      createdAt: base - 22 * 60 * 1000,
      kind: 'report',
      address: 'Via Nazionale 89, Roma',
      note: 'Persona che ha avuto un malore in strada, ambulanza arrivata in 5 minuti.',
      viewedBy: 8,
      seenByMe: false,
      mine: false,
      confirmedBy: 0,
      disputedBy: 0,
    },
    {
      id: '5',
      coord: { latitude: center.latitude - 0.0014, longitude: center.longitude + 0.0008 },
      category: 'pericolo',
      createdAt: base - 3 * 60 * 60 * 1000,
      kind: 'report',
      address: 'Viale Trastevere 201, Roma',
      note: 'Bottiglia di vetro rotta sul marciapiede davanti alla scuola, attenzione ai bambini.',
      viewedBy: 5,
      seenByMe: false,
      mine: false,
      confirmedBy: 0,
      disputedBy: 0,
    },
    {
      id: '6',
      coord: { latitude: center.latitude + 0.0025, longitude: center.longitude - 0.0005 },
      category: 'furto',
      createdAt: base - 6 * 60 * 60 * 1000,
      kind: 'report',
      address: 'Via Cavour 222, Roma',
      note: 'Scooter rubato tra le 14 e le 16, modello Vespa blu targa in gergo "AZ".',
      viewedBy: 47,
      seenByMe: false,
      mine: false,
      confirmedBy: 0,
      disputedBy: 0,
    },
    {
      id: '7',
      coord: { latitude: center.latitude - 0.0021, longitude: center.longitude - 0.0015 },
      category: 'evento',
      createdAt: base - 5 * 60 * 60 * 1000,
      kind: 'report',
      address: 'Via dei Fori Imperiali, Roma',
      note: 'Manifestazione in corso, strade chiuse fino alle 20. Evitare zona.',
      viewedBy: 112,
      seenByMe: false,
      mine: false,
      confirmedBy: 0,
      disputedBy: 0,
    },
    {
      id: '8',
      coord: { latitude: center.latitude + 0.0004, longitude: center.longitude + 0.0030 },
      category: 'pericolo',
      createdAt: base - 30 * 60 * 1000,
      kind: 'report',
      address: 'Largo Argentina 8, Roma',
      note: 'Auto che sfreccia nella ZTL in senso contrario, presente cartello di passaggio.',
      viewedBy: 3,
      seenByMe: false,
      mine: false,
      confirmedBy: 0,
      disputedBy: 0,
    },
    {
      id: 'mine-demo',
      coord: { latitude: center.latitude - 0.0006, longitude: center.longitude + 0.0005 },
      category: 'evento',
      createdAt: base - 26 * 60 * 60 * 1000,
      kind: 'report',
      address: 'La tua zona',
      note: 'Cantiere aperto sul marciapiede davanti al portone, il passaggio è stretto.',
      viewedBy: 47,
      seenByMe: true,
      mine: true,
      confirmedBy: 9,
      disputedBy: 1,
    },
  ];
}

const CENTER_EPSILON = 0.0002;

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ora';
  if (m < 60) return `${m}m fa`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h fa`;
  const d = Math.floor(h / 24);
  return `${d}g fa`;
}

function enrichSuggestion(s: Suggestion, userQuery: string): Suggestion {
  const userCivicMatch = userQuery.match(/\b(\d+[A-Za-z]?)\b/);
  const userCivic = userCivicMatch?.[1] ?? null;
  const addr = s.address;
  const civic = addr?.house_number ?? userCivic;
  if (!addr) {
    return { ...s, enrichedDisplay: s.display_name, hasCivic: !!civic };
  }
  const parts: string[] = [];
  if (addr.road) parts.push(civic ? `${addr.road} ${civic}` : addr.road);
  const city = addr.city || addr.town || addr.village;
  if (city) parts.push(addr.postcode ? `${addr.postcode} ${city}` : city);
  if (addr.country) parts.push(addr.country);
  return {
    ...s,
    enrichedDisplay: parts.length > 0 ? parts.join(', ') : s.display_name,
    hasCivic: !!civic,
  };
}

async function searchAddress(query: string): Promise<Suggestion[]> {
  if (query.trim().length < 3) return [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&countrycodes=it&q=${encodeURIComponent(
        query
      )}`,
      {
        headers: {
          'User-Agent': 'GuardianApp/0.1 (spike)',
          'Accept-Language': 'it',
        },
      }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as Suggestion[];
    return data.map((s) => enrichSuggestion(s, query));
  } catch {
    return [];
  }
}

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

/* =========================== APP ROOT =========================== */

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [userEmail, setUserEmail] = useState<string>('');
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [contacts, setContacts] = useState<TrustedContact[]>(INITIAL_TRUSTED);
  const [spidVerified, setSpidVerified] = useState(false);

  if (screen === 'login') {
    return (
      <LoginScreen
        onSuccess={(email) => {
          setUserEmail(email);
          setScreen('onboarding');
        }}
      />
    );
  }
  if (screen === 'onboarding') {
    return (
      <OnboardingScreen
        onSubmit={(p) => {
          setPlaces([p]);
          setScreen('spid');
        }}
      />
    );
  }
  if (screen === 'spid') {
    return (
      <SpidScreen
        onVerified={(providerName) => {
          console.log('[AUDIT]', { action: 'spid_verified', providerName });
          setSpidVerified(true);
          setScreen('map');
        }}
        onSkip={() => setScreen('map')}
      />
    );
  }
  return (
    <MapScreen
      userEmail={userEmail}
      places={places}
      setPlaces={setPlaces}
      contacts={contacts}
      setContacts={setContacts}
      spidVerified={spidVerified}
      onLogout={() => {
        setUserEmail('');
        setPlaces([]);
        setContacts(INITIAL_TRUSTED);
        setSpidVerified(false);
        setScreen('login');
      }}
    />
  );
}

/* ============================ LOGIN ============================= */

function LoginScreen({ onSuccess }: { onSuccess: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const mockLogin = () => {
    console.log('[AUDIT]', { action: 'mock_login', email });
    onSuccess(email || 'guest@guardian.app');
  };

  return (
    <SafeAreaView style={authStyles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={authStyles.container}
      >
        <View style={authStyles.brand}>
          <View style={authStyles.logoCircle}>
            <Ionicons name="shield-checkmark" size={38} color="#fff" />
          </View>
          <Text style={authStyles.brandTitle}>Guardian</Text>
          <Text style={authStyles.brandSubtitle}>
            Sicurezza condivisa per la tua città
          </Text>
        </View>

        <View style={authStyles.form}>
          <Text style={authStyles.label}>Email</Text>
          <TextInput
            style={authStyles.input}
            placeholder="tuanome@email.it"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={authStyles.label}>Password</Text>
          <TextInput
            style={authStyles.input}
            placeholder="••••••••"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Pressable
            style={({ pressed }) => [
              authStyles.primaryBtn,
              pressed && { opacity: 0.85 },
            ]}
            onPress={mockLogin}
          >
            <Text style={authStyles.primaryBtnText}>Accedi</Text>
          </Pressable>

          <View style={authStyles.divider}>
            <View style={authStyles.dividerLine} />
            <Text style={authStyles.dividerText}>oppure</Text>
            <View style={authStyles.dividerLine} />
          </View>

          <Pressable
            style={({ pressed }) => [
              authStyles.appleBtn,
              pressed && { opacity: 0.85 },
            ]}
            onPress={mockLogin}
          >
            <Ionicons name="logo-apple" size={18} color="#fff" />
            <Text style={authStyles.appleBtnText}>Continua con Apple</Text>
          </Pressable>

          <Text style={authStyles.footnote}>
            Non hai un account?{' '}
            <Text style={authStyles.link} onPress={mockLogin}>
              Registrati
            </Text>
          </Text>
        </View>

        <Text style={authStyles.disclaimer}>
          Guardian non sostituisce il 112. In caso di emergenza reale chiama sempre
          le autorità.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ========================= ONBOARDING =========================== */

function OnboardingScreen({ onSubmit }: { onSubmit: (p: SavedPlace) => void }) {
  const [label, setLabel] = useState<PlaceLabel>('Casa');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selected && query === (selected.enrichedDisplay ?? selected.display_name))
      return;
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (query.trim().length < 3) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      const results = await searchAddress(query);
      setSuggestions(results);
      setLoading(false);
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const submit = () => {
    if (!selected) {
      Alert.alert(
        'Indirizzo non selezionato',
        'Digita il tuo indirizzo e scegli un suggerimento dalla lista.'
      );
      return;
    }
    const place: SavedPlace = {
      id: makeId(),
      label,
      address: selected.enrichedDisplay ?? selected.display_name,
      coord: {
        latitude: parseFloat(selected.lat),
        longitude: parseFloat(selected.lon),
      },
      notificationsEnabled: true,
    };
    console.log('[AUDIT]', { action: 'onboarding_place', place });
    onSubmit(place);
  };

  return (
    <SafeAreaView style={authStyles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={authStyles.container}
      >
        <View style={authStyles.brand}>
          <View style={authStyles.logoCircle}>
            <Ionicons name="home" size={38} color="#fff" />
          </View>
          <Text style={authStyles.brandTitle}>Dove vivi?</Text>
          <Text style={authStyles.brandSubtitle}>
            Ci serve per inviarti alert solo sulle segnalazioni della tua zona.
          </Text>
        </View>

        <ScrollView style={authStyles.form} keyboardShouldPersistTaps="handled">
          <Text style={authStyles.label}>Tipo di luogo</Text>
          <View style={onbStyles.pillRow}>
            {PLACE_LABELS.map((l) => {
              const active = l === label;
              return (
                <Pressable
                  key={l}
                  style={[onbStyles.pill, active && onbStyles.pillActive]}
                  onPress={() => setLabel(l)}
                >
                  <Ionicons
                    name={PLACE_LABEL_ICON[l]}
                    size={13}
                    color={active ? '#fff' : '#6B7280'}
                  />
                  <Text
                    style={[onbStyles.pillText, active && onbStyles.pillTextActive]}
                  >
                    {l}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={authStyles.label}>Indirizzo completo (con civico)</Text>
          <View style={onbStyles.inputWrap}>
            <Ionicons
              name="search"
              size={16}
              color="#9CA3AF"
              style={{ marginRight: 8 }}
            />
            <TextInput
              style={onbStyles.inputInner}
              placeholder="Es. Via di Val Tellina 29, Roma"
              placeholderTextColor="#9CA3AF"
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
            {loading && <ActivityIndicator size="small" color="#7C3AED" />}
          </View>

          {suggestions.length > 0 && !selected && (
            <View style={onbStyles.suggList}>
              {suggestions.map((s, i) => (
                <Pressable
                  key={`${s.lat}-${s.lon}-${i}`}
                  style={({ pressed }) => [
                    onbStyles.suggItem,
                    pressed && { backgroundColor: '#F9FAFB' },
                  ]}
                  onPress={() => {
                    const display = s.enrichedDisplay ?? s.display_name;
                    setSelected(s);
                    setQuery(display);
                    setSuggestions([]);
                  }}
                >
                  <Ionicons name="location-outline" size={14} color="#7C3AED" />
                  <View style={{ flex: 1 }}>
                    <Text style={onbStyles.suggText} numberOfLines={2}>
                      {s.enrichedDisplay ?? s.display_name}
                    </Text>
                    {!s.hasCivic && (
                      <Text style={onbStyles.suggWarn}>
                        Senza civico — aggiungilo per maggiore precisione
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {selected && (
            <View style={onbStyles.selectedChip}>
              <Ionicons name="checkmark-circle" size={16} color="#43A047" />
              <Text style={onbStyles.selectedText} numberOfLines={1}>
                {selected.hasCivic ? 'Indirizzo con civico' : 'Indirizzo verificato'}
              </Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [
              authStyles.primaryBtn,
              !selected && { opacity: 0.5 },
              pressed && selected && { opacity: 0.85 },
            ]}
            onPress={submit}
            disabled={!selected}
          >
            <Text style={authStyles.primaryBtnText}>Continua</Text>
          </Pressable>

          <Text style={authStyles.footnote}>
            Potrai aggiungere altri luoghi (ufficio, casa vacanza) dal profilo.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* =========================== SPID =============================== */

function SpidScreen({
  onVerified,
  onSkip,
}: {
  onVerified: (providerName: string) => void;
  onSkip: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<'pick' | 'auth' | 'done'>('pick');

  const start = (p: SpidProvider) => {
    setSelectedId(p.id);
    setPhase('auth');
    setTimeout(() => setPhase('done'), 1800);
    setTimeout(() => onVerified(p.name), 2800);
  };

  const selected = SPID_PROVIDERS.find((p) => p.id === selectedId) ?? null;

  return (
    <SafeAreaView style={authStyles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={authStyles.container}
      >
        <View style={authStyles.brand}>
          <View style={[authStyles.logoCircle, { backgroundColor: '#0066CC' }]}>
            <Ionicons name="finger-print" size={38} color="#fff" />
          </View>
          <Text style={authStyles.brandTitle}>Verifica identità</Text>
          <Text style={authStyles.brandSubtitle}>
            Per usare Guardian serve verificare la tua identità con SPID o CIE.
            La verifica è anonima per le tue segnalazioni.
          </Text>
        </View>

        {phase === 'pick' && (
          <ScrollView style={authStyles.form}>
            <Text style={authStyles.label}>Scegli il tuo provider SPID</Text>
            <View style={spidStyles.grid}>
              {SPID_PROVIDERS.map((p) => (
                <Pressable
                  key={p.id}
                  style={({ pressed }) => [
                    spidStyles.providerCard,
                    { borderLeftColor: p.color },
                    pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                  ]}
                  onPress={() => start(p)}
                >
                  <View style={[spidStyles.providerDot, { backgroundColor: p.color }]}>
                    <Text style={spidStyles.providerInitial}>
                      {p.name.charAt(0)}
                    </Text>
                  </View>
                  <Text style={spidStyles.providerName}>{p.name}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </Pressable>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [
                spidStyles.cieBtn,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => start({ id: 'cie', name: 'CIE', color: '#111' })}
            >
              <Ionicons name="card" size={18} color="#fff" />
              <Text style={spidStyles.cieBtnText}>Entra con CIE (NFC)</Text>
            </Pressable>

            <Text style={authStyles.link} onPress={onSkip}>
              Salta per ora (solo demo)
            </Text>
          </ScrollView>
        )}

        {phase === 'auth' && selected && (
          <View style={spidStyles.authScreen}>
            <View
              style={[
                authStyles.logoCircle,
                { backgroundColor: selected.color, marginBottom: 20 },
              ]}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 26 }}>
                {selected.name.charAt(0)}
              </Text>
            </View>
            <ActivityIndicator size="large" color={selected.color} />
            <Text style={spidStyles.authText}>
              Autenticazione con {selected.name}…
            </Text>
            <Text style={spidStyles.authHint}>
              Apertura app del provider, conferma sul dispositivo.
            </Text>
          </View>
        )}

        {phase === 'done' && selected && (
          <View style={spidStyles.authScreen}>
            <View
              style={[
                authStyles.logoCircle,
                { backgroundColor: '#43A047', marginBottom: 20 },
              ]}
            >
              <Ionicons name="checkmark" size={38} color="#fff" />
            </View>
            <Text style={spidStyles.doneTitle}>Identità verificata</Text>
            <Text style={spidStyles.authHint}>
              Ora puoi usare Guardian come residente verificato.
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ============================ MAP =============================== */

function MapScreen({
  userEmail,
  places,
  setPlaces,
  contacts,
  setContacts,
  spidVerified,
  onLogout,
}: {
  userEmail: string;
  places: SavedPlace[];
  setPlaces: (u: SavedPlace[] | ((p: SavedPlace[]) => SavedPlace[])) => void;
  contacts: TrustedContact[];
  setContacts: (
    u: TrustedContact[] | ((c: TrustedContact[]) => TrustedContact[])
  ) => void;
  spidVerified: boolean;
  onLogout: () => void;
}) {
  const primaryPlace = places[0] ?? null;
  const userPos = primaryPlace?.coord ?? FALLBACK_POS;
  const initialRegion: Region = useMemo(
    () => ({
      ...userPos,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }),
    [userPos.latitude, userPos.longitude]
  );
  const mapRef = useRef<MapView>(null);
  const [reports, setReports] = useState<Report[]>(() =>
    buildInitialReports(userPos)
  );
  const [sosActive, setSosActive] = useState(false);
  const [isOnUser, setIsOnUser] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<Report | null>(null);
  const [pendingCategory, setPendingCategory] = useState<Category | null>(null);
  const [detailReport, setDetailReport] = useState<Report | null>(null);
  const [myReportsOpen, setMyReportsOpen] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sortedReports = useMemo(
    () => [...reports].sort((a, b) => b.createdAt - a.createdAt),
    [reports]
  );

  const unseenCount = reports.filter((r) => !r.seenByMe).length;

  const showToast = (
    message: string,
    actionLabel?: string,
    onAction?: () => void,
    durationMs = 2800
  ) => {
    setToast({ message, actionLabel, onAction });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), durationMs);
  };

  const onRegionChangeComplete = (region: Region) => {
    const centered =
      Math.abs(region.latitude - userPos.latitude) < CENTER_EPSILON &&
      Math.abs(region.longitude - userPos.longitude) < CENTER_EPSILON;
    setIsOnUser(centered);
  };

  const recenterOnUser = () => {
    setHighlighted(null);
    mapRef.current?.animateToRegion(initialRegion, 500);
  };

  const markAsSeen = (id: string) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === id && !r.seenByMe
          ? { ...r, seenByMe: true, viewedBy: r.viewedBy + 1 }
          : r
      )
    );
  };

  const finalizeReport = (category: Category, note: string) => {
    const newReport: Report = {
      id: makeId(),
      coord: userPos,
      category,
      createdAt: Date.now(),
      kind: 'report',
      address: primaryPlace?.address ?? 'Posizione attuale',
      note,
      viewedBy: 0,
      seenByMe: true,
      mine: true,
      confirmedBy: 0,
      disputedBy: 0,
    };
    setReports((prev) => [...prev, newReport]);
    console.log('[AUDIT]', {
      action: 'report_created',
      category,
      note,
      timestamp: new Date().toISOString(),
      coord: userPos,
    });
    setPendingCategory(null);
    showToast(
      'Segnalazione inviata — sei anonimo',
      'Vedi le tue segnalazioni',
      () => setMyReportsOpen(true),
      5500
    );
    // Simulazione di attività per demo (views + conferme nei primi minuti)
    setTimeout(() => {
      setReports((prev) =>
        prev.map((r) =>
          r.id === newReport.id
            ? { ...r, viewedBy: r.viewedBy + 3, confirmedBy: r.confirmedBy + 1 }
            : r
        )
      );
    }, 4000);
  };

  const selectCategory = (category: Category) => {
    setSheetOpen(false);
    setPendingCategory(category);
  };

  const focusOnReport = (r: Report) => {
    setNotifOpen(false);
    setDetailReport(null);
    setHighlighted(r);
    markAsSeen(r.id);
    mapRef.current?.animateToRegion(
      {
        ...r.coord,
        latitudeDelta: 0.002,
        longitudeDelta: 0.002,
      },
      600
    );
  };

  const openReportDetail = (r: Report) => {
    markAsSeen(r.id);
    setDetailReport(r);
  };

  const triggerSOS = () => {
    const timestamp = new Date().toISOString();
    console.log('[AUDIT]', {
      action: 'sos_confirm',
      timestamp,
      coord: userPos,
      deviceId: 'mock-device',
    });
    const sos: Report = {
      id: `sos-${Date.now()}`,
      coord: userPos,
      category: 'pericolo',
      createdAt: Date.now(),
      kind: 'sos',
      address: primaryPlace?.address ?? 'Posizione attuale',
      note: 'SOS personale attivato dall\'utente',
      viewedBy: 0,
      seenByMe: true,
    };
    setReports((prev) => [...prev, sos]);
    setSosActive(true);
    setTimeout(() => setSosActive(false), 8000);
    Alert.alert(
      'SOS attivato',
      'Contatti fidati avvisati (mock).\nVuoi chiamare il 112?',
      [
        { text: 'Non ora', style: 'cancel' },
        {
          text: 'Chiama 112',
          style: 'destructive',
          onPress: () => Linking.openURL('tel:112'),
        },
      ]
    );
  };

  const onSOSLongPress = () => {
    console.log('[AUDIT]', {
      action: 'sos_dialog_shown',
      timestamp: new Date().toISOString(),
    });
    Alert.alert(
      'Conferma SOS',
      "Falsi allarmi possono essere perseguiti ai sensi dell'art. 658 c.p. (procurato allarme).\n\nI dati dell'evento potranno essere forniti alle autorità competenti su richiesta formale.\n\nConfermi l'emergenza?",
      [
        {
          text: 'Annulla',
          style: 'cancel',
          onPress: () =>
            console.log('[AUDIT]', {
              action: 'sos_cancel',
              timestamp: new Date().toISOString(),
            }),
        },
        { text: 'CONFERMA SOS', style: 'destructive', onPress: triggerSOS },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        onRegionChangeComplete={onRegionChangeComplete}
      >
        <Marker coordinate={userPos} title="Tu sei qui" pinColor="#7C3AED" />
        <Circle
          center={userPos}
          radius={ALERT_RADIUS_M}
          strokeColor={sosActive ? '#E53935' : 'rgba(124, 58, 237, 0.6)'}
          fillColor={
            sosActive ? 'rgba(229, 57, 53, 0.2)' : 'rgba(124, 58, 237, 0.1)'
          }
          strokeWidth={sosActive ? 4 : 2}
        />
        {highlighted && (
          <Circle
            center={highlighted.coord}
            radius={NOTIFICATION_AREA_M}
            strokeColor={CATEGORY_COLOR[highlighted.category]}
            fillColor={`${CATEGORY_COLOR[highlighted.category]}33`}
            strokeWidth={3}
          />
        )}
        {reports.map((r) => (
          <Marker
            key={r.id}
            coordinate={r.coord}
            pinColor={r.kind === 'sos' ? '#FF0000' : CATEGORY_COLOR[r.category]}
            title={r.kind === 'sos' ? 'SOS ATTIVO' : CATEGORY_LABEL[r.category]}
            description={`${r.address} · ${relativeTime(r.createdAt)}`}
          />
        ))}
      </MapView>

      <View style={styles.header}>
        <Text style={styles.title}>Guardian</Text>
        {spidVerified && (
          <View style={styles.verifiedPill}>
            <Ionicons name="shield-checkmark" size={12} color="#fff" />
            <Text style={styles.verifiedText}>Verificato</Text>
          </View>
        )}
      </View>

      <View style={styles.rightRail}>
        <Pressable
          style={({ pressed }) => [
            styles.iconBtn,
            pressed && { transform: [{ scale: 0.94 }] },
          ]}
          onPress={() => setProfileOpen(true)}
        >
          <Ionicons name="person" size={20} color="#111" />
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.iconBtn,
            pressed && { transform: [{ scale: 0.94 }] },
          ]}
          onPress={() => setNotifOpen(true)}
        >
          <Ionicons name="notifications" size={20} color="#111" />
          {unseenCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unseenCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {toast && (
        <View style={styles.toast}>
          <Ionicons name="checkmark-circle" size={18} color="#43A047" />
          <Text style={styles.toastText}>{toast.message}</Text>
          {toast.actionLabel && toast.onAction && (
            <Pressable
              style={({ pressed }) => [
                styles.toastBtn,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => {
                toast.onAction?.();
                setToast(null);
              }}
            >
              <Text style={styles.toastBtnText}>{toast.actionLabel}</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.legend}>
        <Text style={styles.legendText}>
          Raggio alert: {ALERT_RADIUS_M}m · {reports.length} segnalazioni
        </Text>
      </View>

      {highlighted && (
        <Pressable
          style={({ pressed }) => [
            styles.previewCard,
            pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
          ]}
          onPress={() => {
            if (highlighted) setDetailReport(highlighted);
          }}
        >
          <View
            style={[
              styles.previewIcon,
              { backgroundColor: CATEGORY_COLOR[highlighted.category] },
            ]}
          >
            <Ionicons
              name={
                highlighted.kind === 'sos'
                  ? 'alert'
                  : CATEGORY_ICON[highlighted.category]
              }
              size={18}
              color="#fff"
            />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.previewTitleRow}>
              <Text style={styles.previewTitle}>
                {highlighted.kind === 'sos'
                  ? 'SOS attivo'
                  : CATEGORY_LABEL[highlighted.category]}
              </Text>
              <Pressable
                onPress={() => setHighlighted(null)}
                hitSlop={14}
                style={styles.previewCloseBtn}
              >
                <Ionicons name="close" size={18} color="#9CA3AF" />
              </Pressable>
            </View>
            <Text style={styles.previewAddr} numberOfLines={1}>
              {highlighted.address}
            </Text>
            <Text style={styles.previewNote} numberOfLines={2}>
              {highlighted.note}
            </Text>
            <View style={styles.previewDetailLink}>
              <Text style={styles.previewDetailText}>Vedi dettaglio completo</Text>
              <Ionicons name="chevron-forward" size={14} color="#7C3AED" />
            </View>
          </View>
        </Pressable>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.locateBtn,
          pressed && { transform: [{ scale: 0.95 }] },
        ]}
        onPress={recenterOnUser}
      >
        <Ionicons
          name={isOnUser ? 'locate' : 'locate-outline'}
          size={22}
          color={isOnUser ? '#7C3AED' : '#111'}
        />
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.sosFab,
          pressed && { transform: [{ scale: 0.96 }] },
        ]}
        onLongPress={onSOSLongPress}
        delayLongPress={5000}
      >
        <Ionicons name="alert" size={20} color="white" />
        <Text style={styles.sosFabText}>SOS</Text>
        <Text style={styles.sosHint}>5s</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          pressed && { transform: [{ scale: 0.96 }] },
        ]}
        onPress={() => setSheetOpen(true)}
      >
        <Ionicons name="add" size={22} color="white" />
        <Text style={styles.fabText}>Segnala</Text>
      </Pressable>

      <CategorySheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSelect={selectCategory}
      />

      <ReportConfirmSheet
        category={pendingCategory}
        onClose={() => setPendingCategory(null)}
        onSubmit={(note) => {
          if (pendingCategory) finalizeReport(pendingCategory, note);
        }}
      />

      <NotificationsPage
        visible={notifOpen}
        onClose={() => setNotifOpen(false)}
        reports={sortedReports}
        onSelect={focusOnReport}
      />

      <MyReportsPage
        visible={myReportsOpen}
        onClose={() => setMyReportsOpen(false)}
        reports={sortedReports.filter((r) => r.mine)}
        onSelect={focusOnReport}
      />

      <ReportDetailSheet
        report={detailReport}
        onClose={() => setDetailReport(null)}
        onShowOnMap={focusOnReport}
      />

      <ProfileSheet
        visible={profileOpen}
        onClose={() => setProfileOpen(false)}
        email={userEmail}
        spidVerified={spidVerified}
        places={places}
        setPlaces={setPlaces}
        contacts={contacts}
        setContacts={setContacts}
        onOpenMyReports={() => {
          setProfileOpen(false);
          setMyReportsOpen(true);
        }}
        myReportsCount={reports.filter((r) => r.mine).length}
        onLogout={() => {
          setProfileOpen(false);
          onLogout();
        }}
      />
    </View>
  );
}

/* ===================== CATEGORY BOTTOM SHEET ==================== */

function CategorySheet({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (c: Category) => void;
}) {
  const categories: Category[] = ['pericolo', 'furto', 'evento', 'sanitario'];
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={sheetStyles.backdrop} onPress={onClose}>
        <Pressable style={sheetStyles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={sheetStyles.grabber} />
          <Text style={sheetStyles.title}>Tipo di segnalazione</Text>
          <Text style={sheetStyles.subtitle}>
            Seleziona la categoria dell&apos;evento che vuoi segnalare
          </Text>
          {categories.map((c) => (
            <Pressable
              key={c}
              style={({ pressed }) => [
                sheetStyles.catBtn,
                { backgroundColor: CATEGORY_COLOR[c] },
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => onSelect(c)}
            >
              <Ionicons name={CATEGORY_ICON[c]} size={22} color="#fff" />
              <Text style={sheetStyles.catBtnText}>{CATEGORY_LABEL[c]}</Text>
            </Pressable>
          ))}
          <Text style={sheetStyles.cancelText} onPress={onClose}>
            Annulla
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ==================== REPORT CONFIRM SHEET ====================== */

function ReportConfirmSheet({
  category,
  onClose,
  onSubmit,
}: {
  category: Category | null;
  onClose: () => void;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState('');
  const visible = category !== null;

  useEffect(() => {
    if (!visible) setNote('');
  }, [visible]);

  const canSubmit = note.trim().length >= 10;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(note.trim());
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <Pressable style={sheetStyles.backdrop} onPress={onClose}>
          <Pressable
            style={sheetStyles.sheet}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={sheetStyles.grabber} />
            {category && (
              <>
                <View style={confirmStyles.header}>
                  <View
                    style={[
                      confirmStyles.icon,
                      { backgroundColor: CATEGORY_COLOR[category] },
                    ]}
                  >
                    <Ionicons
                      name={CATEGORY_ICON[category]}
                      size={18}
                      color="#fff"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={sheetStyles.title}>
                      Conferma {CATEGORY_LABEL[category]}
                    </Text>
                    <Text style={sheetStyles.subtitle}>
                      Descrivi brevemente cosa stai segnalando
                    </Text>
                  </View>
                </View>

                <View style={confirmStyles.anonBanner}>
                  <Ionicons name="eye-off" size={14} color="#6D28D9" />
                  <Text style={confirmStyles.anonText}>
                    La tua segnalazione sarà sempre anonima
                  </Text>
                </View>

                <Text style={authStyles.label}>Nota (obbligatoria)</Text>
                <TextInput
                  style={confirmStyles.noteInput}
                  placeholder="Es. gruppo di persone sospette, rumore forte, incidente stradale…"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  value={note}
                  onChangeText={setNote}
                  autoFocus
                  maxLength={500}
                />
                <Text style={confirmStyles.hint}>
                  {note.length < 10
                    ? `${Math.max(0, 10 - note.length)} caratteri mancanti`
                    : `${note.length}/500`}
                </Text>

                <Pressable
                  style={({ pressed }) => [
                    authStyles.primaryBtn,
                    { marginTop: 10, backgroundColor: CATEGORY_COLOR[category] },
                    !canSubmit && { opacity: 0.5 },
                    pressed && canSubmit && { opacity: 0.85 },
                  ]}
                  disabled={!canSubmit}
                  onPress={handleSubmit}
                >
                  <Text style={authStyles.primaryBtnText}>Invia segnalazione</Text>
                </Pressable>
                <Text style={sheetStyles.cancelText} onPress={onClose}>
                  Annulla
                </Text>
              </>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* =================== NOTIFICATIONS FULL PAGE ==================== */

function NotificationsPage({
  visible,
  onClose,
  reports,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  reports: Report[];
  onSelect: (r: Report) => void;
}) {
  const unseenCount = reports.filter((r) => !r.seenByMe).length;
  const [filter, setFilter] = useState<'all' | 'unseen'>('all');

  const shown = useMemo(() => {
    return filter === 'unseen' ? reports.filter((r) => !r.seenByMe) : reports;
  }, [filter, reports]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={pageStyles.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={pageStyles.headerBar}>
          <Pressable onPress={onClose} style={pageStyles.closeBtn} hitSlop={12}>
            <Ionicons name="close" size={22} color="#111" />
          </Pressable>
          <Text style={pageStyles.headerTitle}>Notifiche del quartiere</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={pageStyles.subHeader}>
          <Text style={pageStyles.countText}>
            {reports.length} totali · {unseenCount} non viste
          </Text>
          <View style={pageStyles.filterRow}>
            <Pressable
              style={[pageStyles.filterChip, filter === 'all' && pageStyles.filterActive]}
              onPress={() => setFilter('all')}
            >
              <Text
                style={[
                  pageStyles.filterText,
                  filter === 'all' && pageStyles.filterTextActive,
                ]}
              >
                Tutte
              </Text>
            </Pressable>
            <Pressable
              style={[pageStyles.filterChip, filter === 'unseen' && pageStyles.filterActive]}
              onPress={() => setFilter('unseen')}
            >
              <Text
                style={[
                  pageStyles.filterText,
                  filter === 'unseen' && pageStyles.filterTextActive,
                ]}
              >
                Non viste
              </Text>
            </Pressable>
          </View>
        </View>

        <FlatList
          data={shown}
          keyExtractor={(r) => r.id}
          contentContainerStyle={pageStyles.listContent}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                pageStyles.card,
                pressed && { backgroundColor: '#F9FAFB' },
              ]}
              onPress={() => onSelect(item)}
            >
              <View
                style={[
                  pageStyles.cardIcon,
                  { backgroundColor: CATEGORY_COLOR[item.category] },
                ]}
              >
                <Ionicons
                  name={
                    item.kind === 'sos' ? 'alert' : CATEGORY_ICON[item.category]
                  }
                  size={20}
                  color="#fff"
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={pageStyles.cardTitleRow}>
                  <Text style={pageStyles.cardTitle}>
                    {item.kind === 'sos'
                      ? 'SOS attivo'
                      : CATEGORY_LABEL[item.category]}
                  </Text>
                  {!item.seenByMe && <View style={pageStyles.unseenDot} />}
                </View>
                <View style={pageStyles.cardAddrRow}>
                  <Ionicons name="location" size={12} color="#7C3AED" />
                  <Text style={pageStyles.cardAddr} numberOfLines={1}>
                    {item.address}
                  </Text>
                </View>
                <Text style={pageStyles.cardNote} numberOfLines={2}>
                  {item.note}
                </Text>
                <View style={pageStyles.cardMeta}>
                  <Ionicons name="eye" size={11} color="#9CA3AF" />
                  <Text style={pageStyles.cardMetaText}>
                    {item.viewedBy === 0
                      ? 'non ancora visto'
                      : `${item.viewedBy} ${item.viewedBy === 1 ? 'visualizzazione' : 'visualizzazioni'}`}
                  </Text>
                  <Text style={pageStyles.cardMetaDot}>·</Text>
                  <Text style={pageStyles.cardMetaText}>
                    {relativeTime(item.createdAt)}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={pageStyles.empty}>Nessuna notifica in questo filtro.</Text>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

/* ======================= MY REPORTS PAGE ======================== */

function MyReportsPage({
  visible,
  onClose,
  reports,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  reports: Report[];
  onSelect: (r: Report) => void;
}) {
  const totals = useMemo(() => {
    const totalViews = reports.reduce((s, r) => s + r.viewedBy, 0);
    const totalConfirms = reports.reduce((s, r) => s + r.confirmedBy, 0);
    const totalDisputes = reports.reduce((s, r) => s + r.disputedBy, 0);
    return { totalViews, totalConfirms, totalDisputes, count: reports.length };
  }, [reports]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={pageStyles.safe}>
        <StatusBar barStyle="dark-content" />
        <View style={pageStyles.headerBar}>
          <Pressable onPress={onClose} style={pageStyles.closeBtn} hitSlop={12}>
            <Ionicons name="close" size={22} color="#111" />
          </Pressable>
          <Text style={pageStyles.headerTitle}>Le tue segnalazioni</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={myStyles.statsBlock}>
          <View style={myStyles.statBox}>
            <Text style={myStyles.statNum}>{totals.count}</Text>
            <Text style={myStyles.statLabel}>inviate</Text>
          </View>
          <View style={myStyles.statDivider} />
          <View style={myStyles.statBox}>
            <Text style={myStyles.statNum}>{totals.totalViews}</Text>
            <Text style={myStyles.statLabel}>viste totali</Text>
          </View>
          <View style={myStyles.statDivider} />
          <View style={myStyles.statBox}>
            <Text style={[myStyles.statNum, { color: '#43A047' }]}>
              {totals.totalConfirms}
            </Text>
            <Text style={myStyles.statLabel}>confermate</Text>
          </View>
          <View style={myStyles.statDivider} />
          <View style={myStyles.statBox}>
            <Text style={[myStyles.statNum, { color: '#E53935' }]}>
              {totals.totalDisputes}
            </Text>
            <Text style={myStyles.statLabel}>contestate</Text>
          </View>
        </View>

        <FlatList
          data={reports}
          keyExtractor={(r) => r.id}
          contentContainerStyle={pageStyles.listContent}
          renderItem={({ item }) => {
            const netScore = item.confirmedBy - item.disputedBy;
            const trust =
              item.viewedBy === 0
                ? 'neutra'
                : netScore >= 3
                ? 'verificata'
                : netScore <= -2
                ? 'contestata'
                : 'in attesa';
            const trustColor =
              trust === 'verificata'
                ? '#43A047'
                : trust === 'contestata'
                ? '#E53935'
                : '#9CA3AF';
            return (
              <Pressable
                style={({ pressed }) => [
                  pageStyles.card,
                  pressed && { backgroundColor: '#F9FAFB' },
                ]}
                onPress={() => onSelect(item)}
              >
                <View
                  style={[
                    pageStyles.cardIcon,
                    { backgroundColor: CATEGORY_COLOR[item.category] },
                  ]}
                >
                  <Ionicons
                    name={CATEGORY_ICON[item.category]}
                    size={20}
                    color="#fff"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={pageStyles.cardTitleRow}>
                    <Text style={pageStyles.cardTitle}>
                      {CATEGORY_LABEL[item.category]}
                    </Text>
                    <View
                      style={[myStyles.trustPill, { backgroundColor: `${trustColor}22` }]}
                    >
                      <Text style={[myStyles.trustText, { color: trustColor }]}>
                        {trust}
                      </Text>
                    </View>
                  </View>
                  <View style={pageStyles.cardAddrRow}>
                    <Ionicons name="location" size={12} color="#7C3AED" />
                    <Text style={pageStyles.cardAddr} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </View>
                  <Text style={pageStyles.cardNote} numberOfLines={2}>
                    {item.note}
                  </Text>
                  <View style={myStyles.interactionsRow}>
                    <View style={myStyles.interactionPill}>
                      <Ionicons name="eye" size={12} color="#6B7280" />
                      <Text style={myStyles.interactionText}>{item.viewedBy}</Text>
                    </View>
                    <View
                      style={[
                        myStyles.interactionPill,
                        { backgroundColor: '#DCFCE7' },
                      ]}
                    >
                      <Ionicons name="checkmark" size={12} color="#166534" />
                      <Text style={[myStyles.interactionText, { color: '#166534' }]}>
                        {item.confirmedBy}
                      </Text>
                    </View>
                    <View
                      style={[
                        myStyles.interactionPill,
                        { backgroundColor: '#FEE2E2' },
                      ]}
                    >
                      <Ionicons name="close" size={12} color="#B91C1C" />
                      <Text style={[myStyles.interactionText, { color: '#B91C1C' }]}>
                        {item.disputedBy}
                      </Text>
                    </View>
                    <Text style={pageStyles.cardMetaText}>
                      {relativeTime(item.createdAt)}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={myStyles.emptyBox}>
              <Ionicons name="document-text-outline" size={40} color="#D1D5DB" />
              <Text style={myStyles.emptyTitle}>Nessuna segnalazione ancora</Text>
              <Text style={myStyles.emptyHint}>
                Usa il pulsante Segnala sulla mappa per inviare la tua prima.
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

/* ==================== REPORT DETAIL SHEET ======================= */

function ReportDetailSheet({
  report,
  onClose,
  onShowOnMap,
}: {
  report: Report | null;
  onClose: () => void;
  onShowOnMap: (r: Report) => void;
}) {
  const visible = report !== null;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={sheetStyles.backdrop} onPress={onClose}>
        <Pressable style={sheetStyles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={sheetStyles.grabber} />
          {report && (
            <>
              <View style={detailStyles.head}>
                <View
                  style={[
                    detailStyles.icon,
                    { backgroundColor: CATEGORY_COLOR[report.category] },
                  ]}
                >
                  <Ionicons
                    name={
                      report.kind === 'sos'
                        ? 'alert'
                        : CATEGORY_ICON[report.category]
                    }
                    size={22}
                    color="#fff"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={detailStyles.title}>
                    {report.kind === 'sos'
                      ? 'SOS attivo'
                      : CATEGORY_LABEL[report.category]}
                  </Text>
                  <Text style={detailStyles.timeText}>
                    {relativeTime(report.createdAt)}
                  </Text>
                </View>
              </View>

              <View style={detailStyles.addrBlock}>
                <Ionicons name="location" size={16} color="#7C3AED" />
                <Text style={detailStyles.addrText}>{report.address}</Text>
              </View>

              <View style={detailStyles.noteBlock}>
                <Text style={detailStyles.noteLabel}>Descrizione</Text>
                <Text style={detailStyles.noteText}>{report.note}</Text>
              </View>

              <View style={detailStyles.statsRow}>
                <View style={detailStyles.stat}>
                  <Ionicons name="eye" size={14} color="#6B7280" />
                  <Text style={detailStyles.statValue}>{report.viewedBy}</Text>
                  <Text style={detailStyles.statLabel}>visualizzazioni</Text>
                </View>
                <View style={detailStyles.statDivider} />
                <View style={detailStyles.stat}>
                  <Ionicons name="shield-checkmark" size={14} color="#6B7280" />
                  <Text style={detailStyles.statValue}>Anonima</Text>
                  <Text style={detailStyles.statLabel}>segnalazione</Text>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  authStyles.primaryBtn,
                  { marginTop: 18 },
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => onShowOnMap(report)}
              >
                <Text style={authStyles.primaryBtnText}>Vedi sulla mappa</Text>
              </Pressable>
              <Text style={sheetStyles.cancelText} onPress={onClose}>
                Chiudi
              </Text>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ======================= PROFILE SHEET ========================== */

function ProfileSheet({
  visible,
  onClose,
  email,
  spidVerified,
  places,
  setPlaces,
  contacts,
  setContacts,
  onOpenMyReports,
  myReportsCount,
  onLogout,
}: {
  visible: boolean;
  onClose: () => void;
  email: string;
  spidVerified: boolean;
  places: SavedPlace[];
  setPlaces: (u: SavedPlace[] | ((p: SavedPlace[]) => SavedPlace[])) => void;
  contacts: TrustedContact[];
  setContacts: (
    u: TrustedContact[] | ((c: TrustedContact[]) => TrustedContact[])
  ) => void;
  onOpenMyReports: () => void;
  myReportsCount: number;
  onLogout: () => void;
}) {
  const [addPlaceOpen, setAddPlaceOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);

  const toggleNotif = (id: string) => {
    setPlaces((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, notificationsEnabled: !p.notificationsEnabled } : p
      )
    );
  };

  const removePlace = (id: string) => {
    Alert.alert('Rimuovere il luogo?', 'Non riceverai più notifiche da questa zona.', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Rimuovi',
        style: 'destructive',
        onPress: () => setPlaces((prev) => prev.filter((p) => p.id !== id)),
      },
    ]);
  };

  const toggleVerify = (id: string) => {
    setContacts((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, canVerifyAddresses: !c.canVerifyAddresses } : c
      )
    );
  };

  const removeContact = (id: string) => {
    Alert.alert('Rimuovere il contatto?', null as any, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Rimuovi',
        style: 'destructive',
        onPress: () => setContacts((prev) => prev.filter((c) => c.id !== id)),
      },
    ]);
  };

  const inviteContact = (contact: Omit<TrustedContact, 'id' | 'status'>) => {
    setContacts((prev) => [
      ...prev,
      {
        ...contact,
        id: makeId(),
        status: 'invited',
      },
    ]);
    setAddContactOpen(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={sheetStyles.backdrop} onPress={onClose}>
        <Pressable
          style={[sheetStyles.sheet, sheetStyles.tallSheet]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={sheetStyles.grabber} />
          <View style={profStyles.avatarWrap}>
            <View style={profStyles.avatar}>
              <Ionicons name="person" size={34} color="#fff" />
            </View>
            <Text style={profStyles.name}>{email || 'Utente Guardian'}</Text>
            <Text style={profStyles.verified}>
              <Ionicons
                name="shield-checkmark"
                size={12}
                color={spidVerified ? '#43A047' : '#9CA3AF'}
              />{' '}
              {spidVerified ? 'Identità SPID verificata' : 'Identità non verificata'}
            </Text>
          </View>

          <ScrollView style={{ marginTop: 10 }}>
            {/* === Le tue segnalazioni (shortcut) === */}
            <Pressable
              style={({ pressed }) => [
                profStyles.shortcutRow,
                pressed && { opacity: 0.9 },
              ]}
              onPress={onOpenMyReports}
            >
              <View style={profStyles.shortcutIcon}>
                <Ionicons name="document-text" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={profStyles.shortcutTitle}>Le tue segnalazioni</Text>
                <Text style={profStyles.shortcutDesc}>
                  {myReportsCount} inviate · vedi interazioni e verifiche
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>

            {/* === Luoghi safe === */}
            <View style={profStyles.sectionHeader}>
              <Text style={profStyles.sectionTitle}>Luoghi safe</Text>
              <Pressable onPress={() => setAddPlaceOpen(true)} style={profStyles.addPill}>
                <Ionicons name="add" size={14} color="#7C3AED" />
                <Text style={profStyles.addPillText}>Aggiungi</Text>
              </Pressable>
            </View>
            <Text style={profStyles.sectionDesc}>
              Luoghi salvati dai quali ricevi notifiche. Attiva/disattiva gli alert per
              ogni luogo.
            </Text>

            {places.length === 0 ? (
              <Text style={profStyles.empty}>
                Nessun luogo salvato. Aggiungine uno per ricevere alert.
              </Text>
            ) : (
              places.map((p) => (
                <View key={p.id} style={profStyles.placeRow}>
                  <View
                    style={[
                      profStyles.placeIcon,
                      { backgroundColor: p.notificationsEnabled ? '#7C3AED' : '#9CA3AF' },
                    ]}
                  >
                    <Ionicons name={PLACE_LABEL_ICON[p.label]} size={18} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={profStyles.placeTitleRow}>
                      <Text style={profStyles.placeLabel}>{p.label}</Text>
                      <Pressable onPress={() => removePlace(p.id)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={16} color="#9CA3AF" />
                      </Pressable>
                    </View>
                    <Text style={profStyles.placeAddr} numberOfLines={2}>
                      {p.address}
                    </Text>
                    <View style={profStyles.notifRow}>
                      <Text style={profStyles.notifLabel}>
                        {p.notificationsEnabled ? 'Notifiche attive' : 'Notifiche disattivate'}
                      </Text>
                      <Switch
                        value={p.notificationsEnabled}
                        onValueChange={() => toggleNotif(p.id)}
                        trackColor={{ false: '#E5E7EB', true: '#C4B5FD' }}
                        thumbColor={p.notificationsEnabled ? '#7C3AED' : '#F3F4F6'}
                      />
                    </View>
                  </View>
                </View>
              ))
            )}

            <View style={profStyles.divider} />

            {/* === Contatti fidati === */}
            <View style={profStyles.sectionHeader}>
              <Text style={profStyles.sectionTitle}>Contatti fidati</Text>
              <Pressable
                onPress={() => setAddContactOpen(true)}
                style={profStyles.addPill}
              >
                <Ionicons name="add" size={14} color="#7C3AED" />
                <Text style={profStyles.addPillText}>Invita</Text>
              </Pressable>
            </View>
            <Text style={profStyles.sectionDesc}>
              Persone fidate che possono verificare i tuoi luoghi salvati e a cui
              inviamo alert in caso di SOS.
            </Text>

            {contacts.length === 0 ? (
              <Text style={profStyles.empty}>Nessun contatto ancora invitato.</Text>
            ) : (
              contacts.map((c) => (
                <View key={c.id} style={profStyles.contactRow}>
                  <View style={profStyles.contactAvatar}>
                    <Text style={profStyles.contactInitial}>
                      {c.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={profStyles.placeTitleRow}>
                      <Text style={profStyles.contactName}>{c.name}</Text>
                      <Pressable onPress={() => removeContact(c.id)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={16} color="#9CA3AF" />
                      </Pressable>
                    </View>
                    <Text style={profStyles.contactEmail}>{c.email}</Text>
                    <View style={profStyles.contactMetaRow}>
                      <View
                        style={[
                          profStyles.statusPill,
                          c.status === 'verified' && { backgroundColor: '#DCFCE7' },
                          c.status === 'pending' && { backgroundColor: '#FEF3C7' },
                          c.status === 'invited' && { backgroundColor: '#EDE9FE' },
                        ]}
                      >
                        <Text
                          style={[
                            profStyles.statusText,
                            c.status === 'verified' && { color: '#166534' },
                            c.status === 'pending' && { color: '#92400E' },
                            c.status === 'invited' && { color: '#5B21B6' },
                          ]}
                        >
                          {c.status === 'verified'
                            ? 'Verificato'
                            : c.status === 'pending'
                            ? 'In attesa'
                            : 'Invitato'}
                        </Text>
                      </View>
                    </View>
                    <View style={profStyles.notifRow}>
                      <Text style={profStyles.notifLabel}>
                        Può verificare i tuoi luoghi
                      </Text>
                      <Switch
                        value={c.canVerifyAddresses}
                        onValueChange={() => toggleVerify(c.id)}
                        disabled={c.status !== 'verified'}
                        trackColor={{ false: '#E5E7EB', true: '#C4B5FD' }}
                        thumbColor={c.canVerifyAddresses ? '#7C3AED' : '#F3F4F6'}
                      />
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <Pressable
            style={({ pressed }) => [
              profStyles.logoutBtn,
              pressed && { opacity: 0.85 },
            ]}
            onPress={onLogout}
          >
            <Text style={profStyles.logoutText}>Esci</Text>
          </Pressable>

          <Text style={sheetStyles.cancelText} onPress={onClose}>
            Chiudi
          </Text>

          <AddPlaceSheet
            visible={addPlaceOpen}
            onClose={() => setAddPlaceOpen(false)}
            onAdd={(p) => {
              setPlaces((prev) => [...prev, p]);
              setAddPlaceOpen(false);
            }}
          />

          <AddContactSheet
            visible={addContactOpen}
            onClose={() => setAddContactOpen(false)}
            onAdd={inviteContact}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ==================== ADD PLACE BOTTOM SHEET ==================== */

function AddPlaceSheet({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (p: SavedPlace) => void;
}) {
  const [label, setLabel] = useState<PlaceLabel>('Ufficio');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Suggestion | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setSelected(null);
      setSuggestions([]);
      setLabel('Ufficio');
    }
  }, [visible]);

  useEffect(() => {
    if (selected && query === (selected.enrichedDisplay ?? selected.display_name))
      return;
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (query.trim().length < 3) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      const results = await searchAddress(query);
      setSuggestions(results);
      setLoading(false);
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const submit = () => {
    if (!selected) return;
    onAdd({
      id: makeId(),
      label,
      address: selected.enrichedDisplay ?? selected.display_name,
      coord: {
        latitude: parseFloat(selected.lat),
        longitude: parseFloat(selected.lon),
      },
      notificationsEnabled: true,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <Pressable style={sheetStyles.backdrop} onPress={onClose}>
          <Pressable style={sheetStyles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={sheetStyles.grabber} />
            <Text style={sheetStyles.title}>Nuovo luogo safe</Text>
            <Text style={sheetStyles.subtitle}>
              Aggiungi un indirizzo per ricevere alert anche dalla sua zona.
            </Text>

            <Text style={authStyles.label}>Tipo di luogo</Text>
            <View style={onbStyles.pillRow}>
              {PLACE_LABELS.map((l) => {
                const active = l === label;
                return (
                  <Pressable
                    key={l}
                    style={[onbStyles.pill, active && onbStyles.pillActive]}
                    onPress={() => setLabel(l)}
                  >
                    <Ionicons
                      name={PLACE_LABEL_ICON[l]}
                      size={13}
                      color={active ? '#fff' : '#6B7280'}
                    />
                    <Text
                      style={[onbStyles.pillText, active && onbStyles.pillTextActive]}
                    >
                      {l}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={authStyles.label}>Indirizzo completo (con civico)</Text>
            <View style={onbStyles.inputWrap}>
              <Ionicons
                name="search"
                size={16}
                color="#9CA3AF"
                style={{ marginRight: 8 }}
              />
              <TextInput
                style={onbStyles.inputInner}
                placeholder="Es. Via del Corso 112, Roma"
                placeholderTextColor="#9CA3AF"
                value={query}
                onChangeText={setQuery}
                autoFocus
              />
              {loading && <ActivityIndicator size="small" color="#7C3AED" />}
            </View>

            {suggestions.length > 0 && !selected && (
              <View style={onbStyles.suggList}>
                {suggestions.map((s, i) => (
                  <Pressable
                    key={`${s.lat}-${s.lon}-${i}`}
                    style={({ pressed }) => [
                      onbStyles.suggItem,
                      pressed && { backgroundColor: '#F9FAFB' },
                    ]}
                    onPress={() => {
                      const display = s.enrichedDisplay ?? s.display_name;
                      setSelected(s);
                      setQuery(display);
                      setSuggestions([]);
                    }}
                  >
                    <Ionicons name="location-outline" size={14} color="#7C3AED" />
                    <View style={{ flex: 1 }}>
                      <Text style={onbStyles.suggText} numberOfLines={2}>
                        {s.enrichedDisplay ?? s.display_name}
                      </Text>
                      {!s.hasCivic && (
                        <Text style={onbStyles.suggWarn}>
                          Senza civico — aggiungilo per precisione
                        </Text>
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {selected && (
              <View style={onbStyles.selectedChip}>
                <Ionicons name="checkmark-circle" size={16} color="#43A047" />
                <Text style={onbStyles.selectedText} numberOfLines={1}>
                  {selected.hasCivic
                    ? 'Indirizzo con civico'
                    : 'Indirizzo verificato'}
                </Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                authStyles.primaryBtn,
                !selected && { opacity: 0.5 },
                pressed && selected && { opacity: 0.85 },
              ]}
              onPress={submit}
              disabled={!selected}
            >
              <Text style={authStyles.primaryBtnText}>Aggiungi luogo</Text>
            </Pressable>
            <Text style={sheetStyles.cancelText} onPress={onClose}>
              Annulla
            </Text>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ==================== ADD CONTACT SHEET ========================= */

function AddContactSheet({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (c: Omit<TrustedContact, 'id' | 'status'>) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [canVerify, setCanVerify] = useState(false);

  useEffect(() => {
    if (!visible) {
      setName('');
      setEmail('');
      setCanVerify(false);
    }
  }, [visible]);

  const canSubmit = name.trim().length >= 2 && /@/.test(email);

  const submit = () => {
    if (!canSubmit) return;
    onAdd({
      name: name.trim(),
      email: email.trim(),
      canVerifyAddresses: canVerify,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <Pressable style={sheetStyles.backdrop} onPress={onClose}>
          <Pressable style={sheetStyles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={sheetStyles.grabber} />
            <Text style={sheetStyles.title}>Invita un contatto fidato</Text>
            <Text style={sheetStyles.subtitle}>
              Il contatto riceverà un invito via email e dovrà accettare. Potrà poi
              verificare i tuoi luoghi e ricevere alert SOS.
            </Text>

            <Text style={authStyles.label}>Nome</Text>
            <TextInput
              style={authStyles.input}
              placeholder="Es. Giulia Rossi"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
              autoFocus
            />

            <Text style={authStyles.label}>Email</Text>
            <TextInput
              style={authStyles.input}
              placeholder="email@esempio.it"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <View style={contactStyles.verifyRow}>
              <View style={{ flex: 1 }}>
                <Text style={contactStyles.verifyLabel}>
                  Può verificare i miei luoghi safe
                </Text>
                <Text style={contactStyles.verifyHint}>
                  Gli consenti di confermare che un indirizzo è tuo (utile quando non
                  hai ancora verificato via SPID).
                </Text>
              </View>
              <Switch
                value={canVerify}
                onValueChange={setCanVerify}
                trackColor={{ false: '#E5E7EB', true: '#C4B5FD' }}
                thumbColor={canVerify ? '#7C3AED' : '#F3F4F6'}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                authStyles.primaryBtn,
                { marginTop: 8 },
                !canSubmit && { opacity: 0.5 },
                pressed && canSubmit && { opacity: 0.85 },
              ]}
              onPress={submit}
              disabled={!canSubmit}
            >
              <Text style={authStyles.primaryBtnText}>Invia invito</Text>
            </Pressable>
            <Text style={sheetStyles.cancelText} onPress={onClose}>
              Annulla
            </Text>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ============================ STYLES ============================ */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    position: 'absolute',
    top: 60,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#43A047',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  verifiedText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  rightRail: { position: 'absolute', top: 60, right: 16, gap: 10 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E53935',
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  toast: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  toastText: { fontSize: 13, color: '#111', fontWeight: '600', flex: 1 },
  toastBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 8,
  },
  toastBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  legend: {
    position: 'absolute',
    bottom: 130,
    alignSelf: 'center',
    backgroundColor: 'rgba(17,17,17,0.85)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  legendText: { color: 'white', fontSize: 12, fontWeight: '500' },
  previewCard: {
    position: 'absolute',
    bottom: 170,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  previewIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewTitle: { fontSize: 14, fontWeight: '800', color: '#111' },
  previewAddr: {
    fontSize: 11,
    color: '#7C3AED',
    fontWeight: '700',
    marginTop: 2,
  },
  previewNote: {
    fontSize: 12,
    color: '#374151',
    marginTop: 4,
    lineHeight: 16,
  },
  previewDetailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  previewDetailText: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },
  previewCloseBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  locateBtn: {
    position: 'absolute',
    right: 20,
    bottom: 110,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { color: 'white', fontWeight: '700', fontSize: 15, letterSpacing: 0.3 },
  sosFab: {
    position: 'absolute',
    left: 20,
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E53935',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#E53935',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  sosFabText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 1,
  },
  sosHint: { color: 'white', fontSize: 10, opacity: 0.85, marginLeft: 2 },
});

const authStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F7' },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  brand: { alignItems: 'center', marginTop: 40 },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  form: { marginTop: 20 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  primaryBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 12, color: '#9CA3AF', fontSize: 12 },
  appleBtn: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  appleBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  footnote: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 20,
  },
  link: {
    color: '#7C3AED',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 20,
  },
  disclaimer: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
});

const onbStyles = StyleSheet.create({
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pillActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  pillText: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  pillTextActive: { color: '#fff' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputInner: { flex: 1, fontSize: 15, color: '#111' },
  suggList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  suggItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggText: { fontSize: 13, color: '#111', lineHeight: 17 },
  suggWarn: { fontSize: 11, color: '#B45309', marginTop: 2, fontWeight: '600' },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    marginTop: 8,
  },
  selectedText: { color: '#166534', fontSize: 12, fontWeight: '700' },
});

const spidStyles = StyleSheet.create({
  grid: { marginTop: 6, gap: 8 },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderLeftWidth: 4,
  },
  providerDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerInitial: { color: '#fff', fontWeight: '800', fontSize: 14 },
  providerName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#111' },
  cieBtn: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  cieBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  authScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  authText: { fontSize: 16, color: '#111', fontWeight: '700', marginTop: 20 },
  authHint: { fontSize: 13, color: '#6B7280', marginTop: 8, textAlign: 'center' },
  doneTitle: { fontSize: 20, fontWeight: '800', color: '#111' },
});

const sheetStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  tallSheet: { maxHeight: '88%' },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#111', letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 4, marginBottom: 16 },
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    marginBottom: 10,
  },
  catBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  cancelText: {
    color: '#6B7280',
    fontWeight: '500',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
});

const confirmStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
    marginBottom: 6,
  },
  anonText: { color: '#6D28D9', fontSize: 12, fontWeight: '700' },
  noteInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
});

const pageStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F7' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111',
    letterSpacing: -0.2,
  },
  subHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  countText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  filterActive: { backgroundColor: '#7C3AED' },
  filterText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  filterTextActive: { color: '#fff' },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#111' },
  unseenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53935',
  },
  cardAddrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  cardAddr: { fontSize: 12, color: '#7C3AED', fontWeight: '700', flex: 1 },
  cardNote: {
    fontSize: 13,
    color: '#374151',
    marginTop: 6,
    lineHeight: 17,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  cardMetaText: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  cardMetaDot: { fontSize: 11, color: '#D1D5DB', marginHorizontal: 2 },
  empty: {
    textAlign: 'center',
    color: '#9CA3AF',
    paddingVertical: 40,
    fontSize: 14,
  },
});

const detailStyles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '800', color: '#111' },
  timeText: { fontSize: 12, color: '#6B7280', marginTop: 3 },
  addrBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EDE9FE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  addrText: { flex: 1, fontSize: 13, color: '#6D28D9', fontWeight: '700' },
  noteBlock: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14 },
  noteLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  noteText: { fontSize: 15, color: '#111', lineHeight: 21 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
  },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#111', marginTop: 2 },
  statLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  statDivider: { width: 1, height: 30, backgroundColor: '#E5E7EB' },
});

const profStyles = StyleSheet.create({
  avatarWrap: { alignItems: 'center', paddingTop: 4, paddingBottom: 14 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  name: { fontSize: 17, fontWeight: '800', color: '#111' },
  verified: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#111' },
  sectionDesc: { fontSize: 12, color: '#6B7280', marginTop: 2, marginBottom: 12 },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  addPillText: { color: '#7C3AED', fontWeight: '700', fontSize: 12 },
  empty: {
    textAlign: 'center',
    color: '#9CA3AF',
    paddingVertical: 20,
    fontSize: 13,
  },
  placeRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
  },
  placeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  placeTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  placeLabel: { fontSize: 14, fontWeight: '800', color: '#111' },
  placeAddr: { fontSize: 12, color: '#6B7280', marginTop: 2, lineHeight: 16 },
  notifRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  notifLabel: { fontSize: 12, color: '#374151', fontWeight: '600', flex: 1 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 16 },
  contactRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  contactInitial: { color: '#fff', fontWeight: '800', fontSize: 16 },
  contactName: { fontSize: 14, fontWeight: '800', color: '#111' },
  contactEmail: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  contactMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: { fontSize: 10, fontWeight: '800' },
  logoutBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  logoutText: { color: '#B91C1C', fontWeight: '700', fontSize: 15 },
  shortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EDE9FE',
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,
  },
  shortcutIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutTitle: { fontSize: 14, fontWeight: '800', color: '#5B21B6' },
  shortcutDesc: { fontSize: 11, color: '#6D28D9', marginTop: 2, fontWeight: '600' },
});

const contactStyles = StyleSheet.create({
  verifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    marginTop: 14,
  },
  verifyLabel: { fontSize: 13, fontWeight: '700', color: '#111' },
  verifyHint: { fontSize: 11, color: '#6B7280', marginTop: 2, lineHeight: 15 },
});

const myStyles = StyleSheet.create({
  statsBlock: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800', color: '#111', letterSpacing: -0.3 },
  statLabel: { fontSize: 10, color: '#6B7280', fontWeight: '700', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#E5E7EB', marginHorizontal: 4 },
  trustPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  trustText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  interactionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  interactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  interactionText: { fontSize: 11, fontWeight: '700', color: '#374151' },
  emptyBox: { alignItems: 'center', paddingVertical: 50 },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginTop: 10,
  },
  emptyHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
});
