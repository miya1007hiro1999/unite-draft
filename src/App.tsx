import { Routes, Route, Navigate } from 'react-router-dom'
import SetupPage from './pages/SetupPage'
import DraftPage from './pages/DraftPage'
import DraftPageRealtime from './pages/DraftPageRealtime'
import SummaryPage from './pages/SummaryPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/setup" replace />} />
      <Route path="/setup" element={<SetupPage />} />
      {/* 後方互換性: /draft (IDなし) は既存の挙動を維持 */}
      <Route path="/draft" element={<DraftPage />} />
      {/* サマリーページ: /draft/:draftId/summary */}
      <Route path="/draft/:draftId/summary" element={<SummaryPage />} />
      {/* Realtime対応ページ: /draft/:draftId/realtime */}
      <Route path="/draft/:draftId/realtime" element={<DraftPageRealtime />} />
      {/* 運営用・観戦用のURL分離: /draft/:draftId/:mode */}
      <Route path="/draft/:draftId/:mode" element={<DraftPage />} />
    </Routes>
  )
}

export default App
