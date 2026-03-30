import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login')
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password })
    return response.data
  },
  me: () => api.get('/auth/me'),
}

export const alumnosService = {
  getAll: (params) => api.get('/alumnos/', { params }),
  getOne: (id) => api.get(`/alumnos/${id}`),
  getPerfil: (id) => api.get(`/alumnos/${id}/perfil`),
  crear: (data) => api.post('/alumnos/', data),
  actualizar: (id, data) => api.put(`/alumnos/${id}`, data),
  darBaja: (id, motivo) => api.delete(`/alumnos/${id}`, { params: { motivo } }),
}

export const pagosService = {
  getAll: (params) => api.get('/pagos/', { params }),
  resumen: (params) => api.get('/pagos/resumen', { params }),
  registrar: (data) => api.post('/pagos/registrar', data),
  tablero: () => api.get('/pagos/tablero'),
  eliminar: (id) => api.delete(`/pagos/${id}`),
}

export const asistenciasService = {
  getDia: (fecha, todos = false) => api.get('/asistencias/dia', { params: { fecha, todos } }),
  registrar: (data) => api.post('/asistencias/registrar', data),
  resumen: (alumno_id, params) => api.get(`/asistencias/resumen/${alumno_id}`, { params }),
  getHistorial: (alumno_id, inicio, fin) => api.get(`/asistencias/historial/${alumno_id}`, { params: { inicio, fin } }),
}


export const dashboardService = {
  stats: () => api.get('/auth/dashboard/stats'),
  pendientes: () => api.get('/auth/dashboard/pendientes'),
  cumpleanos: (mes) => api.get('/auth/dashboard/cumpleanos', { params: { mes } }),
}

export const usuariosService = {
  getAll: () => api.get('/usuarios/'),
  actualizar: (id, data) => api.put(`/usuarios/${id}`, data),
  crear: (data) => api.post('/usuarios/', data),
  eliminar: (id) => api.delete(`/usuarios/${id}`),
}

export const sucursalesService = {
  getAll: () => api.get('/sucursales/'),
}

export const maestrasService = {
  getPorSucursal: (sucursal_id) => api.get(`/usuarios/sucursal/${sucursal_id}/maestras`),
}

export const bitacorasService = {
  getAlumno: (alumno_id) => api.get(`/bitacoras/alumno/${alumno_id}`),
  actualizarRegistro: (alumno_id, nomenclatura, data) =>
    api.put(`/bitacoras/registro/${alumno_id}/${encodeURIComponent(nomenclatura)}`, data),
  getProgramas: () => api.get('/bitacoras/programas'),
  getVistaMaestra: (params) => api.get('/bitacoras/vista-maestra', { params }),
  getPendientesImpresion: () => api.get('/bitacoras/imprimir'),
  getProgramasLista: () => api.get('/bitacoras/programas/lista'),
  actualizarUrlPrograma: (programa, url) => api.put(`/bitacoras/programas/${encodeURIComponent(programa)}/url`, { drive_url: url }),
}

export const reportesService = {
  getDeAlumno: (alumno_id) => api.get(`/reportes/alumno/${alumno_id}`),
  subir: (formData) => api.post('/reportes/subir', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  eliminar: (id) => api.delete(`/reportes/${id}`),
}

export default api