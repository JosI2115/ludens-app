import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const navigate = useNavigate()
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        Bienvenida, {usuario.nombre}
      </h2>
      <p className="text-gray-400 text-sm mb-8 capitalize">{usuario.rol}</p>

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

      <h3 className="text-lg font-bold text-gray-700 mb-4">Accesos rápidos</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => navigate('/alumnos')}
          className="bg-white rounded-xl shadow p-6 text-center hover:shadow-md transition border border-transparent hover:border-purple-200"
        >
          <div className="text-3xl mb-2">👨‍🎓</div>
          <p className="font-medium text-gray-800">Alumnos</p>
        </button>
        <button
          onClick={() => navigate('/pagos')}
          className="bg-white rounded-xl shadow p-6 text-center hover:shadow-md transition border border-transparent hover:border-purple-200"
        >
          <div className="text-3xl mb-2">💰</div>
          <p className="font-medium text-gray-800">Pagos</p>
        </button>
        <button
          onClick={() => navigate('/asistencias')}
          className="bg-white rounded-xl shadow p-6 text-center hover:shadow-md transition border border-transparent hover:border-purple-200"
        >
          <div className="text-3xl mb-2">📋</div>
          <p className="font-medium text-gray-800">Asistencias</p>
        </button>
        <button
          onClick={() => navigate('/reportes')}
          className="bg-white rounded-xl shadow p-6 text-center hover:shadow-md transition border border-transparent hover:border-purple-200"
        >
          <div className="text-3xl mb-2">📊</div>
          <p className="font-medium text-gray-800">Reportes</p>
        </button>
      </div>
    </div>
  )
}