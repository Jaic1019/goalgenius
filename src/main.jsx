import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import Matches from './pages/Matches'
import Leaderboard from './pages/Leaderboard'
import Groups from './pages/Groups'
import Teams from './pages/Teams'
import Stadiums from './pages/Stadiums'
import Admin from './pages/Admin'
import './index.css'

function Guard({ children, adminOnly = false }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && profile?.role !== 'admin') return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<Guard><Layout /></Guard>}>
        <Route index element={<Home />} />
        <Route path="matches" element={<Matches />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="groups" element={<Groups />} />
        <Route path="teams" element={<Teams />} />
        <Route path="stadiums" element={<Stadiums />} />
        <Route path="admin" element={<Guard adminOnly><Admin /></Guard>} />
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
