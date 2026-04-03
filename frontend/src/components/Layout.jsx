import { useNavigate, useLocation } from 'react-router-dom'

const menuItems = [
  { path: '/dashboard', icon: '🏠', label: 'Inicio' },
  { path: '/calendario', icon: '📅', label: 'Calendario' },
  { path: '/alumnos', icon: '👨‍🎓', label: 'Alumnos' },
  { path: '/bitacoras', icon: '📒', label: 'Bitácoras', roles: ['directora', 'encargada', 'maestra'] },
  { path: '/pagos', icon: '💰', label: 'Pagos', roles: ['directora', 'encargada', 'recepcionista', 'contadora'] },
  { path: '/asistencias', icon: '📋', label: 'Asistencias', roles: ['directora', 'encargada', 'maestra', 'recepcionista'] },
  { path: '/expedientes', icon: '📁', label: 'Expedientes', roles: ['directora', 'encargada', 'maestra', 'recepcionista'] },
  { path: '/ingresos-bajas', icon: '📊', label: 'Ingresos y Bajas', roles: ['directora', 'encargada', 'contadora'] },
  { path: '/informes', icon: '📞', label: 'Informes', roles: ['directora', 'encargada', 'recepcionista', 'contadora'] },
  { path: '/comisiones', icon: '💰', label: 'Comisiones', roles: ['directora', 'encargada', 'contadora'] },
  { path: '/docentes', icon: '👩‍🏫', label: 'Actividad Docente', roles: ['directora', 'encargada', 'maestra'] },
  { path: '/usuarios', icon: '👥', label: 'Usuarios', roles: ['directora'] },
]

export default function Layout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  const cerrarSesion = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    navigate('/login')
  }

  const menuFiltrado = menuItems.filter(item =>
    !item.roles || item.roles.includes(usuario.rol)
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col fixed h-full z-10">
        <div className="border-b border-gray-100 flex flex-col items-center py-2">
          <img
            src="https://res.cloudinary.com/dymwq2vwg/image/upload/v1775242873/LUDENS_glhzny.jpg"
            alt="LUDENS"
            className="h-50 w-auto object-contain"
          />
          <p className="text-xs text-purple-300 mt-1">Sistema Administrativo</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {menuFiltrado.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                location.pathname === item.path
                  ? 'bg-purple-50 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium text-gray-700 truncate">{usuario.nombre}</p>
            <p className="text-xs text-gray-400 capitalize">{usuario.rol}</p>
            {usuario.sucursal_nombre && (
              <p className="text-xs text-purple-500 font-medium mt-0.5">{usuario.sucursal_nombre}</p>
            )}
          </div>
          <button
            onClick={cerrarSesion}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition"
          >
            <span>🚪</span> Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="ml-56 flex-1 min-h-screen">
        {children}
      </main>
    </div>
  )
}