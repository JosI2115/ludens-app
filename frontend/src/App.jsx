import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Alumnos from './pages/Alumnos'
import Pagos from './pages/Pagos'
import Asistencias from './pages/Asistencias'
import Usuarios from './pages/Usuarios'
import PerfilAlumno from './pages/PerfilAlumno'
import Layout from './components/Layout'
import Bitacoras from './pages/Bitacoras'
import Expedientes from './pages/Expedientes'
import IngresosBajas from './pages/IngresosBajas'
import Calendario from './pages/Calendario'
import ActividadDocente from './pages/ActividadDocente'

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
        <Route path="/alumnos/:id" element={<PrivateRoute><PerfilAlumno /></PrivateRoute>} />
        <Route path="/pagos" element={<PrivateRoute><Pagos /></PrivateRoute>} />
        <Route path="/asistencias" element={<PrivateRoute><Asistencias /></PrivateRoute>} />
        <Route path="/usuarios" element={<PrivateRoute><Usuarios /></PrivateRoute>} />
        <Route path="/bitacoras" element={<PrivateRoute><Bitacoras /></PrivateRoute>} />
        <Route path="/expedientes" element={<PrivateRoute><Expedientes /></PrivateRoute>} />
        <Route path="/ingresos-bajas" element={<PrivateRoute><IngresosBajas /></PrivateRoute>} />
        <Route path="/calendario" element={<PrivateRoute><Calendario /></PrivateRoute>} />
        <Route path="/docentes" element={<PrivateRoute><ActividadDocente /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App