import { useState, useEffect } from 'react'
import { usuariosService, sucursalesService } from '../services/api'

const ROL_COLORES = {
  directora:    'bg-purple-100 text-purple-700',
  encargada:    'bg-blue-100 text-blue-700',
  maestra:      'bg-green-100 text-green-700',
  recepcionista:'bg-yellow-100 text-yellow-700',
  contadora:    'bg-pink-100 text-pink-700',
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [sucursales, setSucursales] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalUsuario, setModalUsuario] = useState(null)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      const [usuariosRes, sucursalesRes] = await Promise.all([
        usuariosService.getAll(),
        sucursalesService.getAll(),
      ])
      setUsuarios(usuariosRes.data)
      setSucursales(sucursalesRes.data)
    } catch (err) {
      console.error('Error cargando usuarios')
    } finally {
      setLoading(false)
    }
  }

  const getNombreSucursal = (sucursal_id) => {
    const s = sucursales.find(s => s.id === sucursal_id)
    return s ? s.nombre : '—'
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Usuarios</h2>
        <span className="text-sm text-gray-400">{usuarios.length} usuarios registrados</span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando usuarios...</div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Nombre</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Correo</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Rol</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Sucursal</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Estado</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{u.nombre}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROL_COLORES[u.rol]}`}>
                      {u.rol}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {getNombreSucursal(u.sucursal_id)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setModalUsuario(u)}
                      className="text-purple-600 hover:text-purple-800 text-xs font-medium"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalUsuario && (
        <ModalEditarUsuario
          usuario={modalUsuario}
          sucursales={sucursales}
          onClose={() => setModalUsuario(null)}
          onSuccess={() => { setModalUsuario(null); cargarDatos() }}
        />
      )}
    </div>
  )
}

function ModalEditarUsuario({ usuario, sucursales, onClose, onSuccess }) {
  const [form, setForm] = useState({
    nombre: usuario.nombre,
    rol: usuario.rol,
    sucursal_id: usuario.sucursal_id || '',
    activo: usuario.activo,
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleGuardar = async () => {
    setLoading(true)
    setError('')
    try {
      const data = { ...form }
      if (!data.password) delete data.password
      if (!data.sucursal_id) data.sucursal_id = null
      await usuariosService.actualizar(usuario.id, data)
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800">Editar usuario</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input name="nombre" value={form.nombre} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select name="rol" value={form.rol} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
              <option value="directora">Directora</option>
              <option value="encargada">Encargada</option>
              <option value="maestra">Maestra</option>
              <option value="recepcionista">Recepcionista</option>
              <option value="contadora">Contadora</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
            <select name="sucursal_id" value={form.sucursal_id} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
              <option value="">Sin sucursal (global)</option>
              {sucursales.map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña (opcional)</label>
            <input name="password" type="password" value={form.password} onChange={handleChange}
              placeholder="Dejar vacío para no cambiar"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          </div>
          <div className="flex items-center gap-2">
            <input name="activo" type="checkbox" checked={form.activo} onChange={handleChange}
              className="w-4 h-4 text-purple-600" />
            <label className="text-sm text-gray-700">Usuario activo</label>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button onClick={handleGuardar} disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white py-2 rounded-lg text-sm font-medium transition">
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}