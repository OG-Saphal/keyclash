import React, { useEffect } from 'react';
import FriendsPage from './pages/FriendsPage';
import FriendProfilePage from './pages/FriendProfilePage';
import FriendsSidebar from './components/friends/FriendsSidebar';
import {
  HashRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTypingStore } from './store/useTypingStore';
import { useAuthStore } from './store/useAuthStore';
import { useMultiplayerStore } from './store/useMultiplayerStore'; // 🆕 Part 5
import { useTimer } from './hooks/useTimer';
// Pages
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ProfilePage from './pages/ProfilePage';
import AccountPage from './pages/AccountPage';
// 🆕 Multiplayer pages
import MultiplayerMenuPage from './pages/multiplayer/MultiplayerMenuPage';
import CreateRoomPage from './pages/multiplayer/CreateRoomPage';
import RoomBrowserPage from './pages/multiplayer/RoomBrowserPage';
import LobbyPage from './pages/multiplayer/LobbyPage';
import QuickMatchSearchingPage from './pages/multiplayer/QuickMatchSearchingPage';
import RacePage from './pages/multiplayer/RacePage';
import MultiplayerResultsPage from './pages/multiplayer/MultiplayerResultsPage';
// 🆕 Shared across singleplayer + multiplayer pages
import ModeTabBar from './components/ModeTabBar';
import LeaveRoomConfirmModal from './components/multiplayer/LeaveRoomConfirmModal';
// Components
import Header from './components/Header';
import Settings from './components/Settings';
import Timer from './components/Timer';
import LiveStats from './components/LiveStats';
import WordDisplay from './components/WordDisplay';
import WordProgress from './components/WordProgress'; // 🆕 Part 7/10 — extracted, now shared with RacePage.tsx (was a private component defined below, inline)
import RestartButton from './components/RestartButton';
import Results from './components/Results';
import Footer from './components/Footer';

// ─── Main typing view ─────────────────────────────────────────────────────────
const TypingView: React.FC = () => {
  const initTest = useTypingStore(s => s.initTest);
  const phase = useTypingStore(s => s.phase);
  const mode = useTypingStore(s => s.mode);
  useTimer();
  useEffect(() => {
    initTest();
  }, [initTest]);
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      <Header />
      <ModeTabBar />
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-3xl">
          <AnimatePresence mode="wait">
            {phase !== 'finished' ? (
              <motion.div
                key="test"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Settings />
                <div className="flex flex-col items-center mb-2">
                  <AnimatePresence mode="wait">
                    {mode === 'time' ? (
                      <motion.div
                        key="timer"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Timer />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="word-progress"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <WordProgress />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <LiveStats />
                </div>
                <WordDisplay />
                <RestartButton />
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <Results />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      <Footer />
    </div>
  );
};

// ─── Room-status-driven navigation (🆕 Part 5) ────────────────────────────────
/**
 * Single source of truth for room-status-driven navigation. Consolidates
 * what used to be split across pages:
 *  - LobbyPage previously navigated to /multiplayer/race itself when status
 *    became 'countdown'/'racing', and back to /multiplayer when the room
 *    disappeared. Both effects have been REMOVED from LobbyPage.tsx.
 *  - RacePage's own navigate() call after submitFinalResult() is left in
 *    place — that's a client-local event (this client just finished
 *    submitting), not a status broadcast every client needs to react to
 *    identically, so it doesn't belong in this shared router.
 *  - New for Part 5: 'finished' -> 'waiting' (the return-to-lobby vote
 *    completing) drives every client from /multiplayer/results back to
 *    /multiplayer/lobby at the same moment, since it's the server confirming
 *    a shared state change, not a single client's local action.
 *
 * 🐛 FIX: the original version of this router redirected to /multiplayer
 * whenever `currentRoom` was null on ANY /multiplayer/* route. But
 * CreateRoomPage, RoomBrowserPage, MultiplayerMenuPage, and
 * QuickMatchSearchingPage are all SUPPOSED to have currentRoom === null —
 * that's their normal resting state before a room exists yet. The redirect
 * was firing the instant you landed on Create/Browse, bouncing you straight
 * back before you could do anything. The "no room" redirect now only
 * applies to the pages that actually require one.
 */
const ROOM_REQUIRED_PATHS = ['/multiplayer/lobby', '/multiplayer/race', '/multiplayer/results'];
const RoomStatusRouter: React.FC = () => {
  const room = useMultiplayerStore((s) => s.currentRoom);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const needsRoom = ROOM_REQUIRED_PATHS.includes(location.pathname);
    if (!room) {
      if (needsRoom) navigate('/multiplayer');
      return;
    }
    if (
      (room.status === 'countdown' || room.status === 'racing') &&
      location.pathname === '/multiplayer/lobby'
    ) {
      navigate('/multiplayer/race');
    }
    if (room.status === 'waiting' && location.pathname === '/multiplayer/results') {
      navigate('/multiplayer/lobby');
    }
  }, [room, room?.status, location.pathname, navigate]);
  return null;
};

// ─── Root App with router ─────────────────────────────────────────────────────
const App: React.FC = () => {
  const initializeAuth = useAuthStore(s => s.initializeAuth);
  // Bootstrap auth state once on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);
  return (
    <HashRouter>
      {/* Both components can coexist here */}
      <LeaveRoomConfirmModal />
      <FriendsSidebar />
      <RoomStatusRouter /> {/* 🆕 Part 5 */}
      <Routes>
        {/* Auth routes (full-page, own layout) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/verify" element={<VerifyEmailPage />} />
        {/* Authenticated routes (also full-page) */}
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/account" element={<AccountPage />} />
        {/* 🆕 Multiplayer routes */}
        <Route path="/multiplayer" element={<MultiplayerMenuPage />} />
        <Route path="/multiplayer/create" element={<CreateRoomPage />} />
        <Route path="/multiplayer/browse" element={<RoomBrowserPage />} />
        <Route path="/multiplayer/lobby" element={<LobbyPage />} />
        <Route path="/multiplayer/quick-match" element={<QuickMatchSearchingPage />} />
        <Route path="/multiplayer/race" element={<RacePage />} />
        <Route path="/multiplayer/results" element={<MultiplayerResultsPage />} />
        {/* 🆕 Friend routes (from your friend) */}
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/u/:username" element={<FriendProfilePage />} />
        {/* Default: typing app */}
        <Route path="*" element={<TypingView />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
