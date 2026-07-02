import { Component } from 'react'

// A render error anywhere in the tree used to mean a silent black page for
// the client. This catches it and offers a reload instead.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('Portal render error:', error, info) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{
        minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center',
        justifyContent:'center', gap:16, background:'#0a0a0a', color:'#f0efed',
        fontFamily:"'Space Grotesk', sans-serif", padding:24, textAlign:'center',
      }}>
        <div style={{ fontFamily:"'Space Mono', monospace", fontSize:11, letterSpacing:'0.2em', color:'#e8432c', textTransform:'uppercase' }}>
          Cypher Cache
        </div>
        <div style={{ fontSize:18, fontWeight:600 }}>Something went wrong.</div>
        <div style={{ fontSize:13, color:'#999', maxWidth:420 }}>
          The portal hit an unexpected error. Reloading usually fixes it — if it keeps happening, let the studio know.
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop:8, padding:'10px 24px', borderRadius:3, border:'none', cursor:'pointer',
            background:'linear-gradient(135deg, #e8432c, #3fd9c4)', color:'#0a0a0a',
            fontWeight:600, fontSize:13, fontFamily:"'Space Grotesk', sans-serif",
          }}>
          Reload portal
        </button>
      </div>
    )
  }
}
