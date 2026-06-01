import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Login from './pages/Login'
import Matches from './pages/Matches'
import Leaderboard from './pages/Leaderboard'
import Admin from './pages/Admin'
import Layout from './components/Layout'
import './index.css'

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && profile?.role !== 'admin') return <Navigate to="/matches" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/matches" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/matches" replace />} />
        <Route path="matches" element={<Matches />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
      </Route>
    </Routes>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
