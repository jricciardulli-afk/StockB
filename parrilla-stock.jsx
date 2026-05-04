import { useState, useRef, useEffect } from "react";

// ─── DATOS BASE ────────────────────────────────────────────────────────────────
const CATEGORIAS = {
  "🥩 Carnes": {
    color: "#c0392b",
    glow: "rgba(192,57,43,0.35)",
    items: [
      { nombre: "Asado de tira", unidad: "kg", stock: 12, minimo: 8 },
      { nombre: "Vacío", unidad: "kg", stock: 6, minimo: 8 },
      { nombre: "Entraña", unidad: "kg", stock: 4, minimo: 5 },
      { nombre: "Bife de chorizo", unidad: "kg", stock: 9, minimo: 6 },
      { nombre: "Matambre", unidad: "kg", stock: 3, minimo: 4 },
      { nombre: "Costillas", unidad: "kg", stock: 10, minimo: 6 },
      { nombre: "Pollo entero", unidad: "unidades", stock: 8, minimo: 6 },
      { nombre: "Pechuga", unidad: "kg", stock: 5, minimo: 4 },
    ],
    proveedor: "La Pampa Carnes",
  },
  "🌭 Embutidos": {
    color: "#e67e22",
    glow: "rgba(230,126,34,0.35)",
    items: [
      { nombre: "Chorizo", unidad: "kg", stock: 7, minimo: 5 },
      { nombre: "Morcilla", unidad: "kg", stock: 2, minimo: 4 },
      { nombre: "Salchicha parrillera", unidad: "kg", stock: 5, minimo: 3 },
      { nombre: "Provoleta", unidad: "kg", stock: 3, minimo: 3 },
    ],
    proveedor: "La Pampa Carnes",
  },
  "🥬 Verduras": {
    color: "#27ae60",
    glow: "rgba(39,174,96,0.35)",
    items: [
      { nombre: "Lechuga", unidad: "unidades", stock: 5, minimo: 4 },
      { nombre: "Tomate", unidad: "kg", stock: 3, minimo: 5 },
      { nombre: "Cebolla", unidad: "kg", stock: 8, minimo: 5 },
      { nombre: "Papas", unidad: "kg", stock: 15, minimo: 10 },
      { nombre: "Limón", unidad: "unidades", stock: 20, minimo: 15 },
      { nombre: "Pimiento", unidad: "kg", stock: 2, minimo: 3 },
    ],
    proveedor: "Verdulería Don José",
  },
  "🧂 Despensa": {
    color: "#f39c12",
    glow: "rgba(243,156,18,0.35)",
    items: [
      { nombre: "Sal gruesa", unidad: "kg", stock: 4, minimo: 3 },
      { nombre: "Chimichurri", unidad: "kg", stock: 1, minimo: 2 },
      { nombre: "Aceite", unidad: "litros", stock: 5, minimo: 4 },
      { nombre: "Pan de campo", unidad: "unidades", stock: 30, minimo: 20 },
      { nombre: "Carbón", unidad: "kg", stock: 20, minimo: 15 },
      { nombre: "Leña", unidad: "kg", stock: 35, minimo: 20 },
    ],
    proveedor: "Almacén Central",
  },
  "🍺 Bebidas": {
    color: "#2980b9",
    glow: "rgba(41,128,185,0.35)",
    items: [
      { nombre: "Cerveza rubia", unidad: "unidades", stock: 48, minimo: 36 },
      { nombre: "Vino tinto", unidad: "botellas", stock: 12, minimo: 10 },
      { nombre: "Gaseosa", unidad: "unidades", stock: 24, minimo: 18 },
      { nombre: "Agua mineral", unidad: "unidades", stock: 20, minimo: 12 },
      { nombre: "Fernet", unidad: "botellas", stock: 4, minimo: 3 },
    ],
    proveedor: "Distribuidora El Barril",
  },
};

const buildStock = () =>
  Object.entries(CATEGORIAS).flatMap(([cat, data]) =>
    data.items.map((item) => ({
      id: `${cat}-${item.nombre}`.replace(/\s/g, "_"),
      nombre: item.nombre,
      categoria: cat,
      proveedor: data.proveedor,
      unidad: item.unidad,
      stock: item.stock,
      minimo: item.minimo,
      actualizado: "hoy",
    }))
  );

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function ParrillaStock() {
  const [stock, setStock] = useState(buildStock);
  const [vista, setVista] = useState("voz"); // voz | stock | pedidos
  const [fase, setFase] = useState("idle"); // idle | escuchando | procesando | resultado
  const [transcripcion, setTranscripcion] = useState("");
  const [cambios, setCambios] = useState([]);
  const [resumen, setResumen] = useState("");
  const [pedidos, setPedidos] = useState(null);
  const [generandoPedido, setGenerandoPedido] = useState(false);
  const [toast, setToast] = useState(null);
  const [catAbierta, setCatAbierta] = useState(null);
  const recognitionRef = useRef(null);

  const bajos = stock.filter((i) => i.stock < i.minimo);

  const flash = (msg, tipo = "ok") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3200);
  };

  // ── VOZ ────────────────────────────────────────────────────────────────────
  const iniciarEscucha = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { flash("Usá Chrome para el reconocimiento de voz", "err"); return; }
    const rec = new SR();
    rec.lang = "es-AR";
    rec.continuous = false;
    rec.interimResults = false;
    recognitionRef.current = rec;
    rec.onstart = () => setFase("escuchando");
    rec.onerror = () => { setFase("idle"); flash("No se captó audio, intentá de nuevo", "err"); };
    rec.onresult = (e) => {
      const texto = e.results[0][0].transcript;
      setTranscripcion(texto);
      procesarVoz(texto);
    };
    rec.start();
  };

  const procesarVoz = async (texto) => {
    setFase("procesando");
    const lista = stock.map((i) => i.nombre).join(", ");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          system: `Sos el sistema de stock de una parrilla argentina. Interpretá comandos de voz del parrillero o dueño.
Productos disponibles: ${lista}
Reglas:
- "me queda poco de X" / "está por terminarse X" → stock: 2
- "no hay X" / "se acabó X" / "falta X" → stock: 0
- "quedan N kg/unidades de X" → stock: N
- "sobra bastante X" → no actualices, ignoralo
Respondé SOLO JSON sin markdown:
{"actualizaciones":[{"nombre":"nombre exacto","stock":número}],"resumen":"frase breve en español coloquial"}`,
          messages: [{ role: "user", content: texto }],
        }),
      });
      const data = await res.json();
      const raw = data.content.map((c) => c.text || "").join("");
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      if (parsed.actualizaciones?.length) {
        setStock((prev) =>
          prev.map((item) => {
            const u = parsed.actualizaciones.find(
              (x) => x.nombre.toLowerCase() === item.nombre.toLowerCase()
            );
            return u ? { ...item, stock: u.stock, actualizado: "ahora" } : item;
          })
        );
        setCambios(parsed.actualizaciones);
        setResumen(parsed.resumen);
        setFase("resultado");
      } else {
        setFase("idle");
        flash("No entendí ningún producto, intentá de nuevo");
      }
    } catch {
      setFase("idle");
      flash("Error al procesar, revisá la conexión", "err");
    }
  };

  const simularVoz = (texto) => {
    setTranscripcion(texto);
    procesarVoz(texto);
  };

  const resetVoz = () => {
    setFase("idle");
    setTranscripcion("");
    setCambios([]);
    setResumen("");
  };

  // ── PEDIDOS ────────────────────────────────────────────────────────────────
  const generarPedidos = async () => {
    if (!bajos.length) { flash("¡Todo el stock está bien!"); return; }
    setGenerandoPedido(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          system: "Sos el encargado de compras de una parrilla. Generá pedidos concretos y directos. Solo JSON.",
          messages: [{
            role: "user",
            content: `Generá pedidos agrupados por proveedor para estos productos con stock bajo:
${JSON.stringify(bajos.map(i => ({ nombre: i.nombre, stock: i.stock, minimo: i.minimo, unidad: i.unidad, proveedor: i.proveedor })))}
JSON: {"pedidos":[{"proveedor":"...","items":[{"nombre":"...","cantidad":número,"unidad":"..."}]}]}`,
          }],
        }),
      });
      const data = await res.json();
      const raw = data.content.map((c) => c.text || "").join("");
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setPedidos(parsed.pedidos);
      setVista("pedidos");
    } catch {
      flash("Error generando pedidos", "err");
    } finally {
      setGenerandoPedido(false);
    }
  };

  const copiarPedido = (pedido) => {
    const txt = `📋 Pedido ${pedido.proveedor}\n${pedido.items.map(i => `• ${i.nombre}: ${i.cantidad} ${i.unidad}`).join("\n")}`;
    navigator.clipboard.writeText(txt);
    flash(`Pedido de ${pedido.proveedor} copiado ✓`);
  };

  // ── COLORES de categoria ───────────────────────────────────────────────────
  const getColor = (cat) => CATEGORIAS[cat]?.color || "#888";
  const getGlow = (cat) => CATEGORIAS[cat]?.glow || "transparent";

  return (
    <div style={{ minHeight: "100vh", background: "#111", color: "#f2ede6", fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes flicker { 0%,100%{opacity:1} 92%{opacity:.97} 94%{opacity:.85} 96%{opacity:.95} }
        @keyframes breathe { 0%,100%{transform:scale(1);box-shadow:0 0 40px var(--glow)} 50%{transform:scale(1.04);box-shadow:0 0 70px var(--glow)} }
        @keyframes ripple { to{transform:scale(2.5);opacity:0} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideRight { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:translateX(0)} }
        @keyframes toastIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .nav-btn:hover { background: rgba(255,255,255,0.07) !important; }
        .cat-item:hover { background: rgba(255,255,255,0.05) !important; }
        .ejemplo:hover { background: rgba(255,255,255,0.08) !important; transform: translateX(4px); }
        ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-track{background:#111} ::-webkit-scrollbar-thumb{background:#333;border-radius:2px}
        input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
      `}</style>

      {/* TOAST */}
      {toast && (
        <div style={{
          position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)",
          background: toast.tipo==="err" ? "#5a0a0a" : "#0a2d0a",
          border: `1px solid ${toast.tipo==="err" ? "#c0392b" : "#27ae60"}`,
          color: "#f2ede6", padding:"12px 24px", borderRadius:30, fontSize:14,
          zIndex:999, animation:"toastIn .25s ease", whiteSpace:"nowrap",
          boxShadow:"0 8px 32px rgba(0,0,0,0.6)"
        }}>{toast.msg}</div>
      )}

      {/* HEADER */}
      <div style={{ padding:"20px 24px 0", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ fontFamily:"Oswald,sans-serif", fontSize:28, fontWeight:700, letterSpacing:2, textTransform:"uppercase", animation:"flicker 8s infinite" }}>
            🔥 La Parrilla
          </div>
          <div style={{ fontSize:11, color:"#666", letterSpacing:3, textTransform:"uppercase", marginTop:2 }}>
            Control de stock
          </div>
        </div>
        {bajos.length > 0 && (
          <div style={{ background:"#3d0a0a", border:"1px solid #c0392b", borderRadius:8, padding:"8px 14px", fontSize:13, color:"#e07070", cursor:"pointer" }}
            onClick={() => { generarPedidos(); }}>
            ⚠ {bajos.length} producto{bajos.length>1?"s":""} bajo{bajos.length>1?"s":""} · Generar pedido
          </div>
        )}
      </div>

      {/* NAV */}
      <div style={{ display:"flex", gap:4, padding:"16px 24px", borderBottom:"1px solid #1e1e1e" }}>
        {[["voz","🎙 Carga por Voz"],["stock","📦 Stock"],["pedidos","📋 Pedidos"]].map(([key,label]) => (
          <button key={key} className="nav-btn" onClick={() => setVista(key)} style={{
            background: vista===key ? "rgba(192,57,43,0.2)" : "transparent",
            border: vista===key ? "1px solid #c0392b" : "1px solid transparent",
            color: vista===key ? "#e07070" : "#666",
            padding:"8px 18px", borderRadius:6, cursor:"pointer", fontSize:14,
            fontFamily:"Oswald,sans-serif", letterSpacing:1, transition:"all .2s"
          }}>{label}</button>
        ))}
      </div>

      <div style={{ padding:"24px", maxWidth:700, margin:"0 auto" }}>

        {/* ═══════════════════════════════════════════════════════════════════ VOZ */}
        {vista === "voz" && (
          <div style={{ animation:"fadeUp .4s ease" }}>

            {/* BOTÓN PRINCIPAL */}
            {fase === "idle" && (
              <div style={{ textAlign:"center", padding:"20px 0 32px" }}>
                <div style={{ fontSize:13, color:"#555", letterSpacing:2, textTransform:"uppercase", marginBottom:32 }}>
                  ¿Qué falta hoy?
                </div>

                {/* Botón micrófono */}
                <div style={{ position:"relative", display:"inline-block" }}>
                  <button onClick={iniciarEscucha} style={{
                    "--glow":"rgba(192,57,43,0.5)",
                    width:160, height:160, borderRadius:"50%",
                    background:"radial-gradient(circle at 35% 35%, #3d1210, #1a0808)",
                    border:"2px solid #c0392b",
                    cursor:"pointer", fontSize:52,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    margin:"0 auto",
                    boxShadow:"0 0 40px rgba(192,57,43,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
                    animation:"breathe 3s ease-in-out infinite",
                    transition:"transform .15s",
                  }}>🎙️</button>
                </div>

                <div style={{ marginTop:24, fontSize:15, color:"#888" }}>
                  Tocá y hablá
                </div>
                <div style={{ marginTop:6, fontSize:12, color:"#444", maxWidth:280, margin:"8px auto 0" }}>
                  "Se acabó la morcilla y quedan 3 kg de vacío"
                </div>

                {/* Ejemplos */}
                <div style={{ marginTop:40, textAlign:"left" }}>
                  <div style={{ fontSize:11, color:"#444", letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>
                    Probá con estos ejemplos
                  </div>
                  {[
                    "Me queda poco de entraña y se acabó el chimichurri",
                    "Quedan 5 kg de asado y no hay morcilla",
                    "La provoleta está por terminarse y falta limón",
                    "Se acabó el carbón, quedan 2 bolsas de leña",
                  ].map((ej, i) => (
                    <div key={i} className="ejemplo" onClick={() => simularVoz(ej)}
                      style={{
                        background:"#181818", border:"1px solid #252525",
                        borderRadius:8, padding:"12px 16px", marginBottom:8,
                        fontSize:14, color:"#aaa", cursor:"pointer",
                        fontStyle:"italic", transition:"all .2s",
                        animation:`slideRight .3s ease ${i*0.07}s both`
                      }}>
                      "{ej}"
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ESCUCHANDO */}
            {fase === "escuchando" && (
              <div style={{ textAlign:"center", padding:"40px 0" }}>
                <div style={{ position:"relative", display:"inline-block", marginBottom:24 }}>
                  <button onClick={() => recognitionRef.current?.stop()} style={{
                    width:160, height:160, borderRadius:"50%",
                    background:"radial-gradient(circle at 35% 35%, #5a0a0a, #2d0505)",
                    border:"2px solid #e74c3c",
                    cursor:"pointer", fontSize:52,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    margin:"0 auto",
                    boxShadow:"0 0 60px rgba(231,76,60,0.5)",
                  }}>🔴</button>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      position:"absolute", top:0, left:0, right:0, bottom:0,
                      borderRadius:"50%", border:"2px solid rgba(231,76,60,0.4)",
                      animation:`ripple ${1.2+i*0.4}s ease-out ${i*0.35}s infinite`,
                      pointerEvents:"none"
                    }} />
                  ))}
                </div>
                <div style={{ fontSize:18, color:"#e07070", fontFamily:"Oswald,sans-serif", letterSpacing:2 }}>
                  ESCUCHANDO...
                </div>
                <div style={{ fontSize:13, color:"#555", marginTop:8 }}>Hablá ahora · Tocá para cancelar</div>
              </div>
            )}

            {/* PROCESANDO */}
            {fase === "procesando" && (
              <div style={{ textAlign:"center", padding:"40px 0" }}>
                <div style={{ fontSize:14, color:"#666", fontStyle:"italic", marginBottom:24, padding:"12px 20px", background:"#181818", borderRadius:10 }}>
                  "{transcripcion}"
                </div>
                <div style={{ fontSize:32, display:"inline-block", animation:"spin 1s linear infinite", marginBottom:16 }}>⚙️</div>
                <div style={{ fontSize:16, color:"#888", fontFamily:"Oswald,sans-serif", letterSpacing:2 }}>Procesando...</div>
              </div>
            )}

            {/* RESULTADO */}
            {fase === "resultado" && (
              <div style={{ animation:"fadeUp .3s ease" }}>
                <div style={{ fontSize:14, color:"#555", fontStyle:"italic", marginBottom:16, padding:"12px 16px", background:"#161616", borderRadius:8, borderLeft:"3px solid #333" }}>
                  "{transcripcion}"
                </div>

                <div style={{ background:"#0d1f0d", border:"1px solid #27ae60", borderRadius:12, padding:20, marginBottom:16 }}>
                  <div style={{ fontSize:11, color:"#27ae60", letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>
                    ✓ Stock actualizado
                  </div>
                  <div style={{ fontSize:15, marginBottom:16, color:"#c8e6c9" }}>{resumen}</div>
                  {cambios.map((c, i) => {
                    const item = stock.find(s => s.nombre.toLowerCase() === c.nombre.toLowerCase());
                    const cat = item?.categoria;
                    const color = cat ? getColor(cat) : "#888";
                    return (
                      <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderTop:"1px solid #1a3d1a" }}>
                        <span style={{ fontSize:15 }}>{c.nombre}</span>
                        <span style={{ fontFamily:"monospace", fontSize:16, color: c.stock === 0 ? "#e07070" : c.stock <= 2 ? "#f39c12" : color, fontWeight:"bold" }}>
                          {c.stock === 0 ? "❌ SIN STOCK" : `${c.stock} ${item?.unidad || ""}`}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={resetVoz} style={{ flex:1, background:"#1a1a1a", border:"1px solid #333", color:"#aaa", padding:"14px", borderRadius:10, cursor:"pointer", fontSize:15, fontFamily:"Oswald,sans-serif", letterSpacing:1 }}>
                    🎙️ Nuevo registro
                  </button>
                  {bajos.length > 0 && (
                    <button onClick={() => { generarPedidos(); resetVoz(); }} style={{ flex:1, background:"#1a0808", border:"1px solid #c0392b", color:"#e07070", padding:"14px", borderRadius:10, cursor:"pointer", fontSize:15, fontFamily:"Oswald,sans-serif", letterSpacing:1 }}>
                      📋 Generar pedido ({bajos.length})
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ STOCK */}
        {vista === "stock" && (
          <div style={{ animation:"fadeUp .4s ease" }}>
            <div style={{ fontSize:11, color:"#444", letterSpacing:2, textTransform:"uppercase", marginBottom:20 }}>
              {stock.length} productos · {bajos.length} bajo mínimo
            </div>

            {Object.entries(CATEGORIAS).map(([cat, data]) => {
              const items = stock.filter(i => i.categoria === cat);
              const bajosEnCat = items.filter(i => i.stock < i.minimo);
              const abierta = catAbierta === cat;
              return (
                <div key={cat} style={{ marginBottom:12, border:`1px solid ${abierta ? data.color+"55" : "#1e1e1e"}`, borderRadius:10, overflow:"hidden", transition:"border .2s" }}>
                  <div onClick={() => setCatAbierta(abierta ? null : cat)}
                    style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 18px", cursor:"pointer", background:"#161616" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <span style={{ fontSize:20 }}>{cat.split(" ")[0]}</span>
                      <span style={{ fontFamily:"Oswald,sans-serif", fontSize:16, letterSpacing:1, color: abierta ? data.color : "#ccc" }}>
                        {cat.split(" ").slice(1).join(" ")}
                      </span>
                      {bajosEnCat.length > 0 && (
                        <span style={{ fontSize:11, color:"#e07070", background:"#2d0a0a", padding:"2px 8px", borderRadius:12 }}>
                          {bajosEnCat.length} bajo
                        </span>
                      )}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <span style={{ fontSize:12, color:"#444" }}>{items.length} productos</span>
                      <span style={{ color:"#444", fontSize:12 }}>{abierta ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {abierta && (
                    <div>
                      {items.map((item) => {
                        const bajo = item.stock < item.minimo;
                        const pct = Math.min((item.stock / item.minimo) * 100, 100);
                        return (
                          <div key={item.id} className="cat-item" style={{ padding:"12px 18px", borderTop:"1px solid #1a1a1a", transition:"background .15s" }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                              <span style={{ fontSize:14 }}>{item.nombre}</span>
                              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                                {bajo && <span style={{ fontSize:11, color:"#e07070" }}>⚠ BAJO</span>}
                                <span style={{ fontFamily:"monospace", fontSize:15, fontWeight:"bold", color: bajo ? "#e07070" : data.color }}>
                                  {item.stock} <span style={{ fontSize:11, color:"#555" }}>{item.unidad}</span>
                                </span>
                              </div>
                            </div>
                            {/* barra */}
                            <div style={{ height:3, background:"#1e1e1e", borderRadius:2 }}>
                              <div style={{ width:`${pct}%`, height:"100%", background: pct < 50 ? "#c0392b" : pct < 80 ? "#f39c12" : data.color, borderRadius:2, transition:"width .4s" }} />
                            </div>
                            <div style={{ fontSize:11, color:"#444", marginTop:4 }}>
                              Mínimo: {item.minimo} {item.unidad} · actualizado: {item.actualizado}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ PEDIDOS */}
        {vista === "pedidos" && (
          <div style={{ animation:"fadeUp .4s ease" }}>
            {!pedidos && !generandoPedido && (
              <div style={{ textAlign:"center", padding:"40px 0" }}>
                <div style={{ fontSize:42, marginBottom:16 }}>📋</div>
                <div style={{ fontSize:16, color:"#888", marginBottom:8 }}>
                  {bajos.length > 0
                    ? `${bajos.length} productos necesitan reposición`
                    : "El stock está completo, no hay pedidos urgentes"}
                </div>
                {bajos.length > 0 && (
                  <button onClick={generarPedidos} style={{
                    marginTop:20, background:"#1a0808", border:"1px solid #c0392b",
                    color:"#e07070", padding:"14px 28px", borderRadius:10,
                    cursor:"pointer", fontSize:16, fontFamily:"Oswald,sans-serif", letterSpacing:1
                  }}>
                    Generar lista de pedidos con IA
                  </button>
                )}
                {/* preview de los bajos */}
                {bajos.length > 0 && (
                  <div style={{ marginTop:28, textAlign:"left" }}>
                    {bajos.map((i) => (
                      <div key={i.id} style={{ display:"flex", justifyContent:"space-between", padding:"10px 16px", borderBottom:"1px solid #1a1a1a", fontSize:13 }}>
                        <span style={{ color:"#aaa" }}>{i.categoria.split(" ")[0]} {i.nombre}</span>
                        <span style={{ fontFamily:"monospace", color:"#e07070" }}>{i.stock}/{i.minimo} {i.unidad}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {generandoPedido && (
              <div style={{ textAlign:"center", padding:"60px 0", color:"#888" }}>
                <div style={{ fontSize:32, display:"inline-block", animation:"spin 1s linear infinite", marginBottom:12 }}>⚙️</div>
                <div style={{ fontFamily:"Oswald,sans-serif", letterSpacing:2 }}>Generando pedidos...</div>
              </div>
            )}

            {pedidos && !generandoPedido && (
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                  <div style={{ fontFamily:"Oswald,sans-serif", fontSize:18, letterSpacing:1 }}>
                    Pedidos · {new Date().toLocaleDateString("es-AR")}
                  </div>
                  <button onClick={generarPedidos} style={{ background:"none", border:"1px solid #333", color:"#666", padding:"6px 14px", borderRadius:6, cursor:"pointer", fontSize:12 }}>
                    🔄 Regenerar
                  </button>
                </div>

                {pedidos.map((pedido, i) => {
                  const provColor = Object.values(CATEGORIAS).find(c => c.proveedor === pedido.proveedor)?.color || "#888";
                  return (
                    <div key={i} style={{ border:`1px solid ${provColor}33`, borderRadius:12, marginBottom:16, overflow:"hidden", animation:`fadeUp .3s ease ${i*0.1}s both` }}>
                      <div style={{ background:`${provColor}15`, padding:"14px 18px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div>
                          <div style={{ fontFamily:"Oswald,sans-serif", fontSize:16, color: provColor, letterSpacing:1 }}>{pedido.proveedor}</div>
                          <div style={{ fontSize:12, color:"#555", marginTop:2 }}>{pedido.items?.length} productos</div>
                        </div>
                        <button onClick={() => copiarPedido(pedido)} style={{
                          background:"none", border:`1px solid ${provColor}55`, color: provColor,
                          padding:"8px 14px", borderRadius:8, cursor:"pointer", fontSize:13,
                          fontFamily:"Oswald,sans-serif", letterSpacing:1
                        }}>
                          Copiar para WhatsApp
                        </button>
                      </div>
                      {pedido.items?.map((item, j) => (
                        <div key={j} style={{ display:"flex", justifyContent:"space-between", padding:"11px 18px", borderTop:"1px solid #1a1a1a", fontSize:14 }}>
                          <span style={{ color:"#ccc" }}>{item.nombre}</span>
                          <span style={{ fontFamily:"monospace", color: provColor, fontWeight:"bold" }}>
                            {item.cantidad} {item.unidad}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
