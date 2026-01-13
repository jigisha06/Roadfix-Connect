import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { MapPin, Upload, X, LogOut, Clock, FileText, Award, Globe, WifiOff, CheckCircle, AlertTriangle, Users } from 'lucide-react';
import { supabase, Report, StatusHistory, UserStats } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface LocationMarkerProps {
  position: [number, number] | null;
  setPosition: (pos: [number, number]) => void;
}

function LocationMarker({ position, setPosition }: LocationMarkerProps) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position ? <Marker position={position} /> : null;
}

const translations = {
  English: {
    appTitle: 'Roadfix Connect',
    appSubtitle: 'Report road issues in your area',
    offlineMode: 'Offline Mode',
    points: 'pts',
    contributor: 'Road Safety Contributor',
    logout: 'Logout',
    reportIssue: 'Report an Issue',
    clickMap: 'Click on the map to select a location',
    issueType: 'Issue Type',
    selectIssue: 'Select an issue type',
    pothole: 'Pothole',
    streetlight: 'Streetlight Not Working',
    drainage: 'Drainage Problem',
    roadDamage: 'Road Damage',
    other: 'Other',
    customIssue: 'Please specify the issue',
    description: 'Description (Optional)',
    uploadPhoto: 'Upload Photo',
    submitting: 'Submitting...',
    submit: 'Submit Report',
    myReports: 'My Reports',
    loadingReports: 'Loading your reports...',
    noReports: "You haven't submitted any reports yet",
    noReportsHint: 'Click the button on the map to report an issue',
    submitted: 'Submitted',
    viewFullTimeline: 'View Full Timeline',
    communityReports: 'Community Reports',
    communityHint: 'Confirm issues reported by others to help prioritize them',
    noCommunityReports: 'No community reports available',
    confirmIssue: 'Confirm Issue',
    confirmed: 'Confirmed',
    aiVerified: 'AI Verified',
    highPriority: 'High Priority',
    verifiedBy: 'Verified by',
    citizen: 'citizen',
    citizens: 'citizens',
    escalated: 'Escalated',
    highPriorityLabel: 'High Priority',
    pending: 'Pending',
    inProgress: 'In Progress',
    resolved: 'Resolved',
    pendingExplanation: 'Awaiting verification',
    inProgressExplanation: 'Assigned to authority',
    resolvedExplanation: 'Issue fixed and closed'
  },
  Hindi: {
    appTitle: 'रोडफिक्स कनेक्ट',
    appSubtitle: 'अपने क्षेत्र में सड़क की समस्याओं की रिपोर्ट करें',
    offlineMode: 'ऑफ़लाइन मोड',
    points: 'अंक',
    contributor: 'सड़क सुरक्षा योगदानकर्ता',
    logout: 'लॉग आउट',
    reportIssue: 'समस्या की रिपोर्ट करें',
    clickMap: 'स्थान चुनने के लिए मानचित्र पर क्लिक करें',
    issueType: 'समस्या का प्रकार',
    selectIssue: 'समस्या का प्रकार चुनें',
    pothole: 'गड्ढा',
    streetlight: 'स्ट्रीटलाइट काम नहीं कर रही',
    drainage: 'जल निकासी की समस्या',
    roadDamage: 'सड़क क्षति',
    other: 'अन्य',
    customIssue: 'कृपया समस्या बताएं',
    description: 'विवरण (वैकल्पिक)',
    uploadPhoto: 'फोटो अपलोड करें',
    submitting: 'जमा हो रहा है...',
    submit: 'रिपोर्ट जमा करें',
    myReports: 'मेरी रिपोर्ट्स',
    loadingReports: 'आपकी रिपोर्ट्स लोड हो रही हैं...',
    noReports: 'आपने अभी तक कोई रिपोर्ट जमा नहीं की है',
    noReportsHint: 'समस्या की रिपोर्ट करने के लिए मानचित्र पर बटन पर क्लिक करें',
    submitted: 'जमा किया',
    viewFullTimeline: 'पूरी टाइमलाइन देखें',
    communityReports: 'समुदाय रिपोर्ट्स',
    communityHint: 'प्राथमिकता देने में मदद के लिए दूसरों द्वारा रिपोर्ट की गई समस्याओं की पुष्टि करें',
    noCommunityReports: 'कोई समुदाय रिपोर्ट उपलब्ध नहीं है',
    confirmIssue: 'समस्या की पुष्टि करें',
    confirmed: 'पुष्टि की गई',
    aiVerified: 'एआई सत्यापित',
    highPriority: 'उच्च प्राथमिकता',
    verifiedBy: 'द्वारा सत्यापित',
    citizen: 'नागरिक',
    citizens: 'नागरिक',
    escalated: 'बढ़ाया गया',
    highPriorityLabel: 'उच्च प्राथमिकता',
    pending: 'लंबित',
    inProgress: 'प्रगति में',
    resolved: 'हल हो गया',
    pendingExplanation: 'सत्यापन की प्रतीक्षा में',
    inProgressExplanation: 'प्राधिकरण को सौंपा गया',
    resolvedExplanation: 'समस्या ठीक की गई और बंद की गई'
  },
  Tamil: {
    appTitle: 'ரோட்ஃபிக்ஸ் கனெக்ட்',
    appSubtitle: 'உங்கள் பகுதியில் சாலை பிரச்சினைகளை தெரிவிக்கவும்',
    offlineMode: 'ஆஃப்லைன் பயன்முறை',
    points: 'புள்ளிகள்',
    contributor: 'சாலை பாதுகாப்பு பங்களிப்பாளர்',
    logout: 'வெளியேறு',
    reportIssue: 'பிரச்சினையை தெரிவிக்கவும்',
    clickMap: 'இடத்தைத் தேர்ந்தெடுக்க வரைபடத்தில் கிளிக் செய்யவும்',
    issueType: 'பிரச்சினை வகை',
    selectIssue: 'பிரச்சினை வகையைத் தேர்ந்தெடுக்கவும்',
    pothole: 'குழி',
    streetlight: 'தெரு விளக்கு வேலை செய்யவில்லை',
    drainage: 'வடிகால் பிரச்சினை',
    roadDamage: 'சாலை சேதம்',
    other: 'மற்றவை',
    customIssue: 'பிரச்சினையை குறிப்பிடவும்',
    description: 'விளக்கம் (விருப்பம்)',
    uploadPhoto: 'புகைப்படம் பதிவேற்றவும்',
    submitting: 'சமர்ப்பிக்கப்படுகிறது...',
    submit: 'அறிக்கை சமர்ப்பிக்கவும்',
    myReports: 'எனது அறிக்கைகள்',
    loadingReports: 'உங்கள் அறிக்கைகள் ஏற்றப்படுகின்றன...',
    noReports: 'நீங்கள் இன்னும் எந்த அறிக்கையும் சமர்ப்பிக்கவில்லை',
    noReportsHint: 'பிரச்சினையைத் தெரிவிக்க வரைபடத்தில் பொத்தானைக் கிளிக் செய்யவும்',
    submitted: 'சமர்ப்பிக்கப்பட்டது',
    viewFullTimeline: 'முழு காலவரிசையைக் காண்க',
    communityReports: 'சமூக அறிக்கைகள்',
    communityHint: 'முன்னுரிமை அளிக்க மற்றவர்களால் தெரிவிக்கப்பட்ட பிரச்சினைகளை உறுதிப்படுத்தவும்',
    noCommunityReports: 'சமூக அறிக்கைகள் இல்லை',
    confirmIssue: 'பிரச்சினையை உறுதிப்படுத்தவும்',
    confirmed: 'உறுதிப்படுத்தப்பட்டது',
    aiVerified: 'AI சரிபார்க்கப்பட்டது',
    highPriority: 'அதிக முன்னுரிமை',
    verifiedBy: 'சரிபார்க்கப்பட்டது',
    citizen: 'குடிமகன்',
    citizens: 'குடிமக்கள்',
    escalated: 'அதிகரிக்கப்பட்டது',
    highPriorityLabel: 'அதிக முன்னுரிமை',
    pending: 'நிலுவையில்',
    inProgress: 'முன்னேற்றத்தில்',
    resolved: 'தீர்க்கப்பட்டது',
    pendingExplanation: 'சரிபார்ப்புக்காக காத்திருக்கிறது',
    inProgressExplanation: 'அதிகாரத்திற்கு ஒதுக்கப்பட்டது',
    resolvedExplanation: 'பிரச்சினை சரிசெய்யப்பட்டு மூடப்பட்டது'
  },
  Telugu: {
    appTitle: 'రోడ్‌ఫిక్స్ కనెక్ట్',
    appSubtitle: 'మీ ప్రాంతంలో రహదారి సమస్యలను నివేదించండి',
    offlineMode: 'ఆఫ్‌లైన్ మోడ్',
    points: 'పాయింట్లు',
    contributor: 'రోడ్ సేఫ్టీ కంట్రిబ్యూటర్',
    logout: 'లాగ్ అవుట్',
    reportIssue: 'సమస్యను నివేదించండి',
    clickMap: 'స్థానాన్ని ఎంచుకోవడానికి మ్యాప్‌పై క్లిక్ చేయండి',
    issueType: 'సమస్య రకం',
    selectIssue: 'సమస్య రకాన్ని ఎంచుకోండి',
    pothole: 'గుంట',
    streetlight: 'స్ట్రీట్‌లైట్ పని చేయడం లేదు',
    drainage: 'డ్రైనేజీ సమస్య',
    roadDamage: 'రహదారి నష్టం',
    other: 'ఇతర',
    customIssue: 'దయచేసి సమస్యను పేర్కొనండి',
    description: 'వివరణ (ఐచ్ఛికం)',
    uploadPhoto: 'ఫోటో అప్‌లోడ్ చేయండి',
    submitting: 'సమర్పిస్తోంది...',
    submit: 'నివేదిక సమర్పించండి',
    myReports: 'నా నివేదికలు',
    loadingReports: 'మీ నివేదికలు లోడ్ అవుతున్నాయి...',
    noReports: 'మీరు ఇంకా ఏ నివేదికలను సమర్పించలేదు',
    noReportsHint: 'సమస్యను నివేదించడానికి మ్యాప్‌లోని బటన్‌పై క్లిక్ చేయండి',
    submitted: 'సమర్పించబడింది',
    viewFullTimeline: 'పూర్తి టైమ్‌లైన్ చూడండి',
    communityReports: 'కమ్యూనిటీ నివేదికలు',
    communityHint: 'ప్రాధాన్యత ఇవ్వడంలో సహాయపడటానికి ఇతరులచే నివేదించబడిన సమస్యలను నిర్ధారించండి',
    noCommunityReports: 'కమ్యూనిటీ నివేదికలు అందుబాటులో లేవు',
    confirmIssue: 'సమస్యను నిర్ధారించండి',
    confirmed: 'నిర్ధారించబడింది',
    aiVerified: 'AI ధృవీకరించబడింది',
    highPriority: 'అధిక ప్రాధాన్యత',
    verifiedBy: 'ధృవీకరించబడింది',
    citizen: 'పౌరుడు',
    citizens: 'పౌరులు',
    escalated: 'పెంచబడింది',
    highPriorityLabel: 'అధిక ప్రాధాన్యత',
    pending: 'పెండింగ్',
    inProgress: 'పురోగతిలో',
    resolved: 'పరిష్కరించబడింది',
    pendingExplanation: 'ధృవీకరణ కోసం వేచి ఉంది',
    inProgressExplanation: 'అధికారానికి కేటాయించబడింది',
    resolvedExplanation: 'సమస్య పరిష్కరించబడింది మరియు మూసివేయబడింది'
  }
};

export default function UserPage() {
  const [showForm, setShowForm] = useState(false);
  const [issueType, setIssueType] = useState('');
  const [customIssueType, setCustomIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{crowdVerified: boolean; nearbyCount: number; priority: string} | null>(null);
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [isOnline] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const t = translations[selectedLanguage as keyof typeof translations];

  useEffect(() => {
    fetchMyReports();
    fetchUserStats();
  }, [user]);

  const fetchMyReports = async () => {
    if (!user) return;

    setLoadingReports(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoadingReports(false);
    }
  };

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setUserStats(data);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const fetchStatusHistory = async (reportId: string) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('status_history')
        .select('*')
        .eq('report_id', reportId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      setStatusHistory(data || []);
    } catch (error) {
      console.error('Error fetching status history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const openTimeline = (report: Report) => {
    setSelectedReport(report);
    fetchStatusHistory(report.id);
  };

  const closeTimeline = () => {
    setSelectedReport(null);
    setStatusHistory([]);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!issueType || !description || !image || !position) {
      alert('Please fill all required fields and select a location on the map');
      return;
    }

    if (issueType === 'Other' && !customIssueType.trim()) {
      alert('Please specify the issue type');
      return;
    }

    setLoading(true);

    try {
      const fileExt = image.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('report-images')
        .upload(filePath, image);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('report-images')
        .getPublicUrl(filePath);

      const finalIssueType = issueType === 'Other' ? customIssueType : issueType;

      const { data: insertData, error: insertError } = await supabase
        .from('reports')
        .insert([
          {
            issue_type: finalIssueType,
            description: description,
            image_url: publicUrl,
            latitude: position[0],
            longitude: position[1],
            status: 'Pending',
            user_id: user?.id,
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      if (insertData) {
        setDuplicateInfo({
          crowdVerified: insertData.crowd_verified,
          nearbyCount: insertData.nearby_reports_count,
          priority: insertData.priority
        });
      }

      setSuccess(true);
      fetchMyReports();
      setTimeout(() => {
        setShowForm(false);
        setSuccess(false);
        setDuplicateInfo(null);
        setIssueType('');
        setCustomIssueType('');
        setDescription('');
        setImage(null);
        setPosition(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 3500);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Low':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusExplanation = (status: string) => {
    switch (status) {
      case 'Pending':
        return t.pendingExplanation;
      case 'In Progress':
        return t.inProgressExplanation;
      case 'Resolved':
        return t.resolvedExplanation;
      default:
        return '';
    }
  };

  const getStatusStage = (status: string): number => {
    switch (status) {
      case 'Pending':
        return 1;
      case 'In Progress':
        return 2;
      case 'Resolved':
        return 3;
      default:
        return 0;
    }
  };

  const getTimeSinceReported = (createdAt: string): { text: string; isOverdue: boolean } => {
    const now = new Date();
    const reportDate = new Date(createdAt);
    const diffMs = now.getTime() - reportDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    let text = '';
    if (diffDays > 0) {
      text = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      text = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      text = 'Just now';
    }

    const isOverdue = diffDays >= 7;
    return { text, isOverdue };
  };

  const getAIInsight = (report: Report): string => {
    const insights: string[] = [];

    if (report.confirmation_count >= 5) {
      insights.push('High-risk area due to multiple reports');
    } else if (report.confirmation_count >= 3) {
      insights.push('Recurring issue pattern detected');
    }

    if (report.issue_type === 'Pothole' && report.priority === 'High') {
      insights.push('Critical road safety hazard');
    } else if (report.issue_type === 'Waterlogging') {
      insights.push('Likely water drainage issue');
    } else if (report.issue_type === 'Street Light') {
      insights.push('Public safety concern - immediate attention needed');
    } else if (report.issue_type === 'Road Damage') {
      insights.push('Infrastructure maintenance required');
    }

    if (report.escalated) {
      insights.push('Escalated to higher authorities');
    }

    if (report.ai_verified && report.priority === 'High') {
      insights.push('AI-verified critical issue');
    }

    return insights[0] || 'Standard maintenance request';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t.appTitle}</h1>
              <p className="text-sm text-gray-600 mt-1">{t.appSubtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/citizen/community-reports')}
                className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors border border-green-200"
              >
                <Users size={18} />
                <span className="font-medium">{t.communityReports}</span>
              </button>

              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <Globe size={16} className="text-gray-600" />
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="text-sm bg-transparent border-none outline-none cursor-pointer text-gray-700"
                >
                  <option>English</option>
                  <option>Hindi</option>
                  <option>Tamil</option>
                  <option>Telugu</option>
                </select>
              </div>

              {!isOnline && (
                <div className="flex items-center gap-1 px-3 py-2 bg-orange-50 rounded-lg border border-orange-200">
                  <WifiOff size={16} className="text-orange-600" />
                  <span className="text-xs text-orange-600 font-medium">{t.offlineMode}</span>
                </div>
              )}

              {userStats && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
                  <Award size={16} className="text-blue-600" />
                  <span className="text-sm font-semibold text-blue-900">{userStats.points} {t.points}</span>
                  {userStats.verified_reports_count >= 5 && (
                    <span className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded-full">{t.contributor}</span>
                  )}
                </div>
              )}

              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <LogOut size={18} />
                <span>{t.logout}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="h-[500px] relative">
            <MapContainer
              center={[28.6139, 77.2090]}
              zoom={13}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationMarker position={position} setPosition={setPosition} />
            </MapContainer>

            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="absolute bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 transition-colors z-[1000]"
              >
                <MapPin size={20} />
                {t.reportIssue}
              </button>
            )}
          </div>
        </div>

        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <FileText size={24} className="text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">{t.myReports}</h2>
              </div>
            </div>

            <div className="p-6">
              {loadingReports ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <p className="text-gray-600 mt-4">{t.loadingReports}</p>
                </div>
              ) : myReports.length === 0 ? (
                <div className="text-center py-12">
                  <FileText size={48} className="text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">{t.noReports}</p>
                  <p className="text-sm text-gray-500 mt-2">{t.noReportsHint}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myReports.map((report) => (
                    <div
                      key={report.id}
                      className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <div className="aspect-video bg-gray-100 relative">
                        <img
                          src={report.image_url}
                          alt={report.issue_type}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="p-4 space-y-4">
                        <div>
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900 text-lg">{report.issue_type}</h3>
                            {(() => {
                              const timeInfo = getTimeSinceReported(report.created_at);
                              return (
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  timeInfo.isOverdue && report.status !== 'Resolved'
                                    ? 'bg-red-100 text-red-700 border border-red-200'
                                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                                }`}>
                                  {timeInfo.isOverdue && report.status !== 'Resolved' ? '⚠️ Overdue' : timeInfo.text}
                                </span>
                              );
                            })()}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {t.submitted} {new Date(report.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>

                        {report.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">{report.description}</p>
                        )}

                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200 shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-2.5 h-2.5 rounded-full ${
                                report.status === 'Resolved' ? 'bg-green-500 shadow-lg shadow-green-200' :
                                report.status === 'In Progress' ? 'bg-blue-500 animate-pulse shadow-lg shadow-blue-200' :
                                'bg-yellow-500 shadow-lg shadow-yellow-200'
                              }`}></div>
                              <span className="text-sm font-bold text-gray-900">{report.status}</span>
                            </div>
                            <span className="text-xs text-gray-600 font-medium">{getStatusExplanation(report.status)}</span>
                          </div>

                          <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex flex-col items-center gap-1 z-10">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
                                  getStatusStage(report.status) >= 1
                                    ? 'bg-gradient-to-br from-green-400 to-green-600 text-white shadow-lg scale-110'
                                    : 'bg-white border-2 border-gray-300 text-gray-400'
                                }`}>
                                  <CheckCircle size={18} />
                                </div>
                                <span className={`text-[10px] font-semibold mt-1 ${
                                  getStatusStage(report.status) >= 1 ? 'text-gray-800' : 'text-gray-400'
                                }`}>
                                  {t.submitted}
                                </span>
                              </div>

                              <div className="flex flex-col items-center gap-1 z-10">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
                                  report.ai_verified || report.confirmation_count > 0
                                    ? 'bg-gradient-to-br from-purple-400 to-purple-600 text-white shadow-lg scale-110'
                                    : 'bg-white border-2 border-gray-300 text-gray-400'
                                }`}>
                                  <CheckCircle size={18} />
                                </div>
                                <span className={`text-[10px] font-semibold mt-1 ${
                                  report.ai_verified || report.confirmation_count > 0 ? 'text-gray-800' : 'text-gray-400'
                                }`}>
                                  Verified
                                </span>
                              </div>

                              <div className="flex flex-col items-center gap-1 z-10">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
                                  getStatusStage(report.status) >= 2
                                    ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-lg scale-110 animate-pulse'
                                    : 'bg-white border-2 border-gray-300 text-gray-400'
                                }`}>
                                  <Clock size={18} />
                                </div>
                                <span className={`text-[10px] font-semibold mt-1 ${
                                  getStatusStage(report.status) >= 2 ? 'text-gray-800' : 'text-gray-400'
                                }`}>
                                  {t.inProgress}
                                </span>
                              </div>

                              <div className="flex flex-col items-center gap-1 z-10">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
                                  getStatusStage(report.status) >= 3
                                    ? 'bg-gradient-to-br from-green-400 to-green-600 text-white shadow-lg scale-110'
                                    : 'bg-white border-2 border-gray-300 text-gray-400'
                                }`}>
                                  <CheckCircle size={18} />
                                </div>
                                <span className={`text-[10px] font-semibold mt-1 ${
                                  getStatusStage(report.status) >= 3 ? 'text-gray-800' : 'text-gray-400'
                                }`}>
                                  {t.resolved}
                                </span>
                              </div>
                            </div>

                            <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-300 -z-0">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  getStatusStage(report.status) >= 3 ? 'bg-gradient-to-r from-green-500 to-green-600 w-full' :
                                  getStatusStage(report.status) >= 2 ? 'bg-gradient-to-r from-green-500 via-purple-500 to-blue-600 w-2/3' :
                                  report.ai_verified || report.confirmation_count > 0 ? 'bg-gradient-to-r from-green-500 to-purple-600 w-1/3' :
                                  'bg-green-500 w-0'
                                }`}
                              ></div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {report.ai_verified && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full border border-green-200">
                              <CheckCircle size={12} />
                              {t.aiVerified}
                            </span>
                          )}
                          {report.priority === 'High' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full border border-red-200">
                              <AlertTriangle size={12} />
                              {t.highPriorityLabel}
                            </span>
                          )}
                          {report.confirmation_count > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full border border-blue-200">
                              <Users size={12} />
                              {t.verifiedBy} {report.confirmation_count} {report.confirmation_count === 1 ? t.citizen : t.citizens}
                            </span>
                          )}
                          {report.escalated && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full border border-orange-200">
                              <AlertTriangle size={12} />
                              {t.escalated}
                            </span>
                          )}
                        </div>

                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5">
                              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 9a1 1 0 012 0v4a1 1 0 11-2 0V9zm1-5a1 1 0 100 2 1 1 0 000-2z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-blue-900 mb-0.5">AI Insight</p>
                              <p className="text-xs text-blue-800 leading-relaxed">{getAIInsight(report)}</p>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => openTimeline(report)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                        >
                          <Clock size={16} />
                          {t.viewFullTimeline}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[2000]">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">{t.reportIssue}</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              {success ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">Report Submitted!</p>
                  <p className="text-sm text-gray-600 mt-2">Thank you for helping improve our roads</p>

                  {duplicateInfo && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      {duplicateInfo.crowdVerified ? (
                        <div className="bg-blue-50 rounded-lg p-3 mb-2">
                          <p className="text-sm font-semibold text-blue-900">Crowd Verified!</p>
                          <p className="text-xs text-blue-700 mt-1">
                            {duplicateInfo.nearbyCount + 1} {duplicateInfo.nearbyCount + 1 === 1 ? 'report' : 'reports'} within 50 meters
                          </p>
                        </div>
                      ) : null}
                      <div className={`rounded-lg p-2 ${
                        duplicateInfo.priority === 'High' ? 'bg-red-50 text-red-900' :
                        duplicateInfo.priority === 'Medium' ? 'bg-orange-50 text-orange-900' :
                        'bg-gray-50 text-gray-900'
                      }`}>
                        <p className="text-xs font-medium">Priority: {duplicateInfo.priority}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t.issueType} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={issueType}
                      onChange={(e) => setIssueType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">{t.selectIssue}</option>
                      <option value="Pothole">{t.pothole}</option>
                      <option value="Waterlogging">Waterlogging</option>
                      <option value="Faulty Signal">Faulty Signal</option>
                      <option value="Wrong Parking">Wrong Parking</option>
                      <option value="Street Light">{t.streetlight}</option>
                      <option value="Road Damage">{t.roadDamage}</option>
                      <option value="Other">{t.other}</option>
                    </select>
                  </div>

                  {issueType === 'Other' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t.customIssue} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={customIssueType}
                        onChange={(e) => setCustomIssueType(e.target.value)}
                        placeholder={t.customIssue}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t.description} <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t.description}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t.uploadPhoto} <span className="text-red-500">*</span>
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="image-upload"
                        required
                      />
                      <label
                        htmlFor="image-upload"
                        className="cursor-pointer flex flex-col items-center"
                      >
                        <Upload size={32} className="text-gray-400 mb-2" />
                        <span className="text-sm text-gray-600">
                          {image ? image.name : 'Click to upload image'}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location <span className="text-red-500">*</span>
                    </label>
                    {position ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Latitude</label>
                          <input
                            type="text"
                            value={position[0].toFixed(6)}
                            readOnly
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Longitude</label>
                          <input
                            type="text"
                            value={position[1].toFixed(6)}
                            readOnly
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-500">
                        {t.clickMap}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? t.submitting : t.submit}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[2000]">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Status Timeline</h2>
                  <p className="text-sm text-gray-600 mt-1">{selectedReport.issue_type}</p>
                </div>
                <button
                  onClick={closeTimeline}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {loadingHistory ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : statusHistory.length === 0 ? (
                  <p className="text-center text-gray-600 py-8">No status changes yet</p>
                ) : (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                    <div className="space-y-6">
                      {statusHistory.map((history, index) => (
                        <div key={history.id} className="relative flex gap-4">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                            history.new_status === 'Resolved' ? 'bg-green-500' :
                            history.new_status === 'In Progress' ? 'bg-blue-500' :
                            'bg-yellow-500'
                          }`}>
                            {index === 0 ? (
                              <div className="w-3 h-3 bg-white rounded-full"></div>
                            ) : (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                          <div className="flex-1 pb-6">
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                              <div className="flex items-center justify-between mb-2">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(history.new_status)}`}>
                                  {history.new_status}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(history.changed_at).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              {history.old_status && (
                                <p className="text-sm text-gray-600">
                                  Changed from <span className="font-medium">{history.old_status}</span> to <span className="font-medium">{history.new_status}</span>
                                </p>
                              )}
                              {!history.old_status && (
                                <p className="text-sm text-gray-600">
                                  Report created with status <span className="font-medium">{history.new_status}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Current Status:</span>
                    <span className={`ml-2 font-medium ${
                      selectedReport.status === 'Resolved' ? 'text-green-600' :
                      selectedReport.status === 'In Progress' ? 'text-blue-600' :
                      'text-yellow-600'
                    }`}>{selectedReport.status}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Priority:</span>
                    <span className={`ml-2 font-medium ${
                      selectedReport.priority === 'High' ? 'text-red-600' :
                      selectedReport.priority === 'Medium' ? 'text-orange-600' :
                      'text-gray-600'
                    }`}>{selectedReport.priority}</span>
                  </div>
                  {selectedReport.crowd_verified && (
                    <div className="col-span-2">
                      <span className="text-gray-600">Crowd Verified:</span>
                      <span className="ml-2 font-medium text-blue-600">Yes ({selectedReport.nearby_reports_count + 1} reports)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
