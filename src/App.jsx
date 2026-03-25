import { useState, useMemo, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const CATEGORIAS_EGRESO = ["🏠 Vivienda","🍔 Comida","🚗 Transporte","💊 Salud","🎭 Entretenimiento","👕 Ropa","📚 Educación","💡 Servicios","💳 Deudas","🎁 Otros"];
const CATEGORIAS_INGRESO = ["💼 Salario","💰 Freelance","📈 Inversiones","🏦 Ahorros","🎁 Regalo","💸 Otros ingresos"];
const PALETTE = ["#ef4444","#f87171","#fca5a5","#dc2626","#b91c1c","#3b82f6","#60a5fa","#93c5fd","#1d4ed8","#2563eb"];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const C_INGRESO = "#3b82f6";
const C_EGRESO  = "#ef4444";
const C_BG      = "#000000";
const C_SURFACE = "#0f0f0f";
const C_BORDER  = "#1f1f1f";
const C_TEXT    = "#ffffff";
const C_MUTED   = "#666666";

const formatMXN = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
const claveMes = (y, m) => `${y}-${String(m + 1).padStart(2, "0")}`;
const hoy = new Date();

// ===================== LOGIN =====================
function LoginScreen({ onLogin }) {
  const [modo, setModo] = useState("login"); // login | registro
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!user.trim() || !pass.trim()) { setError("Completa todos los campos"); return; }
    const usuarios = JSON.parse(localStorage.getItem("finanzas_usuarios") || "{}");
    if (modo === "registro") {
      if (usuarios[user]) { setError("Ese usuario ya existe"); return; }
      usuarios[user] = pass;
      localStorage.setItem("finanzas_usuarios", JSON.stringify(usuarios));
      onLogin(user);
    } else {
      if (!usuarios[user] || usuarios[user] !== pass) { setError("Usuario o contraseña incorrectos"); return; }
      onLogin(user);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C_BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;700&display=swap" rel="stylesheet" />
      <div style={{ width: "100%", maxWidth: 380 }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 38, color: C_TEXT, margin: "0 0 4px", textAlign: "center", letterSpacing: -1 }}>Kash<span style={{ color: C_INGRESO }}>.</span></h1>
        <p style={{ color: C_MUTED, textAlign: "center", marginBottom: 36, fontSize: 14 }}>Tu dinero, con estilo</p>

        <div style={{ background: C_SURFACE, border: `1px solid ${C_BORDER}`, borderRadius: 18, padding: 28 }}>
          <div style={{ display: "flex", marginBottom: 24, background: "#111", borderRadius: 10, padding: 4 }}>
            {["login","registro"].map(m => (
              <button key={m} onClick={() => { setModo(m); setError(""); }}
                style={{ flex: 1, padding: "8px", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, background: modo === m ? C_INGRESO : "transparent", color: modo === m ? "#fff" : C_MUTED }}>
                {m === "login" ? "Iniciar sesión" : "Registrarse"}
              </button>
            ))}
          </div>

          <label style={labelStyle}>Usuario</label>
          <input style={inputStyle} placeholder="Tu nombre de usuario" value={user} onChange={e => { setUser(e.target.value); setError(""); }} />
          <label style={labelStyle}>Contraseña</label>
          <input style={inputStyle} type="password" placeholder="Tu contraseña" value={pass} onChange={e => { setPass(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleSubmit()} />

          {error && <p style={{ color: C_EGRESO, fontSize: 13, margin: "10px 0 0", textAlign: "center" }}>{error}</p>}

          <button onClick={handleSubmit}
            style={{ ...btnStyle, width: "100%", marginTop: 20, padding: 14, background: C_INGRESO, color: "#fff", fontWeight: 700, fontSize: 15 }}>
            {modo === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===================== MODAL =====================
function Modal({ onClose, onSave, tipo }) {
  const [form, setForm] = useState({ descripcion: "", monto: "", categoria: tipo === "ingreso" ? CATEGORIAS_INGRESO[0] : CATEGORIAS_EGRESO[0] });
  const categorias = tipo === "ingreso" ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO;
  const valid = form.descripcion.trim() && parseFloat(form.monto) > 0;
  const color = tipo === "ingreso" ? C_INGRESO : C_EGRESO;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(6px)", padding: 16 }}>
      <div style={{ background: "#0a0a0a", border: `1px solid ${color}`, borderRadius: 16, padding: "28px 24px", width: "100%", maxWidth: 380, boxShadow: `0 0 40px ${color}30` }}>
        <h3 style={{ margin: "0 0 20px", fontFamily: "'Playfair Display', serif", fontSize: 20, color }}>
          {tipo === "ingreso" ? "➕ Nuevo Ingreso" : "➖ Nuevo Egreso"}
        </h3>
        <label style={labelStyle}>Descripción</label>
        <input style={inputStyle} placeholder="Ej. Pago de nómina..." value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
        <label style={labelStyle}>Monto ($)</label>
        <input style={inputStyle} type="number" inputMode="decimal" placeholder="0.00" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })} />
        <label style={labelStyle}>Categoría</label>
        <select style={{ ...inputStyle, cursor: "pointer" }} value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
          {categorias.map(c => <option key={c} style={{ background: "#111" }}>{c}</option>)}
        </select>
        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{ ...btnStyle, background: "#1a1a1a", color: "#aaa", flex: 1, border: "1px solid #333", padding: 12 }}>Cancelar</button>
          <button onClick={() => { if (valid) { onSave({ ...form, monto: parseFloat(form.monto), id: Date.now(), tipo }); onClose(); } }}
            style={{ ...btnStyle, background: valid ? color : "#1a1a1a", color: valid ? "#fff" : "#444", flex: 1, fontWeight: 700, cursor: valid ? "pointer" : "not-allowed", padding: 12 }}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ===================== TOOLTIP =====================
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: "#111", border: "1px solid #222", borderRadius: 10, padding: "10px 14px" }}>
        <p style={{ margin: 0, color: payload[0].payload.fill, fontWeight: 700, fontSize: 12 }}>{payload[0].name}</p>
        <p style={{ margin: "4px 0 0", color: "#fff", fontSize: 13 }}>{formatMXN(payload[0].value)}</p>
        <p style={{ margin: "2px 0 0", color: "#666", fontSize: 11 }}>{payload[0].payload.pct}%</p>
      </div>
    );
  }
  return null;
};

// ===================== APP PRINCIPAL =====================
function FinanzasApp({ usuario, onLogout }) {
  const storageKey = `finanzas_data_${usuario}`;

  const [todos, setTodos] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch { return {}; }
  });
  const [mes, setMes] = useState({ year: hoy.getFullYear(), month: hoy.getMonth() });
  const [modal, setModal] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const [vistaAnual, setVistaAnual] = useState(false);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(todos));
  }, [todos]);

  const clave = claveMes(mes.year, mes.month);
  const movimientos = todos[clave] || [];

  const navMes = (dir) => {
    setMes(prev => {
      let m = prev.month + dir, y = prev.year;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      return { year: y, month: m };
    });
    setFiltro("todos");
  };

  const agregar = (m) => setTodos(prev => ({ ...prev, [clave]: [m, ...(prev[clave] || [])] }));
  const eliminar = (id) => setTodos(prev => ({ ...prev, [clave]: (prev[clave] || []).filter(m => m.id !== id) }));

  const totalIngresos = useMemo(() => movimientos.filter(m => m.tipo === "ingreso").reduce((s, m) => s + m.monto, 0), [movimientos]);
  const totalEgresos = useMemo(() => movimientos.filter(m => m.tipo === "egreso").reduce((s, m) => s + m.monto, 0), [movimientos]);
  const balance = totalIngresos - totalEgresos;

  const pieData = useMemo(() => {
    const cats = {};
    movimientos.filter(m => m.tipo === "egreso").forEach(m => { cats[m.categoria] = (cats[m.categoria] || 0) + m.monto; });
    const total = Object.values(cats).reduce((s, v) => s + v, 0);
    return Object.entries(cats).map(([name, value], i) => ({ name, value, fill: PALETTE[i % PALETTE.length], pct: total ? ((value / total) * 100).toFixed(1) : 0 }));
  }, [movimientos]);

  const resumenAnual = useMemo(() => MESES.map((nombre, i) => {
    const k = claveMes(mes.year, i);
    const movs = todos[k] || [];
    const ing = movs.filter(m => m.tipo === "ingreso").reduce((s, m) => s + m.monto, 0);
    const egr = movs.filter(m => m.tipo === "egreso").reduce((s, m) => s + m.monto, 0);
    return { nombre, i, ing, egr, bal: ing - egr, tiene: movs.length > 0 };
  }), [todos, mes.year]);

  const filtrados = movimientos.filter(m => filtro === "todos" || m.tipo === filtro);

  return (
    <div style={{ minHeight: "100vh", background: C_BG, color: C_TEXT, fontFamily: "'DM Sans', sans-serif", paddingBottom: 60 }}>
      {/* HEADER */}
      <div style={{ background: "#050505", borderBottom: `1px solid ${C_BORDER}`, padding: "18px 16px 16px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: C_MUTED, letterSpacing: 2, textTransform: "uppercase" }}>Hola, {usuario}</p>
              <h1 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 22, color: C_TEXT }}>
                Kash<span style={{ color: C_INGRESO }}>.</span> <span style={{ fontSize: 15, fontWeight: 400, color: C_MUTED }}>{MESES[mes.month]} {mes.year}</span>
              </h1>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={() => setVistaAnual(v => !v)}
                style={{ ...btnStyle, background: vistaAnual ? C_INGRESO : "#111", color: vistaAnual ? "#fff" : C_MUTED, fontSize: 11, padding: "7px 12px", border: `1px solid ${vistaAnual ? C_INGRESO : "#333"}` }}>
                {vistaAnual ? "📅 Mes" : "📆 Año"}
              </button>
              <button onClick={onLogout}
                style={{ ...btnStyle, background: "transparent", color: C_MUTED, fontSize: 11, padding: "7px 12px", border: "1px solid #333" }}>
                Salir
              </button>
            </div>
          </div>

          {/* Selector meses */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: vistaAnual ? 0 : 14 }}>
            <button onClick={() => navMes(-1)} style={{ ...btnStyle, background: "#111", color: "#aaa", padding: "6px 12px", border: "1px solid #333", flexShrink: 0 }}>‹</button>
            <div style={{ display: "flex", gap: 4, overflowX: "auto", scrollbarWidth: "none", flex: 1 }}>
              {MESES.map((nombre, i) => {
                const k = claveMes(mes.year, i);
                const tieneDatos = (todos[k] || []).length > 0;
                const sel = i === mes.month;
                return (
                  <button key={i} onClick={() => { setMes(p => ({ ...p, month: i })); setFiltro("todos"); setVistaAnual(false); }}
                    style={{ ...btnStyle, flexShrink: 0, padding: "5px 8px", fontSize: 10, lineHeight: 1.4, background: sel ? C_INGRESO : tieneDatos ? "#111" : "transparent", color: sel ? "#fff" : tieneDatos ? "#ccc" : "#333", border: sel ? "none" : `1px solid ${tieneDatos ? "#333" : "#1a1a1a"}`, fontWeight: sel ? 700 : 400 }}>
                    {nombre.slice(0, 3)}
                    {tieneDatos && !sel && <span style={{ display: "block", width: 3, height: 3, background: C_INGRESO, borderRadius: "50%", margin: "2px auto 0" }} />}
                  </button>
                );
              })}
            </div>
            <button onClick={() => navMes(1)} style={{ ...btnStyle, background: "#111", color: "#aaa", padding: "6px 12px", border: "1px solid #333", flexShrink: 0 }}>›</button>
          </div>

          {/* KPI */}
          {!vistaAnual && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { label: "Ingresos", value: totalIngresos, color: C_INGRESO, bg: `${C_INGRESO}15`, border: `${C_INGRESO}40` },
                { label: "Egresos", value: totalEgresos, color: C_EGRESO, bg: `${C_EGRESO}15`, border: `${C_EGRESO}40` },
                { label: "Balance", value: balance, color: balance >= 0 ? "#fff" : C_EGRESO, bg: balance >= 0 ? "#ffffff10" : `${C_EGRESO}15`, border: balance >= 0 ? "#ffffff30" : `${C_EGRESO}40` },
              ].map(k => (
                <div key={k.label} style={{ background: k.bg, border: `1px solid ${k.border}`, borderRadius: 12, padding: "10px 8px" }}>
                  <p style={{ margin: "0 0 3px", fontSize: 9, color: C_MUTED, textTransform: "uppercase", letterSpacing: 1 }}>{k.label}</p>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: k.color }}>{formatMXN(k.value)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CONTENIDO */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 16px" }}>

        {vistaAnual ? (
          <section style={{ marginTop: 20 }}>
            <h2 style={sectionTitle}>Resumen {mes.year}</h2>
            {resumenAnual.map(({ nombre, i, ing, egr, bal, tiene }) => (
              <div key={i} onClick={() => { setMes(p => ({ ...p, month: i })); setVistaAnual(false); }}
                style={{ background: i === mes.month ? "#0d1117" : C_SURFACE, border: `1px solid ${i === mes.month ? C_INGRESO + "60" : C_BORDER}`, borderRadius: 12, padding: "13px 14px", marginBottom: 7, cursor: "pointer", opacity: tiene ? 1 : 0.35 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: tiene ? 7 : 0 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: i === mes.month ? C_INGRESO : "#ccc" }}>{nombre}</span>
                  {tiene ? <span style={{ fontSize: 13, fontWeight: 700, color: bal >= 0 ? "#fff" : C_EGRESO }}>{formatMXN(bal)}</span>
                    : <span style={{ fontSize: 12, color: "#333" }}>Sin datos</span>}
                </div>
                {tiene && (
                  <div style={{ display: "flex", gap: 12 }}>
                    <span style={{ fontSize: 12, color: C_INGRESO }}>↑ {formatMXN(ing)}</span>
                    <span style={{ fontSize: 12, color: C_EGRESO }}>↓ {formatMXN(egr)}</span>
                  </div>
                )}
              </div>
            ))}
          </section>
        ) : (
          <>
            {/* Gráfica */}
            {pieData.length > 0 ? (
              <section style={{ marginTop: 20 }}>
                <h2 style={sectionTitle}>📊 Distribución de Egresos</h2>
                <div style={{ background: C_SURFACE, border: `1px solid ${C_BORDER}`, borderRadius: 16, padding: "12px 4px" }}>
                  <ResponsiveContainer width="100%" height={230}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={88} paddingAngle={3} dataKey="value">
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} stroke="transparent" />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" iconSize={7} formatter={(v) => <span style={{ color: "#aaa", fontSize: 10 }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </section>
            ) : (
              <div style={{ marginTop: 20, background: C_SURFACE, border: `1px dashed ${C_BORDER}`, borderRadius: 16, padding: "28px 20px", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 28 }}>📭</p>
                <p style={{ margin: "8px 0 0", color: "#444", fontSize: 13 }}>Sin movimientos en {MESES[mes.month]}</p>
              </div>
            )}

            {/* Ahorro */}
            {totalIngresos > 0 && (
              <div style={{ marginTop: 10, background: C_SURFACE, border: `1px solid ${C_BORDER}`, borderRadius: 14, padding: "12px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                  <span style={{ fontSize: 12, color: C_MUTED }}>Capacidad de ahorro</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: balance >= 0 ? C_INGRESO : C_EGRESO }}>
                    {((balance / totalIngresos) * 100).toFixed(1)}%
                  </span>
                </div>
                <div style={{ background: "#1a1a1a", borderRadius: 99, height: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, (balance / totalIngresos) * 100))}%`, background: balance >= 0 ? `linear-gradient(90deg,${C_INGRESO},#60a5fa)` : C_EGRESO, borderRadius: 99, transition: "width 0.5s ease" }} />
                </div>
              </div>
            )}

            {/* Botones */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
              <button onClick={() => setModal("ingreso")} style={{ ...btnStyle, background: `${C_INGRESO}15`, border: `1.5px solid ${C_INGRESO}`, color: C_INGRESO, padding: "13px", fontSize: 14, fontWeight: 600 }}>＋ Ingreso</button>
              <button onClick={() => setModal("egreso")} style={{ ...btnStyle, background: `${C_EGRESO}15`, border: `1.5px solid ${C_EGRESO}`, color: C_EGRESO, padding: "13px", fontSize: 14, fontWeight: 600 }}>＋ Egreso</button>
            </div>

            {/* Lista */}
            <section style={{ marginTop: 20, paddingBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <h2 style={{ ...sectionTitle, margin: 0 }}>📋 Movimientos</h2>
                <div style={{ display: "flex", gap: 4 }}>
                  {["todos", "ingreso", "egreso"].map(f => {
                    const sel = filtro === f;
                    const color = f === "ingreso" ? C_INGRESO : f === "egreso" ? C_EGRESO : "#fff";
                    return (
                      <button key={f} onClick={() => setFiltro(f)}
                        style={{ ...btnStyle, padding: "4px 9px", fontSize: 10, background: sel ? color : "#111", color: sel ? "#fff" : C_MUTED, fontWeight: sel ? 700 : 400, border: sel ? "none" : "1px solid #333" }}>
                        {f === "todos" ? "Todos" : f === "ingreso" ? "Ingresos" : "Egresos"}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {filtrados.length === 0 && <p style={{ color: "#444", textAlign: "center", padding: "20px 0", fontSize: 13 }}>Sin movimientos aún</p>}
                {filtrados.map(m => (
                  <div key={m.id} style={{ background: C_SURFACE, border: `1px solid ${m.tipo === "ingreso" ? C_INGRESO + "30" : C_EGRESO + "30"}`, borderRadius: 12, padding: "11px 13px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14, color: C_TEXT, marginBottom: 2 }}>{m.descripcion}</div>
                      <div style={{ fontSize: 11, color: C_MUTED }}>{m.categoria}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: m.tipo === "ingreso" ? C_INGRESO : C_EGRESO }}>
                        {m.tipo === "ingreso" ? "+" : "-"}{formatMXN(m.monto)}
                      </span>
                      <button onClick={() => eliminar(m.id)}
                        style={{ background: "transparent", border: "none", color: "#444", cursor: "pointer", fontSize: 15, padding: 2 }}
                        onMouseEnter={e => e.target.style.color = C_EGRESO} onMouseLeave={e => e.target.style.color = "#444"}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      {modal && <Modal tipo={modal} onClose={() => setModal(null)} onSave={agregar} />}
    </div>
  );
}

// ===================== ROOT =====================
export default function App() {
  const [usuario, setUsuario] = useState(() => localStorage.getItem("finanzas_sesion") || null);

  const handleLogin = (u) => {
    localStorage.setItem("finanzas_sesion", u);
    setUsuario(u);
  };

  const handleLogout = () => {
    localStorage.removeItem("finanzas_sesion");
    setUsuario(null);
  };

  return usuario
    ? <FinanzasApp usuario={usuario} onLogout={handleLogout} />
    : <LoginScreen onLogin={handleLogin} />;
}

const labelStyle = { display: "block", fontSize: 11, color: "#666", marginBottom: 5, marginTop: 12, textTransform: "uppercase", letterSpacing: 1 };
const inputStyle = { width: "100%", background: "#111", border: "1px solid #333", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" };
const btnStyle = { border: "none", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontFamily: "inherit", fontSize: 13 };
const sectionTitle = { fontFamily: "'Playfair Display', serif", fontSize: 17, color: "#fff", margin: "0 0 10px" };