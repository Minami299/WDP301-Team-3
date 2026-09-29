import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [backendStatus, setBackendStatus] = useState('Chưa kết nối')

  useEffect(() => {
    fetch('http://localhost:5000/api/health')
      .then((res) => res.json())
      .then((data) => setBackendStatus(data.message || 'Kết nối thành công'))
      .catch(() => setBackendStatus('Không thể kết nối đến backend (hãy đảm bảo server đang chạy)'))
  }, [])

  return (
    <div className="container">
      <header className="header">
        <h1>Travelio</h1>
        <p>Hệ thống du lịch & đặt tour</p>
      </header>

      <main className="card">
        <h2>Trạng thái hệ thống</h2>
        <div className="status-item">
          <strong>Frontend:</strong> <span>React.js + Vite đang chạy</span>
        </div>
        <div className="status-item">
          <strong>Backend (Express):</strong> <span>{backendStatus}</span>
        </div>
      </main>
    </div>
  )
}

export default App
