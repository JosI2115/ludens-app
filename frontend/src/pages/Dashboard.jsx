import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const navigate = useNavigate()
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-purple-600 text-white px-6 py-4 flex justify-between items-center shadow">
        <div>
          <h1 className="text-xl font-bold">LUDENS</h1>
          <p className="text-purple-200 text-xs">Clases de Regularización</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium">{usuario.nombre}</p>
            <p className="text-purple-200 text-xs capitalize">{usuario.rol}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-purple-700 hover:bg-purple-800 px-3 py-1 rounded-lg text-sm transition"
          >
            Salir
          </button>
        </div>
      </nav>

      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Bienvenida, {usuario.nombre}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-6 border-l-4 border-purple-500">
            <p className="text-gray-500 text-sm">Alumnos activos</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">0</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6 border-l-4 border-yellow-500">
            <p className="text-gray-500 text-sm">Pagos pendientes</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">0</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6 border-l-4 border-red-500">
            <p className="text-gray-500 text-sm">En riesgo de baja</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">0</p>
          </div>
        </div>

        <h3 className="text-lg font-bold text-gray-700 mb-4">Módulos</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/alumnos')}
            className="bg-white rounded-xl shadow p-6 text-center hover:shadow-md transition hover:border-purple-300 border border-transparent"
          >
            <div className="text-3xl mb-2">👨‍🎓</div>
            <p className="font-medium text-gray-800">Alumnos</p>
            <p className="text-xs text-gray-400 mt-1">Gestionar alumnos</p>
          </button>
          <button
            disabled
            className="bg-white rounded-xl shadow p-6 text-center opacity-50 cursor-not-allowed"
          >
            <div className="text-3xl mb-2">💰</div>
            <p className="font-medium text-gray-800">Pagos</p>
            <p className="text-xs text-gray-400 mt-1">Próximamente</p>
          </button>
          <button
            disabled
            className="bg-white rounded-xl shadow p-6 text-center opacity-50 cursor-not-allowed"
          >
            <div className="text-3xl mb-2">📋</div>
            <p className="font-medium text-gray-800">Asistencias</p>
            <p className="text-xs text-gray-400 mt-1">Próximamente</p>
          </button>
          <button
            disabled
            className="bg-white rounded-xl shadow p-6 text-center opacity-50 cursor-not-allowed"
          >
            <div className="text-3xl mb-2">📊</div>
            <p className="font-medium text-gray-800">Reportes</p>
            <p className="text-xs text-gray-400 mt-1">Próximamente</p>
          </button>
        </div>
      </div>
    </div>
  )
}