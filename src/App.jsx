import { useState, useRef, useEffect, createContext, useContext } from 'react'
import { Routes, Route, Link, useParams, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { supabase } from './supabase'

// ═══════════════════════════════════════════════════════
// AUTH CONTEXT
// ═══════════════════════════════════════════════════════

const AuthContext = createContext(null)

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [artist, setArtist] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  const fetchArtistProfile = async (userId) => {
    const { data } = await supabase.from('artists').select('*').eq('user_id', userId).limit(1).maybeSingle()
    setArtist(data ?? null)
    setAuthLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchArtistProfile(session.user.id)
      else setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchArtistProfile(session.user.id)
      else { setArtist(null); setAuthLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setArtist(null)
  }

  const isAdmin = user?.email === 'mooresquesigh@gmail.com'

  return (
    <AuthContext.Provider value={{ user, artist, authLoading, isAdmin, signOut, refetchArtist: () => user && fetchArtistProfile(user.id) }}>
      {children}
    </AuthContext.Provider>
  )
}

const useAuth = () => useContext(AuthContext)

// ═══════════════════════════════════════════════════════
// STRIPE CHECKOUT
// ═══════════════════════════════════════════════════════

async function handleStripeCheckout(cartItems) {
  try {
    const response = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cartItems })
    })
    const data = await response.json()
    if (data.url) window.location.href = data.url
    else alert('Payment error: ' + (data.error || 'Unknown error'))
  } catch (error) {
    alert('Payment error: ' + error.message)
  }
}

// ═══════════════════════════════════════════════════════
// AUDIO PLAYER
// ═══════════════════════════════════════════════════════

function AudioPlayer({ song, currentPlaying, setCurrentPlaying }) {
  const audioRef = useRef(null)
  const isPlaying = currentPlaying === song.id
  const audioSrc = song.preview_url || song.audio_url || song.preview

  useEffect(() => {
    if (!isPlaying && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [isPlaying])

  const toggle = () => {
    if (isPlaying) {
      setCurrentPlaying(null)
    } else {
      setCurrentPlaying(song.id)
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = 0
          audioRef.current.play()
        }
      }, 50)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current && audioRef.current.currentTime >= 30) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setCurrentPlaying(null)
    }
  }

  return (
    <>
      <audio ref={audioRef} src={audioSrc} onTimeUpdate={handleTimeUpdate} />
      <button onClick={toggle} style={{ padding:"8px 16px", background:isPlaying?"rgba(200,169,110,0.15)":"transparent", border:"1px solid rgba(200,169,110,0.4)", color:"#c8a96e", fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", cursor:"pointer", display:"flex", alignItems:"center", gap:"6px" }}>
        {isPlaying ? "⏸ Stop" : "▶ Preview"}
      </button>
    </>
  )
}

// ═══════════════════════════════════════════════════════
// SIDEBAR (logged-in users)
// ═══════════════════════════════════════════════════════

const SIDEBAR_WIDTH = 220

function Sidebar() {
  const { artist, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const SideLink = ({ to, label, sub, disabled }) => {
    const active = location.pathname + location.search === to || location.search === `?tab=${to.split('?tab=')[1]}`
    if (disabled) return (
      <div style={{ display:"block", padding: sub ? "7px 24px 7px 36px" : "10px 24px", color:"#2a2a2a", fontSize:"10px", letterSpacing:"2px", textTransform:"uppercase", cursor:"default", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        {label}
        <span style={{ fontSize:"8px", letterSpacing:"1px", color:"#2a2a2a", background:"#111", padding:"2px 6px", borderRadius:"2px" }}>Soon</span>
      </div>
    )
    return (
      <Link to={to} style={{ display:"block", padding: sub ? "7px 24px 7px 36px" : "10px 24px", color:active?"#c8a96e":"#7a7570", textDecoration:"none", fontSize: sub ? "10px" : "11px", letterSpacing:"2px", textTransform:"uppercase", background:active?"rgba(200,169,110,0.06)":"transparent", borderLeft:active?"2px solid #c8a96e":"2px solid transparent" }}>
        {label}
      </Link>
    )
  }

  return (
    <div style={{ position:"fixed", top:0, left:0, bottom:0, width:`${SIDEBAR_WIDTH}px`, background:"#08080b", borderRight:"1px solid #1a1a1a", zIndex:200, display:"flex", flexDirection:"column", overflowY:"auto" }}>

      {/* Logo */}
      <div style={{ padding:"24px 24px 20px", borderBottom:"1px solid #1a1a1a" }}>
        <Link to="/" style={{ fontSize:"17px", letterSpacing:"4px", color:"#c8a96e", textDecoration:"none", fontWeight:"bold" }}>VAINMUZE</Link>
      </div>

      {/* The Backstage — Artist Tools */}
      <div style={{ padding:"16px 0 8px", borderBottom:"1px solid #1a1a1a" }}>
        <p style={{ fontSize:"9px", letterSpacing:"3px", textTransform:"uppercase", color:"#2a2a2a", padding:"0 24px", marginBottom:"6px" }}>The Backstage</p>
        <SideLink to="/dashboard" label="Dashboard" />
        <SideLink to="/dashboard?tab=songs" label="My Music" sub />
        <SideLink to="/dashboard?tab=upload" label="Upload" sub />
        <SideLink to="/dashboard?tab=profile" label="Profile" sub />
        <SideLink to="/dashboard?tab=earnings" label="Earnings" sub disabled />
      </div>

      {/* Admin — Platform Owner */}
      {isAdmin && (
        <div style={{ padding:"16px 0 8px", borderBottom:"1px solid #1a1a1a" }}>
          <p style={{ fontSize:"9px", letterSpacing:"3px", textTransform:"uppercase", color:"#2a2a2a", padding:"0 24px", marginBottom:"6px" }}>Admin</p>
          <SideLink to="/admin" label="Applications" />
          <SideLink to="/admin?view=artists" label="All Artists" sub disabled />
          <SideLink to="/admin?view=fans" label="Fans" sub disabled />
          <SideLink to="/admin?view=revenue" label="Revenue" sub disabled />
        </div>
      )}

      {/* User info + sign out */}
      <div style={{ marginTop:"auto", padding:"20px 24px", borderTop:"1px solid #1a1a1a" }}>
        {artist && (
          <div style={{ marginBottom:"14px" }}>
            {artist.photo_url && (
              <img src={artist.photo_url} alt={artist.name} style={{ width:"36px", height:"36px", objectFit:"cover", borderRadius:"50%", marginBottom:"8px", display:"block" }} />
            )}
            <p style={{ fontSize:"13px", color:"#f0ece4", fontWeight:"bold", margin:"0 0 3px", letterSpacing:"0.5px" }}>{artist.name}</p>
            <span style={{ fontSize:"9px", letterSpacing:"2px", textTransform:"uppercase", color:artist.status==='approved'?"#48bb78":"#c8a96e" }}>{artist.status}</span>
          </div>
        )}
        <button onClick={handleSignOut} style={{ width:"100%", padding:"9px", background:"transparent", border:"1px solid #222", color:"#7a7570", fontSize:"10px", letterSpacing:"2px", textTransform:"uppercase", cursor:"pointer" }}>Sign Out</button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// NAV (public / logged-out)
// ═══════════════════════════════════════════════════════

function Nav({ cart }) {
  const { user, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const leftOffset = user ? `${SIDEBAR_WIDTH}px` : "0"

  return (
    <nav style={{ position:"fixed", top:0, left:leftOffset, right:0, zIndex:100, display:"flex", justifyContent:"space-between", alignItems:"center", padding:"18px 48px", background:"rgba(6,6,8,0.98)", borderBottom:"1px solid #1a1a1a" }}>
      {!user && (
        <Link to="/" style={{ fontSize:"22px", letterSpacing:"4px", color:"#c8a96e", textDecoration:"none", fontWeight:"bold" }}>VAINMUZE</Link>
      )}
      <div style={{ display:"flex", gap:"28px", alignItems:"center", marginLeft: user ? "0" : "auto" }}>
        <Link to="/" style={navLink}>Home</Link>
        <Link to="/store" style={navLink}>Store</Link>
        <Link to="/artists" style={navLink}>Artists</Link>
        <Link to="/about" style={navLink}>About</Link>
      </div>
      <div style={{ display:"flex", gap:"16px", alignItems:"center" }}>
        {!user && <Link to="/artist/login" style={navLink}>The Backstage</Link>}
        <Link to="/store" style={{ padding:"8px 20px", background:"#c8a96e", color:"#060608", fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", textDecoration:"none", fontWeight:"bold" }}>Cart ({cart.length})</Link>
      </div>
    </nav>
  )
}

const navLink = { color:"#7a7570", textDecoration:"none", fontSize:"12px", letterSpacing:"2px", textTransform:"uppercase" }

// ═══════════════════════════════════════════════════════
// HOME
// ═══════════════════════════════════════════════════════

function Home({ addToCart, cart }) {
  const [songs, setSongs] = useState([])
  const [homePlaying, setHomePlaying] = useState(null)

  useEffect(() => {
    supabase.from('songs').select('*, artist:artists(name, slug)').limit(3).order('created_at', { ascending: true })
      .then(({ data }) => setSongs(data || []))
  }, [])

  return (
    <div style={{ background:"#060608", minHeight:"100vh", color:"#f0ece4" }}>
      <div style={{ position:"relative", height:"100vh", display:"flex", alignItems:"flex-end", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 60% 40%, rgba(200,169,110,0.08) 0%, transparent 60%)" }}></div>
        <img src="/VainMuze_avatar.png" alt="VainMuze" style={{ position:"absolute", right:0, top:0, width:"55%", height:"100%", objectFit:"cover", objectPosition:"center top", opacity:0.9 }} />
        <div style={{ position:"relative", zIndex:2, padding:"0 48px 80px", maxWidth:"620px" }}>
          <p style={{ fontSize:"11px", letterSpacing:"5px", textTransform:"uppercase", color:"#c8a96e", marginBottom:"20px" }}>Portland, PNW — Est. 2004</p>
          <h1 style={{ fontFamily:"Georgia, serif", fontSize:"80px", fontWeight:"900", lineHeight:"0.95", marginBottom:"24px" }}>
            Raw.<br/><em style={{ color:"#c8a96e" }}>Unhinged.</em><br/>Real.
          </h1>
          <p style={{ fontSize:"15px", lineHeight:"1.7", color:"#7a7570", maxWidth:"460px", marginBottom:"48px" }}>VainMuze is a home for independent artists and the people who love real music. No gatekeepers. No algorithms deciding what you hear. Just music, community, and creative freedom.</p>
          <div style={{ display:"flex", gap:"20px", flexWrap:"wrap" }}>
            <Link to="/store" style={{ padding:"14px 36px", background:"#c8a96e", color:"#060608", fontSize:"12px", letterSpacing:"3px", textTransform:"uppercase", textDecoration:"none", fontWeight:"bold" }}>Discover Music</Link>
            <Link to="/artist/signup" style={{ padding:"14px 36px", background:"transparent", border:"1px solid #c8a96e", color:"#c8a96e", fontSize:"12px", letterSpacing:"3px", textTransform:"uppercase", textDecoration:"none" }}>Share Your Music</Link>
          </div>
        </div>
      </div>

      <div style={{ padding:"100px 48px", background:"#0d0d12", borderTop:"1px solid rgba(200,169,110,0.1)" }}>
        <div style={{ maxWidth:"1100px", margin:"0 auto" }}>
          <p style={{ fontSize:"10px", letterSpacing:"5px", textTransform:"uppercase", color:"#c8a96e", marginBottom:"12px", textAlign:"center" }}>A Space For Everyone</p>
          <h2 style={{ fontFamily:"Georgia, serif", fontSize:"42px", fontWeight:"700", textAlign:"center", marginBottom:"64px" }}>Who is VainMuze for?</h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"2px" }}>
            {[
              { icon:"🎧", title:"Music Lovers", desc:"Discover raw, independent music from artists who make it because they have to. No mainstream filters. Just real sound.", cta:"Explore Music", link:"/store" },
              { icon:"🎤", title:"Independent Artists", desc:"Sell your music directly to fans. Keep your earnings. Build your audience. No label required. This platform is yours.", cta:"Join as Artist", link:"/artist/signup" },
              { icon:"🤝", title:"Collaborators & Industry", desc:"Find emerging talent before anyone else does. Connect with artists, producers, and creators building something real.", cta:"Browse Artists", link:"/artists" }
            ].map(item => (
              <div key={item.title} style={{ padding:"48px 36px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.04)" }}
                onMouseEnter={e => e.currentTarget.style.background="rgba(200,169,110,0.04)"}
                onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,0.02)"}>
                <div style={{ fontSize:"36px", marginBottom:"20px" }}>{item.icon}</div>
                <h3 style={{ fontFamily:"Georgia, serif", fontSize:"24px", fontWeight:"700", marginBottom:"16px" }}>{item.title}</h3>
                <p style={{ fontSize:"14px", lineHeight:"1.8", color:"#7a7570", marginBottom:"28px" }}>{item.desc}</p>
                <Link to={item.link} style={{ fontSize:"11px", letterSpacing:"3px", textTransform:"uppercase", color:"#c8a96e", textDecoration:"none", borderBottom:"1px solid #c8a96e", paddingBottom:"2px" }}>{item.cta} →</Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {songs.length > 0 && (
        <div style={{ padding:"100px 48px", maxWidth:"1100px", margin:"0 auto" }}>
          <p style={{ fontSize:"10px", letterSpacing:"5px", textTransform:"uppercase", color:"#c8a96e", marginBottom:"12px" }}>Fresh Tracks</p>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"48px" }}>
            <h2 style={{ fontFamily:"Georgia, serif", fontSize:"42px", fontWeight:"700" }}>Featured Music</h2>
            <Link to="/store" style={{ fontSize:"11px", letterSpacing:"3px", textTransform:"uppercase", color:"#7a7570", textDecoration:"none", borderBottom:"1px solid #7a7570", paddingBottom:"2px" }}>View All →</Link>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"16px" }}>
            {songs.map((song, i) => (
              <div key={song.id} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", padding:"32px", borderRadius:"4px" }}
                onMouseEnter={e => e.currentTarget.style.borderColor="rgba(200,169,110,0.3)"}
                onMouseLeave={e => e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"}>
                <div style={{ fontFamily:"Georgia, serif", fontSize:"56px", color:"rgba(200,169,110,0.1)", lineHeight:"1", marginBottom:"16px" }}>0{i+1}</div>
                <div style={{ fontSize:"10px", letterSpacing:"4px", textTransform:"uppercase", color:"#8a6f3f", marginBottom:"8px" }}>{song.genre}</div>
                <h3 style={{ fontFamily:"Georgia, serif", fontSize:"20px", fontWeight:"700", marginBottom:"4px" }}>{song.title}</h3>
                {song.artist && <Link to={`/artists/${song.artist.slug}`} style={{ fontSize:"11px", color:"#7a7570", textDecoration:"none" }}>{song.artist.name}</Link>}
                <p style={{ fontSize:"12px", color:"#7a7570", margin:"8px 0 16px" }}>{song.duration}</p>
                <div style={{ marginBottom:"16px" }}>
                  <AudioPlayer song={song} currentPlaying={homePlaying} setCurrentPlaying={setHomePlaying} />
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontFamily:"Georgia, serif", fontSize:"24px", color:"#c8a96e" }}>${song.price}</span>
                  <button onClick={() => addToCart(song)} disabled={!!cart.find(s => s.id === song.id)}
                    style={{ padding:"8px 16px", background:"transparent", border:"1px solid rgba(200,169,110,0.4)", color:"#c8a96e", fontSize:"11px", letterSpacing:"2px", cursor:"pointer" }}>
                    {cart.find(s => s.id === song.id) ? "Added ✓" : "+ Cart"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding:"100px 48px", background:"#0d0d12", borderTop:"1px solid rgba(200,169,110,0.1)", borderBottom:"1px solid rgba(200,169,110,0.1)" }}>
        <div style={{ maxWidth:"800px", margin:"0 auto", textAlign:"center" }}>
          <h2 style={{ fontFamily:"Georgia, serif", fontSize:"48px", fontWeight:"900", lineHeight:"1.1", marginBottom:"24px" }}>Music is better<br/><em style={{ color:"#c8a96e" }}>together</em></h2>
          <p style={{ fontSize:"16px", lineHeight:"1.8", color:"#7a7570", marginBottom:"48px" }}>VainMuze is more than a store. It is a growing community of artists, fans, collaborators, and music lovers who believe independent voices deserve to be heard. Join us.</p>
          <div style={{ display:"flex", gap:"16px", justifyContent:"center", flexWrap:"wrap" }}>
            <Link to="/store" style={{ padding:"14px 36px", background:"#c8a96e", color:"#060608", fontSize:"12px", letterSpacing:"3px", textTransform:"uppercase", textDecoration:"none", fontWeight:"bold" }}>Discover Music</Link>
            <Link to="/artist/signup" style={{ padding:"14px 36px", background:"transparent", border:"1px solid rgba(200,169,110,0.4)", color:"#c8a96e", fontSize:"12px", letterSpacing:"3px", textTransform:"uppercase", textDecoration:"none" }}>Join as Artist</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════

function Store({ addToCart, cart, removeFromCart }) {
  const [songs, setSongs] = useState([])
  const [view, setView] = useState("store")
  const [currentPlaying, setCurrentPlaying] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const total = cart.reduce((sum, s) => sum + Number(s.price), 0).toFixed(2)

  useEffect(() => {
    supabase.from('songs').select('*, artist:artists(name, slug)').order('created_at', { ascending: true })
      .then(({ data }) => { setSongs(data || []); setLoading(false) })
  }, [])

  const handleCheckout = async () => {
    setCheckoutLoading(true)
    await handleStripeCheckout(cart)
    setCheckoutLoading(false)
  }

  return (
    <div style={{ background:"#060608", minHeight:"100vh", color:"#f0ece4", paddingTop:"100px" }}>
      <div style={{ maxWidth:"1100px", margin:"0 auto", padding:"40px 48px" }}>
        <p style={{ fontSize:"10px", letterSpacing:"5px", textTransform:"uppercase", color:"#c8a96e", marginBottom:"12px" }}>The Music</p>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"48px" }}>
          <h1 style={{ fontFamily:"Georgia, serif", fontSize:"48px", fontWeight:"900" }}>All Tracks</h1>
          <div style={{ display:"flex", gap:"12px" }}>
            {["store","cart"].map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding:"8px 20px", background:view===v?"#c8a96e":"transparent", color:view===v?"#060608":"#7a7570", border:"1px solid", borderColor:view===v?"#c8a96e":"#333", fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", cursor:"pointer" }}>
                {v==="cart" ? `Cart (${cart.length})` : "Store"}
              </button>
            ))}
          </div>
        </div>

        {view === "store" && (
          loading ? <p style={{ color:"#7a7570", textAlign:"center", padding:"60px" }}>Loading tracks...</p> :
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:"16px" }}>
            {songs.map(song => (
              <div key={song.id} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", padding:"32px", borderRadius:"4px" }}>
                <div style={{ fontSize:"10px", letterSpacing:"4px", textTransform:"uppercase", color:"#8a6f3f", marginBottom:"6px" }}>{song.genre}</div>
                <h3 style={{ fontFamily:"Georgia, serif", fontSize:"20px", fontWeight:"700", marginBottom:"4px" }}>{song.title}</h3>
                {song.artist && <Link to={`/artists/${song.artist.slug}`} style={{ fontSize:"11px", color:"#7a7570", textDecoration:"none" }}>{song.artist.name}</Link>}
                <p style={{ fontSize:"12px", color:"#7a7570", margin:"6px 0 12px" }}>{song.duration}</p>
                <div style={{ marginBottom:"16px" }}>
                  <AudioPlayer song={song} currentPlaying={currentPlaying} setCurrentPlaying={setCurrentPlaying} />
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontFamily:"Georgia, serif", fontSize:"24px", color:"#c8a96e" }}>${song.price}</span>
                  <button onClick={() => addToCart(song)} disabled={!!cart.find(s => s.id === song.id)}
                    style={{ padding:"10px 20px", background:cart.find(s => s.id === song.id)?"#333":"#c8a96e", color:cart.find(s => s.id === song.id)?"#7a7570":"#060608", border:"none", fontSize:"11px", cursor:"pointer", fontWeight:"bold" }}>
                    {cart.find(s => s.id === song.id) ? "Added" : "+ Add"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === "cart" && (
          <div>
            {cart.length === 0 ? <p style={{ color:"#7a7570", textAlign:"center", padding:"60px" }}>Your cart is empty</p> : (
              <div>
                {cart.map(song => (
                  <div key={song.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", marginBottom:"8px", borderRadius:"4px" }}>
                    <div>
                      <p style={{ margin:0, fontFamily:"Georgia, serif", fontSize:"18px", fontWeight:"bold" }}>{song.title}</p>
                      <p style={{ margin:0, color:"#7a7570", fontSize:"12px" }}>{song.genre}</p>
                    </div>
                    <div style={{ display:"flex", gap:"20px", alignItems:"center" }}>
                      <span style={{ color:"#c8a96e", fontFamily:"Georgia, serif", fontSize:"22px" }}>${song.price}</span>
                      <button onClick={() => removeFromCart(song.id)} style={{ background:"transparent", color:"#9b2c2c", border:"1px solid #9b2c2c", padding:"6px 12px", fontSize:"11px", cursor:"pointer" }}>Remove</button>
                    </div>
                  </div>
                ))}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:"32px", marginTop:"32px", borderTop:"1px solid #222" }}>
                  <p style={{ fontFamily:"Georgia, serif", fontSize:"28px", margin:0 }}>Total: ${total}</p>
                  <button onClick={handleCheckout} disabled={checkoutLoading}
                    style={{ padding:"14px 40px", background:"#c8a96e", color:"#060608", border:"none", fontSize:"12px", letterSpacing:"3px", textTransform:"uppercase", cursor:"pointer", fontWeight:"bold", opacity:checkoutLoading?0.7:1 }}>
                    {checkoutLoading ? "Redirecting..." : "Checkout with Stripe"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// ABOUT
// ═══════════════════════════════════════════════════════

function About() {
  return (
    <div style={{ background:"#060608", minHeight:"100vh", color:"#f0ece4", paddingTop:"100px" }}>
      <div style={{ maxWidth:"900px", margin:"0 auto", padding:"60px 48px" }}>
        <p style={{ fontSize:"10px", letterSpacing:"5px", textTransform:"uppercase", color:"#c8a96e", marginBottom:"12px" }}>The Artist</p>
        <h1 style={{ fontFamily:"Georgia, serif", fontSize:"64px", fontWeight:"900", lineHeight:"1.1", marginBottom:"48px" }}>Twenty years of<br/><em style={{ color:"#c8a96e" }}>unfiltered sound</em></h1>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"60px", alignItems:"start" }}>
          <div>
            <p style={{ fontSize:"16px", lineHeight:"1.9", color:"#7a7570", marginBottom:"24px" }}>A Portland songwriter and producer, rooted in the beautiful Pacific Northwest. For two decades I have been writing songs that do not apologize.</p>
            <p style={{ fontSize:"16px", lineHeight:"1.9", color:"#7a7570", marginBottom:"24px" }}>Hip hop that bleeds truth. Blues that aches. Indie anthems for the ones who will not give up. Cinematic pop for moments that deserve a score.</p>
            <p style={{ fontSize:"16px", lineHeight:"1.9", color:"#7a7570" }}>VainMuze started as an artist name. Now it is becoming a platform where independent voices sell their music directly, without gatekeepers.</p>
          </div>
          <div style={{ position:"relative" }}>
            <div style={{ position:"absolute", inset:"-16px", border:"1px solid rgba(200,169,110,0.2)", transform:"rotate(2deg)" }}></div>
            <img src="/VainMuze_avatar.png" alt="VainMuze" style={{ width:"100%", filter:"grayscale(20%) contrast(1.1)", position:"relative", zIndex:1 }} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// ARTISTS
// ═══════════════════════════════════════════════════════

function Artists() {
  const [artists, setArtists] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('artists').select('*, songs(count)').eq('status', 'approved').order('name')
      .then(({ data }) => { setArtists(data || []); setLoading(false) })
  }, [])

  return (
    <div style={{ background:"#060608", minHeight:"100vh", color:"#f0ece4", paddingTop:"100px" }}>
      <div style={{ maxWidth:"1100px", margin:"0 auto", padding:"60px 48px" }}>
        <p style={{ fontSize:"10px", letterSpacing:"5px", textTransform:"uppercase", color:"#c8a96e", marginBottom:"12px", textAlign:"center" }}>The Community</p>
        <h1 style={{ fontFamily:"Georgia, serif", fontSize:"64px", fontWeight:"900", lineHeight:"1.1", marginBottom:"24px", textAlign:"center" }}>Independent<br/><em style={{ color:"#c8a96e" }}>Artists</em></h1>
        <p style={{ fontSize:"16px", color:"#7a7570", maxWidth:"560px", margin:"0 auto 80px", lineHeight:"1.8", textAlign:"center" }}>Every artist here built their sound outside the system. No labels. No gatekeepers. Just music made because it had to be made.</p>

        {loading ? <p style={{ color:"#7a7570", textAlign:"center", padding:"40px" }}>Loading artists...</p> : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:"16px", marginBottom:"80px" }}>
            {artists.map(artist => (
              <Link key={artist.id} to={`/artists/${artist.slug}`} style={{ textDecoration:"none" }}>
                <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"4px", overflow:"hidden" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor="rgba(200,169,110,0.4)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"}>
                  <div style={{ height:"200px", overflow:"hidden", position:"relative", background:"#111" }}>
                    {artist.photo_url ? (
                      <img src={artist.photo_url} alt={artist.name} style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top", filter:"grayscale(20%)" }} />
                    ) : (
                      <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"64px" }}>🎵</div>
                    )}
                    <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(6,6,8,0.8) 0%, transparent 60%)" }}></div>
                  </div>
                  <div style={{ padding:"24px" }}>
                    <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"12px" }}>
                      {(artist.genres || []).map(g => (
                        <span key={g} style={{ fontSize:"9px", letterSpacing:"2px", textTransform:"uppercase", color:"#8a6f3f", background:"rgba(200,169,110,0.08)", padding:"3px 8px", borderRadius:"2px" }}>{g}</span>
                      ))}
                    </div>
                    <h3 style={{ fontFamily:"Georgia, serif", fontSize:"24px", fontWeight:"700", color:"#f0ece4", marginBottom:"4px" }}>{artist.name}</h3>
                    <p style={{ fontSize:"12px", color:"#7a7570", marginBottom:"12px" }}>{artist.location}{artist.established ? ` — Est. ${artist.established}` : ''}</p>
                    <p style={{ fontSize:"13px", color:"#c8a96e", letterSpacing:"2px", textTransform:"uppercase" }}>
                      {artist.songs?.[0]?.count || 0} Tracks →
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div style={{ borderTop:"1px solid rgba(200,169,110,0.1)", paddingTop:"80px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"16px", marginBottom:"48px" }}>
            {[["🎵","Free to Join","No upfront costs. Upload and start selling immediately."],["💰","Keep Your Earnings","Direct Stripe payments. Your money goes straight to you."],["🔥","Built by an Artist","Made by a musician who understands what indie artists need."]].map(([icon,title,text]) => (
              <div key={title} style={{ padding:"40px 32px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"4px" }}>
                <div style={{ fontSize:"28px", marginBottom:"16px" }}>{icon}</div>
                <h3 style={{ fontFamily:"Georgia, serif", fontSize:"20px", fontWeight:"700", marginBottom:"12px" }}>{title}</h3>
                <p style={{ fontSize:"14px", color:"#7a7570", lineHeight:"1.7", margin:0 }}>{text}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign:"center" }}>
            <Link to="/artist/signup" style={{ display:"inline-block", padding:"16px 48px", background:"transparent", border:"1px solid #c8a96e", color:"#c8a96e", fontSize:"12px", letterSpacing:"4px", textTransform:"uppercase", textDecoration:"none" }}>Apply as an Artist</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// ARTIST PROFILE
// ═══════════════════════════════════════════════════════

function ArtistProfile({ addToCart, cart }) {
  const { artistId } = useParams()
  const [artist, setArtist] = useState(null)
  const [songs, setSongs] = useState([])
  const [profilePlaying, setProfilePlaying] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data: artistData } = await supabase.from('artists').select('*').eq('slug', artistId).single()
      if (!artistData) { setLoading(false); return }
      setArtist(artistData)
      const { data: songsData } = await supabase.from('songs').select('*').eq('artist_id', artistData.id).order('created_at', { ascending: true })
      setSongs(songsData || [])
      setLoading(false)
    }
    fetchData()
  }, [artistId])

  if (loading) return <div style={{ background:"#060608", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}><p style={{ color:"#7a7570" }}>Loading...</p></div>

  if (!artist) return (
    <div style={{ background:"#060608", minHeight:"100vh", color:"#f0ece4", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
      <h1 style={{ fontFamily:"Georgia, serif", fontSize:"48px", color:"#c8a96e", marginBottom:"24px" }}>Artist not found</h1>
      <Link to="/artists" style={{ color:"#7a7570", textDecoration:"none", letterSpacing:"3px", textTransform:"uppercase", fontSize:"12px" }}>← Back to Artists</Link>
    </div>
  )

  return (
    <div style={{ background:"#060608", minHeight:"100vh", color:"#f0ece4" }}>
      <div style={{ position:"relative", height:"70vh", display:"flex", alignItems:"flex-end", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 60% 40%, rgba(200,169,110,0.06) 0%, transparent 60%)" }}></div>
        {artist.photo_url ? (
          <img src={artist.photo_url} alt={artist.name} style={{ position:"absolute", right:0, top:0, width:"50%", height:"100%", objectFit:"cover", objectPosition:"center top", opacity:0.85 }} />
        ) : (
          <div style={{ position:"absolute", right:0, top:0, width:"50%", height:"100%", background:"#111", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"120px" }}>🎵</div>
        )}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to right, rgba(6,6,8,1) 40%, transparent 70%)" }}></div>
        <div style={{ position:"relative", zIndex:2, padding:"0 48px 60px", maxWidth:"580px" }}>
          <Link to="/artists" style={{ fontSize:"11px", letterSpacing:"3px", textTransform:"uppercase", color:"#7a7570", textDecoration:"none", display:"block", marginBottom:"24px" }}>← All Artists</Link>
          <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"16px" }}>
            {(artist.genres || []).map(g => (
              <span key={g} style={{ fontSize:"9px", letterSpacing:"2px", textTransform:"uppercase", color:"#8a6f3f", background:"rgba(200,169,110,0.08)", padding:"3px 8px", borderRadius:"2px" }}>{g}</span>
            ))}
          </div>
          <h1 style={{ fontFamily:"Georgia, serif", fontSize:"72px", fontWeight:"900", lineHeight:"0.95", marginBottom:"16px" }}>{artist.name}</h1>
          <p style={{ fontSize:"11px", letterSpacing:"4px", textTransform:"uppercase", color:"#c8a96e" }}>{artist.location}{artist.established ? ` — Est. ${artist.established}` : ''}</p>
        </div>
      </div>

      <div style={{ maxWidth:"1100px", margin:"0 auto", padding:"80px 48px" }}>
        {(artist.bio1 || artist.bio2 || artist.bio3) && (
          <div style={{ marginBottom:"80px" }}>
            <p style={{ fontSize:"10px", letterSpacing:"5px", textTransform:"uppercase", color:"#c8a96e", marginBottom:"24px" }}>About</p>
            {artist.bio1 && <p style={{ fontSize:"16px", lineHeight:"1.9", color:"#7a7570", marginBottom:"20px" }}>{artist.bio1}</p>}
            {artist.bio2 && <p style={{ fontSize:"16px", lineHeight:"1.9", color:"#7a7570", marginBottom:"20px" }}>{artist.bio2}</p>}
            {artist.bio3 && <p style={{ fontSize:"16px", lineHeight:"1.9", color:"#7a7570" }}>{artist.bio3}</p>}
          </div>
        )}

        <p style={{ fontSize:"10px", letterSpacing:"5px", textTransform:"uppercase", color:"#c8a96e", marginBottom:"12px" }}>Tracks</p>
        <h2 style={{ fontFamily:"Georgia, serif", fontSize:"36px", fontWeight:"700", marginBottom:"40px" }}>Music by {artist.name}</h2>
        {songs.length === 0 ? (
          <p style={{ color:"#7a7570" }}>No tracks yet.</p>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:"16px" }}>
            {songs.map((song, i) => (
              <div key={song.id} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", padding:"32px", borderRadius:"4px" }}
                onMouseEnter={e => e.currentTarget.style.borderColor="rgba(200,169,110,0.3)"}
                onMouseLeave={e => e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"}>
                <div style={{ fontFamily:"Georgia, serif", fontSize:"48px", color:"rgba(200,169,110,0.1)", lineHeight:"1", marginBottom:"12px" }}>{String(i+1).padStart(2,'0')}</div>
                <div style={{ fontSize:"10px", letterSpacing:"4px", textTransform:"uppercase", color:"#8a6f3f", marginBottom:"6px" }}>{song.genre}</div>
                <h3 style={{ fontFamily:"Georgia, serif", fontSize:"20px", fontWeight:"700", marginBottom:"6px" }}>{song.title}</h3>
                <p style={{ fontSize:"12px", color:"#7a7570", marginBottom:"16px" }}>{song.duration}</p>
                <div style={{ marginBottom:"16px" }}>
                  <AudioPlayer song={song} currentPlaying={profilePlaying} setCurrentPlaying={setProfilePlaying} />
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontFamily:"Georgia, serif", fontSize:"24px", color:"#c8a96e" }}>${song.price}</span>
                  <button onClick={() => addToCart(song)} disabled={!!cart.find(s => s.id === song.id)}
                    style={{ padding:"10px 20px", background:cart.find(s => s.id === song.id)?"#333":"#c8a96e", color:cart.find(s => s.id === song.id)?"#7a7570":"#060608", border:"none", fontSize:"11px", cursor:"pointer", fontWeight:"bold" }}>
                    {cart.find(s => s.id === song.id) ? "Added" : "+ Add"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// ARTIST SIGNUP
// ═══════════════════════════════════════════════════════

const GENRE_OPTIONS = ['Hip Hop', 'Blues', 'Indie', 'Pop', 'R&B', 'Jazz', 'Rock', 'Electronic', 'Folk', 'Country', 'Classical', 'Cinematic', 'Other']

function ArtistSignup() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form, setForm] = useState({ email:'', password:'', name:'', location:'', established:'', bio1:'', bio2:'', bio3:'' })
  const [genres, setGenres] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (user) return <Navigate to="/dashboard" />

  const toggleGenre = (g) => setGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return setError('Artist name is required')
    if (genres.length === 0) return setError('Select at least one genre')
    setLoading(true)
    setError('')

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (authError) { setError(authError.message); setLoading(false); return }

    const slug = form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    const { error: artistError } = await supabase.from('artists').insert({
      user_id: authData.user.id,
      name: form.name,
      slug,
      location: form.location,
      established: form.established,
      bio1: form.bio1,
      bio2: form.bio2,
      bio3: form.bio3,
      genres,
      status: 'pending'
    })

    if (artistError) { setError(artistError.message); setLoading(false); return }

    setSuccess(true)
    setLoading(false)
  }

  if (success) return (
    <div style={{ background:"#060608", minHeight:"100vh", color:"#f0ece4", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"48px", textAlign:"center" }}>
      <div style={{ fontSize:"64px", marginBottom:"24px" }}>🎵</div>
      <h1 style={{ fontFamily:"Georgia, serif", fontSize:"48px", color:"#c8a96e", marginBottom:"16px" }}>Application Submitted</h1>
      <p style={{ fontSize:"18px", color:"#7a7570", maxWidth:"480px", lineHeight:"1.8", marginBottom:"16px" }}>Your artist profile is pending review. We'll approve it shortly.</p>
      <p style={{ fontSize:"14px", color:"#7a7570", maxWidth:"480px", lineHeight:"1.8", marginBottom:"48px" }}>Please check your email to confirm your account, then log in once you're approved.</p>
      <Link to="/" style={{ padding:"14px 36px", background:"#c8a96e", color:"#060608", fontSize:"12px", letterSpacing:"3px", textTransform:"uppercase", textDecoration:"none", fontWeight:"bold" }}>Back to Home</Link>
    </div>
  )

  return (
    <div style={{ background:"#060608", minHeight:"100vh", color:"#f0ece4", paddingTop:"100px" }}>
      <div style={{ maxWidth:"680px", margin:"0 auto", padding:"60px 48px" }}>
        <p style={{ fontSize:"10px", letterSpacing:"5px", textTransform:"uppercase", color:"#c8a96e", marginBottom:"12px" }}>Join VainMuze</p>
        <h1 style={{ fontFamily:"Georgia, serif", fontSize:"48px", fontWeight:"900", marginBottom:"48px" }}>Apply as an<br/><em style={{ color:"#c8a96e" }}>Artist</em></h1>

        <form onSubmit={handleSubmit}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"16px" }}>
            <div>
              <label style={labelStyle}>Email *</label>
              <input style={inputStyle} type="email" required value={form.email} onChange={e => setForm({...form, email:e.target.value})} placeholder="your@email.com" />
            </div>
            <div>
              <label style={labelStyle}>Password *</label>
              <input style={inputStyle} type="password" required value={form.password} onChange={e => setForm({...form, password:e.target.value})} placeholder="Min 6 characters" minLength={6} />
            </div>
          </div>

          <div style={{ marginBottom:"16px" }}>
            <label style={labelStyle}>Artist Name *</label>
            <input style={inputStyle} type="text" required value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="Your artist name" />
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"16px" }}>
            <div>
              <label style={labelStyle}>Location</label>
              <input style={inputStyle} type="text" value={form.location} onChange={e => setForm({...form, location:e.target.value})} placeholder="City, State" />
            </div>
            <div>
              <label style={labelStyle}>Year Established</label>
              <input style={inputStyle} type="text" value={form.established} onChange={e => setForm({...form, established:e.target.value})} placeholder="e.g. 2018" />
            </div>
          </div>

          <div style={{ marginBottom:"16px" }}>
            <label style={labelStyle}>Bio (Part 1)</label>
            <textarea style={{...inputStyle, height:"80px", resize:"vertical"}} value={form.bio1} onChange={e => setForm({...form, bio1:e.target.value})} placeholder="Introduce yourself..." />
          </div>
          <div style={{ marginBottom:"16px" }}>
            <label style={labelStyle}>Bio (Part 2) — optional</label>
            <textarea style={{...inputStyle, height:"80px", resize:"vertical"}} value={form.bio2} onChange={e => setForm({...form, bio2:e.target.value})} placeholder="Your sound and influences..." />
          </div>
          <div style={{ marginBottom:"24px" }}>
            <label style={labelStyle}>Bio (Part 3) — optional</label>
            <textarea style={{...inputStyle, height:"80px", resize:"vertical"}} value={form.bio3} onChange={e => setForm({...form, bio3:e.target.value})} placeholder="Your vision and what drives you..." />
          </div>

          <div style={{ marginBottom:"32px" }}>
            <label style={labelStyle}>Genres * (select all that apply)</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"8px", marginTop:"8px" }}>
              {GENRE_OPTIONS.map(g => (
                <button key={g} type="button" onClick={() => toggleGenre(g)}
                  style={{ padding:"8px 16px", background:genres.includes(g)?"#c8a96e":"transparent", color:genres.includes(g)?"#060608":"#7a7570", border:`1px solid ${genres.includes(g)?"#c8a96e":"#333"}`, fontSize:"11px", letterSpacing:"1px", cursor:"pointer", borderRadius:"2px" }}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          {error && <p style={{ color:"#e53e3e", marginBottom:"16px", fontSize:"14px" }}>{error}</p>}

          <button type="submit" disabled={loading}
            style={{ width:"100%", padding:"16px", background:"#c8a96e", color:"#060608", border:"none", fontSize:"12px", letterSpacing:"3px", textTransform:"uppercase", cursor:"pointer", fontWeight:"bold", opacity:loading?0.7:1 }}>
            {loading ? "Submitting..." : "Submit Application"}
          </button>

          <p style={{ textAlign:"center", marginTop:"24px", fontSize:"13px", color:"#7a7570" }}>
            Already have an account? <Link to="/artist/login" style={{ color:"#c8a96e", textDecoration:"none" }}>Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// ARTIST LOGIN
// ═══════════════════════════════════════════════════════

function ArtistLogin() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (user) return <Navigate to="/dashboard" />

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else navigate('/dashboard')
  }

  return (
    <div style={{ background:"#060608", minHeight:"100vh", color:"#f0ece4", display:"flex", alignItems:"center", justifyContent:"center", padding:"48px" }}>
      <div style={{ width:"100%", maxWidth:"420px" }}>
        <p style={{ fontSize:"10px", letterSpacing:"5px", textTransform:"uppercase", color:"#c8a96e", marginBottom:"12px", textAlign:"center" }}>The Backstage</p>
        <h1 style={{ fontFamily:"Georgia, serif", fontSize:"42px", fontWeight:"900", marginBottom:"48px", textAlign:"center" }}>Sign In</h1>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom:"16px" }}>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
          </div>
          <div style={{ marginBottom:"32px" }}>
            <label style={labelStyle}>Password</label>
            <input style={inputStyle} type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" />
          </div>

          {error && <p style={{ color:"#e53e3e", marginBottom:"16px", fontSize:"14px" }}>{error}</p>}

          <button type="submit" disabled={loading}
            style={{ width:"100%", padding:"16px", background:"#c8a96e", color:"#060608", border:"none", fontSize:"12px", letterSpacing:"3px", textTransform:"uppercase", cursor:"pointer", fontWeight:"bold", opacity:loading?0.7:1 }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <p style={{ textAlign:"center", marginTop:"24px", fontSize:"13px", color:"#7a7570" }}>
            New artist? <Link to="/artist/signup" style={{ color:"#c8a96e", textDecoration:"none" }}>Apply here</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// ARTIST DASHBOARD
// ═══════════════════════════════════════════════════════

function ArtistDashboard() {
  const { user, artist, authLoading, refetchArtist } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const tabParam = new URLSearchParams(location.search).get('tab')
  const [songs, setSongs] = useState([])
  const [view, setView] = useState(tabParam || 'songs')

  useEffect(() => {
    if (tabParam && tabParam !== view) setView(tabParam)
  }, [tabParam])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [songForm, setSongForm] = useState({ title:'', genre:'', duration:'', price:'1.15' })
  const [audioFile, setAudioFile] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [profileForm, setProfileForm] = useState({})
  const [profileGenres, setProfileGenres] = useState([])
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [dashPlaying, setDashPlaying] = useState(null)

  useEffect(() => {
    if (artist) {
      setProfileForm({ name:artist.name||'', location:artist.location||'', established:artist.established||'', bio1:artist.bio1||'', bio2:artist.bio2||'', bio3:artist.bio3||'' })
      setProfileGenres(artist.genres || [])
      fetchSongs()
    }
  }, [artist])

  const fetchSongs = async () => {
    const { data } = await supabase.from('songs').select('*').eq('artist_id', artist.id).order('created_at', { ascending: false })
    setSongs(data || [])
  }

  if (authLoading) return <div style={{ background:"#060608", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}><p style={{ color:"#7a7570" }}>Loading...</p></div>
  if (!user) return <Navigate to="/artist/login" />
  if (!artist) return (
    <div style={{ background:"#060608", minHeight:"100vh", color:"#f0ece4", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"48px" }}>
      <h2 style={{ fontFamily:"Georgia, serif", fontSize:"32px", color:"#c8a96e", marginBottom:"16px" }}>Application Pending</h2>
      <p style={{ color:"#7a7570", maxWidth:"400px", lineHeight:"1.8" }}>Your artist application is under review. You'll be able to access your dashboard once approved. Please also confirm your email if you haven't yet.</p>
    </div>
  )

  const uploadAudio = async (file) => {
    const path = `${user.id}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
    const { error } = await supabase.storage.from('audio').upload(path, file)
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('audio').getPublicUrl(path)
    return publicUrl
  }

  const uploadPhoto = async (file) => {
    const path = `${user.id}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`
    const { error } = await supabase.storage.from('artist-photos').upload(path, file)
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('artist-photos').getPublicUrl(path)
    return publicUrl
  }

  const handleUploadSong = async (e) => {
    e.preventDefault()
    if (!audioFile) return setUploadError('Please select an audio file')
    if (!songForm.title.trim()) return setUploadError('Title is required')
    setUploading(true)
    setUploadError('')
    setUploadSuccess(false)

    try {
      const audioUrl = await uploadAudio(audioFile)
      await supabase.from('songs').insert({
        artist_id: artist.id,
        title: songForm.title,
        genre: songForm.genre,
        duration: songForm.duration,
        price: parseFloat(songForm.price) || 1.15,
        audio_url: audioUrl,
        preview_url: audioUrl,
      })
      setSongForm({ title:'', genre:'', duration:'', price:'1.15' })
      setAudioFile(null)
      setUploadSuccess(true)
      fetchSongs()
    } catch (err) {
      setUploadError(err.message)
    }
    setUploading(false)
  }

  const handleDeleteSong = async (songId) => {
    if (!confirm('Delete this track?')) return
    await supabase.from('songs').delete().eq('id', songId)
    fetchSongs()
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    let photoUrl = artist.photo_url

    if (photoFile) {
      try { photoUrl = await uploadPhoto(photoFile) }
      catch (err) { setSavingProfile(false); return alert('Photo upload failed: ' + err.message) }
    }

    await supabase.from('artists').update({
      ...profileForm,
      genres: profileGenres,
      photo_url: photoUrl
    }).eq('id', artist.id)

    await refetchArtist()
    setProfileSaved(true)
    setSavingProfile(false)
    setTimeout(() => setProfileSaved(false), 3000)
  }

  const toggleProfileGenre = (g) => setProfileGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])

  return (
    <div style={{ background:"#060608", minHeight:"100vh", color:"#f0ece4", paddingTop:"100px" }}>
      <div style={{ maxWidth:"1000px", margin:"0 auto", padding:"40px 48px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"48px" }}>
          <div>
            <p style={{ fontSize:"10px", letterSpacing:"5px", textTransform:"uppercase", color:"#c8a96e", marginBottom:"8px" }}>Artist Dashboard</p>
            <h1 style={{ fontFamily:"Georgia, serif", fontSize:"42px", fontWeight:"900" }}>{artist.name}</h1>
            <span style={{ fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", padding:"4px 12px", background:artist.status==='approved'?"rgba(72,187,120,0.15)":"rgba(200,169,110,0.1)", color:artist.status==='approved'?"#48bb78":"#c8a96e", borderRadius:"2px" }}>{artist.status}</span>
          </div>
          <Link to={`/artists/${artist.slug}`} style={{ fontSize:"11px", letterSpacing:"3px", textTransform:"uppercase", color:"#7a7570", textDecoration:"none", borderBottom:"1px solid #7a7570", paddingBottom:"2px" }}>View Public Profile →</Link>
        </div>

        <div style={{ display:"flex", gap:"8px", marginBottom:"40px" }}>
          {['songs','upload','profile'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding:"10px 24px", background:view===v?"#c8a96e":"transparent", color:view===v?"#060608":"#7a7570", border:`1px solid ${view===v?"#c8a96e":"#333"}`, fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", cursor:"pointer" }}>
              {v==='songs'?"My Tracks":v==='upload'?"Upload Track":"Edit Profile"}
            </button>
          ))}
        </div>

        {view === 'songs' && (
          <div>
            <h2 style={{ fontFamily:"Georgia, serif", fontSize:"28px", fontWeight:"700", marginBottom:"24px" }}>My Tracks ({songs.length})</h2>
            {songs.length === 0 ? (
              <div style={{ textAlign:"center", padding:"60px", border:"1px dashed #333", borderRadius:"4px" }}>
                <p style={{ color:"#7a7570", marginBottom:"16px" }}>No tracks yet. Upload your first song!</p>
                <button onClick={() => setView('upload')} style={{ padding:"12px 32px", background:"#c8a96e", color:"#060608", border:"none", fontSize:"11px", letterSpacing:"2px", cursor:"pointer", fontWeight:"bold" }}>Upload Track</button>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                {songs.map(song => (
                  <div key={song.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px 24px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"4px" }}>
                    <div style={{ flex:1 }}>
                      <p style={{ margin:0, fontFamily:"Georgia, serif", fontSize:"18px", fontWeight:"bold" }}>{song.title}</p>
                      <p style={{ margin:0, color:"#7a7570", fontSize:"12px" }}>{song.genre} · {song.duration} · ${song.price}</p>
                    </div>
                    <div style={{ display:"flex", gap:"12px", alignItems:"center" }}>
                      <AudioPlayer song={song} currentPlaying={dashPlaying} setCurrentPlaying={setDashPlaying} />
                      <button onClick={() => handleDeleteSong(song.id)} style={{ background:"transparent", color:"#9b2c2c", border:"1px solid #9b2c2c", padding:"6px 12px", fontSize:"11px", cursor:"pointer" }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'upload' && (
          <div style={{ maxWidth:"540px" }}>
            <h2 style={{ fontFamily:"Georgia, serif", fontSize:"28px", fontWeight:"700", marginBottom:"32px" }}>Upload New Track</h2>
            <form onSubmit={handleUploadSong}>
              <div style={{ marginBottom:"16px" }}>
                <label style={labelStyle}>Track Title *</label>
                <input style={inputStyle} type="text" required value={songForm.title} onChange={e => setSongForm({...songForm, title:e.target.value})} placeholder="Song title" />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"12px", marginBottom:"16px" }}>
                <div>
                  <label style={labelStyle}>Genre</label>
                  <input style={inputStyle} type="text" value={songForm.genre} onChange={e => setSongForm({...songForm, genre:e.target.value})} placeholder="e.g. Blues" />
                </div>
                <div>
                  <label style={labelStyle}>Duration</label>
                  <input style={inputStyle} type="text" value={songForm.duration} onChange={e => setSongForm({...songForm, duration:e.target.value})} placeholder="e.g. 3:45" />
                </div>
                <div>
                  <label style={labelStyle}>Price ($)</label>
                  <input style={inputStyle} type="number" step="0.01" min="0.50" value={songForm.price} onChange={e => setSongForm({...songForm, price:e.target.value})} />
                </div>
              </div>
              <div style={{ marginBottom:"32px" }}>
                <label style={labelStyle}>Audio File * (MP3 or WAV)</label>
                <input type="file" accept="audio/*" required onChange={e => setAudioFile(e.target.files[0])}
                  style={{ ...inputStyle, padding:"12px", cursor:"pointer" }} />
                {audioFile && <p style={{ color:"#c8a96e", fontSize:"12px", marginTop:"4px" }}>✓ {audioFile.name}</p>}
              </div>
              {uploadError && <p style={{ color:"#e53e3e", marginBottom:"16px", fontSize:"14px" }}>{uploadError}</p>}
              {uploadSuccess && <p style={{ color:"#48bb78", marginBottom:"16px", fontSize:"14px" }}>✓ Track uploaded successfully!</p>}
              <button type="submit" disabled={uploading}
                style={{ width:"100%", padding:"16px", background:"#c8a96e", color:"#060608", border:"none", fontSize:"12px", letterSpacing:"3px", textTransform:"uppercase", cursor:"pointer", fontWeight:"bold", opacity:uploading?0.7:1 }}>
                {uploading ? "Uploading..." : "Upload Track"}
              </button>
            </form>
          </div>
        )}

        {view === 'profile' && (
          <div style={{ maxWidth:"620px" }}>
            <h2 style={{ fontFamily:"Georgia, serif", fontSize:"28px", fontWeight:"700", marginBottom:"32px" }}>Edit Profile</h2>
            <form onSubmit={handleSaveProfile}>
              <div style={{ marginBottom:"16px" }}>
                <label style={labelStyle}>Artist Name *</label>
                <input style={inputStyle} type="text" required value={profileForm.name||''} onChange={e => setProfileForm({...profileForm, name:e.target.value})} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"16px" }}>
                <div>
                  <label style={labelStyle}>Location</label>
                  <input style={inputStyle} type="text" value={profileForm.location||''} onChange={e => setProfileForm({...profileForm, location:e.target.value})} placeholder="City, State" />
                </div>
                <div>
                  <label style={labelStyle}>Year Established</label>
                  <input style={inputStyle} type="text" value={profileForm.established||''} onChange={e => setProfileForm({...profileForm, established:e.target.value})} placeholder="e.g. 2018" />
                </div>
              </div>
              <div style={{ marginBottom:"16px" }}>
                <label style={labelStyle}>Bio (Part 1)</label>
                <textarea style={{...inputStyle, height:"80px", resize:"vertical"}} value={profileForm.bio1||''} onChange={e => setProfileForm({...profileForm, bio1:e.target.value})} />
              </div>
              <div style={{ marginBottom:"16px" }}>
                <label style={labelStyle}>Bio (Part 2)</label>
                <textarea style={{...inputStyle, height:"80px", resize:"vertical"}} value={profileForm.bio2||''} onChange={e => setProfileForm({...profileForm, bio2:e.target.value})} />
              </div>
              <div style={{ marginBottom:"24px" }}>
                <label style={labelStyle}>Bio (Part 3)</label>
                <textarea style={{...inputStyle, height:"80px", resize:"vertical"}} value={profileForm.bio3||''} onChange={e => setProfileForm({...profileForm, bio3:e.target.value})} />
              </div>
              <div style={{ marginBottom:"24px" }}>
                <label style={labelStyle}>Genres</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"8px", marginTop:"8px" }}>
                  {GENRE_OPTIONS.map(g => (
                    <button key={g} type="button" onClick={() => toggleProfileGenre(g)}
                      style={{ padding:"8px 16px", background:profileGenres.includes(g)?"#c8a96e":"transparent", color:profileGenres.includes(g)?"#060608":"#7a7570", border:`1px solid ${profileGenres.includes(g)?"#c8a96e":"#333"}`, fontSize:"11px", cursor:"pointer", borderRadius:"2px" }}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom:"32px" }}>
                <label style={labelStyle}>Profile Photo</label>
                {artist.photo_url && <img src={artist.photo_url} alt="Current photo" style={{ width:"80px", height:"80px", objectFit:"cover", borderRadius:"4px", display:"block", marginBottom:"8px" }} />}
                <input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files[0])}
                  style={{ ...inputStyle, padding:"12px", cursor:"pointer" }} />
                {photoFile && <p style={{ color:"#c8a96e", fontSize:"12px", marginTop:"4px" }}>✓ {photoFile.name}</p>}
              </div>
              {profileSaved && <p style={{ color:"#48bb78", marginBottom:"16px", fontSize:"14px" }}>✓ Profile saved!</p>}
              <button type="submit" disabled={savingProfile}
                style={{ width:"100%", padding:"16px", background:"#c8a96e", color:"#060608", border:"none", fontSize:"12px", letterSpacing:"3px", textTransform:"uppercase", cursor:"pointer", fontWeight:"bold", opacity:savingProfile?0.7:1 }}>
                {savingProfile ? "Saving..." : "Save Profile"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// ADMIN PANEL
// ═══════════════════════════════════════════════════════

function AdminPanel() {
  const { user, isAdmin, authLoading } = useAuth()
  const [artists, setArtists] = useState([])
  const [filter, setFilter] = useState('pending')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAdmin) fetchArtists()
  }, [isAdmin])

  const fetchArtists = async () => {
    const { data } = await supabase.from('artists').select('*').order('created_at', { ascending: false })
    setArtists(data || [])
    setLoading(false)
  }

  const updateStatus = async (id, status) => {
    await supabase.from('artists').update({ status }).eq('id', id)
    fetchArtists()
  }

  const deleteSong = async (artistId) => {
    if (!confirm('Delete all songs and this artist profile?')) return
    await supabase.from('songs').delete().eq('artist_id', artistId)
    await supabase.from('artists').delete().eq('id', artistId)
    fetchArtists()
  }

  if (authLoading) return <div style={{ background:"#060608", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}><p style={{ color:"#7a7570" }}>Loading...</p></div>
  if (!user) return <Navigate to="/artist/login" />
  if (!isAdmin) return <Navigate to="/" />

  const filtered = artists.filter(a => a.status === filter)
  const counts = { pending: artists.filter(a => a.status==='pending').length, approved: artists.filter(a => a.status==='approved').length, rejected: artists.filter(a => a.status==='rejected').length }

  return (
    <div style={{ background:"#060608", minHeight:"100vh", color:"#f0ece4", paddingTop:"100px" }}>
      <div style={{ maxWidth:"1000px", margin:"0 auto", padding:"40px 48px" }}>
        <p style={{ fontSize:"10px", letterSpacing:"5px", textTransform:"uppercase", color:"#c8a96e", marginBottom:"12px" }}>Admin</p>
        <h1 style={{ fontFamily:"Georgia, serif", fontSize:"42px", fontWeight:"900", marginBottom:"48px" }}>Artist Applications</h1>

        <div style={{ display:"flex", gap:"8px", marginBottom:"40px" }}>
          {['pending','approved','rejected'].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{ padding:"10px 24px", background:filter===s?"#c8a96e":"transparent", color:filter===s?"#060608":"#7a7570", border:`1px solid ${filter===s?"#c8a96e":"#333"}`, fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", cursor:"pointer" }}>
              {s} ({counts[s]})
            </button>
          ))}
        </div>

        {loading ? <p style={{ color:"#7a7570" }}>Loading...</p> : filtered.length === 0 ? (
          <p style={{ color:"#7a7570", padding:"40px", textAlign:"center" }}>No {filter} artists.</p>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            {filtered.map(artist => (
              <div key={artist.id} style={{ padding:"24px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"4px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"12px" }}>
                  <div style={{ display:"flex", gap:"16px", alignItems:"center" }}>
                    {artist.photo_url && <img src={artist.photo_url} alt={artist.name} style={{ width:"60px", height:"60px", objectFit:"cover", borderRadius:"4px" }} />}
                    <div>
                      <h3 style={{ fontFamily:"Georgia, serif", fontSize:"22px", fontWeight:"700", margin:0 }}>{artist.name}</h3>
                      <p style={{ color:"#7a7570", fontSize:"12px", margin:"4px 0 0" }}>{artist.location}{artist.established ? ` · Est. ${artist.established}` : ''}</p>
                      <p style={{ color:"#7a7570", fontSize:"12px", margin:"2px 0 0" }}>Genres: {(artist.genres||[]).join(', ')}</p>
                    </div>
                  </div>
                  <p style={{ color:"#7a7570", fontSize:"11px" }}>{new Date(artist.created_at).toLocaleDateString()}</p>
                </div>
                {artist.bio1 && <p style={{ color:"#7a7570", fontSize:"13px", lineHeight:"1.7", marginBottom:"16px" }}>{artist.bio1}</p>}
                <div style={{ display:"flex", gap:"8px" }}>
                  {artist.status !== 'approved' && (
                    <button onClick={() => updateStatus(artist.id, 'approved')} style={{ padding:"8px 20px", background:"rgba(72,187,120,0.15)", color:"#48bb78", border:"1px solid #48bb78", fontSize:"11px", letterSpacing:"2px", cursor:"pointer" }}>✓ Approve</button>
                  )}
                  {artist.status !== 'rejected' && (
                    <button onClick={() => updateStatus(artist.id, 'rejected')} style={{ padding:"8px 20px", background:"rgba(245,101,101,0.1)", color:"#fc8181", border:"1px solid #fc8181", fontSize:"11px", letterSpacing:"2px", cursor:"pointer" }}>✗ Reject</button>
                  )}
                  {artist.status !== 'pending' && (
                    <button onClick={() => updateStatus(artist.id, 'pending')} style={{ padding:"8px 20px", background:"transparent", color:"#7a7570", border:"1px solid #333", fontSize:"11px", letterSpacing:"2px", cursor:"pointer" }}>Reset to Pending</button>
                  )}
                  <button onClick={() => deleteSong(artist.id)} style={{ padding:"8px 20px", background:"transparent", color:"#9b2c2c", border:"1px solid #9b2c2c", fontSize:"11px", letterSpacing:"2px", cursor:"pointer" }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// SHARED STYLES
// ═══════════════════════════════════════════════════════

const labelStyle = { display:"block", fontSize:"10px", letterSpacing:"3px", textTransform:"uppercase", color:"#7a7570", marginBottom:"6px" }
const inputStyle = { width:"100%", padding:"12px 16px", background:"rgba(255,255,255,0.04)", border:"1px solid #333", color:"#f0ece4", fontSize:"14px", outline:"none", borderRadius:"2px", boxSizing:"border-box" }

// ═══════════════════════════════════════════════════════
// SUCCESS / CANCEL
// ═══════════════════════════════════════════════════════

function Success() {
  return (
    <div style={{ background:"#060608", minHeight:"100vh", color:"#f0ece4", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"48px" }}>
      <div style={{ fontSize:"64px", marginBottom:"24px" }}>🎵</div>
      <h1 style={{ fontFamily:"Georgia, serif", fontSize:"48px", fontWeight:"900", color:"#c8a96e", marginBottom:"16px" }}>Thank You!</h1>
      <p style={{ fontSize:"18px", color:"#7a7570", maxWidth:"480px", lineHeight:"1.8", marginBottom:"48px" }}>Your payment was successful. Check your email for your receipt from Stripe.</p>
      <Link to="/store" style={{ padding:"14px 36px", background:"#c8a96e", color:"#060608", fontSize:"12px", letterSpacing:"3px", textTransform:"uppercase", textDecoration:"none", fontWeight:"bold" }}>Back to Store</Link>
    </div>
  )
}

function Cancel() {
  return (
    <div style={{ background:"#060608", minHeight:"100vh", color:"#f0ece4", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"48px" }}>
      <div style={{ fontSize:"64px", marginBottom:"24px" }}>😔</div>
      <h1 style={{ fontFamily:"Georgia, serif", fontSize:"48px", fontWeight:"900", marginBottom:"16px" }}>Payment Cancelled</h1>
      <p style={{ fontSize:"18px", color:"#7a7570", maxWidth:"480px", lineHeight:"1.8", marginBottom:"48px" }}>No worries — your cart is still waiting for you.</p>
      <Link to="/store" style={{ padding:"14px 36px", background:"#c8a96e", color:"#060608", fontSize:"12px", letterSpacing:"3px", textTransform:"uppercase", textDecoration:"none", fontWeight:"bold" }}>Back to Store</Link>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════════════

function Footer() {
  return (
    <footer style={{ padding:"48px", borderTop:"1px solid #1a1a1a", background:"#060608", color:"#f0ece4" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"32px" }}>
        <span style={{ fontFamily:"Georgia, serif", fontSize:"20px", letterSpacing:"4px", color:"#c8a96e", fontWeight:"bold" }}>VAINMUZE</span>
        <div style={{ display:"flex", gap:"24px", alignItems:"center" }}>
          <a href="https://www.youtube.com/@VainMuze" target="_blank" rel="noopener noreferrer" style={{ fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", color:"#7a7570", textDecoration:"none" }}>YouTube</a>
          <a href="https://www.tiktok.com/@vainmuze1" target="_blank" rel="noopener noreferrer" style={{ fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", color:"#7a7570", textDecoration:"none" }}>TikTok</a>
        </div>
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:"24px", borderTop:"1px solid #1a1a1a" }}>
        <span style={{ fontSize:"12px", color:"#7a7570" }}>2026 VainMuze — Portland, OR</span>
        <div style={{ display:"flex", gap:"32px" }}>
          <Link to="/" style={{ fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", color:"#7a7570", textDecoration:"none" }}>Home</Link>
          <Link to="/store" style={{ fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", color:"#7a7570", textDecoration:"none" }}>Store</Link>
          <Link to="/about" style={{ fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", color:"#7a7570", textDecoration:"none" }}>About</Link>
          <Link to="/artists" style={{ fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", color:"#7a7570", textDecoration:"none" }}>Artists</Link>
          <Link to="/artist/signup" style={{ fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", color:"#7a7570", textDecoration:"none" }}>Join</Link>
        </div>
      </div>
    </footer>
  )
}

// ═══════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════

function AppShell({ cart, addToCart, removeFromCart }) {
  const { user } = useAuth()

  return (
    <div style={{ display:"flex" }}>
      {user && <Sidebar />}
      <div style={{ flex:1, marginLeft:user ? `${SIDEBAR_WIDTH}px` : "0", minWidth:0, background:"#060608" }}>
        <Nav cart={cart} />
        <Routes>
          <Route path="/" element={<Home addToCart={addToCart} cart={cart} />} />
          <Route path="/store" element={<Store addToCart={addToCart} cart={cart} removeFromCart={removeFromCart} />} />
          <Route path="/about" element={<About />} />
          <Route path="/artists" element={<Artists />} />
          <Route path="/artists/:artistId" element={<ArtistProfile addToCart={addToCart} cart={cart} />} />
          <Route path="/artist/signup" element={<ArtistSignup />} />
          <Route path="/artist/login" element={<ArtistLogin />} />
          <Route path="/dashboard" element={<ArtistDashboard />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/success" element={<Success />} />
          <Route path="/cancel" element={<Cancel />} />
        </Routes>
        <Footer />
      </div>
    </div>
  )
}

export default function App() {
  const [cart, setCart] = useState([])
  const addToCart = (song) => { if (!cart.find(s => s.id === song.id)) setCart([...cart, song]) }
  const removeFromCart = (id) => setCart(cart.filter(s => s.id !== id))

  return (
    <AuthProvider>
      <AppShell cart={cart} addToCart={addToCart} removeFromCart={removeFromCart} />
    </AuthProvider>
  )
}
