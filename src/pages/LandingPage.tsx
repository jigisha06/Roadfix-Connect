import { useNavigate } from 'react-router-dom';
import { Users, Shield } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Roadfix Connect</h1>
          <p className="text-xl text-gray-600">Report and track road issues in your community</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <button
            onClick={() => navigate('/citizen/auth')}
            className="group bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 border-2 border-transparent hover:border-blue-500"
          >
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-500 transition-colors">
                <Users size={40} className="text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Citizen</h2>
              <p className="text-gray-600 text-center">
                Report road issues in your area and help improve infrastructure
              </p>
            </div>
          </button>

          <button
            onClick={() => navigate('/admin/login')}
            className="group bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 border-2 border-transparent hover:border-green-500"
          >
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-green-500 transition-colors">
                <Shield size={40} className="text-green-600 group-hover:text-white transition-colors" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Admin</h2>
              <p className="text-gray-600 text-center">
                Manage and resolve reported road issues across the city
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
