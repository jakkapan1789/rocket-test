const api = window.electronAPI

export const storage = {
  async getCollections() {
    return api.collections.get()
  },
  async saveCollections(collections) {
    return api.collections.save(collections)
  },
  async getHistory() {
    return api.history.get()
  },
  async addHistory(entry) {
    return api.history.add(entry)
  },
  async clearHistory() {
    return api.history.clear()
  },
  async getStats() {
    return api.stats.get()
  },
  async addStat(entry) {
    return api.stats.add(entry)
  },
  async getEnv() {
    return api.env.get()
  },
  async saveEnv(vars) {
    return api.env.save(vars)
  },
}
