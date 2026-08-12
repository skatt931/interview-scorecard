import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthGate } from './auth/AuthGate'
import { Scorecard } from './pages/Scorecard'

export default function App() {
  return (
    <AuthGate>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Scorecard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthGate>
  )
}
