import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Alumnos from './pages/Alumnos'
import Pagos from './pages/Pagos'
import Layout from './components/Layout'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" />
  return <Layout>{children}</Layout>
}

function App() {
  const token = localStorage.getItem('token')

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={token ? '/dashboard' : '/login'} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/alumnos" element={<PrivateRoute><Alumnos /></PrivateRoute>} />
        <Route path="/pagos" element={<PrivateRoute><Pagos /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App