import { Routes, Route } from 'react-router-dom'
import './App.scss'
import { Callback } from './pages/Callback/Callback'
import { Home } from './pages/Home/Home'
import { Dashboard } from './pages/Dashboard/Dashboard'
import { MySignSettings } from './pages/MySignSettings/MySignSettings'
import { PDFSigningAdvanced } from './pages/PDFSigningAdvanced/PDFSigningAdvanced'

function App() {
  
  return (
     <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<MySignSettings />} />
        <Route path="/sign-pdf" element={<PDFSigningAdvanced />} />
        <Route path="/test" element={<Home />} />
        <Route path="/callback" element={<Callback />} />
      </Routes>
    </>
  )
}

export default App
