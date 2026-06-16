import { useState, useEffect } from 'react'
import api, { usuariosService, sucursalesService } from '../services/api'

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
  const [modalNuevo, setModalNuevo] = useState(false)

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
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{usuarios.length} usuarios registrados</span>
          <button
            onClick={() => setModalNuevo(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            + Nuevo usuario
          </button>
        </div>
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
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Color</th>
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
                  <td className="px-4 py-3 text-gray-500 text-sm">
                    {u.sucursal_nombre || <span className="text-purple-600 font-medium text-xs">Global</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.color ? (
                      <div className="w-6 h-6 rounded-full border border-gray-200" style={{backgroundColor: u.color}}></div>
                    ) : <span className="text-gray-300 text-xs">Sin color</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setModalUsuario(u)}
                      className="text-purple-600 hover:text-purple-800 text-xs font-medium"
                    >
                      Editar
                    </button>
                    <button
                      onClick={async () => {
                        if (!window.confirm(`¿Eliminar a ${u.nombre}?`)) return
                        try {
                          await usuariosService.eliminar(u.id)
                          cargarDatos()
                        } catch (err) {
                          alert('Error eliminando usuario')
                        }
                      }}
                      className="text-red-500 hover:text-red-700 text-xs font-medium ml-3"
                    >
                      Eliminar
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
      {modalNuevo && (
        <ModalNuevoUsuario
          sucursales={sucursales}
          onClose={() => setModalNuevo(false)}
          onSuccess={() => { setModalNuevo(false); cargarDatos() }}
        />
      )}
    </div>
  )
}

function ModalEditarUsuario({ usuario: u, sucursales, onClose, onSuccess }) {
  const [form, setForm] = useState({
    nombre: u.nombre,
    rol: u.rol,
    sucursal_id: u.sucursal_id || '',
    activo: u.activo,
    password: '',
    color: u.color || '',
    es_global: u.es_global || false,
    es_encargada_general: u.es_encargada_general || false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sucursalesUsuario, setSucursalesUsuario] = useState([])
  const [modalReasignar, setModalReasignar] = useState(false)
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  useEffect(() => {
    if (u?.id && u?.rol === 'maestra') {
      api.get(`/usuarios/${u.id}/sucursales`)
        .then(res => setSucursalesUsuario(res.data.map(s => s.id)))
        .catch(() => {})
    }
  }, [u?.id])

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
      if (!data.color) data.color = null
      await usuariosService.actualizar(u.id, data)
      if (form.rol === 'maestra') {
        await api.put(`/usuarios/${u.id}/sucursales`, { sucursal_ids: sucursalesUsuario })
      }
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
          {form.rol !== 'maestra' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
              <select name="sucursal_id" value={form.sucursal_id} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                <option value="">Global (todas las sucursales)</option>
                {sucursales.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
          )}
          {form.rol === 'maestra' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sucursales donde trabaja</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sucursalesUsuario.length === 0}
                    onChange={() => setSucursalesUsuario([])}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Todas las sucursales (global)</span>
                </label>
                <div className="border-t pt-2">
                  {sucursales.map(s => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={sucursalesUsuario.includes(s.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSucursalesUsuario(prev => [...prev, s.id])
                          } else {
                            setSucursalesUsuario(prev => prev.filter(id => id !== s.id))
                          }
                        }}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="text-sm text-gray-700">{s.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
          {form.rol !== 'directora' && (
            <div className="flex items-center gap-2 mt-2">
              <input type="checkbox"
                checked={form.es_global || false}
                onChange={e => setForm(f => ({...f, es_global: e.target.checked}))}
                className="w-4 h-4 text-purple-600 rounded" />
              <label className="text-sm text-gray-700">Acceso global (todas las sucursales)</label>
            </div>
          )}
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
          {usuario.rol === 'directora' && (
            <div className="flex items-center gap-2">
              <input type="checkbox"
                checked={form.es_encargada_general || false}
                onChange={e => setForm(f => ({...f, es_encargada_general: e.target.checked}))}
                className="w-4 h-4 text-purple-600 rounded" />
              <label className="text-sm text-gray-700">Encargada general (ve todas las sucursales)</label>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color para calendario</label>
            <div className="flex gap-2 flex-wrap mb-2">
              <button type="button"
                onClick={() => setForm(f => ({...f, color: ''}))}
                className={`w-8 h-8 rounded-full border-4 transition flex items-center justify-center bg-gray-100 ${!form.color ? 'border-gray-800' : 'border-transparent'}`}>
                <span className="text-gray-400 text-xs">✕</span>
              </button>
              {['#378ADD','#D4537E','#639922','#BA7517','#9B59B6','#E74C3C','#1ABC9C','#F39C12','#2C3E50','#E91E63','#00BCD4','#FF5722','#607D8B','#8BC34A','#FF9800','#673AB7','#009688','#F44336','#3F51B5','#CDDC39'].map(c => (
                <button key={c} type="button"
                  onClick={() => setForm(f => ({...f, color: c}))}
                  className={`w-8 h-8 rounded-full border-4 transition ${form.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                  style={{backgroundColor: c}}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Color personalizado:</label>
              <input type="color" value={form.color || '#ffffff'}
                onChange={e => setForm(f => ({...f, color: e.target.value}))}
                className="w-8 h-8 rounded cursor-pointer border border-gray-300" />
              {form.color && <span className="text-xs text-gray-500">{form.color}</span>}
            </div>
          </div>

          {usuario.rol === 'directora' && (form.rol === 'maestra' || form.rol === 'encargada') && (
            <button
              type="button"
              onClick={() => setModalReasignar(true)}
              className="w-full bg-orange-100 hover:bg-orange-200 text-orange-700 py-2 rounded-lg text-sm font-medium mt-2"
            >
              👥 Reasignar alumnos a otra maestra
            </button>
          )}

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
      {modalReasignar && (
        <ModalReasignarAlumnos
          maestra={u}
          sucursales={sucursales}
          onClose={() => setModalReasignar(false)}
          onReasignado={() => { setModalReasignar(false); onSuccess() }}
        />
      )}
    </div>
  )
}

function ModalNuevoUsuario({ sucursales, onClose, onSuccess }) {
  const [form, setForm] = useState({
    nombre: '', email: '', password: '', rol: 'maestra',
    sucursal_id: '', color: '', es_global: false, es_encargada_general: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sucursalesUsuario, setSucursalesUsuario] = useState([])
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const handleGuardar = async () => {
    if (!form.nombre || !form.email || !form.password) {
      setError('Nombre, email y contraseña son obligatorios')
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = { ...form }
      if (!data.sucursal_id) data.sucursal_id = null
      if (!data.color) data.color = null
      const resultado = await usuariosService.crear(data)
      if (form.rol === 'maestra' && sucursalesUsuario.length > 0 && resultado.data.id) {
        await api.put(`/usuarios/${resultado.data.id}/sucursales`, { sucursal_ids: sucursalesUsuario })
      }
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al crear usuario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800">Nuevo usuario</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input name="nombre" value={form.nombre} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input name="password" type="password" value={form.password} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select name="rol" value={form.rol} onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
              <option value="maestra">Maestra</option>
              <option value="encargada">Encargada</option>
              <option value="recepcionista">Recepcionista</option>
              <option value="contadora">Contadora</option>
            </select>
          </div>
          {form.rol !== 'maestra' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
              <select name="sucursal_id" value={form.sucursal_id} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                <option value="">Global (todas las sucursales)</option>
                {sucursales.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
          )}
          {form.rol === 'maestra' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sucursales donde trabaja</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sucursalesUsuario.length === 0}
                    onChange={() => setSucursalesUsuario([])}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Todas las sucursales (global)</span>
                </label>
                <div className="border-t pt-2">
                  {sucursales.map(s => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={sucursalesUsuario.includes(s.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSucursalesUsuario(prev => [...prev, s.id])
                          } else {
                            setSucursalesUsuario(prev => prev.filter(id => id !== s.id))
                          }
                        }}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="text-sm text-gray-700">{s.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
          {form.rol !== 'directora' && (
            <div className="flex items-center gap-2 mt-2">
              <input type="checkbox"
                checked={form.es_global || false}
                onChange={e => setForm(f => ({...f, es_global: e.target.checked}))}
                className="w-4 h-4 text-purple-600 rounded" />
              <label className="text-sm text-gray-700">Acceso global (todas las sucursales)</label>
            </div>
          )}
          {usuario.rol === 'directora' && (
            <div className="flex items-center gap-2">
              <input type="checkbox"
                checked={form.es_encargada_general || false}
                onChange={e => setForm(f => ({...f, es_encargada_general: e.target.checked}))}
                className="w-4 h-4 text-purple-600 rounded" />
              <label className="text-sm text-gray-700">Encargada general (ve todas las sucursales)</label>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color para calendario</label>
            <div className="flex gap-2 flex-wrap mb-2">
              <button type="button"
                onClick={() => setForm(f => ({...f, color: ''}))}
                className={`w-8 h-8 rounded-full border-4 transition flex items-center justify-center bg-gray-100 ${!form.color ? 'border-gray-800' : 'border-transparent'}`}>
                <span className="text-gray-400 text-xs">✕</span>
              </button>
              {['#378ADD','#D4537E','#639922','#BA7517','#9B59B6','#E74C3C','#1ABC9C','#F39C12','#2C3E50','#E91E63','#00BCD4','#FF5722','#607D8B','#8BC34A','#FF9800','#673AB7','#009688','#F44336','#3F51B5','#CDDC39'].map(c => (
                <button key={c} type="button"
                  onClick={() => setForm(f => ({...f, color: c}))}
                  className={`w-8 h-8 rounded-full border-4 transition ${form.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                  style={{backgroundColor: c}}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">Color personalizado:</label>
              <input type="color" value={form.color || '#ffffff'}
                onChange={e => setForm(f => ({...f, color: e.target.value}))}
                className="w-8 h-8 rounded cursor-pointer border border-gray-300" />
              {form.color && <span className="text-xs text-gray-500">{form.color}</span>}
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={handleGuardar} disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white py-2 rounded-lg text-sm font-medium">
              {loading ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ModalReasignarAlumnos({ maestra, sucursales, onClose, onReasignado }) {
  const [modo, setModo] = useState('masivo')
  const [maestrasDisponibles, setMaestrasDisponibles] = useState([])
  const [alumnos, setAlumnos] = useState([])
  const [asignaciones, setAsignaciones] = useState({})
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [nuevaMaestraLectura, setNuevaMaestraLectura] = useState('')
  const [nuevaMaestraMatematicas, setNuevaMaestraMatematicas] = useState('')

  useEffect(() => {
    setCargando(true)
    api.get('/alumnos/', { params: { incluir_bajas: false } }).then(res => {
      const misAlumnos = res.data.filter(a =>
        a.maestra_lectura_id === maestra.id ||
        a.maestra_matematicas_id === maestra.id ||
        a.maestra_id === maestra.id
      )
      setAlumnos(misAlumnos)
      const init = {}
      misAlumnos.forEach(a => { init[a.id] = { lectura: '', matematicas: '' } })
      setAsignaciones(init)
      setCargando(false)
    })
    api.get('/usuarios/lista-basica').then(res => {
      setMaestrasDisponibles(res.data.filter(u => (u.rol === 'maestra' || u.rol === 'encargada') && u.id !== maestra.id))
    })
  }, [])

  const handleReasignar = async () => {
    if (modo === 'masivo') {
      if (!nuevaMaestraLectura && !nuevaMaestraMatematicas) {
        alert('Selecciona al menos una maestra destino')
        return
      }
      if (!window.confirm(`¿Reasignar todos los alumnos de ${maestra.nombre}?`)) return
      setGuardando(true)
      try {
        const res = await api.post(`/usuarios/${maestra.id}/reasignar-alumnos`, {
          nueva_maestra_lectura_id: nuevaMaestraLectura || null,
          nueva_maestra_matematicas_id: nuevaMaestraMatematicas || null
        })
        alert(`✅ ${res.data.reasignados} alumnos reasignados`)
        onReasignado()
        onClose()
      } catch (err) {
        alert('Error: ' + (err.response?.data?.detail || err.message))
      } finally {
        setGuardando(false)
      }
    } else {
      const cambios = Object.entries(asignaciones).filter(([id, asig]) => asig.lectura || asig.matematicas)
      if (cambios.length === 0) {
        alert('No hay cambios seleccionados')
        return
      }
      if (!window.confirm(`¿Aplicar cambios a ${cambios.length} alumnos?`)) return
      setGuardando(true)
      try {
        await Promise.all(cambios.map(([alumnoId, asig]) =>
          api.put(`/alumnos/${alumnoId}`, {
            ...(asig.lectura ? { maestra_lectura_id: asig.lectura } : {}),
            ...(asig.matematicas ? { maestra_matematicas_id: asig.matematicas } : {})
          })
        ))
        alert(`✅ ${cambios.length} alumnos reasignados`)
        onReasignado()
        onClose()
      } catch (err) {
        alert('Error: ' + (err.response?.data?.detail || err.message))
      } finally {
        setGuardando(false)
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-5 border-b flex justify-between items-center">
          <h3 className="font-bold text-gray-800">👥 Reasignar alumnos de {maestra.nombre}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">
            Alumnos de <span className="font-medium">{maestra.nombre}</span>: {alumnos.length} en total
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => setModo('masivo')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${modo === 'masivo' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              🔄 Reasignar todos
            </button>
            <button
              onClick={() => setModo('individual')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${modo === 'individual' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              ✏️ Por alumno
            </button>
          </div>

          {modo === 'masivo' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva maestra de Lectura (para todos)</label>
                <select value={nuevaMaestraLectura} onChange={e => setNuevaMaestraLectura(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                  <option value="">Sin cambio</option>
                  {maestrasDisponibles.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva maestra de Matemáticas (para todos)</label>
                <select value={nuevaMaestraMatematicas} onChange={e => setNuevaMaestraMatematicas(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                  <option value="">Sin cambio</option>
                  {maestrasDisponibles.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>
            </div>
          )}

          {modo === 'individual' && (cargando ? (
            <p className="text-center text-gray-400 py-4">Cargando alumnos...</p>
          ) : (
            <div className="max-h-72 overflow-y-auto border rounded-lg divide-y">
              {alumnos.length === 0 ? (
                <p className="text-center text-gray-400 py-6 text-sm">Sin alumnos asignados</p>
              ) : alumnos.map(alumno => (
                <div key={alumno.id} className="p-3 bg-white hover:bg-gray-50">
                  <p className="text-sm font-medium text-gray-800 mb-2">{alumno.nombre} {alumno.apellido}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(alumno.maestra_lectura_id === maestra.id || alumno.maestra_id === maestra.id) && (
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Lectura → nueva maestra</label>
                        <select
                          value={asignaciones[alumno.id]?.lectura || ''}
                          onChange={e => setAsignaciones(prev => ({
                            ...prev,
                            [alumno.id]: { ...prev[alumno.id], lectura: e.target.value }
                          }))}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                        >
                          <option value="">Sin cambio</option>
                          {maestrasDisponibles.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                        </select>
                      </div>
                    )}
                    {alumno.maestra_matematicas_id === maestra.id && (
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Matemáticas → nueva maestra</label>
                        <select
                          value={asignaciones[alumno.id]?.matematicas || ''}
                          onChange={e => setAsignaciones(prev => ({
                            ...prev,
                            [alumno.id]: { ...prev[alumno.id], matematicas: e.target.value }
                          }))}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
                        >
                          <option value="">Sin cambio</option>
                          {maestrasDisponibles.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-700">⚠️ Solo se actualizan los alumnos donde selecciones una nueva maestra.</p>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm">Cancelar</button>
            <button onClick={handleReasignar} disabled={guardando}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white py-2 rounded-lg text-sm font-medium">
              {guardando ? 'Guardando...' : '👥 Aplicar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}