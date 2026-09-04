// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomePage } from './pages/HomePage';
import { SplitPage } from './pages/SplitPage';
import { HistoryPage } from './pages/HistoryPage';
import { CommunityPage } from './pages/CommunityPage';
import { FriendsPage } from './pages/FriendsPage';
import { ProfilePage } from './pages/ProfilePage';
import { ZkLoginCallbackPage } from './pages/ZkLoginCallbackPage';

export default function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <div style={{ flex: 1, paddingBottom: '72px' }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/split" element={<SplitPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/auth/callback" element={<ZkLoginCallbackPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  );
}
