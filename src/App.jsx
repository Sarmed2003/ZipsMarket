import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { isSupabaseConfigured } from './lib/supabase'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Home from './pages/Home'
import ListingDetail from './pages/ListingDetail'
import CreateListing from './pages/CreateListing'
import EditListing from './pages/EditListing'
import Purchases from './pages/Purchases'
import Profile from './pages/Profile'
import Chat from './pages/Chat'
import Messages from './pages/Messages'
import Likes from './pages/Likes'
import Following from './pages/Following'
import Checkout from './pages/Checkout'
import './App.css'

function AppRoutes() {
  const { user, loading } = useAuth()

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-xl w-full bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <h1 className="text-2xl font-extrabold zips-wordmark animate-zips mb-3">ZipsMarket</h1>
          <p className="text-gray-700 font-semibold mb-2">Setup required</p>
          <p className="text-gray-600 mb-6">
            Your app is running, but Supabase environment variables are missing. This usually shows up as a white screen.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
            <p className="font-semibold mb-2">Fix:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Open <code className="font-mono">.env.local</code> in the project root</li>
              <li>Set <code className="font-mono">VITE_SUPABASE_URL</code> and <code className="font-mono">VITE_SUPABASE_ANON_KEY</code></li>
              <li>Restart the dev server (<code className="font-mono">npm run dev</code>)</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/signup"
        element={user ? <Navigate to="/" replace /> : <Signup />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/listing/:id"
        element={
          <ProtectedRoute>
            <ListingDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-listing"
        element={
          <ProtectedRoute>
            <CreateListing />
          </ProtectedRoute>
        }
      />
      <Route
        path="/listing/:id/edit"
        element={
          <ProtectedRoute>
            <EditListing />
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchases"
        element={
          <ProtectedRoute>
            <Purchases />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/:id"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        }
      />
      <Route
        path="/likes"
        element={
          <ProtectedRoute>
            <Likes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/following"
        element={
          <ProtectedRoute>
            <Following />
          </ProtectedRoute>
        }
      />
      <Route
        path="/checkout/:id"
        element={
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  )
}

export default App