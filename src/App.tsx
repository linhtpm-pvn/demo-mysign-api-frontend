import { Routes, Route } from 'react-router-dom'
import './App.scss'
import { Callback } from './pages/Callback/Callback'
import { Home } from './pages/Home/Home'

function App() {
  
  return (
     <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/callback" element={<Callback />} />
      </Routes>
    </>
  )
}

export default App
