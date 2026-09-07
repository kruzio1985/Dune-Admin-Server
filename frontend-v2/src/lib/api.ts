import axios from 'axios'

const api = axios.create({ baseURL: '/api/v1', timeout: 30000 })

api.interceptors.response.use(
  r => r.data,
  e => Promise.reject(new Error(e.response?.data?.detail || e.response?.data?.error || e.message))
)

export const gameplay = {
  players: (q = '', limit = 50) => api.get(`/gameplay/players?q=${q}&limit=${limit}`),
  playerDetail: (id: number) => api.get(`/gameplay/players/${id}/detail`),
  playerInventory: (id: number) => api.get(`/gameplay/players/${id}/inventory`),
  playerSpecs: (id: number) => api.get(`/gameplay/players/${id}/specs`),
  playerKeystones: (id: number) => api.get(`/gameplay/players/${id}/keystones`),
  playerFaction: (id: number) => api.get(`/gameplay/players/${id}/faction`),
  playerJourney: (id: number) => api.get(`/gameplay/players/${id}/journey`),
  repairAll: (accountId: number) => api.post(`/gameplay/inventory/repair-all?account_id=${accountId}`),
  fillWater: (accountId: number) => api.post(`/gameplay/inventory/fill-water?account_id=${accountId}`),
  giveItem: (flsId: string, template: string, qty = 1, quality = 0) =>
    api.post('/gameplay/give-item-live', { fls_id: flsId, template, qty, durability: 1.0, quality }),
  cheatScript: (flsId: string, script: string) =>
    api.post('/gameplay/cheat-script', { fls_id: flsId, script_name: script }),
  kickPlayer: (flsId: string) => api.post('/gameplay/players/kick?fls_id=' + flsId),
  renamePlayer: (accountId: number, name: string) =>
    api.post(`/gameplay/players/rename?account_id=${accountId}&name=${name}`),
  maxSpecs: (accountId: number, force = false) =>
    api.post('/gameplay/specializations/max-safe', { account_id: accountId, force }),
}

export const characters = {
  list: () => api.get('/gameplay/characters'),
  get: (id: number) => api.get(`/gameplay/characters/${id}`),
  updateStats: (id: number, updates: any[]) => api.post(`/gameplay/characters/${id}/stats`, { updates }),
  getSpecs: (id: number) => api.get(`/gameplay/characters/${id}/specializations`),
  setSpecTrack: (id: number, track: string, xp: number, level: number) =>
    api.post(`/gameplay/characters/${id}/specializations/track?track_type=${track}&xp=${xp}&level=${level}`),
  unlockKeystones: (id: number, prefix: string) =>
    api.post(`/gameplay/characters/${id}/specializations/unlock-keystones?track_prefix=${prefix}`),
  getEconomy: (id: number) => api.get(`/gameplay/characters/${id}/economy`),
  setCurrency: (id: number, cid: number, balance: number) =>
    api.post(`/gameplay/characters/${id}/economy/currency?currency_id=${cid}&balance=${balance}`),
  setFactionRep: (id: number, fid: number, amount: number) =>
    api.post(`/gameplay/characters/${id}/economy/reputation?faction_id=${fid}&amount=${amount}`),
  getCosmetics: (id: number) => api.get(`/gameplay/characters/${id}/cosmetics`),
  addCosmetic: (id: number, cosmeticId: string) =>
    api.post(`/gameplay/characters/${id}/cosmetics/add?cosmetic_id=${cosmeticId}`),
  removeCosmetic: (id: number, cosmeticId: string) =>
    api.post(`/gameplay/characters/${id}/cosmetics/remove?cosmetic_id=${cosmeticId}`),
}

export const market = {
  listings: (limit = 50) => api.get(`/gameplay/market/listings?limit=${limit}`),
  create: (data: any) => api.post('/gameplay/market/create', data),
  delete: (orderId: number) => api.post(`/gameplay/market/delete?order_id=${orderId}`),
  clear: () => api.post('/gameplay/market/clear'),
  stats: () => api.get('/gameplay/market/stats'),
}

export const dashboard = {
  get: () => api.get('/dashboard/'),
  vmStatus: () => api.get('/dashboard/vm-status'),
  bgStatus: () => api.get('/dashboard/battlegroup-status'),
}

export const storage = {
  list: () => api.get('/gameplay/storage'),
  bases: () => api.get('/gameplay/bases'),
  blueprints: () => api.get('/gameplay/blueprints'),
}

export const packages = {
  list: () => api.get('/gameplay/packages'),
  create: (data: any) => api.post('/gameplay/packages/create', data),
  delete: (name: string) => api.post(`/gameplay/packages/delete?name=${name}`),
  give: (flsId: string, name: string) => api.post(`/gameplay/packages/give?fls_id=${flsId}&name=${name}`),
}
