import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from '@/pages/Home'
import ProfilePage from '@/pages/ProfilePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/profile/:id" element={<ProfilePage />} />
      </Routes>
    </BrowserRouter>
  )
}