import { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { storage } from '../../services/storage.js'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, ArcElement
)

const CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: '#8b949e', font: { size: 11 } },
    },
  },
  scales: {
    x: {
      ticks: { color: '#6e7681', font: { size: 10 } },
      grid: { color: 'rgba(48, 54, 61, 0.6)' },
    },
    y: {
      ticks: { color: '#6e7681', font: { size: 10 } },
      grid: { color: 'rgba(48, 54, 61, 0.6)' },
    },
  },
}

const PIE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right',
      labels: { color: '#8b949e', font: { size: 11 }, padding: 12 },
    },
  },
}

function computeStats(requests) {
  if (!requests.length) return { total: 0, avg: 0, errorRate: 0, p95: 0 }
  const total = requests.length
  const errors = requests.filter((r) => r.error || (r.status >= 400) || r.status === 0).length
  const times = requests.map((r) => r.time || 0).sort((a, b) => a - b)
  const avg = Math.round(times.reduce((s, t) => s + t, 0) / times.length)
  const p95 = times[Math.floor(times.length * 0.95)] || 0
  const errorRate = total ? Math.round((errors / total) * 100) : 0
  return { total, avg, errorRate, p95 }
}

export default function StatsPanel() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    storage.getStats().then((s) => {
      setData(s?.requests || [])
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="stats-panel" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="stats-panel" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No data yet</div>
          <div className="empty-state-text">Send some requests to see statistics</div>
        </div>
      </div>
    )
  }

  const stats = computeStats(data)

  // Last 20 requests for timeline
  const recent = data.slice(-20)
  const labels = recent.map((_, i) => `#${data.length - 20 + i + 1}`)
  const times = recent.map((r) => r.time || 0)

  const lineData = {
    labels,
    datasets: [
      {
        label: 'Response Time (ms)',
        data: times,
        borderColor: '#58a6ff',
        backgroundColor: 'rgba(88, 166, 255, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointBackgroundColor: '#58a6ff',
      },
    ],
  }

  // Method breakdown
  const methodCounts = {}
  data.forEach((r) => {
    methodCounts[r.method] = (methodCounts[r.method] || 0) + 1
  })
  const methodColors = {
    GET: '#3fb950', POST: '#58a6ff', PUT: '#d29922',
    DELETE: '#f85149', PATCH: '#bc8cff', HEAD: '#6e7681', OPTIONS: '#6e7681',
  }
  const methodData = {
    labels: Object.keys(methodCounts),
    datasets: [{
      data: Object.values(methodCounts),
      backgroundColor: Object.keys(methodCounts).map((m) => methodColors[m] || '#6e7681'),
      borderWidth: 0,
    }],
  }

  // Status code breakdown
  const statusGroups = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0, 'Error': 0 }
  data.forEach((r) => {
    if (!r.status || r.status === 0) statusGroups['Error']++
    else if (r.status < 300) statusGroups['2xx']++
    else if (r.status < 400) statusGroups['3xx']++
    else if (r.status < 500) statusGroups['4xx']++
    else statusGroups['5xx']++
  })
  const statusData = {
    labels: Object.keys(statusGroups).filter((k) => statusGroups[k] > 0),
    datasets: [{
      data: Object.values(statusGroups).filter((v) => v > 0),
      backgroundColor: ['#3fb950', '#d29922', '#e3b341', '#f85149', '#6e7681'],
      borderWidth: 0,
    }],
  }

  // Hourly request bar (last 12h)
  const now = new Date()
  const hourLabels = Array.from({ length: 12 }, (_, i) => {
    const h = new Date(now)
    h.setHours(h.getHours() - (11 - i))
    return `${h.getHours()}:00`
  })
  const hourCounts = Array(12).fill(0)
  data.forEach((r) => {
    const d = new Date(r.timestamp)
    const diffH = Math.floor((now - d) / 3600000)
    if (diffH < 12) {
      hourCounts[11 - diffH]++
    }
  })
  const barData = {
    labels: hourLabels,
    datasets: [{
      label: 'Requests',
      data: hourCounts,
      backgroundColor: 'rgba(88, 166, 255, 0.6)',
      borderRadius: 4,
    }],
  }

  return (
    <div className="stats-panel" style={{ flex: 1 }}>
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-card-label">Total Requests</div>
          <div className="stat-card-value accent">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Avg Response Time</div>
          <div className={`stat-card-value ${stats.avg > 1000 ? 'red' : 'green'}`}>{stats.avg}ms</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Error Rate</div>
          <div className={`stat-card-value ${stats.errorRate > 20 ? 'red' : 'green'}`}>{stats.errorRate}%</div>
        </div>
      </div>

      <div className="chart-container">
        <div className="chart-title">Response Time — Last 20 Requests</div>
        <div style={{ height: 180 }}>
          <Line data={lineData} options={CHART_OPTIONS} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="chart-container">
          <div className="chart-title">Methods</div>
          <div style={{ height: 160 }}>
            <Doughnut data={methodData} options={PIE_OPTIONS} />
          </div>
        </div>
        <div className="chart-container">
          <div className="chart-title">Status Codes</div>
          <div style={{ height: 160 }}>
            <Doughnut data={statusData} options={PIE_OPTIONS} />
          </div>
        </div>
      </div>

      <div className="chart-container">
        <div className="chart-title">Requests per Hour (Last 12h)</div>
        <div style={{ height: 150 }}>
          <Bar data={barData} options={{ ...CHART_OPTIONS, plugins: { legend: { display: false } } }} />
        </div>
      </div>
    </div>
  )
}
