import { useState, useMemo, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { auth, db } from "./firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

const CATEGORIAS_EGRESO = ["🏠 Vivienda","🍔 Comida","🚗 Transporte","💊 Salud","🎭 Entretenimiento","👕 Ropa","📚 Educación","💡 Servicios","💳 Deudas","🎁 Otros"];
const CATEGORIAS_INGRESO = ["💼 Salario","💰 Freelance","📈 Inversiones","🏦 Ahorros","🎁 Regalo","💸 Otros ingresos"];
const PALETTE = ["#ef4444","#f87171","#fca5a5","#dc2626","#b91c1c","#3b82f6","#60a5fa","#93c5fd","#1d4ed8","#2563eb"];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const TIPOS_DEUDA = ["💳 Tarjeta de Crédito","🏦 Préstamo Personal","🏠 Hipoteca","🚗 Crédito Automotriz","📚 Crédito Educativo","💸 Otro"];

const C_INGRESO = "#3b82f6";
const C_EGRESO  = "#ef4444";
const C_BG      = "#000000";
const C_SURFACE = "#0f0f0f";
const C_BORDER  = "#1f1f1f";
const C_TEXT    = "#ffffff";
const C_MUTED   = "#666666";
const C_DEUDA   = "#f59e0b";
const C_OK      = "#22c55e";

const formatMXN = (n) => new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN"}).format(n);
const claveMes = (y,m) => `${y}-${String(m+1).padStart(2,"0")}`;
const hoy = new Date();

const labelStyle = {display:"block",fontSize:11,color:"#666",marginBottom:5,marginTop:12,textTransform:"uppercase",letterSpacing:1};
const inputStyle = {width:"100%",background:"#111",border:"1px solid #333",borderRadius:10,padding:"10px 14px",color:"#fff",fontSize:14,outline:"none",boxSizing:"border-box",WebkitAppearance:"none"};
const btnStyle = {border:"none",borderRadius:10,padding:"10px 16px",cursor:"pointer",fontFamily:"inherit",fontSize:13,WebkitTapHighlightColor:"transparent"};
const sectionTitle = {fontFamily:"'Playfair Display', serif",fontSize:17,color:"#fff",margin:"0 0 10px"};

// ==================== UTILIDADES ====================
function diasHasta(dia) {
  const h = new Date();
  const mesActual = h.getMonth();
  const anio = h.getFullYear();
  let target = new Date(anio, mesActual, dia);
  if (target <= h) target = new Date(anio, mesActual + 1, dia);
  return Math.ceil((target - h) / (1000*60*60*24));
}

function etiquetaDias(dias) {
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  return `En ${dias} días`;
}

function solicitarPermisoNotificaciones() {
  if (!("Notification" in window)) return Promise.resolve("denied");
  if (Notification.permission === "granted") return Promise.resolve("granted");
  if (Notification.permission === "denied") return Promise.resolve("denied");
  return Notification.requestPermission();
}

function enviarNotificacion(titulo, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(titulo, { body });
  }
}

// ==================== GLOBAL STYLES ====================
function GlobalStyles() {
  return <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html{font-size:16px;-webkit-text-size-adjust:100%}
    body{margin:0;padding:0;overflow-x:hidden;background:#000}
    input,select,button,textarea{font-family:'DM Sans',sans-serif}
    input[type="number"]::-webkit-inner-spin-button,
    input[type="number"]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
    input[type="number"]{-moz-appearance:textfield}
    input[type="date"]{color-scheme:dark}
    ::-webkit-scrollbar{width:0;height:0}
    select{-webkit-appearance:none;-moz-appearance:none;appearance:none;
      background-image:url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
      background-repeat:no-repeat;background-position:right 12px center;background-size:14px;padding-right:36px!important}
    @media(max-width:380px){html{font-size:14px}}
  `}</style>;
}

// ==================== LOGIN ====================
function LoginScreen({ onLogin }) {
  const [modo, setModo] = useState("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const traducirError = (code) => {
    const errores = {
      "auth/email-already-in-use": "Ese correo ya está registrado",
      "auth/invalid-email": "Correo inválido",
      "auth/weak-password": "La contraseña debe tener al menos 6 caracteres",
      "auth/user-not-found": "No existe una cuenta con ese correo",
      "auth/wrong-password": "Contraseña incorrecta",
      "auth/invalid-credential": "Correo o contraseña incorrectos",
      "auth/too-many-requests": "Demasiados intentos, espera un momento",
    };
    return errores[code] || "Error de autenticación";
  };

  const handleSubmit = async () => {
    if (!email.trim()||!pass.trim()){setError("Completa todos los campos");return;}
    setCargando(true);
    setError("");
    try {
      if (modo==="registro") {
        await createUserWithEmailAndPassword(auth, email, pass);
      } else {
        await signInWithEmailAndPassword(auth, email, pass);
      }
    } catch(e) {
      setError(traducirError(e.code));
    }
    setCargando(false);
  };

  return (
    <div style={{minHeight:"100dvh",background:C_BG,display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'DM Sans', sans-serif"}}>
      <GlobalStyles/>
      <div style={{width:"100%",maxWidth:380}}>
        <h1 style={{fontFamily:"'Playfair Display', serif",fontSize:"clamp(30px,8vw,38px)",color:C_TEXT,margin:"0 0 4px",textAlign:"center",letterSpacing:-1}}>Kash<span style={{color:C_INGRESO}}>.</span></h1>
        <p style={{color:C_MUTED,textAlign:"center",marginBottom:36,fontSize:14}}>Tu dinero, con estilo</p>
        <div style={{background:C_SURFACE,border:`1px solid ${C_BORDER}`,borderRadius:18,padding:"clamp(20px,5vw,28px)"}}>
          <div style={{display:"flex",marginBottom:24,background:"#111",borderRadius:10,padding:4}}>
            {["login","registro"].map(m=>(
              <button key={m} onClick={()=>{setModo(m);setError("");}}
                style={{flex:1,padding:"8px",border:"none",borderRadius:8,cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600,background:modo===m?C_INGRESO:"transparent",color:modo===m?"#fff":C_MUTED}}>
                {m==="login"?"Iniciar sesión":"Registrarse"}
              </button>
            ))}
          </div>
          <label style={labelStyle}>Correo electrónico</label>
          <input style={inputStyle} type="email" placeholder="tu@correo.com" value={email} onChange={e=>{setEmail(e.target.value);setError("");}} />
          <label style={labelStyle}>Contraseña</label>
          <input style={inputStyle} type="password" placeholder="Mínimo 6 caracteres" value={pass} onChange={e=>{setPass(e.target.value);setError("");}}
            onKeyDown={e=>e.key==="Enter"&&handleSubmit()} />
          {error&&<p style={{color:C_EGRESO,fontSize:13,margin:"10px 0 0",textAlign:"center"}}>{error}</p>}
          <button onClick={handleSubmit} disabled={cargando}
            style={{...btnStyle,width:"100%",marginTop:20,padding:14,background:cargando?"#333":C_INGRESO,color:"#fff",fontWeight:700,fontSize:15,opacity:cargando?0.7:1}}>
            {cargando?"Cargando...":(modo==="login"?"Entrar":"Crear cuenta")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== MODAL MOVIMIENTO ====================
function Modal({ onClose, onSave, tipo, deudas }) {
  const [form, setForm] = useState({
    descripcion:"", monto:"",
    categoria: tipo==="ingreso"?CATEGORIAS_INGRESO[0]:CATEGORIAS_EGRESO[0],
    tarjetaId: "",
  });
  const categorias = tipo==="ingreso"?CATEGORIAS_INGRESO:CATEGORIAS_EGRESO;
  const valid = form.descripcion.trim() && parseFloat(form.monto) > 0;
  const color = tipo==="ingreso"?C_INGRESO:C_EGRESO;
  const tarjetasActivas = (deudas||[]).filter(d=>d.tipo==="💳 Tarjeta de Crédito"&&(d.deudaTotal-d.pagado)>=0);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(6px)",padding:16,overflowY:"auto"}}>
      <div style={{background:"#0a0a0a",border:`1px solid ${color}`,borderRadius:16,padding:"clamp(20px,5vw,28px) clamp(16px,4vw,24px)",width:"100%",maxWidth:400,boxShadow:`0 0 40px ${color}30`,margin:"auto"}}>
        <h3 style={{margin:"0 0 20px",fontFamily:"'Playfair Display', serif",fontSize:20,color}}>
          {tipo==="ingreso"?"➕ Nuevo Ingreso":"➖ Nuevo Egreso"}
        </h3>
        <label style={labelStyle}>Descripción</label>
        <input style={inputStyle} placeholder="Ej. Pago de nómina..." value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})} />
        <label style={labelStyle}>Monto ($)</label>
        <input style={inputStyle} type="number" inputMode="decimal" placeholder="0.00" value={form.monto} onChange={e=>setForm({...form,monto:e.target.value})} />
        <label style={labelStyle}>Categoría</label>
        <select style={{...inputStyle,cursor:"pointer"}} value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})}>
          {categorias.map(c=><option key={c} style={{background:"#111"}}>{c}</option>)}
        </select>
        {tipo==="egreso"&&tarjetasActivas.length>0&&(
          <>
            <label style={labelStyle}>Cargar a tarjeta (opcional)</label>
            <select style={{...inputStyle,cursor:"pointer"}} value={form.tarjetaId} onChange={e=>setForm({...form,tarjetaId:e.target.value})}>
              <option value="" style={{background:"#111"}}>— Sin tarjeta (efectivo/débito) —</option>
              {tarjetasActivas.map(t=>(
                <option key={t.id} value={t.id} style={{background:"#111"}}>
                  {t.nombre} (Disp: {formatMXN(Math.max(0,(t.limiteCredito||0)-(t.deudaTotal-t.pagado)))})
                </option>
              ))}
            </select>
          </>
        )}
        <div style={{display:"flex",gap:10,marginTop:22}}>
          <button onClick={onClose} style={{...btnStyle,background:"#1a1a1a",color:"#aaa",flex:1,border:"1px solid #333",padding:12}}>Cancelar</button>
          <button onClick={()=>{if(valid){onSave({...form,monto:parseFloat(form.monto),id:Date.now(),tipo,tarjetaId:form.tarjetaId||null});onClose();}}}
            style={{...btnStyle,background:valid?color:"#1a1a1a",color:valid?"#fff":"#444",flex:1,fontWeight:700,cursor:valid?"pointer":"not-allowed",padding:12}}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== MODAL DEUDA / TARJETA ====================
function ModalDeuda({ onClose, onSave, deudaEditar }) {
  const [form, setForm] = useState(deudaEditar || {
    nombre:"", tipo:TIPOS_DEUDA[0],
    deudaTotal:"", pagado:"", pagoMinimo:"",
    tasaInteres:"", limiteCredito:"",
    diaCorte:"", diaPago:"",
    fechaLimitePago:"",
    notificaciones: true,
    historialPagos: [],
  });

  const isTarjeta = form.tipo === "💳 Tarjeta de Crédito";
  const valid = form.nombre.trim() && (isTarjeta ? parseFloat(form.limiteCredito||form.deudaTotal) > 0 : parseFloat(form.deudaTotal) > 0);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(6px)",padding:16,overflowY:"auto"}}>
      <div style={{background:"#0a0a0a",border:`1px solid ${C_DEUDA}`,borderRadius:16,padding:"clamp(18px,4vw,26px) clamp(14px,4vw,22px)",width:"100%",maxWidth:440,boxShadow:`0 0 40px ${C_DEUDA}30`,margin:"auto",maxHeight:"92dvh",overflowY:"auto"}}>
        <h3 style={{margin:"0 0 18px",fontFamily:"'Playfair Display', serif",fontSize:20,color:C_DEUDA}}>
          {deudaEditar?"✏️ Editar":"💳 Nueva"} {isTarjeta?"Tarjeta":"Deuda"}
        </h3>
        <label style={labelStyle}>Nombre</label>
        <input style={inputStyle} placeholder="Ej. Visa BBVA, Préstamo Nu..." value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} />
        <label style={labelStyle}>Tipo</label>
        <select style={{...inputStyle,cursor:"pointer"}} value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}>
          {TIPOS_DEUDA.map(t=><option key={t} style={{background:"#111"}}>{t}</option>)}
        </select>
        {isTarjeta && (
          <>
            <label style={labelStyle}>Límite de Crédito ($)</label>
            <input style={inputStyle} type="number" inputMode="decimal" placeholder="Ej. 50000" value={form.limiteCredito} onChange={e=>setForm({...form,limiteCredito:e.target.value})} />
          </>
        )}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div>
            <label style={labelStyle}>{isTarjeta?"Saldo Actual ($)":"Deuda Total ($)"}</label>
            <input style={inputStyle} type="number" inputMode="decimal" placeholder="0.00" value={form.deudaTotal} onChange={e=>setForm({...form,deudaTotal:e.target.value})} />
          </div>
          <div>
            <label style={labelStyle}>Pagado ($)</label>
            <input style={inputStyle} type="number" inputMode="decimal" placeholder="0.00" value={form.pagado} onChange={e=>setForm({...form,pagado:e.target.value})} />
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div>
            <label style={labelStyle}>Pago Mínimo ($)</label>
            <input style={inputStyle} type="number" inputMode="decimal" placeholder="0.00" value={form.pagoMinimo} onChange={e=>setForm({...form,pagoMinimo:e.target.value})} />
          </div>
          <div>
            <label style={labelStyle}>Tasa Interés (%)</label>
            <input style={inputStyle} type="number" inputMode="decimal" placeholder="0.0" value={form.tasaInteres} onChange={e=>setForm({...form,tasaInteres:e.target.value})} />
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div>
            <label style={labelStyle}>Día de Corte</label>
            <input style={inputStyle} type="number" inputMode="numeric" placeholder="Ej. 15" min="1" max="31" value={form.diaCorte} onChange={e=>setForm({...form,diaCorte:e.target.value})} />
          </div>
          <div>
            <label style={labelStyle}>Día de Pago</label>
            <input style={inputStyle} type="number" inputMode="numeric" placeholder="Ej. 5" min="1" max="31" value={form.diaPago} onChange={e=>setForm({...form,diaPago:e.target.value})} />
          </div>
        </div>
        <label style={labelStyle}>Fecha Límite de Pago</label>
        <input style={{...inputStyle,cursor:"pointer"}} type="date" value={form.fechaLimitePago||""} onChange={e=>setForm({...form,fechaLimitePago:e.target.value})} />
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:16,padding:"12px 14px",background:"#111",borderRadius:10,border:"1px solid #222"}}>
          <div>
            <div style={{fontSize:13,color:C_TEXT,fontWeight:500}}>🔔 Notificaciones</div>
            <div style={{fontSize:11,color:C_MUTED,marginTop:2}}>Aviso antes de corte y pago</div>
          </div>
          <button onClick={()=>setForm({...form,notificaciones:!form.notificaciones})}
            style={{width:48,height:26,borderRadius:13,border:"none",cursor:"pointer",position:"relative",
              background:form.notificaciones?C_INGRESO:"#333",transition:"background 0.2s"}}>
            <div style={{width:20,height:20,borderRadius:10,background:"#fff",position:"absolute",top:3,
              left:form.notificaciones?25:3,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}} />
          </button>
        </div>
        <div style={{display:"flex",gap:10,marginTop:22}}>
          <button onClick={onClose} style={{...btnStyle,background:"#1a1a1a",color:"#aaa",flex:1,border:"1px solid #333",padding:12}}>Cancelar</button>
          <button onClick={()=>{
            if(valid){
              onSave({
                ...form,
                deudaTotal:parseFloat(form.deudaTotal)||0,
                pagado:parseFloat(form.pagado)||0,
                pagoMinimo:parseFloat(form.pagoMinimo)||0,
                tasaInteres:parseFloat(form.tasaInteres)||0,
                limiteCredito:parseFloat(form.limiteCredito)||0,
                diaCorte:parseInt(form.diaCorte)||0,
                diaPago:parseInt(form.diaPago)||0,
                notificaciones:form.notificaciones!==false,
                historialPagos:form.historialPagos||[],
                id:form.id||Date.now(),
              });
              onClose();
            }
          }}
            style={{...btnStyle,background:valid?C_DEUDA:"#1a1a1a",color:valid?"#000":"#444",flex:1,fontWeight:700,cursor:valid?"pointer":"not-allowed",padding:12}}>
            {deudaEditar?"Actualizar":"Agregar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== MODAL PAGO DEUDA ====================
function ModalPago({ deuda, onClose, onSave }) {
  const [monto, setMonto] = useState("");
  const restante = deuda.deudaTotal - deuda.pagado;
  const valid = parseFloat(monto)>0;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(6px)",padding:16}}>
      <div style={{background:"#0a0a0a",border:`1px solid ${C_INGRESO}`,borderRadius:16,padding:"clamp(20px,5vw,28px) clamp(16px,4vw,24px)",width:"100%",maxWidth:400,boxShadow:`0 0 40px ${C_INGRESO}30`}}>
        <h3 style={{margin:"0 0 6px",fontFamily:"'Playfair Display', serif",fontSize:20,color:C_INGRESO}}>💰 Registrar Pago</h3>
        <p style={{color:C_MUTED,fontSize:13,margin:"0 0 20px"}}>{deuda.nombre} — Restante: {formatMXN(restante)}</p>
        <label style={labelStyle}>Monto del Pago ($)</label>
        <input style={inputStyle} type="number" inputMode="decimal" placeholder="0.00" value={monto} onChange={e=>setMonto(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&valid&&onSave(parseFloat(monto))} />
        <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
          {deuda.pagoMinimo>0&&(
            <button onClick={()=>setMonto(String(deuda.pagoMinimo))}
              style={{...btnStyle,background:"#111",color:C_DEUDA,fontSize:11,padding:"6px 12px",border:`1px solid ${C_DEUDA}40`}}>
              Mínimo: {formatMXN(deuda.pagoMinimo)}
            </button>
          )}
          {restante>0&&(
            <button onClick={()=>setMonto(String(restante))}
              style={{...btnStyle,background:"#111",color:C_OK,fontSize:11,padding:"6px 12px",border:`1px solid ${C_OK}40`}}>
              Liquidar: {formatMXN(restante)}
            </button>
          )}
        </div>
        <div style={{display:"flex",gap:10,marginTop:22}}>
          <button onClick={onClose} style={{...btnStyle,background:"#1a1a1a",color:"#aaa",flex:1,border:"1px solid #333",padding:12}}>Cancelar</button>
          <button onClick={()=>{if(valid){onSave(parseFloat(monto));onClose();}}}
            style={{...btnStyle,background:valid?C_INGRESO:"#1a1a1a",color:valid?"#fff":"#444",flex:1,fontWeight:700,cursor:valid?"pointer":"not-allowed",padding:12}}>
            Registrar Pago
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== DETALLE TARJETA ====================
function ModalDetalleTarjeta({ deuda, movimientos, onClose }) {
  const cargos = movimientos.filter(m => String(m.tarjetaId) === String(deuda.id));
  const pagos = deuda.historialPagos || [];
  const todos = [
    ...cargos.map(c => ({ ...c, _tipo: "cargo", _fecha: c.id })),
    ...pagos.map(p => ({ ...p, _tipo: "pago", _fecha: p.fecha })),
  ].sort((a, b) => b._fecha - a._fecha);
  const isTarjeta = deuda.tipo === "💳 Tarjeta de Crédito";
  const restante = deuda.deudaTotal - deuda.pagado;
  const disponible = isTarjeta ? Math.max(0, (deuda.limiteCredito||0) - restante) : 0;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,backdropFilter:"blur(6px)",padding:16,overflowY:"auto"}}>
      <div style={{background:"#0a0a0a",border:`1px solid ${C_DEUDA}`,borderRadius:16,padding:"clamp(18px,4vw,26px) clamp(14px,4vw,22px)",width:"100%",maxWidth:460,boxShadow:`0 0 40px ${C_DEUDA}30`,margin:"auto",maxHeight:"92dvh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 style={{margin:0,fontFamily:"'Playfair Display', serif",fontSize:18,color:C_DEUDA}}>{deuda.nombre}</h3>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:C_MUTED,cursor:"pointer",fontSize:18,padding:4}}>✕</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isTarjeta?"1fr 1fr 1fr":"1fr 1fr",gap:6,marginBottom:14}}>
          <div style={{background:"#111",borderRadius:10,padding:"10px",textAlign:"center"}}>
            <div style={{fontSize:9,color:C_MUTED,textTransform:"uppercase",letterSpacing:0.5}}>Restante</div>
            <div style={{fontSize:16,fontWeight:700,color:restante<=0?C_OK:C_EGRESO,marginTop:4}}>{restante<=0?"✓ Liquidada":formatMXN(restante)}</div>
          </div>
          {isTarjeta&&(
            <div style={{background:"#111",borderRadius:10,padding:"10px",textAlign:"center"}}>
              <div style={{fontSize:9,color:C_MUTED,textTransform:"uppercase",letterSpacing:0.5}}>Disponible</div>
              <div style={{fontSize:16,fontWeight:700,color:C_INGRESO,marginTop:4}}>{formatMXN(disponible)}</div>
            </div>
          )}
          <div style={{background:"#111",borderRadius:10,padding:"10px",textAlign:"center"}}>
            <div style={{fontSize:9,color:C_MUTED,textTransform:"uppercase",letterSpacing:0.5}}>{isTarjeta?"Límite":"Total"}</div>
            <div style={{fontSize:16,fontWeight:700,color:"#aaa",marginTop:4}}>{formatMXN(isTarjeta?(deuda.limiteCredito||0):deuda.deudaTotal)}</div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(100px, 1fr))",gap:6,marginBottom:16}}>
          {deuda.diaCorte>0&&(
            <div style={{background:`${C_DEUDA}10`,border:`1px solid ${C_DEUDA}25`,borderRadius:10,padding:"8px 10px",textAlign:"center"}}>
              <div style={{fontSize:9,color:C_MUTED,textTransform:"uppercase",letterSpacing:0.5}}>Corte</div>
              <div style={{fontSize:18,fontWeight:700,color:C_DEUDA,marginTop:2}}>Día {deuda.diaCorte}</div>
              <div style={{fontSize:10,color:C_DEUDA,marginTop:2,opacity:0.8}}>{etiquetaDias(diasHasta(deuda.diaCorte))}</div>
            </div>
          )}
          {deuda.diaPago>0&&(
            <div style={{background:`${C_INGRESO}10`,border:`1px solid ${C_INGRESO}25`,borderRadius:10,padding:"8px 10px",textAlign:"center"}}>
              <div style={{fontSize:9,color:C_MUTED,textTransform:"uppercase",letterSpacing:0.5}}>Pago</div>
              <div style={{fontSize:18,fontWeight:700,color:C_INGRESO,marginTop:2}}>Día {deuda.diaPago}</div>
              <div style={{fontSize:10,color:C_INGRESO,marginTop:2,opacity:0.8}}>{etiquetaDias(diasHasta(deuda.diaPago))}</div>
            </div>
          )}
          {deuda.fechaLimitePago&&(
            <div style={{background:`${C_EGRESO}10`,border:`1px solid ${C_EGRESO}25`,borderRadius:10,padding:"8px 10px",textAlign:"center"}}>
              <div style={{fontSize:9,color:C_MUTED,textTransform:"uppercase",letterSpacing:0.5}}>Límite</div>
              <div style={{fontSize:15,fontWeight:700,color:C_EGRESO,marginTop:4}}>
                {new Date(deuda.fechaLimitePago+"T12:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"short",year:"numeric"})}
              </div>
            </div>
          )}
        </div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}}>
          {deuda.pagoMinimo>0&&<span style={{fontSize:12,color:C_MUTED}}>Pago mín: <span style={{color:C_DEUDA,fontWeight:600}}>{formatMXN(deuda.pagoMinimo)}</span></span>}
          {deuda.tasaInteres>0&&<span style={{fontSize:12,color:C_MUTED}}>Tasa: <span style={{color:"#aaa",fontWeight:600}}>{deuda.tasaInteres}%</span></span>}
        </div>
        <h4 style={{fontSize:13,color:C_TEXT,fontWeight:600,marginBottom:10}}>📋 Movimientos vinculados ({todos.length})</h4>
        <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:280,overflowY:"auto",paddingRight:4}}>
          {todos.length===0&&<p style={{color:"#444",textAlign:"center",padding:"16px 0",fontSize:12}}>Sin movimientos registrados</p>}
          {todos.map((item, idx) => (
            <div key={idx} style={{background:"#111",borderRadius:10,padding:"9px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",
              borderLeft:`3px solid ${item._tipo==="pago"?C_INGRESO:C_EGRESO}`}}>
              <div style={{minWidth:0,flex:1}}>
                <div style={{fontSize:13,color:C_TEXT,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {item._tipo==="pago"?"💰 Pago":item.descripcion||"Cargo"}
                </div>
                <div style={{fontSize:10,color:C_MUTED,marginTop:1}}>
                  {new Date(item._fecha).toLocaleDateString("es-MX",{day:"numeric",month:"short",year:"numeric"})}
                  {item._tipo==="cargo"&&item.categoria&&` · ${item.categoria}`}
                </div>
              </div>
              <span style={{fontWeight:700,fontSize:13,color:item._tipo==="pago"?C_INGRESO:C_EGRESO,flexShrink:0,marginLeft:8}}>
                {item._tipo==="pago"?"+":"-"}{formatMXN(item.monto)}
              </span>
            </div>
          ))}
        </div>
        {cargos.length>0&&(
          <div style={{marginTop:12,padding:"10px 12px",background:"#111",borderRadius:10,display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:12,color:C_MUTED}}>Total cargos</span>
            <span style={{fontSize:13,fontWeight:700,color:C_EGRESO}}>{formatMXN(cargos.reduce((s,c)=>s+c.monto,0))}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== TOOLTIP ====================
const CustomTooltip = ({ active, payload }) => {
  if (active&&payload&&payload.length) {
    return (
      <div style={{background:"#111",border:"1px solid #222",borderRadius:10,padding:"10px 14px"}}>
        <p style={{margin:0,color:payload[0].payload.fill,fontWeight:700,fontSize:12}}>{payload[0].name}</p>
        <p style={{margin:"4px 0 0",color:"#fff",fontSize:13}}>{formatMXN(payload[0].value)}</p>
        <p style={{margin:"2px 0 0",color:"#666",fontSize:11}}>{payload[0].payload.pct}%</p>
      </div>
    );
  }
  return null;
};

// ==================== TARJETA DE DEUDA ====================
function DeudaCard({ deuda, onPago, onEdit, onDelete, onDetalle, alertas }) {
  const restante = deuda.deudaTotal - deuda.pagado;
  const isTarjeta = deuda.tipo === "💳 Tarjeta de Crédito";
  const limite = deuda.limiteCredito || deuda.deudaTotal;
  const progreso = deuda.deudaTotal > 0 ? (deuda.pagado / deuda.deudaTotal) * 100 : 0;
  const liquidada = restante <= 0;
  const misAlertas = alertas.filter(a => a.deudaId === deuda.id);

  return (
    <div style={{background:C_SURFACE,border:`1px solid ${liquidada?C_OK+"40":misAlertas.length>0?C_EGRESO+"50":C_DEUDA+"30"}`,borderRadius:14,
      padding:"clamp(12px,3vw,16px)",position:"relative",opacity:liquidada?0.6:1,cursor:"pointer"}}
      onClick={onDetalle}>
      {misAlertas.length>0&&!liquidada&&(
        <div style={{marginBottom:10,display:"flex",flexDirection:"column",gap:4}}>
          {misAlertas.map((a,i)=>(
            <div key={i} style={{background:a.urgente?`${C_EGRESO}20`:`${C_DEUDA}15`,border:`1px solid ${a.urgente?C_EGRESO+"40":C_DEUDA+"30"}`,
              borderRadius:8,padding:"6px 10px",display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:12}}>{a.urgente?"🚨":"🔔"}</span>
              <span style={{fontSize:11,color:a.urgente?C_EGRESO:C_DEUDA,fontWeight:500}}>{a.mensaje}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,gap:8}}>
        <div style={{minWidth:0,flex:1}}>
          <div style={{fontWeight:600,fontSize:14,color:C_TEXT,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{deuda.nombre}</div>
          <div style={{fontSize:11,color:C_MUTED,display:"flex",gap:8,flexWrap:"wrap"}}>
            <span>{deuda.tipo}</span>
            {deuda.diaCorte>0&&<span>Corte: día {deuda.diaCorte}</span>}
            {deuda.diaPago>0&&<span>Pago: día {deuda.diaPago}</span>}
          </div>
        </div>
        <div style={{display:"flex",gap:4,flexShrink:0}} onClick={e=>e.stopPropagation()}>
          <button onClick={onEdit} style={{background:"transparent",border:"none",color:"#555",cursor:"pointer",fontSize:13,padding:"2px 4px"}}
            onMouseEnter={e=>e.target.style.color=C_DEUDA} onMouseLeave={e=>e.target.style.color="#555"}>✏️</button>
          <button onClick={onDelete} style={{background:"transparent",border:"none",color:"#555",cursor:"pointer",fontSize:13,padding:"2px 4px"}}
            onMouseEnter={e=>e.target.style.color=C_EGRESO} onMouseLeave={e=>e.target.style.color="#555"}>✕</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:isTarjeta?"1fr 1fr 1fr":"1fr 1fr",gap:8,marginBottom:10}}>
        <div>
          <div style={{fontSize:10,color:C_MUTED,textTransform:"uppercase",letterSpacing:0.5,marginBottom:2}}>Restante</div>
          <div style={{fontSize:isTarjeta?14:16,fontWeight:700,color:liquidada?C_OK:C_EGRESO}}>{liquidada?"✓ Liquidada":formatMXN(restante)}</div>
        </div>
        {isTarjeta&&(
          <div>
            <div style={{fontSize:10,color:C_MUTED,textTransform:"uppercase",letterSpacing:0.5,marginBottom:2}}>Disponible</div>
            <div style={{fontSize:14,fontWeight:700,color:C_INGRESO}}>{formatMXN(Math.max(0,limite-restante))}</div>
          </div>
        )}
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:10,color:C_MUTED,textTransform:"uppercase",letterSpacing:0.5,marginBottom:2}}>{isTarjeta?"Límite":"Total"}</div>
          <div style={{fontSize:14,fontWeight:500,color:"#aaa"}}>{formatMXN(isTarjeta?limite:deuda.deudaTotal)}</div>
        </div>
      </div>
      <div style={{background:"#1a1a1a",borderRadius:99,height:6,overflow:"hidden",marginBottom:10}}>
        <div style={{height:"100%",width:`${Math.min(100,progreso)}%`,borderRadius:99,transition:"width 0.5s ease",
          background:liquidada?C_OK:progreso>50?`linear-gradient(90deg,${C_DEUDA},${C_OK})`:`linear-gradient(90deg,${C_EGRESO},${C_DEUDA})`}} />
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {deuda.pagoMinimo>0&&<span style={{fontSize:11,color:C_MUTED}}>Mín: <span style={{color:C_DEUDA,fontWeight:600}}>{formatMXN(deuda.pagoMinimo)}</span></span>}
          {deuda.tasaInteres>0&&<span style={{fontSize:11,color:C_MUTED}}>Tasa: <span style={{color:"#aaa",fontWeight:600}}>{deuda.tasaInteres}%</span></span>}
          {deuda.fechaLimitePago&&<span style={{fontSize:11,color:C_MUTED}}>Vence: <span style={{color:C_EGRESO,fontWeight:600}}>{new Date(deuda.fechaLimitePago+"T12:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"short"})}</span></span>}
        </div>
        {!liquidada&&(
          <button onClick={onPago}
            style={{...btnStyle,background:`${C_INGRESO}20`,border:`1px solid ${C_INGRESO}60`,color:C_INGRESO,fontSize:11,padding:"6px 14px",fontWeight:600,flexShrink:0}}>
            💰 Pagar
          </button>
        )}
      </div>
    </div>
  );
}

// ==================== APP PRINCIPAL ====================
function FinanzasApp({ usuario, onLogout }) {
  const uid = usuario.uid;
  const userEmail = usuario.email;

  const [todos, setTodos] = useState({});
  const [deudas, setDeudas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mes, setMes] = useState({year:hoy.getFullYear(),month:hoy.getMonth()});
  const [modal, setModal] = useState(null);
  const [modalDeuda, setModalDeuda] = useState(false);
  const [deudaEditar, setDeudaEditar] = useState(null);
  const [modalPago, setModalPago] = useState(null);
  const [modalDetalle, setModalDetalle] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const [vista, setVista] = useState("mes");
  const [notifStatus, setNotifStatus] = useState(()=>"Notification" in window ? Notification.permission : "denied");

  // ========== FIRESTORE SYNC ==========
  // Cargar datos iniciales y escuchar cambios en tiempo real
  useEffect(()=>{
    const unsub1 = onSnapshot(doc(db, "usuarios", uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setTodos(data.movimientos || {});
        setDeudas(data.deudas || []);
      }
      setCargando(false);
    });
    return () => unsub1();
  },[uid]);

  // Guardar movimientos en Firestore
  const guardarEnFirestore = async (nuevosTodos, nuevasDeudas) => {
    try {
      await setDoc(doc(db, "usuarios", uid), {
        movimientos: nuevosTodos,
        deudas: nuevasDeudas,
        email: userEmail,
        ultimaActualizacion: Date.now(),
      }, { merge: true });
    } catch(e) {
      console.error("Error guardando:", e);
    }
  };

  const clave = claveMes(mes.year,mes.month);
  const movimientos = todos[clave]||[];

  const todosMovimientos = useMemo(()=>{
    const all = [];
    Object.values(todos).forEach(arr=>{if(Array.isArray(arr))all.push(...arr);});
    return all;
  },[todos]);

  const navMes = (dir)=>{
    setMes(prev=>{let m=prev.month+dir,y=prev.year;if(m<0){m=11;y--;}if(m>11){m=0;y++;}return{year:y,month:m};});
    setFiltro("todos");
  };

  const agregar = (m) => {
    const nuevosTodos = {...todos,[clave]:[m,...(todos[clave]||[])]};
    let nuevasDeudas = deudas;
    if (m.tarjetaId && m.tipo==="egreso") {
      nuevasDeudas = deudas.map(d=>
        String(d.id)===String(m.tarjetaId) ? {...d, deudaTotal: d.deudaTotal + m.monto} : d
      );
    }
    setTodos(nuevosTodos);
    setDeudas(nuevasDeudas);
    guardarEnFirestore(nuevosTodos, nuevasDeudas);
  };

  const eliminar = (id) => {
    const mov = movimientos.find(m=>m.id===id);
    const nuevosTodos = {...todos,[clave]:(todos[clave]||[]).filter(m=>m.id!==id)};
    let nuevasDeudas = deudas;
    if (mov && mov.tarjetaId && mov.tipo==="egreso") {
      nuevasDeudas = deudas.map(d=>
        String(d.id)===String(mov.tarjetaId) ? {...d, deudaTotal: Math.max(0, d.deudaTotal - mov.monto)} : d
      );
    }
    setTodos(nuevosTodos);
    setDeudas(nuevasDeudas);
    guardarEnFirestore(nuevosTodos, nuevasDeudas);
  };

  const agregarDeuda = (d) => {
    const nuevas = deudaEditar ? deudas.map(x=>x.id===d.id?d:x) : [...deudas,d];
    setDeudas(nuevas);
    guardarEnFirestore(todos, nuevas);
  };

  const eliminarDeuda = (id) => {
    if(confirm("¿Eliminar esta deuda?")){
      const nuevas = deudas.filter(d=>d.id!==id);
      setDeudas(nuevas);
      guardarEnFirestore(todos, nuevas);
    }
  };

  const registrarPago = (deudaId, monto) => {
    const deuda = deudas.find(d=>d.id===deudaId);
    const nuevasDeudas = deudas.map(d=>d.id===deudaId?{
      ...d,
      pagado:Math.min(d.deudaTotal, d.pagado+monto),
      historialPagos:[...(d.historialPagos||[]),{monto,fecha:Date.now()}]
    }:d);
    const nuevoMov = {descripcion:`Pago: ${deuda?.nombre||"Deuda"}`,monto,categoria:"💳 Deudas",id:Date.now(),tipo:"egreso",tarjetaId:null};
    const nuevosTodos = {...todos,[clave]:[nuevoMov,...(todos[clave]||[])]};
    setDeudas(nuevasDeudas);
    setTodos(nuevosTodos);
    guardarEnFirestore(nuevosTodos, nuevasDeudas);
  };

  // ALERTAS
  const alertas = useMemo(()=>{
    const arr = [];
    deudas.forEach(d=>{
      if (d.deudaTotal - d.pagado <= 0) return;
      if (!d.notificaciones) return;
      if (d.diaCorte > 0) {
        const dias = diasHasta(d.diaCorte);
        if (dias <= 3) arr.push({ deudaId:d.id, mensaje:`Corte ${dias===0?"hoy":dias===1?"mañana":`en ${dias} días`}`, urgente:dias<=1 });
      }
      if (d.diaPago > 0) {
        const dias = diasHasta(d.diaPago);
        if (dias <= 5) arr.push({ deudaId:d.id, mensaje:`Pago ${dias===0?"hoy":dias===1?"mañana":`en ${dias} días`} — Mín: ${formatMXN(d.pagoMinimo||0)}`, urgente:dias<=2 });
      }
      if (d.fechaLimitePago) {
        const limite = new Date(d.fechaLimitePago+"T23:59:59");
        const diffDias = Math.ceil((limite - new Date())/(1000*60*60*24));
        if (diffDias <= 5 && diffDias >= 0) arr.push({ deudaId:d.id, mensaje:`Fecha límite ${diffDias===0?"HOY":diffDias===1?"mañana":`en ${diffDias} días`}`, urgente:diffDias<=1 });
        if (diffDias < 0) arr.push({ deudaId:d.id, mensaje:`⚠️ Venció hace ${Math.abs(diffDias)} días`, urgente:true });
      }
    });
    return arr;
  },[deudas]);

  useEffect(()=>{
    if (alertas.filter(a=>a.urgente).length > 0 && notifStatus==="granted") {
      const urgentes = alertas.filter(a=>a.urgente);
      const nombres = [...new Set(urgentes.map(a=>deudas.find(d=>d.id===a.deudaId)?.nombre).filter(Boolean))];
      enviarNotificacion("Kash — Atención", `Alertas urgentes: ${nombres.join(", ")}`);
    }
  },[]);

  const habilitarNotificaciones = async () => {
    const result = await solicitarPermisoNotificaciones();
    setNotifStatus(result);
    if (result === "granted") enviarNotificacion("Kash","Notificaciones activadas 🎉");
  };

  const totalIngresos = useMemo(()=>movimientos.filter(m=>m.tipo==="ingreso").reduce((s,m)=>s+m.monto,0),[movimientos]);
  const totalEgresos = useMemo(()=>movimientos.filter(m=>m.tipo==="egreso").reduce((s,m)=>s+m.monto,0),[movimientos]);
  const balance = totalIngresos - totalEgresos;

  const totalDeudaRestante = useMemo(()=>deudas.reduce((s,d)=>s+Math.max(0,d.deudaTotal-d.pagado),0),[deudas]);
  const totalDeudaOriginal = useMemo(()=>deudas.reduce((s,d)=>s+(d.limiteCredito||d.deudaTotal),0),[deudas]);
  const deudasActivas = deudas.filter(d=>d.deudaTotal-d.pagado>0);
  const deudasLiquidadas = deudas.filter(d=>d.deudaTotal-d.pagado<=0);

  const pieData = useMemo(()=>{
    const cats={};
    movimientos.filter(m=>m.tipo==="egreso").forEach(m=>{cats[m.categoria]=(cats[m.categoria]||0)+m.monto;});
    const total=Object.values(cats).reduce((s,v)=>s+v,0);
    return Object.entries(cats).map(([name,value],i)=>({name,value,fill:PALETTE[i%PALETTE.length],pct:total?((value/total)*100).toFixed(1):0}));
  },[movimientos]);

  const resumenAnual = useMemo(()=>MESES.map((nombre,i)=>{
    const k=claveMes(mes.year,i);const movs=todos[k]||[];
    const ing=movs.filter(m=>m.tipo==="ingreso").reduce((s,m)=>s+m.monto,0);
    const egr=movs.filter(m=>m.tipo==="egreso").reduce((s,m)=>s+m.monto,0);
    return{nombre,i,ing,egr,bal:ing-egr,tiene:movs.length>0};
  }),[todos,mes.year]);

  const filtrados = movimientos.filter(m=>filtro==="todos"||m.tipo===filtro);
  const alertasUrgentes = alertas.filter(a=>a.urgente);

  // Pantalla de carga
  if (cargando) {
    return (
      <div style={{minHeight:"100dvh",background:C_BG,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans', sans-serif"}}>
        <GlobalStyles/>
        <div style={{textAlign:"center"}}>
          <h1 style={{fontFamily:"'Playfair Display', serif",fontSize:32,color:C_TEXT,margin:"0 0 10px"}}>Kash<span style={{color:C_INGRESO}}>.</span></h1>
          <p style={{color:C_MUTED,fontSize:14}}>Cargando tus datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:"100dvh",background:C_BG,color:C_TEXT,fontFamily:"'DM Sans', sans-serif",paddingBottom:60,overflowX:"hidden"}}>
      <GlobalStyles/>

      {/* HEADER */}
      <div style={{background:"#050505",borderBottom:`1px solid ${C_BORDER}`,padding:"clamp(12px,3vw,18px) clamp(12px,3vw,16px) clamp(10px,3vw,16px)"}}>
        <div style={{maxWidth:600,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,gap:8}}>
            <div style={{minWidth:0}}>
              <p style={{margin:0,fontSize:11,color:C_MUTED,letterSpacing:2,textTransform:"uppercase"}}>{userEmail}</p>
              <h1 style={{margin:0,fontFamily:"'Playfair Display', serif",fontSize:"clamp(18px,5vw,22px)",color:C_TEXT,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                Kash<span style={{color:C_INGRESO}}>.</span> <span style={{fontSize:"clamp(12px,3.5vw,15px)",fontWeight:400,color:C_MUTED}}>{MESES[mes.month]} {mes.year}</span>
              </h1>
            </div>
            <button onClick={onLogout} style={{...btnStyle,background:"transparent",color:C_MUTED,fontSize:11,padding:"7px 10px",border:"1px solid #333",flexShrink:0}}>Salir</button>
          </div>

          {alertasUrgentes.length>0&&vista!=="deudas"&&(
            <div onClick={()=>setVista("deudas")} style={{background:`${C_EGRESO}15`,border:`1px solid ${C_EGRESO}40`,borderRadius:10,padding:"8px 12px",marginBottom:10,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:14}}>🚨</span>
              <span style={{fontSize:12,color:C_EGRESO,fontWeight:500}}>Tienes {alertasUrgentes.length} alerta{alertasUrgentes.length>1?"s":""} urgente{alertasUrgentes.length>1?"s":""}</span>
            </div>
          )}

          <div style={{display:"flex",gap:4,marginBottom:12,background:"#111",borderRadius:10,padding:3}}>
            {[
              {key:"mes",label:"📅 Mes"},
              {key:"año",label:"📆 Año"},
              {key:"deudas",label:`💳 Deudas${deudasActivas.length>0?` (${deudasActivas.length})`:""}`},
            ].map(v=>(
              <button key={v.key} onClick={()=>setVista(v.key)}
                style={{...btnStyle,flex:1,fontSize:"clamp(10px,2.8vw,12px)",padding:"7px 4px",fontWeight:600,borderRadius:8,position:"relative",
                  background:vista===v.key?(v.key==="deudas"?C_DEUDA:C_INGRESO):"transparent",
                  color:vista===v.key?(v.key==="deudas"?"#000":"#fff"):C_MUTED}}>
                {v.label}
                {v.key==="deudas"&&alertasUrgentes.length>0&&vista!=="deudas"&&(
                  <span style={{position:"absolute",top:-2,right:-2,width:8,height:8,background:C_EGRESO,borderRadius:"50%",border:"2px solid #111"}} />
                )}
              </button>
            ))}
          </div>

          {vista!=="deudas"&&(
            <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:vista==="año"?0:12}}>
              <button onClick={()=>navMes(-1)} style={{...btnStyle,background:"#111",color:"#aaa",padding:"6px 10px",border:"1px solid #333",flexShrink:0,fontSize:16}}>‹</button>
              <div style={{display:"flex",gap:3,overflowX:"auto",scrollbarWidth:"none",flex:1,WebkitOverflowScrolling:"touch"}}>
                {MESES.map((nombre,i)=>{
                  const k=claveMes(mes.year,i);const tieneDatos=(todos[k]||[]).length>0;const sel=i===mes.month;
                  return(
                    <button key={i} onClick={()=>{setMes(p=>({...p,month:i}));setFiltro("todos");setVista("mes");}}
                      style={{...btnStyle,flexShrink:0,padding:"4px 6px",fontSize:"clamp(9px,2.5vw,10px)",lineHeight:1.4,minWidth:0,
                        background:sel?C_INGRESO:tieneDatos?"#111":"transparent",
                        color:sel?"#fff":tieneDatos?"#ccc":"#333",
                        border:sel?"none":`1px solid ${tieneDatos?"#333":"#1a1a1a"}`,fontWeight:sel?700:400}}>
                      {nombre.slice(0,3)}
                      {tieneDatos&&!sel&&<span style={{display:"block",width:3,height:3,background:C_INGRESO,borderRadius:"50%",margin:"2px auto 0"}} />}
                    </button>
                  );
                })}
              </div>
              <button onClick={()=>navMes(1)} style={{...btnStyle,background:"#111",color:"#aaa",padding:"6px 10px",border:"1px solid #333",flexShrink:0,fontSize:16}}>›</button>
            </div>
          )}

          {vista==="mes"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"clamp(4px,2vw,8px)"}}>
              {[
                {label:"Ingresos",value:totalIngresos,color:C_INGRESO,bg:`${C_INGRESO}15`,border:`${C_INGRESO}40`},
                {label:"Egresos",value:totalEgresos,color:C_EGRESO,bg:`${C_EGRESO}15`,border:`${C_EGRESO}40`},
                {label:"Balance",value:balance,color:balance>=0?"#fff":C_EGRESO,bg:balance>=0?"#ffffff10":`${C_EGRESO}15`,border:balance>=0?"#ffffff30":`${C_EGRESO}40`},
              ].map(k=>(
                <div key={k.label} style={{background:k.bg,border:`1px solid ${k.border}`,borderRadius:12,padding:"clamp(8px,2vw,10px) clamp(6px,2vw,8px)"}}>
                  <p style={{margin:"0 0 3px",fontSize:"clamp(8px,2.2vw,9px)",color:C_MUTED,textTransform:"uppercase",letterSpacing:1}}>{k.label}</p>
                  <p style={{margin:0,fontSize:"clamp(11px,3vw,13px)",fontWeight:700,color:k.color,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{formatMXN(k.value)}</p>
                </div>
              ))}
            </div>
          )}

          {vista==="deudas"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"clamp(4px,2vw,8px)"}}>
              <div style={{background:`${C_DEUDA}15`,border:`1px solid ${C_DEUDA}40`,borderRadius:12,padding:"clamp(8px,2vw,10px) clamp(6px,2vw,8px)"}}>
                <p style={{margin:"0 0 3px",fontSize:9,color:C_MUTED,textTransform:"uppercase",letterSpacing:1}}>Por Pagar</p>
                <p style={{margin:0,fontSize:"clamp(13px,3.5vw,16px)",fontWeight:700,color:C_DEUDA}}>{formatMXN(totalDeudaRestante)}</p>
              </div>
              <div style={{background:"#ffffff10",border:"1px solid #ffffff30",borderRadius:12,padding:"clamp(8px,2vw,10px) clamp(6px,2vw,8px)"}}>
                <p style={{margin:"0 0 3px",fontSize:9,color:C_MUTED,textTransform:"uppercase",letterSpacing:1}}>Activas</p>
                <p style={{margin:0,fontSize:"clamp(13px,3.5vw,16px)",fontWeight:700,color:"#fff"}}>{deudasActivas.length}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CONTENIDO */}
      <div style={{maxWidth:600,margin:"0 auto",padding:"0 clamp(12px,3vw,16px)"}}>

        {vista==="deudas"&&(
          <section style={{marginTop:20,paddingBottom:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
              <h2 style={sectionTitle}>💳 Mis Deudas y Tarjetas</h2>
              {notifStatus!=="granted"&&"Notification" in window&&(
                <button onClick={habilitarNotificaciones}
                  style={{...btnStyle,background:"#111",color:C_DEUDA,fontSize:11,padding:"6px 12px",border:`1px solid ${C_DEUDA}40`}}>
                  🔔 Activar Avisos
                </button>
              )}
            </div>
            <button onClick={()=>{setDeudaEditar(null);setModalDeuda(true);}}
              style={{...btnStyle,width:"100%",background:`${C_DEUDA}15`,border:`1.5px dashed ${C_DEUDA}60`,color:C_DEUDA,padding:14,fontSize:14,fontWeight:600,marginBottom:14}}>
              ＋ Agregar Tarjeta o Deuda
            </button>
            {deudas.length>0&&totalDeudaRestante>0&&(
              <div style={{background:C_SURFACE,border:`1px solid ${C_BORDER}`,borderRadius:14,padding:"clamp(10px,3vw,14px) clamp(12px,3vw,16px)",marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
                  <span style={{fontSize:12,color:C_MUTED}}>Progreso total</span>
                  <span style={{fontSize:12,fontWeight:700,color:C_DEUDA}}>
                    {totalDeudaOriginal>0?((1-totalDeudaRestante/totalDeudaOriginal)*100).toFixed(1):0}%
                  </span>
                </div>
                <div style={{background:"#1a1a1a",borderRadius:99,height:8,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${totalDeudaOriginal>0?((1-totalDeudaRestante/totalDeudaOriginal)*100):0}%`,
                    background:`linear-gradient(90deg,${C_DEUDA},${C_OK})`,borderRadius:99,transition:"width 0.5s ease"}} />
                </div>
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {deudasActivas.length===0&&deudasLiquidadas.length===0&&(
                <div style={{background:C_SURFACE,border:`1px dashed ${C_BORDER}`,borderRadius:16,padding:"28px 20px",textAlign:"center"}}>
                  <p style={{margin:0,fontSize:28}}>💳</p>
                  <p style={{margin:"8px 0 0",color:"#444",fontSize:13}}>Agrega tus tarjetas y préstamos</p>
                </div>
              )}
              {deudasActivas.map(d=>(
                <DeudaCard key={d.id} deuda={d} alertas={alertas}
                  onPago={()=>setModalPago(d)}
                  onEdit={()=>{setDeudaEditar(d);setModalDeuda(true);}}
                  onDelete={()=>eliminarDeuda(d.id)}
                  onDetalle={()=>setModalDetalle(d)} />
              ))}
            </div>
            {deudasLiquidadas.length>0&&(
              <>
                <h3 style={{fontSize:13,color:C_OK,margin:"20px 0 10px",fontWeight:600}}>✓ Liquidadas ({deudasLiquidadas.length})</h3>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {deudasLiquidadas.map(d=>(
                    <DeudaCard key={d.id} deuda={d} alertas={alertas}
                      onPago={()=>{}} onEdit={()=>{setDeudaEditar(d);setModalDeuda(true);}}
                      onDelete={()=>eliminarDeuda(d.id)} onDetalle={()=>setModalDetalle(d)} />
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {vista==="año"&&(
          <section style={{marginTop:20}}>
            <h2 style={sectionTitle}>Resumen {mes.year}</h2>
            {resumenAnual.map(({nombre,i,ing,egr,bal,tiene})=>(
              <div key={i} onClick={()=>{setMes(p=>({...p,month:i}));setVista("mes");}}
                style={{background:i===mes.month?"#0d1117":C_SURFACE,border:`1px solid ${i===mes.month?C_INGRESO+"60":C_BORDER}`,borderRadius:12,
                  padding:"clamp(10px,3vw,13px) clamp(12px,3vw,14px)",marginBottom:7,cursor:"pointer",opacity:tiene?1:0.35}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:tiene?7:0}}>
                  <span style={{fontWeight:600,fontSize:14,color:i===mes.month?C_INGRESO:"#ccc"}}>{nombre}</span>
                  {tiene?<span style={{fontSize:13,fontWeight:700,color:bal>=0?"#fff":C_EGRESO}}>{formatMXN(bal)}</span>
                    :<span style={{fontSize:12,color:"#333"}}>Sin datos</span>}
                </div>
                {tiene&&(
                  <div style={{display:"flex",gap:12}}>
                    <span style={{fontSize:12,color:C_INGRESO}}>↑ {formatMXN(ing)}</span>
                    <span style={{fontSize:12,color:C_EGRESO}}>↓ {formatMXN(egr)}</span>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {vista==="mes"&&(
          <>
            {pieData.length>0?(
              <section style={{marginTop:20}}>
                <h2 style={sectionTitle}>📊 Distribución de Egresos</h2>
                <div style={{background:C_SURFACE,border:`1px solid ${C_BORDER}`,borderRadius:16,padding:"12px 4px"}}>
                  <ResponsiveContainer width="100%" height={230}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={88} paddingAngle={3} dataKey="value">
                        {pieData.map((entry,i)=><Cell key={i} fill={entry.fill} stroke="transparent" />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip/>} />
                      <Legend iconType="circle" iconSize={7} formatter={(v)=><span style={{color:"#aaa",fontSize:10}}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </section>
            ):(
              <div style={{marginTop:20,background:C_SURFACE,border:`1px dashed ${C_BORDER}`,borderRadius:16,padding:"28px 20px",textAlign:"center"}}>
                <p style={{margin:0,fontSize:28}}>📭</p>
                <p style={{margin:"8px 0 0",color:"#444",fontSize:13}}>Sin movimientos en {MESES[mes.month]}</p>
              </div>
            )}

            {totalIngresos>0&&(
              <div style={{marginTop:10,background:C_SURFACE,border:`1px solid ${C_BORDER}`,borderRadius:14,padding:"clamp(10px,3vw,12px) clamp(12px,3vw,16px)"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
                  <span style={{fontSize:12,color:C_MUTED}}>Capacidad de ahorro</span>
                  <span style={{fontSize:12,fontWeight:700,color:balance>=0?C_INGRESO:C_EGRESO}}>{((balance/totalIngresos)*100).toFixed(1)}%</span>
                </div>
                <div style={{background:"#1a1a1a",borderRadius:99,height:6,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${Math.max(0,Math.min(100,(balance/totalIngresos)*100))}%`,
                    background:balance>=0?`linear-gradient(90deg,${C_INGRESO},#60a5fa)`:C_EGRESO,borderRadius:99,transition:"width 0.5s ease"}} />
                </div>
              </div>
            )}

            {deudasActivas.length>0&&(
              <div onClick={()=>setVista("deudas")} style={{marginTop:10,background:`${C_DEUDA}08`,border:`1px solid ${C_DEUDA}30`,borderRadius:14,
                padding:"clamp(10px,3vw,12px) clamp(12px,3vw,16px)",cursor:"pointer"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:12,color:C_MUTED}}>💳 Deudas activas: <span style={{color:C_DEUDA,fontWeight:700}}>{deudasActivas.length}</span></span>
                  <span style={{fontSize:13,fontWeight:700,color:C_DEUDA}}>{formatMXN(totalDeudaRestante)}</span>
                </div>
              </div>
            )}

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"clamp(6px,2vw,10px)",marginTop:16}}>
              <button onClick={()=>setModal("ingreso")} style={{...btnStyle,background:`${C_INGRESO}15`,border:`1.5px solid ${C_INGRESO}`,color:C_INGRESO,padding:"13px",fontSize:14,fontWeight:600}}>＋ Ingreso</button>
              <button onClick={()=>setModal("egreso")} style={{...btnStyle,background:`${C_EGRESO}15`,border:`1.5px solid ${C_EGRESO}`,color:C_EGRESO,padding:"13px",fontSize:14,fontWeight:600}}>＋ Egreso</button>
            </div>

            <section style={{marginTop:20,paddingBottom:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:6}}>
                <h2 style={{...sectionTitle,margin:0}}>📋 Movimientos</h2>
                <div style={{display:"flex",gap:4}}>
                  {["todos","ingreso","egreso"].map(f=>{
                    const sel=filtro===f;
                    const color=f==="ingreso"?C_INGRESO:f==="egreso"?C_EGRESO:"#fff";
                    return(
                      <button key={f} onClick={()=>setFiltro(f)}
                        style={{...btnStyle,padding:"4px 9px",fontSize:10,background:sel?color:"#111",color:sel?"#fff":C_MUTED,fontWeight:sel?700:400,border:sel?"none":"1px solid #333"}}>
                        {f==="todos"?"Todos":f==="ingreso"?"Ingresos":"Egresos"}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {filtrados.length===0&&<p style={{color:"#444",textAlign:"center",padding:"20px 0",fontSize:13}}>Sin movimientos aún</p>}
                {filtrados.map(m=>{
                  const tarjeta = m.tarjetaId ? deudas.find(d=>String(d.id)===String(m.tarjetaId)) : null;
                  return(
                    <div key={m.id} style={{background:C_SURFACE,border:`1px solid ${m.tipo==="ingreso"?C_INGRESO+"30":C_EGRESO+"30"}`,borderRadius:12,
                      padding:"clamp(9px,2.5vw,11px) clamp(10px,3vw,13px)",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                      <div style={{minWidth:0,flex:1}}>
                        <div style={{fontWeight:500,fontSize:14,color:C_TEXT,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.descripcion}</div>
                        <div style={{fontSize:11,color:C_MUTED,display:"flex",gap:6,flexWrap:"wrap"}}>
                          <span>{m.categoria}</span>
                          {tarjeta&&<span style={{color:C_DEUDA}}>💳 {tarjeta.nombre}</span>}
                        </div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                        <span style={{fontWeight:700,fontSize:"clamp(12px,3vw,14px)",color:m.tipo==="ingreso"?C_INGRESO:C_EGRESO}}>
                          {m.tipo==="ingreso"?"+":"-"}{formatMXN(m.monto)}
                        </span>
                        <button onClick={()=>eliminar(m.id)}
                          style={{background:"transparent",border:"none",color:"#444",cursor:"pointer",fontSize:15,padding:2}}
                          onMouseEnter={e=>e.target.style.color=C_EGRESO} onMouseLeave={e=>e.target.style.color="#444"}>✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>

      {modal&&<Modal tipo={modal} onClose={()=>setModal(null)} onSave={agregar} deudas={deudas} />}
      {modalDeuda&&<ModalDeuda deudaEditar={deudaEditar} onClose={()=>{setModalDeuda(false);setDeudaEditar(null);}} onSave={agregarDeuda} />}
      {modalPago&&<ModalPago deuda={modalPago} onClose={()=>setModalPago(null)} onSave={(monto)=>{registrarPago(modalPago.id,monto);setModalPago(null);}} />}
      {modalDetalle&&<ModalDetalleTarjeta deuda={modalDetalle} movimientos={todosMovimientos} onClose={()=>setModalDetalle(null)} />}
    </div>
  );
}

// ==================== ROOT ====================
export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [verificando, setVerificando] = useState(true);

  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setVerificando(false);
    });
    return () => unsub();
  },[]);

  const handleLogout = async () => {
    await signOut(auth);
    setUsuario(null);
  };

  if (verificando) {
    return (
      <div style={{minHeight:"100dvh",background:"#000",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans', sans-serif"}}>
        <GlobalStyles/>
        <div style={{textAlign:"center"}}>
          <h1 style={{fontFamily:"'Playfair Display', serif",fontSize:32,color:"#fff",margin:"0 0 10px"}}>Kash<span style={{color:"#3b82f6"}}>.</span></h1>
          <p style={{color:"#666",fontSize:14}}>Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return usuario
    ? <FinanzasApp usuario={usuario} onLogout={handleLogout}/>
    : <LoginScreen/>;
}