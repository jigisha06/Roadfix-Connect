import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThumbsUp, Award, Globe, LogOut, ArrowLeft, MapPin, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase, Report, UserStats } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const translations = {
  English: {
    appTitle: 'Roadfix Connect',
    communityReports: 'Community Reports',
    communityHint: 'Confirm issues reported by others to help prioritize them',
    noCommunityReports: 'No community reports available',
    confirmIssue: 'Confirm Issue',
    confirmed: 'Confirmed',
    points: 'pts',
    contributor: 'Road Safety Contributor',
    logout: 'Logout',
    backToDashboard: 'Back to Dashboard',
    aiVerified: 'AI Verified',
    highPriorityLabel: 'High Priority',
    verifiedBy: 'Verified by',
    citizen: 'citizen',
    citizens: 'citizens',
    escalated: 'Escalated',
    myReport: 'Your Report',
    loadingReports: 'Loading community reports...',
    pending: 'Pending',
    inProgress: 'In Progress',
    resolved: 'Resolved',
  },
  Hindi: {
    appTitle: 'रोडफिक्स कनेक्ट',
    communityReports: 'समुदाय रिपोर्ट्स',
    communityHint: 'प्राथमिकता देने में मदद के लिए दूसरों द्वारा रिपोर्ट की गई समस्याओं की पुष्टि करें',
    noCommunityReports: 'कोई समुदाय रिपोर्ट उपलब्ध नहीं है',
    confirmIssue: 'समस्या की पुष्टि करें',
    confirmed: 'पुष्टि की गई',
    points: 'अंक',
    contributor: 'सड़क सुरक्षा योगदानकर्ता',
    logout: 'लॉग आउट',
    backToDashboard: 'डैशबोर्ड पर वापस जाएं',
    aiVerified: 'एआई सत्यापित',
    highPriorityLabel: 'उच्च प्राथमिकता',
    verifiedBy: 'द्वारा सत्यापित',
    citizen: 'नागरिक',
    citizens: 'नागरिक',
    escalated: 'बढ़ाया गया',
    myReport: 'आपकी रिपोर्ट',
    loadingReports: 'समुदाय रिपोर्ट्स लोड हो रही हैं...',
    pending: 'लंबित',
    inProgress: 'प्रगति में',
    resolved: 'हल हो गया',
  },
  Tamil: {
    appTitle: 'ரோட்ஃபிக்ஸ் கனெக்ட்',
    communityReports: 'சமூக அறிக்கைகள்',
    communityHint: 'முன்னுரிமை அளிக்க மற்றவர்களால் தெரிவிக்கப்பட்ட பிரச்சினைகளை உறுதிப்படுத்தவும்',
    noCommunityReports: 'சமூக அறிக்கைகள் இல்லை',
    confirmIssue: 'பிரச்சினையை உறுதிப்படுத்தவும்',
    confirmed: 'உறுதிப்படுத்தப்பட்டது',
    points: 'புள்ளிகள்',
    contributor: 'சாலை பாதுகாப்பு பங்களிப்பாளர்',
    logout: 'வெளியேறு',
    backToDashboard: 'டாஷ்போர்டுக்குத் திரும்பு',
    aiVerified: 'AI சரிபார்க்கப்பட்டது',
    highPriorityLabel: 'அதிக முன்னுரிமை',
    verifiedBy: 'சரிபார்க்கப்பட்டது',
    citizen: 'குடிமகன்',
    citizens: 'குடிமக்கள்',
    escalated: 'அதிகரிக்கப்பட்டது',
    myReport: 'உங்கள் அறிக்கை',
    loadingReports: 'சமூக அறிக்கைகள் ஏற்றப்படுகின்றன...',
    pending: 'நிலுவையில்',
    inProgress: 'முன்னேற்றத்தில்',
    resolved: 'தீர்க்கப்பட்டது',
  },
  Telugu: {
    appTitle: 'రోడ్‌ఫిక్స్ కనెక్ట్',
    communityReports: 'కమ్యూనిటీ నివేదికలు',
    communityHint: 'ప్రాధాన్యత ఇవ్వడంలో సహాయపడటానికి ఇతరులచే నివేదించబడిన సమస్యలను నిర్ధారించండి',
    noCommunityReports: 'కమ్యూనిటీ నివేదికలు అందుబాటులో లేవు',
    confirmIssue: 'సమస్యను నిర్ధారించండి',
    confirmed: 'నిర్ధారించబడింది',
    points: 'పాయింట్లు',
    contributor: 'రోడ్ సేఫ్టీ కంట్రిబ్యూటర్',
    logout: 'లాగ్ అవుట్',
    backToDashboard: 'డ్యాష్‌బోర్డ్‌కు తిరిగి వెళ్లండి',
    aiVerified: 'AI ధృవీకరించబడింది',
    highPriorityLabel: 'అధిక ప్రాధాన్యత',
    verifiedBy: 'ధృవీకరించబడింది',
    citizen: 'పౌరుడు',
    citizens: 'పౌరులు',
    escalated: 'పెంచబడింది',
    myReport: 'మీ నివేదిక',
    loadingReports: 'కమ్యూనిటీ నివేదికలు లోడ్ అవుతున్నాయి...',
    pending: 'పెండింగ్',
    inProgress: 'పురోగతిలో',
    resolved: 'పరిష్కరించబడింది',
  }
};

export default function CommunityReports() {
  const [communityReports, setCommunityReports] = useState<Report[]>([]);
  const [confirmedReports, setConfirmedReports] = useState<Set<string>>(new Set());
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [loadingReports, setLoadingReports] = useState(true);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const t = translations[selectedLanguage as keyof typeof translations];

  useEffect(() => {
    fetchCommunityReports();
    fetchUserStats();
    fetchUserConfirmations();
  }, [user]);

  const fetchCommunityReports = async () => {
    setLoadingReports(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setCommunityReports(data || []);
    } catch (error) {
      console.error('Error fetching community reports:', error);
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

  const fetchUserConfirmations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('report_confirmations')
        .select('report_id')
        .eq('user_id', user.id);

      if (error) throw error;
      const confirmedIds = new Set(data?.map(c => c.report_id) || []);
      setConfirmedReports(confirmedIds);
    } catch (error) {
      console.error('Error fetching confirmations:', error);
    }
  };

  const handleConfirmReport = async (reportId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('add_report_confirmation', {
        report_id_param: reportId,
        user_id_param: user.id
      });

      if (error) throw error;

      if (data) {
        setConfirmedReports(new Set([...confirmedReports, reportId]));
        fetchCommunityReports();
        fetchUserStats();
      } else {
        alert('You have already confirmed this report or it is your own report.');
      }
    } catch (error) {
      console.error('Error confirming report:', error);
      alert('Failed to confirm report');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/citizen/dashboard')}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
                <span className="text-sm font-medium">{t.backToDashboard}</span>
              </button>
              <div className="h-8 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t.appTitle}</h1>
                <p className="text-sm text-gray-600 mt-1">{t.communityReports}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
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
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <ThumbsUp size={24} className="text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t.communityReports}</h2>
                <p className="text-sm text-gray-600 mt-1">{t.communityHint}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {loadingReports ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                <p className="text-gray-600 mt-4">{t.loadingReports}</p>
              </div>
            ) : communityReports.length === 0 ? (
              <div className="text-center py-12">
                <ThumbsUp size={48} className="text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">{t.noCommunityReports}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {communityReports.map((report) => (
                  <div
                    key={report.id}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200"
                  >
                    <div className="aspect-video bg-gray-100 relative">
                      <img
                        src={report.image_url}
                        alt={report.issue_type}
                        className="w-full h-full object-cover"
                      />
                      {report.user_id === user?.id && (
                        <div className="absolute top-2 right-2">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded-full shadow-lg">
                            <CheckCircle size={12} />
                            {t.myReport}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg">{report.issue_type}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <MapPin size={12} className="text-gray-400" />
                            <p className="text-xs text-gray-500">
                              {new Date(report.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                            report.status
                          )}`}
                        >
                          {report.status}
                        </span>
                      </div>

                      {report.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{report.description}</p>
                      )}

                      <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1.5">
                          <ThumbsUp size={14} className="text-gray-500" />
                          <span className="text-sm text-gray-600 font-medium">{report.confirmation_count}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users size={14} className="text-gray-500" />
                          <span className="text-xs text-gray-500">
                            {report.confirmation_count} {report.confirmation_count === 1 ? t.citizen : t.citizens}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(report.priority)}`}>
                          {report.priority}
                        </span>
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
                        {report.escalated && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full border border-orange-200">
                            <AlertTriangle size={12} />
                            {t.escalated}
                          </span>
                        )}
                      </div>

                      {report.user_id !== user?.id && !confirmedReports.has(report.id) ? (
                        <button
                          onClick={() => handleConfirmReport(report.id)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm hover:shadow-md"
                        >
                          <ThumbsUp size={16} />
                          {t.confirmIssue} (+5 {t.points})
                        </button>
                      ) : confirmedReports.has(report.id) ? (
                        <div className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-green-700 bg-green-50 rounded-lg border border-green-200">
                          <CheckCircle size={16} />
                          {t.confirmed}
                        </div>
                      ) : (
                        <div className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-blue-700 bg-blue-50 rounded-lg border border-blue-200">
                          <CheckCircle size={16} />
                          {t.myReport}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
