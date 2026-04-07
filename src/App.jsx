import { useState, useRef, useEffect } from 'react'
import { Routes, Route, Link, useParams, useSearchParams } from 'react-router-dom'

const ARTISTS = [
  {
    id: "vainmuze",
    name: "VainMuze",
    location: "Portland, Oregon",
    established: "2004",
    photo: "/VainMuze_avatar.png",
    bio1: "A Portland songwriter and producer, rooted in the beautiful Pacific Northwest. For two decades I have been writing songs that do not apologize.",
    bio2: "Hip hop that bleeds truth. Blues that aches. Indie anthems for the ones who will not give up. Cinematic pop for moments that deserve a score.",
    bio3: "VainMuze started as an artist name. Now it is becoming a platform where independent voices sell their music directly, without gatekeepers.",
    genres: ["Hip Hop", "Blues", "Indie", "Cinematic Pop"],
    stats: [["20", "Years Writing"], ["4", "Genres"], ["∞", "Stories"]],
    songs: [
      { id: 1, title: "America", genre: "Hip Hop", duration: "3:45", price: 1.15, preview: "/America.wav", download: "/America.wav" },
      { id: 2, title: "Human Tragedy", genre: "Indie", duration: "4:00", price: 1.15, preview: "/Human Tragedy.wav", download: "/Human Tragedy.wav" },
      { id: 3, title: "My Shadow and I", genre: "Blues", duration: "3:30", price: 1.15, preview: "/My Shadow and I.wav", download: "/My Shadow and I.wav" },
      { id: 4, title: "Crying", genre: "Indie Pop", duration: "3:30", price: 1.15, preview: "/Crying.wav", download: "/Crying.wav" },
      { id: 5, title: "Falling", genre: "Indie", duration: "3:30", price: 1.15, preview: "/Falling.wav", download: "/Falling.wav" },
      { id: 6, title: "I Pray for You", genre: "Indie", duration: "3:30", price: 1.15, preview: "/I Pray for You.wav", download: "/I Pray for You.wav" },
      { id: 7, title: "Maybe in the Next Hour", genre: "Blues", duration: "3:30", price: 1.15, preview: "/Maybe in the Next Hour.wav", download: "/Maybe in the Next Hour.wav" },
      { id: 8, title: "My Life", genre: "Indie", duration: "3:30", price: 1.15, preview: "/My Life.wav", download: "/My Life.wav" },
      { id: 9, title: "Pretty for Me", genre: "Blues", duration: "3:30", price: 1.15, preview: "/Pretty for Me.wav", download: "/Pretty for Me.wav" }
    ]
  }
]

const SONGS = ARTISTS.flatMap(a => a.songs.map(s => ({ ...s, artistId: a.id, artistName: a.name })))

async function handleStripeCheckout(cartItems) {
  try {
    const response = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cartItems })
    })
    const data = await response.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      alert('Payment error: ' + (data.error || 'Unknown error'))
    }
  } catch (error) {
    alert('Payment error: ' + error.message)
  }
}

function AudioPlayer({ song, currentPlaying, setCurrentPlaying }) {
  const audioRef = useRef(null)
  const isPlaying = currentPlaying === song.id

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
      <audio ref={audioRef} src={song.preview} onTimeUpdate={handleTimeUpdate} />
      <button onClick={toggle} style={{
        padding: "8px 16px",
        background: isPlaying ? "rgba(200,169,110,0.15)" : "transparent",
        border: "1px solid rgba(200,169,110,0.4)",
        color: "#c8a96e",
        fontSize: "11px",
        letterSpacing: "2px",
        textTransform: "uppercase",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "6px"
      }}>
        {isPlaying ? "⏸ Stop" : "▶ Preview"}
      </button>
    </>
  )
}

function Nav({ cart }) {
  return (
    <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px 48px", background:"rgba(6,6,8,0.98)", borderBottom:"1px solid #1a1a1a" }}>
      <Link to="/" style={{ fontSize:"24px", letterSpacing:"4px", color:"#c8a96e", textDecoration:"none", fontWeight:"bold" }}>VAINMUZE</Link>
      <div style={{ display:"flex", gap:"32px", alignItems:"center" }}>
        <Link to="/" style={{ color:"#7a7570", textDecoration:"none", fontSize:"12px", letterSpacing:"2px", textTransform:"uppercase" }}>Home</Link>
        <Link to="/store" style={{ color:"#7a7570", textDecoration:"none", fontSize:"12px", letterSpacing:"2px", textTransform:"uppercase" }}>Store</Link>
        <Link to="/about" style={{ color:"#7a7570", textDecoration:"none", fontSize:"12px", letterSpacing:"2px", textTransform:"uppercase" }}>About</Link>
        <Link to="/artists" style={{ color:"#7a7570", textDecoration:"none", fontSize:"12px", letterSpacing:"2px", textTransform:"uppercase" }}>Artists</Link>
        <Link to="/store" style={{ padding:"8px 20px", background:"#c8a96e", color:"#060608", fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", textDecoration:"none", fontWeight:"bold" }}>Cart ({cart.length})</Link>
      </div>
    </nav>
  )
}

function Home({ addToCart, cart }) {
  const [homePlaying, setHomePlaying] = useState(null)
  const featured = SONGS.slice(0, 3)

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
          <div style={{ display:"flex", gap:"20px", alignItems:"center", flexWrap:"wrap" }}>
            <Link to="/store" style={{ padding:"14px 36px", background:"#c8a96e", color:"#060608", fontSize:"12px", letterSpacing:"3px", textTransform:"uppercase", textDecoration:"none", fontWeight:"bold" }}>Discover Music</Link>
            <Link to="/artists" style={{ padding:"14px 36px", background:"transparent", border:"1px solid #c8a96e", color:"#c8a96e", fontSize:"12px", letterSpacing:"3px", textTransform:"uppercase", textDecoration:"none" }}>Share Your Music</Link>
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
              { icon:"🎤", title:"Independent Artists", desc:"Sell your music directly to fans. Keep your earnings. Build your audience. No label required. This platform is yours.", cta:"Join as Artist", link:"/artists" },
              { icon:"🤝", title:"Collaborators & Industry", desc:"Find emerging talent before anyone else does. Connect with artists, producers, and creators building something real.", cta:"Connect", link:"/artists" }
            ].map(item => (
              <div key={item.title} style={{ padding:"48px 36px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.04)", transition:"all 0.3s" }}
                onMouseEnter={e => e.currentTarget.style.background="rgba(200,169,110,0.04)"}
                onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,0.02)"}>
                <div style={{ fontSize:"36px", marginBottom:"20px" }}>{item.icon}</div>
                <h3 style={{ fontFamily:"Georgia, serif", fontSize:"24px", fontWeight:"700", marginBottom:"16px", color:"#f0ece4" }}>{item.title}</h3>
                <p style={{ fontSize:"14px", lineHeight:"1.8", color:"#7a7570", marginBottom:"28px" }}>{item.desc}</p>
                <Link to={item.link} style={{ fontSize:"11px", letterSpacing:"3px", textTransform:"uppercase", color:"#c8a96e", textDecoration:"none", borderBottom:"1px solid #c8a96e", paddingBottom:"2px" }}>{item.cta} →</Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding:"100px 48px", maxWidth:"1100px", margin:"0 auto" }}>
        <p style={{ fontSize:"10px", letterSpacing:"5px", textTransform:"uppercase", color:"#c8a96e", marginBottom:"12px" }}>Fresh Tracks</p>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"48px" }}>
          <h2 style={{ fontFamily:"Georgia, serif", fontSize:"42px", fontWeight:"700" }}>Featured Music</h2>
          <Link to="/store" style={{ fontSize:"11px", letterSpacing:"3px", textTransform:"uppercase", color:"#7a7570", textDecoration:"none", borderBottom:"1px solid #7a7570", paddingBottom:"2px" }}>View All →</Link>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"16px" }}>
          {featured.map((song, i) => (
            <div key={song.id} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", padding:"32px", borderRadius:"4px" }}
              onMouseEnter={e => e.currentTarget.style.borderColor="rgba(200,169,110,0.3)"}
              onMouseLeave={e => e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"}>
              <div style={{ fontFamily:"Georgia, serif", fontSize:"56px", color:"rgba(200,169,110,0.1)", lineHeight:"1", marginBottom:"16px" }}>0{i+1}</div>
              <div style={{ fontSize:"10px", letterSpacing:"4px", textTransform:"uppercase", color:"#8a6f3f", marginBottom:"8px" }}>{song.genre}</div>
              <h3 style={{ fontFamily:"Georgia, serif", fontSize:"20px", fontWeight:"700", marginBottom:"8px" }}>{song.title}</h3>
              <p style={{ fontSize:"12px", color:"#7a7570", marginBottom:"16px" }}>{song.duration}</p>
              <div style={{ marginBottom:"16px" }}>
                <AudioPlayer song={song} currentPlaying={homePlaying} setCurrentPlaying={setHomePlaying} />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontFamily:"Georgia, serif", fontSize:"24px", color:"#c8a96e" }}>${song.price}</span>
                <button onClick={() => addToCart(song)} disabled={!!cart.find(s => s.id === song.id)}
                  style={{ padding:"8px 16px", background:"transparent", border:"1px solid rgba(200,169,110,0.4)", color:"#c8a96e", fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", cursor:"pointer" }}>
                  {cart.find(s => s.id === song.id) ? "Added ✓" : "+ Cart"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:"100px 48px", background:"#0d0d12", borderTop:"1px solid rgba(200,169,110,0.1)", borderBottom:"1px solid rgba(200,169,110,0.1)" }}>
        <div style={{ maxWidth:"800px", margin:"0 auto", textAlign:"center" }}>
          <p style={{ fontSize:"10px", letterSpacing:"5px", textTransform:"uppercase", color:"#c8a96e", marginBottom:"12px" }}>The Community</p>
          <h2 style={{ fontFamily:"Georgia, serif", fontSize:"48px", fontWeight:"900", lineHeight:"1.1", marginBottom:"24px" }}>Music is better<br/><em style={{ color:"#c8a96e" }}>together</em></h2>
          <p style={{ fontSize:"16px", lineHeight:"1.8", color:"#7a7570", marginBottom:"48px" }}>VainMuze is more than a store. It is a growing community of artists, fans, collaborators, and music lovers who believe independent voices deserve to be heard. Join us.</p>
          <div style={{ display:"flex", gap:"16px", justifyContent:"center", flexWrap:"wrap" }}>
            <Link to="/store" style={{ padding:"14px 36px", background:"#c8a96e", color:"#060608", fontSize:"12px", letterSpacing:"3px", textTransform:"uppercase", textDecoration:"none", fontWeight:"bold" }}>Discover Music</Link>
            <Link to="/artists" style={{ padding:"14px 36px", background:"transparent", border:"1px solid rgba(200,169,110,0.4)", color:"#c8a96e", fontSize:"12px", letterSpacing:"3px", textTransform:"uppercase", textDecoration:"none" }}>Join as Artist</Link>
          </div>
        </div>
      </div>

      <div style={{ padding:"80px 48px", maxWidth:"1100px", margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:"2px" }}>
          {[["20+","Years of Music"],["9","Tracks & Growing"],["$1.15","Per Track"],["100%","Independent"]].map(([num, label]) => (
            <div key={label} style={{ padding:"40px 32px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.04)", textAlign:"center" }}>
              <div style={{ fontFamily:"Georgia, serif", fontSize:"48px", color:"#c8a96e", fontWeight:"900", marginBottom:"8px" }}>{num}</div>
              <div style={{ fontSize:"11px", letterSpacing:"3px", textTransform:"uppercase", color:"#7a7570" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Store({ addToCart, cart, removeFromCart }) {
  const [view, setView] = useState("store")
  const [currentPlaying, setCurrentPlaying] = useState(null)
  const [purchased, setPurchased] = useState([])
  const [loading, setLoading] = useState(false)
  const total = cart.reduce((sum, s) => sum + s.price, 0).toFixed(2)

  const handleCheckout = async () => {
    setLoading(true)
    await handleStripeCheckout(cart)
    setLoading(false)
  }

  return (
    <div style={{ background:"#060608", minHeight:"100vh", color:"#f0ece4", paddingTop:"100px" }}>
      <div style={{ maxWidth:"1100px", margin:"0 auto", padding:"40px 48px" }}>
        <p style={{ fontSize:"10px", letterSpacing:"5px", textTransform:"uppercase", color:"#c8a96e", marginBottom:"12px" }}>The Music</p>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"48px" }}>
          <h1 style={{ fontFamily:"Georgia, serif", fontSize:"48px", fontWeight:"900" }}>All Tracks</h1>
          <div style={{ display:"flex", gap:"12px" }}>
            {["store","cart","purchased"].map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding:"8px 20px", background:view===v ? "#c8a96e" : "transparent", color:view===v ? "#060608" : "#7a7570", border:"1px solid", borderColor:view===v ? "#c8a96e" : "#333", fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", cursor:"pointer" }}>
                {v==="cart" ? "Cart ("+cart.length+")" : v==="purchased" ? "My Songs ("+purchased.length+")" : "Store"}
              </button>
            ))}
          </div>
        </div>
        {view === "store" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:"16px" }}>
            {SONGS.map(song => (
              <div key={song.id} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", padding:"32px", borderRadius:"4px" }}>
                <div style={{ fontSize:"10px", letterSpacing:"4px", textTransform:"uppercase", color:"#8a6f3f", marginBottom:"6px" }}>{song.genre}</div>
                <h3 style={{ fontFamily:"Georgia, serif", fontSize:"20px", fontWeight:"700", marginBottom:"4px" }}>{song.title}</h3>
                <Link to={"/artists/"+song.artistId} style={{ fontSize:"11px", color:"#7a7570", textDecoration:"none", letterSpacing:"1px" }}>{song.artistName}</Link>
                <p style={{ fontSize:"12px", color:"#7a7570", marginBottom:"12px", marginTop:"4px" }}>{song.duration}</p>
                <div style={{ marginBottom:"16px" }}>
                  <AudioPlayer song={song} currentPlaying={currentPlaying} setCurrentPlaying={setCurrentPlaying} />
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontFamily:"Georgia, serif", fontSize:"24px", color:"#c8a96e" }}>${song.price}</span>
                  <button onClick={() => addToCart(song)} disabled={!!cart.find(s => s.id === song.id)}
                    style={{ padding:"10px 20px", background:cart.find(s => s.id === song.id) ? "#333" : "#c8a96e", color:cart.find(s => s.id === song.id) ? "#7a7570" : "#060608", border:"none", fontSize:"11px", cursor:"pointer", fontWeight:"bold" }}>
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
                  <button onClick={handleCheckout} disabled={loading}
                    style={{ padding:"14px 40px", background:"#c8a96e", color:"#060608", border:"none", fontSize:"12px", letterSpacing:"3px", textTransform:"uppercase", cursor:"pointer", fontWeight:"bold", opacity: loading ? 0.7 : 1 }}>
                    {loading ? "Redirecting..." : "Checkout with Stripe"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {view === "purchased" && (
          <div>
            {purchased.length === 0 ? <p style={{ color:"#7a7570", textAlign:"center", padding:"60px" }}>No purchases yet</p> :
              purchased.map(song => (
                <div key={song.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", marginBottom:"8px", borderRadius:"4px" }}>
                  <div>
                    <p style={{ margin:0, fontFamily:"Georgia, serif", fontSize:"18px", fontWeight:"bold" }}>{song.title}</p>
                    <p style={{ margin:0, color:"#7a7570", fontSize:"12px" }}>{song.genre}</p>
                  </div>
                  <a href={song.download} download style={{ padding:"8px 20px", background:"#c8a96e", color:"#060608", border:"none", cursor:"pointer", fontWeight:"bold", fontSize:"11px", textDecoration:"none", letterSpacing:"1px" }}>⬇ Download</a>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  )
}

function Success() {
  return (
    <div style={{ background:"#060608", minHeight:"100vh", color:"#f0ece4", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"48px" }}>
      <div style={{ fontSize:"64px", marginBottom:"24px" }}>🎵</div>
      <h1 style={{ fontFamily:"Georgia, serif", fontSize:"48px", fontWeight:"900", color:"#c8a96e", marginBottom:"16px" }}>Thank You!</h1>
      <p style={{ fontSize:"18px", color:"#7a7570", maxWidth:"480px", lineHeight:"1.8", marginBottom:"48px" }}>Your payment was successful. Your music is ready. Check your email for your receipt from Stripe.</p>
      <Link to="/store" style={{ padding:"14px 36px", background:"#c8a96e", color:"#060608", fontSize:"12px", letterSpacing:"3px", textTransform:"uppercase", textDecoration:"none", fontWeight:"bold" }}>Back to Store</Link>
    </div>
  )
}

function Cancel() {
  return (
    <div style={{ background:"#060608", minHeight:"100vh", color:"#f0ece4", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"48px" }}>
      <div style={{ fontSize:"64px", marginBottom:"24px" }}>😔</div>
      <h1 style={{ fontFamily:"Georgia, serif", fontSize:"48px", fontWeight:"900", marginBottom:"16px" }}>Payment Cancelled</h1>
      <p style={{ fontSize:"18px", color:"#7a7570", maxWidth:"480px", lineHeight:"1.8", marginBottom:"48px" }}>No worries — your cart is still waiting for you. Come back whenever you are ready.</p>
      <Link to="/store" style={{ padding:"14px 36px", background:"#c8a96e", color:"#060608", fontSize:"12px", letterSpacing:"3px", textTransform:"uppercase", textDecoration:"none", fontWeight:"bold" }}>Back to Store</Link>
    </div>
  )
}

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
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"20px", marginTop:"48px", paddingTop:"48px", borderTop:"1px solid #222" }}>
              {[["20","Years Writing"],["4","Genres"],["∞","Stories"]].map(([n,l]) => (
                <div key={l}>
                  <div style={{ fontFamily:"Georgia, serif", fontSize:"48px", color:"#c8a96e", lineHeight:"1", marginBottom:"8px" }}>{n}</div>
                  <div style={{ fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", color:"#7a7570" }}>{l}</div>
                </div>
              ))}
            </div>
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

function Artists() {
  return (
    <div style={{ background:"#060608", minHeight:"100vh", color:"#f0ece4", paddingTop:"100px" }}>
      <div style={{ maxWidth:"1100px", margin:"0 auto", padding:"60px 48px" }}>
        <p style={{ fontSize:"10px", letterSpacing:"5px", textTransform:"uppercase", color:"#c8a96e", marginBottom:"12px", textAlign:"center" }}>For Artists</p>
        <h1 style={{ fontFamily:"Georgia, serif", fontSize:"64px", fontWeight:"900", lineHeight:"1.1", marginBottom:"24px", textAlign:"center" }}>Your music.<br/><em style={{ color:"#c8a96e" }}>Your rules.</em></h1>
        <p style={{ fontSize:"16px", color:"#7a7570", maxWidth:"560px", margin:"0 auto 80px", lineHeight:"1.8", textAlign:"center" }}>VainMuze is being built for independent artists who are tired of giving their work away. Sell directly. Keep what you earn. No labels. No gatekeepers.</p>

        <h2 style={{ fontFamily:"Georgia, serif", fontSize:"32px", fontWeight:"700", marginBottom:"32px" }}>Featured Artists</h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:"16px", marginBottom:"80px" }}>
          {ARTISTS.map(artist => (
            <Link key={artist.id} to={"/artists/"+artist.id} style={{ textDecoration:"none" }}>
              <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"4px", overflow:"hidden" }}
                onMouseEnter={e => e.currentTarget.style.borderColor="rgba(200,169,110,0.4)"}
                onMouseLeave={e => e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"}>
                <div style={{ height:"200px", overflow:"hidden", position:"relative" }}>
                  <img src={artist.photo} alt={artist.name} style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top", filter:"grayscale(20%)" }} />
                  <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(6,6,8,0.8) 0%, transparent 60%)" }}></div>
                </div>
                <div style={{ padding:"24px" }}>
                  <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"12px" }}>
                    {artist.genres.map(g => (
                      <span key={g} style={{ fontSize:"9px", letterSpacing:"2px", textTransform:"uppercase", color:"#8a6f3f", background:"rgba(200,169,110,0.08)", padding:"3px 8px", borderRadius:"2px" }}>{g}</span>
                    ))}
                  </div>
                  <h3 style={{ fontFamily:"Georgia, serif", fontSize:"24px", fontWeight:"700", color:"#f0ece4", marginBottom:"4px" }}>{artist.name}</h3>
                  <p style={{ fontSize:"12px", color:"#7a7570", marginBottom:"16px" }}>{artist.location} — Est. {artist.established}</p>
                  <p style={{ fontSize:"13px", color:"#c8a96e", letterSpacing:"2px", textTransform:"uppercase" }}>{artist.songs.length} Tracks →</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div style={{ borderTop:"1px solid rgba(200,169,110,0.1)", paddingTop:"80px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"16px", marginBottom:"48px", textAlign:"left" }}>
            {[["🎵","Free to Join","No upfront costs. Upload and start selling immediately."],["💰","Keep Your Earnings","Direct Stripe payments. Your money goes straight to you."],["🔥","Built by an Artist","Made by a musician who understands what indie artists need."]].map(([icon,title,text]) => (
              <div key={title} style={{ padding:"40px 32px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"4px" }}>
                <div style={{ fontSize:"28px", marginBottom:"16px" }}>{icon}</div>
                <h3 style={{ fontFamily:"Georgia, serif", fontSize:"20px", fontWeight:"700", marginBottom:"12px", color:"#f0ece4" }}>{title}</h3>
                <p style={{ fontSize:"14px", color:"#7a7570", lineHeight:"1.7", margin:0 }}>{text}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign:"center" }}>
            <a href="mailto:hello@vainmuze.com" style={{ display:"inline-block", padding:"16px 48px", background:"transparent", border:"1px solid #c8a96e", color:"#c8a96e", fontSize:"12px", letterSpacing:"4px", textTransform:"uppercase", textDecoration:"none" }}>Join the Waitlist</a>
          </div>
        </div>
      </div>
    </div>
  )
}

function ArtistProfile({ addToCart, cart }) {
  const { artistId } = useParams()
  const [profilePlaying, setProfilePlaying] = useState(null)
  const artist = ARTISTS.find(a => a.id === artistId)

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
        <img src={artist.photo} alt={artist.name} style={{ position:"absolute", right:0, top:0, width:"50%", height:"100%", objectFit:"cover", objectPosition:"center top", opacity:0.85 }} />
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to right, rgba(6,6,8,1) 40%, transparent 70%)" }}></div>
        <div style={{ position:"relative", zIndex:2, padding:"0 48px 60px", maxWidth:"580px" }}>
          <Link to="/artists" style={{ fontSize:"11px", letterSpacing:"3px", textTransform:"uppercase", color:"#7a7570", textDecoration:"none", display:"block", marginBottom:"24px" }}>← All Artists</Link>
          <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"16px" }}>
            {artist.genres.map(g => (
              <span key={g} style={{ fontSize:"9px", letterSpacing:"2px", textTransform:"uppercase", color:"#8a6f3f", background:"rgba(200,169,110,0.08)", padding:"3px 8px", borderRadius:"2px" }}>{g}</span>
            ))}
          </div>
          <h1 style={{ fontFamily:"Georgia, serif", fontSize:"72px", fontWeight:"900", lineHeight:"0.95", marginBottom:"16px" }}>{artist.name}</h1>
          <p style={{ fontSize:"11px", letterSpacing:"4px", textTransform:"uppercase", color:"#c8a96e" }}>{artist.location} — Est. {artist.established}</p>
        </div>
      </div>

      <div style={{ maxWidth:"1100px", margin:"0 auto", padding:"80px 48px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"80px", marginBottom:"80px" }}>
          <div>
            <p style={{ fontSize:"10px", letterSpacing:"5px", textTransform:"uppercase", color:"#c8a96e", marginBottom:"24px" }}>About</p>
            <p style={{ fontSize:"16px", lineHeight:"1.9", color:"#7a7570", marginBottom:"20px" }}>{artist.bio1}</p>
            <p style={{ fontSize:"16px", lineHeight:"1.9", color:"#7a7570", marginBottom:"20px" }}>{artist.bio2}</p>
            <p style={{ fontSize:"16px", lineHeight:"1.9", color:"#7a7570" }}>{artist.bio3}</p>
          </div>
          <div>
            <p style={{ fontSize:"10px", letterSpacing:"5px", textTransform:"uppercase", color:"#c8a96e", marginBottom:"24px" }}>By the Numbers</p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"16px" }}>
              {artist.stats.map(([n,l]) => (
                <div key={l} style={{ padding:"32px 24px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.04)", textAlign:"center" }}>
                  <div style={{ fontFamily:"Georgia, serif", fontSize:"48px", color:"#c8a96e", lineHeight:"1", marginBottom:"8px" }}>{n}</div>
                  <div style={{ fontSize:"10px", letterSpacing:"2px", textTransform:"uppercase", color:"#7a7570" }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p style={{ fontSize:"10px", letterSpacing:"5px", textTransform:"uppercase", color:"#c8a96e", marginBottom:"12px" }}>Tracks</p>
        <h2 style={{ fontFamily:"Georgia, serif", fontSize:"36px", fontWeight:"700", marginBottom:"40px" }}>Music by {artist.name}</h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:"16px" }}>
          {artist.songs.map((song, i) => (
            <div key={song.id} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", padding:"32px", borderRadius:"4px" }}
              onMouseEnter={e => e.currentTarget.style.borderColor="rgba(200,169,110,0.3)"}
              onMouseLeave={e => e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"}>
              <div style={{ fontFamily:"Georgia, serif", fontSize:"48px", color:"rgba(200,169,110,0.1)", lineHeight:"1", marginBottom:"12px" }}>0{i+1}</div>
              <div style={{ fontSize:"10px", letterSpacing:"4px", textTransform:"uppercase", color:"#8a6f3f", marginBottom:"6px" }}>{song.genre}</div>
              <h3 style={{ fontFamily:"Georgia, serif", fontSize:"20px", fontWeight:"700", marginBottom:"6px" }}>{song.title}</h3>
              <p style={{ fontSize:"12px", color:"#7a7570", marginBottom:"16px" }}>{song.duration}</p>
              <div style={{ marginBottom:"16px" }}>
                <AudioPlayer song={song} currentPlaying={profilePlaying} setCurrentPlaying={setProfilePlaying} />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontFamily:"Georgia, serif", fontSize:"24px", color:"#c8a96e" }}>${song.price}</span>
                <button onClick={() => addToCart(song)} disabled={!!cart.find(s => s.id === song.id)}
                  style={{ padding:"10px 20px", background:cart.find(s => s.id === song.id) ? "#333" : "#c8a96e", color:cart.find(s => s.id === song.id) ? "#7a7570" : "#060608", border:"none", fontSize:"11px", cursor:"pointer", fontWeight:"bold" }}>
                  {cart.find(s => s.id === song.id) ? "Added" : "+ Add"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Footer() {
  return (
    <footer style={{ padding:"48px", borderTop:"1px solid #1a1a1a", background:"#060608", color:"#f0ece4" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"32px" }}>
        <span style={{ fontFamily:"Georgia, serif", fontSize:"20px", letterSpacing:"4px", color:"#c8a96e", fontWeight:"bold" }}>VAINMUZE</span>
        <div style={{ display:"flex", gap:"24px", alignItems:"center" }}>
          <a href="https://www.youtube.com/@VainMuze" target="_blank" rel="noopener noreferrer"
            style={{ display:"flex", alignItems:"center", gap:"8px", fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", color:"#7a7570", textDecoration:"none" }}
            onMouseEnter={e => e.currentTarget.style.color="#c8a96e"}
            onMouseLeave={e => e.currentTarget.style.color="#7a7570"}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            YouTube
          </a>
          <a href="https://www.tiktok.com/@vainmuze1" target="_blank" rel="noopener noreferrer"
            style={{ display:"flex", alignItems:"center", gap:"8px", fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", color:"#7a7570", textDecoration:"none" }}
            onMouseEnter={e => e.currentTarget.style.color="#c8a96e"}
            onMouseLeave={e => e.currentTarget.style.color="#7a7570"}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/></svg>
            TikTok
          </a>
        </div>
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:"24px", borderTop:"1px solid #1a1a1a" }}>
        <span style={{ fontSize:"12px", color:"#7a7570" }}>2026 VainMuze — Portland, OR</span>
        <div style={{ display:"flex", gap:"32px" }}>
          <Link to="/" style={{ fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", color:"#7a7570", textDecoration:"none" }}>Home</Link>
          <Link to="/store" style={{ fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", color:"#7a7570", textDecoration:"none" }}>Store</Link>
          <Link to="/about" style={{ fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", color:"#7a7570", textDecoration:"none" }}>About</Link>
          <Link to="/artists" style={{ fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", color:"#7a7570", textDecoration:"none" }}>Artists</Link>
        </div>
      </div>
    </footer>
  )
}

export default function App() {
  const [cart, setCart] = useState([])
  const addToCart = (song) => { if (!cart.find(s => s.id === song.id)) setCart([...cart, song]) }
  const removeFromCart = (id) => setCart(cart.filter(s => s.id !== id))

  return (
    <>
      <Nav cart={cart} />
      <Routes>
        <Route path="/" element={<Home addToCart={addToCart} cart={cart} />} />
        <Route path="/store" element={<Store addToCart={addToCart} cart={cart} removeFromCart={removeFromCart} />} />
        <Route path="/about" element={<About />} />
        <Route path="/artists" element={<Artists />} />
        <Route path="/artists/:artistId" element={<ArtistProfile addToCart={addToCart} cart={cart} />} />
        <Route path="/success" element={<Success />} />
        <Route path="/cancel" element={<Cancel />} />
      </Routes>
      <Footer />
    </>
  )
}
