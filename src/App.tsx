import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from '@/pages/Home'
import ProfilePage from '@/pages/ProfilePage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import TopicPage from '@/pages/TopicPage'
import BackButtonHandler from '@/components/BackButtonHandler'
import AnnouncementBanner from '@/components/AnnouncementBanner'
import AnnouncementPopup from '@/components/AnnouncementPopup'

export default function App() {
  return (
    <BrowserRouter>
      <BackButtonHandler />
      <AnnouncementBanner />
      <AnnouncementPopup />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/profile/:id" element={<ProfilePage />} />
        <Route path="/topic/:name" element={<TopicPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    </BrowserRouter>
  )
}