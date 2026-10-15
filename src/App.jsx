import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { signup, login, logout, getUser, handleAuthCallback } from '@netlify/identity';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await handleAuthCallback();
      const current = await getUser();
      setUser(current);
      setLoading(false);
    };
    init();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      <div className="app">
        <header>
          <h1>Karibu Kenya Dating</h1>
          <nav>
            {user ? (
              <>
                <Link to="/profile">Profile</Link>
                <Link to="/matches">Nearby Matches</Link>
                <button onClick={async () => { await logout(); setUser(null); }}>Logout</button>
              </>
            ) : (
              <Link to="/login">Login / Signup</Link>
            )}
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={user ? <Navigate to="/profile" /> : <Auth setUser={setUser} />} />
            <Route path="/profile" element={user ? <Profile user={user} /> : <Navigate to="/login" />} />
            <Route path="/matches" element={user ? <Matches user={user} /> : <Navigate to="/login" />} />
          </Routes>
        </main>
        <footer>
          <p>Location-based matchmaking for Kenyans. Be safe, be kind.</p>
        </footer>
      </div>
    </Router>
  );
}

function Home() {
  return (
    <div>
      <h2>Find your match nearby in Kenya</h2>
      <p>Connect with people in Nairobi, Mombasa, Kisumu and more based on location, interests, and preferences.</p>
      <p>Features: Profiles, GPS matching, Chat, Safety reports.</p>
    </div>
  );
}

function Auth({ setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isSignup) {
        await signup(email, password);
        setMessage('Signup successful! Check your email to confirm.');
      } else {
        const user = await login(email, password);
        setUser(user);
      }
    } catch (err) {
      setMessage(err.message || 'Error');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>{isSignup ? 'Sign Up' : 'Login'}</h2>
      <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
      <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
      <button type="submit">{isSignup ? 'Sign Up' : 'Login'}</button>
      <button type="button" onClick={() => setIsSignup(!isSignup)}>
        {isSignup ? 'Have account? Login' : 'No account? Sign Up'}
      </button>
      {message && <p>{message}</p>}
    </form>
  );
}

function Profile({ user }) {
  const [profile, setProfile] = useState({ name: '', age: '', bio: '', county: '', tribe: '', religion: '', interests: '' });
  const [location, setLocation] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/profile', { headers: { Authorization: `Bearer ${user.token?.access_token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => data && setProfile({...data, interests: (data.interests || []).join(', ') }))
      .catch(() => {});
  }, [user]);

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => setMessage('Location access denied or unavailable')
      );
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    const data = { ...profile, lat: location?.lat, lng: location?.lng, interests: profile.interests.split(',').map(s => s.trim()).filter(Boolean) };
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token?.access_token}` },
        body: JSON.stringify(data)
      });
      if (res.ok) setMessage('Profile saved!');
      else setMessage('Error saving');
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div>
      <h2>Your Profile</h2>
      <form onSubmit={saveProfile}>
        <input placeholder="Name" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} required />
        <input type="number" placeholder="Age" value={profile.age} onChange={e => setProfile({...profile, age: e.target.value})} />
        <textarea placeholder="Bio" value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} />
        <input placeholder="County (e.g. Nairobi)" value={profile.county} onChange={e => setProfile({...profile, county: e.target.value})} />
        <input placeholder="Tribe (optional)" value={profile.tribe} onChange={e => setProfile({...profile, tribe: e.target.value})} />
        <input placeholder="Religion (optional)" value={profile.religion} onChange={e => setProfile({...profile, religion: e.target.value})} />
        <input placeholder="Interests (comma separated)" value={profile.interests} onChange={e => setProfile({...profile, interests: e.target.value})} />
        <button type="button" onClick={getLocation}>Share Location (GPS)</button>
        {location && <p>Location: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>}
        <button type="submit">Save Profile</button>
      </form>
      {message && <p>{message}</p>}
      <p>Photo upload coming soon (use Netlify Blobs).</p>
    </div>
  );
}

function Matches({ user }) {
  const [matches, setMatches] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/nearby', { headers: { Authorization: `Bearer ${user.token?.access_token}` } })
      .then(r => r.json())
      .then(setMatches)
      .catch(err => setMessage(err.message));
  }, [user]);

  return (
    <div>
      <h2>Nearby Matches</h2>
      {message && <p>{message}</p>}
      <ul>
        {matches.map(m => (
          <li key={m.id}>
            <strong>{m.name}</strong>, {m.age} - {m.county} - {m.bio?.substring(0, 100)}
          </li>
        ))}
      </ul>
      {matches.length === 0 && <p>No nearby users yet. Complete your profile with location!</p>}
    </div>
  );
}

export default App;
