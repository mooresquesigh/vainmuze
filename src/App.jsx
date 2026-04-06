import { useState } from 'react'
import { Routes, Route, Link } from 'react-router-dom'

const SONGS = [
  { id: 1, title: "America This, America That", genre: "Hip Hop", duration: "3:45", price: 1.15, cover: "🎤" },
  { id: 2, title: "I Won't Give Up", genre: "Indie", duration: "4:00", price: 1.15, cover: "✊" },
  { id: 3, title: "My Shadow and I", genre: "Blues", duration: "3:30", price: 1.15, cover: "🎸" }
]

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
          {SONGS.map((song, i) => (
            <div key={song.id} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", padding:"32px", borderRadius:"4px" }}
              onMouseEnter={e => e.currentTarget.style.borderColor="rgba(200,169,110,0.3)"}
              onMouseLeave={e => e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"}>
              <div style={{ fontFamily:"Georgia, serif", fontSize:"56px", color:"rgba(200,169,110,0.1)", lineHeight:"1", marginBottom:"16px" }}>0{i+1}</div>
              <div style={{ fontSize:"10px", letterSpacing:"4px", textTransform:"uppercase", color:"#8a6f3f", marginBottom:"8px" }}>{song.genre}</div>
              <h3 style={{ fontFamily:"Georgia, serif", fontSize:"20px", fontWeight:"700", marginBottom:"8px" }}>{song.title}</h3>
              <p style={{ fontSize:"12px", color:"#7a7570", marginBottom:"24px" }}>{song.duration}</p>
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
          {[["20+","Years of Music"],["3","Genres & Growing"],["$1.15","Per Track"],["100%","Independent"]].map(([num, label]) => (
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
  const [purchased, setPurchased] = useState([])
  const total = cart.reduce((sum, s) => sum + s.price, 0).toFixed(2)
  const handleCheckout = () => { setPurchased([...purchased, ...cart]); alert("Thank you! Downloads ready.") }

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
                <div style={{ fontSize:"48px", textAlign:"center", marginBottom:"16px" }}>{song.cover}</div>
                <div style={{ fontSize:"10px", letterSpacing:"4px", textTransform:"uppercase", color:"#8a6f3f", marginBottom:"6px" }}>{song.genre}</div>
                <h3 style={{ fontFamily:"Georgia, serif", fontSize:"20px", fontWeight:"700", marginBottom:"6px" }}>{song.title}</h3>
                <p style={{ fontSize:"12px", color:"#7a7570", marginBottom:"20px" }}>{song.duration}</p>
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
                  <button onClick={handleCheckout} style={{ padding:"14px 40px", background:"#c8a96e", color:"#060608", border:"none", fontSize:"12px", letterSpacing:"3px", textTransform:"uppercase", cursor:"pointer", fontWeight:"bold" }}>Checkout</button>
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
                  <button style={{ padding:"8px 20px", background:"#c8a96e", color:"#060608", border:"none", cursor:"pointer", fontWeight:"bold" }}>Download</button>
                </div>
              ))
            }
          </div>
        )}
      </div>
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
      <div style={{ maxWidth:"900px", margin:"0 auto", padding:"60px 48px", textAlign:"center" }}>
        <p style={{ fontSize:"10px", letterSpacing:"5px", textTransform:"uppercase", color:"#c8a96e", marginBottom:"12px" }}>For Artists</p>
        <h1 style={{ fontFamily:"Georgia, serif", fontSize:"64px", fontWeight:"900", lineHeight:"1.1", marginBottom:"24px" }}>Your music.<br/><em style={{ color:"#c8a96e" }}>Your rules.</em></h1>
        <p style={{ fontSize:"16px", color:"#7a7570", maxWidth:"560px", margin:"0 auto 80px", lineHeight:"1.8" }}>VainMuze is being built for independent artists who are tired of giving their work away. Sell directly. Keep what you earn. No labels. No gatekeepers.</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"16px", marginBottom:"80px", textAlign:"left" }}>
          {[["🎵","Free to Join","No upfront costs. Upload and start selling immediately."],["💰","Keep Your Earnings","Direct Stripe payments. Your money goes straight to you."],["🔥","Built by an Artist","Made by a musician who understands what indie artists need."]].map(([icon,title,text]) => (
            <div key={title} style={{ padding:"40px 32px", background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"4px" }}>
              <div style={{ fontSize:"28px", marginBottom:"16px" }}>{icon}</div>
              <h3 style={{ fontFamily:"Georgia, serif", fontSize:"20px", fontWeight:"700", marginBottom:"12px" }}>{title}</h3>
              <p style={{ fontSize:"14px", color:"#7a7570", lineHeight:"1.7", margin:0 }}>{text}</p>
            </div>
          ))}
        </div>
        <a href="mailto:hello@vainmuze.com" style={{ display:"inline-block", padding:"16px 48px", background:"transparent", border:"1px solid #c8a96e", color:"#c8a96e", fontSize:"12px", letterSpacing:"4px", textTransform:"uppercase", textDecoration:"none" }}>Join the Waitlist</a>
      </div>
    </div>
  )
}

function Footer() {
  return (
    <footer style={{ padding:"48px", borderTop:"1px solid #1a1a1a", display:"flex", justifyContent:"space-between", alignItems:"center", background:"#060608", color:"#f0ece4" }}>
      <span style={{ fontFamily:"Georgia, serif", fontSize:"20px", letterSpacing:"4px", color:"#c8a96e", fontWeight:"bold" }}>VAINMUZE</span>
      <span style={{ fontSize:"12px", color:"#7a7570" }}>2026 VainMuze — Portland, OR</span>
      <div style={{ display:"flex", gap:"32px" }}>
        <Link to="/" style={{ fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", color:"#7a7570", textDecoration:"none" }}>Home</Link>
        <Link to="/store" style={{ fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", color:"#7a7570", textDecoration:"none" }}>Store</Link>
        <Link to="/about" style={{ fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", color:"#7a7570", textDecoration:"none" }}>About</Link>
        <Link to="/artists" style={{ fontSize:"11px", letterSpacing:"2px", textTransform:"uppercase", color:"#7a7570", textDecoration:"none" }}>Artists</Link>
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
      </Routes>
      <Footer />
    </>
  )
}