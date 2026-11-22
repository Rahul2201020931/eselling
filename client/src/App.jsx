import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { useData } from './data.jsx';
import { useI18n } from './i18n.jsx';
import Home from './pages/Home.jsx';
import ListingDetail from './pages/ListingDetail.jsx';
import PostAd from './pages/PostAd.jsx';
import Login from './pages/Login.jsx';
import Profile from './pages/Profile.jsx';
import MyAds from './pages/MyAds.jsx';
import Admin from './pages/Admin.jsx';
import EditAd from './pages/EditAd.jsx';
import Chats from './pages/Chats.jsx';
import Notifications from './pages/Notifications.jsx';
import SellerProfile from './pages/SellerProfile.jsx';
import Info from './pages/Info.jsx';

function Header() {
  const { user, logout } = useAuth();
  const { unreadChats, unreadNotifs } = useData();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  return (
    <header className="header">
      <Link to="/" className="logo">
        Eselling
      </Link>
      <nav>
        <button className="secondary small lang" onClick={() => setLang(lang === 'en' ? 'ne' : 'en')} title="Language">
          {lang === 'en' ? 'ने' : 'EN'}
        </button>
        {user ? (
          <>
            {user.role === 'admin' && <Link to="/admin">Admin</Link>}
            <Link to="/chats" className="with-count">
              {t('Chats')}
              {unreadChats > 0 && <span className="count">{unreadChats}</span>}
            </Link>
            <Link to="/notifications" className="with-count" aria-label={t('Notifications')}>
              🔔{unreadNotifs > 0 && <span className="count">{unreadNotifs}</span>}
            </Link>
            <Link to="/my-ads">{t('My ads')}</Link>
            <Link to="/profile">{user.name}</Link>
            <button
              className="link"
              onClick={async () => {
                await logout();
                navigate('/');
              }}
            >
              {t('Log out')}
            </button>
          </>
        ) : (
          <Link to="/login">{t('Log in')}</Link>
        )}
        <Link to="/post" className="button">
          {t('Post an ad')}
        </Link>
      </nav>
    </header>
  );
}

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="footer">
      <Link to="/info/safety">{t('Safety tips')}</Link>
      <Link to="/info/help">{t('Help')}</Link>
      <Link to="/info/terms">{t('Terms of use')}</Link>
      <Link to="/info/privacy">{t('Privacy policy')}</Link>
      <Link to="/info/contact">{t('Contact us')}</Link>
    </footer>
  );
}

// Sends visitors who are not logged in to the login page.
function RequireLogin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="muted">Loading...</p>;
  return user ? children : <Navigate to="/login" replace />;
}

// Only admins may open the page; everyone else goes back to the home page.
function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="muted">Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'admin' ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <>
      <Header />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/listings/:id" element={<ListingDetail />} />
          <Route path="/listings/:id/edit" element={<RequireLogin><EditAd /></RequireLogin>} />
          <Route path="/u/:id" element={<SellerProfile />} />
          <Route path="/info/:page" element={<Info />} />
          <Route path="/login" element={<Login />} />
          <Route path="/post" element={<RequireLogin><PostAd /></RequireLogin>} />
          <Route path="/my-ads" element={<RequireLogin><MyAds /></RequireLogin>} />
          <Route path="/chats" element={<RequireLogin><Chats /></RequireLogin>} />
          <Route path="/chats/:id" element={<RequireLogin><Chats /></RequireLogin>} />
          <Route path="/notifications" element={<RequireLogin><Notifications /></RequireLogin>} />
          <Route path="/profile" element={<RequireLogin><Profile /></RequireLogin>} />
          <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
