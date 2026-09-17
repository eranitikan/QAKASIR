import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Barcode,
  Bell,
  Box,
  Camera,
  Check,
  ChevronDown,
  Download,
  LogOut,
  Menu,
  PackagePlus,
  Plus,
  Printer,
  QrCode,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Signal,
  Store,
  Users,
  WalletCards,
  X,
} from 'lucide-react'
import QRCode from 'qrcode'
import './styles.css'

const STORAGE_KEY = 'kasir-toko-mobile-v1'
const money = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0)
const todayKey = () => new Date().toISOString().slice(0, 10)
const nowLabel = () => new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
const uid = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
const safeParse = (value, fallback) => {
  try { return value ? JSON.parse(value) : fallback } catch { return fallback }
}
const storage = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
  },
}

const seedProducts = [
  { id: 'p1', barcode: '8991234500017', name: 'Kopi Susu Gula Aren', category: 'Minuman', price: 18000, stock: 24, minStock: 8, sku: 'KOP-001' },
  { id: 'p2', barcode: '8991234500024', name: 'Teh Tarik Original', category: 'Minuman', price: 15000, stock: 18, minStock: 6, sku: 'TEH-001' },
  { id: 'p3', barcode: '8991234500031', name: 'Roti Bakar Coklat', category: 'Makanan', price: 22000, stock: 12, minStock: 5, sku: 'ROT-001' },
  { id: 'p4', barcode: '8991234500048', name: 'Nasi Goreng Spesial', category: 'Makanan', price: 28000, stock: 9, minStock: 4, sku: 'NAS-001' },
  { id: 'p5', barcode: '8991234500055', name: 'Air Mineral 600ml', category: 'Minuman', price: 5000, stock: 40, minStock: 12, sku: 'AIR-001' },
  { id: 'p6', barcode: '8991234500062', name: 'Kentang Goreng', category: 'Snack', price: 16000, stock: 15, minStock: 5, sku: 'KEN-001' },
  { id: 'p7', barcode: '8991234500079', name: 'Pisang Keju', category: 'Snack', price: 14000, stock: 10, minStock: 4, sku: 'PIS-001' },
  { id: 'p8', barcode: '8991234500086', name: 'Mie Goreng Jawa', category: 'Makanan', price: 25000, stock: 7, minStock: 4, sku: 'MIE-001' },
]

const seedCustomers = [
  { id: 'c1', name: 'Ahmad Fauzi', phone: '081234567890', points: 1250, joined: '2025-01-12' },
  { id: 'c2', name: 'Siti Nurhaliza', phone: '081298765432', points: 840, joined: '2025-02-03' },
  { id: 'c3', name: 'Budi Santoso', phone: '081345678901', points: 320, joined: '2025-03-18' },
]

const seedUsers = [
  { id: 'u-admin', name: 'Admin Toko', role: 'admin', pin: '1234' },
  { id: 'u-kasir', name: 'Kasir Pagi', role: 'kasir', pin: '1234' },
  { id: 'u-inventory', name: 'Tim Stok', role: 'inventory', pin: '1234' },
]

const initialData = () => ({
  products: seedProducts,
  customers: seedCustomers,
  users: seedUsers,
  transactions: [],
  inventoryLogs: [],
  accessLogs: [{ id: uid('log'), time: nowLabel(), userId: 'u-admin', userName: 'Admin Toko', role: 'admin', action: 'Login pertama kali' }],
  syncQueue: [],
  settings: { storeName: 'Toko Sejahtera', taxRate: 0, lowStock: 8, pointsPerRp: 10000, pointValue: 100 },
})

const navItems = [
  { key: 'dashboard', label: 'Ringkas', icon: Store },
  { key: 'pos', label: 'Kasir', icon: ShoppingCart },
  { key: 'inventory', label: 'Stok', icon: Box },
  { key: 'customers', label: 'Pelanggan', icon: Users },
  { key: 'reports', label: 'Laporan', icon: Receipt },
  { key: 'settings', label: 'Akun', icon: Settings },
]

function App() {
  const [data, setData] = useState(() => storage.get(STORAGE_KEY, initialData()))
  const [user, setUser] = useState(() => storage.get('kasir-session', null))
  const [route, setRoute] = useState(user ? 'dashboard' : 'login')
  const [online, setOnline] = useState(navigator.onLine)
  const [toast, setToast] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [mobileMenu, setMobileMenu] = useState(false)

  useEffect(() => { storage.set(STORAGE_KEY, data) }, [data])
  useEffect(() => {
    const onOnline = () => { setOnline(true); notify('Koneksi kembali online. Antrean siap disinkronkan.') }
    const onOffline = () => { setOnline(false); notify('Mode offline aktif. Transaksi tetap bisa disimpan.') }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [])
  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  function notify(message, type = 'success') { setToast({ message, type, id: uid('toast') }) }
  function log(action) {
    const entry = { id: uid('log'), time: nowLabel(), userId: user?.id || '-', userName: user?.name || 'Sistem', role: user?.role || 'system', action }
    setData((current) => ({ ...current, accessLogs: [entry, ...current.accessLogs].slice(0, 300) }))
  }
  function login(selectedUser) {
    setUser(selectedUser)
    storage.set('kasir-session', selectedUser)
    setData((current) => ({ ...current, accessLogs: [{ id: uid('log'), time: nowLabel(), userId: selectedUser.id, userName: selectedUser.name, role: selectedUser.role, action: `Login sebagai ${selectedUser.role}` }, ...current.accessLogs] }))
    setRoute('dashboard')
    notify(`Selamat datang, ${selectedUser.name}`)
  }
  function logout() {
    log('Logout')
    setUser(null)
    storage.set('kasir-session', null)
    setRoute('login')
  }
  function updateData(patch) { setData((current) => ({ ...current, ...patch })) }
  function syncNow() {
    if (!data.syncQueue.length) return notify('Tidak ada data yang perlu disinkronkan.', 'info')
    const syncedAt = nowLabel()
    setData((current) => ({ ...current, syncQueue: [], accessLogs: [{ id: uid('log'), time: syncedAt, userId: user?.id || '-', userName: user?.name || 'Sistem', role: user?.role || 'system', action: `Sinkronisasi ${current.syncQueue.length} transaksi ke server lokal` }, ...current.accessLogs] }))
    notify(`Sinkronisasi selesai: ${data.syncQueue.length} transaksi tercatat.`)
  }
  function can(role) { return !user || user.role === 'admin' || user.role === role }
  function exportCsv(filename, rows, headers) {
    const escape = (value) => `"${String(value ?? '').toString().replaceAll('"', '""')}"`
    const csv = [headers.map((h) => escape(h.label)).join(','), ...rows.map((row) => headers.map((h) => escape(row[h.key])).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
    notify('File CSV berhasil diunduh.')
  }
  function printArea() { window.print() }

  if (!user) return <LoginScreen onLogin={login} data={data} />
  const visibleNav = navItems.filter((item) => item.key !== 'inventory' || user.role !== 'kasir')
  const stats = useMemo(() => {
    const todays = data.transactions.filter((trx) => trx.date === todayKey())
    const revenue = todays.reduce((sum, trx) => sum + trx.grandTotal, 0)
    const lowStock = data.products.filter((product) => product.stock <= product.minStock).length
    return { revenue, count: todays.length, lowStock, customers: data.customers.length }
  }, [data])

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="icon-button menu-button" onClick={() => setMobileMenu((value) => !value)} aria-label="Buka menu"><Menu size={20} /></button>
        <div className="brand"><span className="brand-mark"><Store size={20} /></span><div><strong>{data.settings.storeName}</strong><small>Kasir mobile offline</small></div></div>
        <div className="topbar-actions">
          <span className={`connection ${online ? 'online' : 'offline'}`}><Signal size={14} />{online ? 'Online' : 'Offline'}</span>
          {data.syncQueue.length > 0 && <span className="sync-pill"><RefreshCw size={13} />{data.syncQueue.length} antre</span>}
          <button className="icon-button" onClick={() => notify('Tidak ada notifikasi baru.', 'info')} aria-label="Notifikasi"><Bell size={19} /></button>
          <button className="user-chip" onClick={logout}><span className="avatar">{user.name.slice(0, 1)}</span><span className="user-chip-copy"><strong>{user.name}</strong><small>{user.role}</small></span><LogOut size={16} /></button>
        </div>
      </header>
      <div className="layout">
        <aside className={`sidebar ${mobileMenu ? 'open' : ''}`}>
          <div className="sidebar-title">MENU UTAMA</div>
          {visibleNav.map((item) => {
            const Icon = item.icon
            return <button key={item.key} className={`nav-item ${route === item.key ? 'active' : ''}`} onClick={() => { setRoute(item.key); setMobileMenu(false) }}><Icon size={18} />{item.label}</button>
          })}
          <div className="sidebar-note"><span className="status-dot" />Data tersimpan di perangkat ini</div>
          <div className="sidebar-help"><strong>Butuh bantuan?</strong><span>Gunakan menu Laporan untuk melihat rekap bisnis.</span></div>
        </aside>
        {mobileMenu && <button className="sidebar-scrim" onClick={() => setMobileMenu(false)} aria-label="Tutup menu" />}
        <main className="content">
          {route === 'dashboard' && <Dashboard data={data} onNavigate={setRoute} onPrint={printArea} onExport={(type) => exportCsv(`laporan-${type}-${todayKey()}.csv`, type === 'transactions' ? data.transactions.map((trx) => ({ date: trx.date, id: trx.id, customer: trx.customerName || 'Umum', total: trx.grandTotal, payment: trx.paymentMethod })) : data.products.map((product) => ({ name: product.name, sku: product.sku, price: product.price, stock: product.stock })), type === 'transactions' ? [{ key: 'date', label: 'Tanggal' }, { key: 'id', label: 'ID' }, { key: 'customer', label: 'Pelanggan' }, { key: 'total', label: 'Total' }, { key: 'payment', label: 'Pembayaran' }] : [{ key: 'name', label: 'Produk' }, { key: 'sku', label: 'SKU' }, { key: 'price', label: 'Harga' }, { key: 'stock', label: 'Stok' }])} />}
          {route === 'pos' && <Pos data={data} updateData={updateData} notify={notify} log={log} onReceipt={setReceipt} />}
          {route === 'inventory' && <Inventory data={data} user={user} updateData={updateData} notify={notify} log={log} exportCsv={exportCsv} />}
          {route === 'customers' && <Customers data={data} updateData={updateData} notify={notify} log={log} />}
          {route === 'reports' && <Reports data={data} exportCsv={exportCsv} onPrint={printArea} />}
          {route === 'settings' && <SettingsPage data={data} updateData={updateData} notify={notify} log={log} onLogin={login} />}
        </main>
      </div>
      <nav className="bottom-nav">
        {visibleNav.map((item) => { const Icon = item.icon; return <button key={item.key} className={route === item.key ? 'active' : ''} onClick={() => setRoute(item.key)}><Icon size={19} />{item.label}</button> })}
      </nav>
      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} onPrint={printArea} />}
      {toast && <div className={`toast ${toast.type}`}><Check size={17} />{toast.message}</div>}
    </div>
  )
}

function LoginScreen({ onLogin, data }) {
  const [selected, setSelected] = useState(data.users[0]?.id || '')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    const found = data.users.find((item) => item.id === selected)
    if (!found || found.pin !== pin) { setError('PIN belum sesuai. Coba PIN 1234 untuk demo.'); return }
    setError('')
    onLogin(found)
  }
  return <div className="login-page"><div className="login-card"><div className="login-illustration"><Store size={34} /></div><h1>Kasir Toko Mobile</h1><p>Masuk untuk mengelola kasir, stok, pelanggan, dan laporan.</p><form onSubmit={submit}><label>Pengguna<select value={selected} onChange={(event) => setSelected(event.target.value)}>{data.users.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.role}</option>)}</select></label><label>PIN<input inputMode="numeric" type="password" value={pin} onChange={(event) => setPin(event.target.value)} placeholder="Masukkan PIN" /></label>{error && <div className="form-error">{error}</div>}<button className="primary-button full" type="submit">Masuk ke aplikasi <ChevronDown size={16} className="rotate-left" /></button></form><div className="demo-note"><strong>AKUN DEMO</strong><span>Admin / kasir / inventory</span><span>PIN: 1234</span></div></div><div className="login-side"><div className="side-copy"><span className="eyebrow">OFFLINE-FIRST POINT OF SALE</span><h2>Jualan tetap jalan,<br />walaupun internet putus.</h2><p>Checkout, stok, pelanggan, dan laporan tersimpan aman di perangkat. Saat online, antrean transaksi siap disinkronkan.</p><div className="side-stats"><div><strong>100%</strong><span>transaksi offline</span></div><div><strong>3</strong><span>role pengguna</span></div><div><strong>24/7</strong><span>akses kasir</span></div></div></div></div></div>
}

function Dashboard({ data, onNavigate, onPrint, onExport }) {
  const todays = data.transactions.filter((trx) => trx.date === todayKey())
  const revenue = todays.reduce((sum, trx) => sum + trx.grandTotal, 0)
  const lowStock = data.products.filter((product) => product.stock <= product.minStock)
  const topProducts = Object.entries(data.products.reduce((acc, product) => {
    data.transactions.forEach((trx) => trx.items.forEach((item) => { if (item.productId === product.id) acc[product.id] = (acc[product.id] || 0) + item.qty }))
    return acc
  }, {})).map(([id, qty]) => ({ ...data.products.find((product) => product.id === id), qty })).sort((a, b) => b.qty - a.qty).slice(0, 5)
  const maxQty = Math.max(1, ...topProducts.map((product) => product.qty))
  return <div className="page"><PageHeading title="Ringkasan bisnis" description={`Pantau penjualan, stok, dan aktivitas hari ini. ${data.syncQueue.length ? `${data.syncQueue.length} transaksi menunggu sinkronisasi.` : 'Semua data sudah tercatat.'}`} /><div className="stat-grid"><StatCard label="Penjualan hari ini" value={money(revenue)} detail={`${todays.length} transaksi`} tone="blue" /><StatCard label="Pelanggan aktif" value={data.customers.length} detail="Terdaftar" tone="green" /><StatCard label="Stok menipis" value={lowStock.length} detail="Perlu diperhatikan" tone="amber" /><StatCard label="Antrean sync" value={data.syncQueue.length} detail={navigator.onLine ? 'Siap dikirim' : 'Mode offline'} tone="purple" /></div><div className="dashboard-grid"><section className="panel"><PanelHeading title="Produk terlaris" action={<button className="text-button" onClick={() => onNavigate('reports')}>Lihat laporan</button>} /><div className="top-list">{topProducts.length ? topProducts.map((product) => <div className="top-row" key={product.id}><span className="rank">{product.id === topProducts[0]?.id ? '★' : product.qty}</span><div><strong>{product.name}</strong><small>{product.qty} terjual</small></div><div className="bar"><span style={{ width: `${Math.max(8, product.qty / maxQty * 100)}%` }} /></div></div>) : <EmptyState title="Belum ada penjualan" description="Mulai transaksi dari menu Kasir." />}</div></section><section className="panel"><PanelHeading title="Stok rendah" action={<button className="text-button" onClick={() => onNavigate('inventory')}>Kelola stok</button>} /><div className="stock-list">{lowStock.length ? lowStock.slice(0, 5).map((product) => <div className="stock-row" key={product.id}><Box size={17} /><div><strong>{product.name}</strong><small>Sisa {product.stock} dari minimum {product.minStock}</small></div><span className={`stock-badge ${product.stock === 0 ? 'danger' : ''}`}>{product.stock === 0 ? 'Habis' : 'Rendah'}</span></div>) : <EmptyState title="Stok aman" description="Belum ada produk yang melewati batas minimum." />}</div></section></div><section className="panel recent-panel"><PanelHeading title="Transaksi terbaru" action={<button className="text-button" onClick={() => onExport('transactions')}>Export CSV</button>} /><div className="table-wrap"><table><thead><tr><th>ID transaksi</th><th>Tanggal</th><th>Pelanggan</th><th>Pembayaran</th><th>Total</th></tr></thead><tbody>{data.transactions.slice(0, 6).map((trx) => <tr key={trx.id}><td className="mono">{trx.id.slice(-8)}</td><td>{new Date(trx.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td><td>{trx.customerName || 'Pelanggan umum'}</td><td><span className="payment-tag">{trx.paymentMethod}</span></td><td><strong>{money(trx.grandTotal)}</strong></td></tr>)}</tbody></table>{!data.transactions.length && <EmptyState title="Belum ada transaksi" description="Transaksi pertama akan muncul di sini." />}</div></section></div>
}

function Pos({ data, updateData, notify, log, onReceipt }) {
  const [query, setQuery] = useState('')
  const [barcode, setBarcode] = useState('')
  const [cart, setCart] = useState([])
  const [customerId, setCustomerId] = useState('')
  const [discount, setDiscount] = useState('')
  const [taxEnabled, setTaxEnabled] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('Tunai')
  const [cashReceived, setCashReceived] = useState('')
  const [scanning, setScanning] = useState(false)
  const [redeemPoints, setRedeemPoints] = useState('')
  const customer = data.customers.find((item) => item.id === customerId)
  const filtered = data.products.filter((product) => `${product.name} ${product.sku} ${product.barcode} ${product.category}`.toLowerCase().includes(query.toLowerCase()))
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const discountValue = Number(discount) || 0
  const pointsRedeemed = Math.min(customer?.points || 0, Number(redeemPoints) || 0)
  const pointsDiscount = pointsRedeemed * data.settings.pointValue
  const tax = taxEnabled ? Math.max(0, (subtotal - discountValue - pointsDiscount) * (data.settings.taxRate / 100)) : 0
  const total = Math.max(0, subtotal - discountValue - pointsDiscount + tax)
  const change = paymentMethod === 'Tunai' ? Math.max(0, Number(cashReceived) - total) : 0
  function addToCart(product) {
    if (product.stock <= 0) return notify('Stok produk habis.', 'error')
    setCart((current) => {
      const found = current.find((item) => item.productId === product.id)
      const nextQty = (found?.qty || 0) + 1
      if (nextQty > product.stock) { notify(`Stok ${product.name} hanya tersisa ${product.stock}.`, 'error'); return current }
      return found ? current.map((item) => item.productId === product.id ? { ...item, qty: nextQty } : item) : [...current, { productId: product.id, name: product.name, price: product.price, qty: 1 }]
    })
  }
  function scanBarcode(value) {
    const product = data.products.find((item) => item.barcode === value || item.sku === value)
    if (product) { addToCart(product); setBarcode(''); notify(`${product.name} ditambahkan.`) } else notify('Barcode tidak ditemukan. Cek kode produk.', 'error')
  }
  async function startScanner() {
    if (!navigator.mediaDevices?.getUserMedia) return notify('Scanner kamera tidak didukung browser ini. Gunakan input manual.', 'error')
    try {
      setScanning(true)
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      const video = document.createElement('video')
      video.srcObject = stream
      await video.play()
      notify('Hadapkan barcode ke kamera. Tutup panel jika sudah terbaca.', 'info')
      const BarcodeDetectorClass = window.BarcodeDetector
      if (!BarcodeDetectorClass) { notify('BarcodeDetector tidak tersedia. Gunakan input manual.', 'info'); stream.getTracks().forEach((track) => track.stop()); setScanning(false); return }
      const detector = new BarcodeDetectorClass({ formats: ['ean_13', 'code_128', 'qr_code'] })
      const detect = () => { if (!scanning) return; detector.detect(video).then((result) => { if (result[0]?.rawValue) { stream.getTracks().forEach((track) => track.stop()); setScanning(false); scanBarcode(result[0].rawValue) } else window.setTimeout(detect, 250) }).catch(() => { stream.getTracks().forEach((track) => track.stop()); setScanning(false) }) }
      detect()
    } catch { setScanning(false); notify('Kamera tidak dapat diakses. Gunakan input manual.', 'error') }
  }
  function checkout() {
    if (!cart.length) return notify('Keranjang masih kosong.', 'error')
    if (paymentMethod === 'Tunai' && Number(cashReceived) < total) return notify('Uang pembayaran belum cukup.', 'error')
    const transaction = { id: uid('TRX'), date: todayKey(), createdAt: new Date().toISOString(), items: cart.map((item) => ({ ...item })), subtotal, discount: discountValue, pointsRedeemed, pointsDiscount, tax, grandTotal: total, paymentMethod, cashReceived: paymentMethod === 'Tunai' ? Number(cashReceived) : total, change, customerName: customer?.name || '', customerId: customer?.id || '', pointsEarned: customer ? Math.floor(total / data.settings.pointsPerRp) : 0, cashier: data.users[0]?.name || 'Kasir' }
    const updatedProducts = data.products.map((product) => { const sold = cart.find((item) => item.productId === product.id); return sold ? { ...product, stock: Math.max(0, product.stock - sold.qty) } : product })
    const updatedCustomers = data.customers.map((item) => item.id === customer?.id ? { ...item, points: Math.max(0, item.points - pointsRedeemed + transaction.pointsEarned) } : item)
    const queueEntry = { id: uid('sync'), type: 'transaction', payload: transaction, createdAt: transaction.createdAt, status: 'menunggu' }
    const stockLogs = cart.map((item) => ({ id: uid('stock'), time: nowLabel(), productId: item.productId, productName: item.name, type: 'Penjualan', qty: -item.qty, userId: 'u-kasir' }))
    updateData({ products: updatedProducts, customers: updatedCustomers, transactions: [transaction, ...data.transactions], inventoryLogs: [...stockLogs, ...data.inventoryLogs].slice(0, 500), syncQueue: [...data.syncQueue, queueEntry] })
    log(`Checkout ${transaction.id} sebesar ${money(total)} secara ${navigator.onLine ? 'online' : 'offline'}`)
    setCart([]); setDiscount(''); setCashReceived(''); setRedeemPoints(''); setCustomerId(''); setTaxEnabled(false)
    onReceipt(transaction)
    notify(navigator.onLine ? 'Transaksi tersimpan dan masuk antrean sinkronisasi.' : 'Transaksi offline tersimpan. Akan disinkronkan saat online.')
  }
  return <div className="page pos-page"><div className="pos-intro"><div><PageHeading title="Kasir cepat" description="Scan barcode, pilih produk, dan proses pembayaran dalam beberapa ketukan." /></div><button className={`scanner-button ${scanning ? 'active' : ''}`} onClick={startScanner}><Camera size={18} />{scanning ? 'Memindai...' : 'Scan barcode'}</button></div><div className="pos-grid"><section className="panel product-panel"><div className="search-row"><label className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari produk, SKU, atau kategori" /></label><label className="barcode-box"><Barcode size={18} /><input value={barcode} onChange={(event) => setBarcode(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { scanBarcode(event.target.value); event.target.value = '' } }} placeholder="Input barcode" /></label></div><div className="category-pills"><button className="active">Semua</button>{['Makanan', 'Minuman', 'Snack'].map((category) => <button key={category} onClick={() => setQuery(category)}>{category}</button>)}</div><div className="product-grid">{filtered.map((product) => <button className="product-card" key={product.id} onClick={() => addToCart(product)}><span className={`product-thumb ${product.stock <= product.minStock ? 'low' : ''}`}>{product.stock <= product.minStock ? <Box size={22} /> : <ShoppingBag size={22} />}</span><strong>{product.name}</strong><small>{product.sku}</small><span>{money(product.price)}</span>{product.stock <= product.minStock && <em>Stok rendah</em>}</button>)}</div>{!filtered.length && <EmptyState title="Produk tidak ditemukan" description="Coba kode atau nama produk lain." />}</section><section className="panel cart-panel"><div className="cart-head"><div><h2>Keranjang</h2><span>{cart.reduce((sum, item) => sum + item.qty, 0)} item</span></div><button className="icon-button" onClick={() => setCart([])} aria-label="Kosongkan keranjang"><X size={17} /></button></div><div className="cart-items">{cart.length ? cart.map((item) => { const product = data.products.find((entry) => entry.id === item.productId); return <div className="cart-item" key={item.productId}><div><strong>{item.name}</strong><small>{money(item.price)} / pcs</small></div><div className="qty-control"><button onClick={() => setCart((current) => current.map((entry) => entry.productId === item.productId ? { ...entry, qty: Math.max(1, entry.qty - 1) } : entry))}>−</button><span>{item.qty}</span><button onClick={() => { if ((product?.stock || 0) > item.qty) setCart((current) => current.map((entry) => entry.productId === item.productId ? { ...entry, qty: entry.qty + 1 } : entry)); else notify('Stok tidak mencukupi.', 'error') }}>+</button></div><strong>{money(item.price * item.qty)}</strong><button className="remove-item" onClick={() => setCart((current) => current.filter((entry) => entry.productId !== item.productId))}><X size={15} /></button></div> }) : <EmptyState title="Keranjang kosong" description="Pilih produk untuk memulai transaksi." />}</div><div className="customer-select"><label>Pelanggan (opsional)<select value={customerId} onChange={(event) => { setCustomerId(event.target.value); setRedeemPoints('') }}><option value="">Pelanggan umum</option>{data.customers.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.points} poin</option>)}</select></label>{customer && <div className="points-box"><QrCode size={17} /><span><strong>{customer.points} poin tersedia</strong><small>1 poin = {money(data.settings.pointValue)}</small></span></div>}</div><div className="discount-row"><label>Diskon Rp<input value={discount} inputMode="numeric" onChange={(event) => setDiscount(event.target.value.replace(/[^0-9]/g, ''))} placeholder="0" /></label><label className="check-label"><input type="checkbox" checked={taxEnabled} onChange={(event) => setTaxEnabled(event.target.checked)} /><span>Pajak {data.settings.taxRate}%</span></label></div>{customer && <div className="redeem-row"><label>Tukar poin<input value={redeemPoints} inputMode="numeric" onChange={(event) => setRedeemPoints(event.target.value.replace(/[^0-9]/g, ''))} placeholder="Maksimal poin" /></label><span className="redeem-hint">Potongan {money(pointsDiscount)}</span></div>}<div className="payment-options">{['Tunai', 'QRIS', 'Transfer', 'Kartu'].map((method) => <button key={method} className={paymentMethod === method ? 'selected' : ''} onClick={() => setPaymentMethod(method)}>{method}</button>)}</div>{paymentMethod === 'Tunai' && <label className="cash-input">Uang diterima<input value={cashReceived} inputMode="numeric" onChange={(event) => setCashReceived(event.target.value.replace(/[^0-9]/g, ''))} placeholder="0" /></label>}<div className="summary"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div>{discountValue > 0 && <div><span>Diskon</span><strong>-{money(discountValue)}</strong></div>}{pointsDiscount > 0 && <div><span>Poin ditukar</span><strong>-{money(pointsDiscount)}</strong></div>}{tax > 0 && <div><span>Pajak</span><strong>{money(tax)}</strong></div>}<div className="total-row"><span>Total</span><strong>{money(total)}</strong></div>{change > 0 && <div className="change-row"><span>Kembalian</span><strong>{money(change)}</strong></div>}</div><button className="primary-button full checkout-button" onClick={checkout} disabled={!cart.length}><WalletCards size={18} />Bayar {money(total)}</button></section></div></div>
}

function Inventory({ data, user, updateData, notify, log, exportCsv }) {
  const [form, setForm] = useState({ id: '', name: '', sku: '', barcode: '', category: 'Makanan', price: '', stock: '', minStock: '' })
  const [editing, setEditing] = useState(false)
  const [adjust, setAdjust] = useState(null)
  const [filter, setFilter] = useState('')
  const reset = () => setForm({ id: '', name: '', sku: '', barcode: '', category: 'Makanan', price: '', stock: '', minStock: '' })
  const filtered = data.products.filter((product) => `${product.name} ${product.sku} ${product.barcode} ${product.category}`.toLowerCase().includes(filter.toLowerCase()))
  function submit(event) {
    event.preventDefault()
    if (!form.name || !form.price || !form.stock) return notify('Nama, harga, dan stok wajib diisi.', 'error')
    const product = { id: form.id || uid('p'), name: form.name, sku: form.sku || `SKU-${Date.now()}`, barcode: form.barcode || `899${Date.now()}`.slice(0, 13), category: form.category, price: Number(form.price), stock: Number(form.stock), minStock: Number(form.minStock || data.settings.lowStock) }
    updateData({ products: form.id ? data.products.map((item) => item.id === form.id ? product : item) : [product, ...data.products] })
    log(`${form.id ? 'Mengubah' : 'Menambahkan'} produk ${product.name}`)
    notify(form.id ? 'Produk diperbarui.' : 'Produk ditambahkan.')
    reset(); setEditing(false)
  }
  function edit(product) { setForm({ id: product.id, name: product.name, sku: product.sku, barcode: product.barcode, category: product.category, price: String(product.price), stock: String(product.stock), minStock: String(product.minStock) }); setEditing(true) }
  function openAdjust(product) { setAdjust({ id: product.id, name: product.name, qty: '', type: 'Masuk' }) }
  function saveAdjust(event) {
    event.preventDefault(); const qty = Number(adjust.qty); if (!qty) return notify('Jumlah stok wajib diisi.', 'error')
    const delta = adjust.type === 'Masuk' ? qty : -qty
    updateData({ products: data.products.map((item) => item.id === adjust.id ? { ...item, stock: Math.max(0, item.stock + delta) } : item), inventoryLogs: [{ id: uid('stock'), time: nowLabel(), productId: adjust.id, productName: adjust.name, type: `Adjust ${adjust.type}`, qty: delta, userId: user?.id || 'system' }, ...data.inventoryLogs].slice(0, 500) })
    log(`Adjust stok ${adjust.name} ${delta > 0 ? '+' : ''}${delta}`)
    notify('Stok berhasil diperbarui.'); setAdjust(null)
  }
  return <div className="page"><PageHeading title="Manajemen stok" description="Tambah produk, pantau stok rendah, dan catat setiap perubahan inventaris." /><div className="toolbar"><div className="search-box"><Search size={18} /><input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Cari produk atau barcode" /></div><div className="toolbar-actions"><button className="secondary-button" onClick={() => exportCsv(`inventory-${todayKey()}.csv`, data.products, [{ key: 'name', label: 'Nama' }, { key: 'sku', label: 'SKU' }, { key: 'barcode', label: 'Barcode' }, { key: 'category', label: 'Kategori' }, { key: 'price', label: 'Harga' }, { key: 'stock', label: 'Stok' }])}><Download size={16} />Export CSV</button><button className="primary-button" onClick={() => { reset(); setEditing(false) }}><Plus size={17} />Tambah produk</button></div></div><div className="content-grid"><section className="panel"><PanelHeading title={editing ? 'Edit produk' : 'Tambah produk'} /><form className="form-grid" onSubmit={submit}><label>Nama produk<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Contoh: Kopi Susu" /></label><label>Kategori<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option>Makanan</option><option>Minuman</option><option>Snack</option><option>Lainnya</option></select></label><label>SKU<input value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} placeholder="Opsional" /></label><label>Barcode<input value={form.barcode} onChange={(event) => setForm({ ...form, barcode: event.target.value })} placeholder="Opsional" /></label><label>Harga jual (Rp)<input required type="number" min="0" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="0" /></label><label>Stok awal<input required type="number" min="0" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} placeholder="0" /></label><label>Batas stok rendah<input type="number" min="0" value={form.minStock} onChange={(event) => setForm({ ...form, minStock: event.target.value })} placeholder={data.settings.lowStock} /></label><div className="form-actions">{editing && <button type="button" className="secondary-button" onClick={() => { reset(); setEditing(false) }}>Batal</button>}<button className="primary-button" type="submit">{editing ? 'Simpan perubahan' : 'Simpan produk'}</button></div></form></section><section className="panel"><PanelHeading title={`Daftar produk (${filtered.length})`} /><div className="table-wrap"><table><thead><tr><th>Produk</th><th>Kategori</th><th>Harga</th><th>Stok</th><th>Aksi</th></tr></thead><tbody>{filtered.map((product) => <tr key={product.id}><td><strong>{product.name}</strong><small className="mono">{product.barcode}</small></td><td><span className="category-tag">{product.category}</span></td><td>{money(product.price)}</td><td><span className={`stock-count ${product.stock <= product.minStock ? 'danger' : ''}`}>{product.stock}</span></td><td><div className="row-actions"><button onClick={() => openAdjust(product)} title="Adjust stok"><RefreshCw size={15} /></button><button onClick={() => edit(product)} title="Edit"><Settings size={15} /></button></div></td></tr>)}</tbody></table>{!filtered.length && <EmptyState title="Produk tidak ditemukan" description="Tambah produk baru atau ubah filter pencarian." />}</div></section></div><section className="panel log-panel"><PanelHeading title="Riwayat pergerakan stok" /><div className="log-list">{data.inventoryLogs.slice(0, 12).map((entry) => <div className="log-row" key={entry.id}><span className={`log-icon ${entry.qty > 0 ? 'positive' : 'negative'}`}>{entry.qty > 0 ? <PackagePlus size={16} /> : <ShoppingBag size={16} />}</span><div><strong>{entry.productName}</strong><small>{entry.type} · {entry.time}</small></div><b className={entry.qty > 0 ? 'positive-text' : 'negative-text'}>{entry.qty > 0 ? '+' : ''}{entry.qty}</b></div>)}</div>{!data.inventoryLogs.length && <EmptyState title="Belum ada riwayat" description="Perubahan stok akan tercatat otomatis." />}</section>{adjust && <Modal title={`Adjust stok: ${adjust.name}`} onClose={() => setAdjust(null)}><form className="stack-form" onSubmit={saveAdjust}><label>Jenis pergerakan<select value={adjust.type} onChange={(event) => setAdjust({ ...adjust, type: event.target.value })}><option>Masuk</option><option>Keluar</option></select></label><label>Jumlah<input autoFocus type="number" min="1" value={adjust.qty} onChange={(event) => setAdjust({ ...adjust, qty: event.target.value })} placeholder="0" /></label><button className="primary-button full" type="submit">Simpan stok</button></form></Modal>}</div>
}

function Customers({ data, updateData, notify, log }) {
  const [form, setForm] = useState({ id: '', name: '', phone: '', points: '' })
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState(data.customers[0]?.id || '')
  const customer = data.customers.find((item) => item.id === selected)
  function submit(event) {
    event.preventDefault(); if (!form.name) return notify('Nama pelanggan wajib diisi.', 'error')
    const next = { id: form.id || uid('c'), name: form.name, phone: form.phone, points: Number(form.points || 0), joined: form.id ? data.customers.find((item) => item.id === form.id)?.joined || todayKey() : todayKey() }
    updateData({ customers: form.id ? data.customers.map((item) => item.id === form.id ? next : item) : [next, ...data.customers] })
    log(`${form.id ? 'Mengubah' : 'Menambahkan'} pelanggan ${next.name}`); notify(form.id ? 'Data pelanggan diperbarui.' : 'Pelanggan ditambahkan.'); setForm({ id: '', name: '', phone: '', points: '' }); setEditing(false)
  }
  function edit(item) { setForm({ id: item.id, name: item.name, phone: item.phone, points: String(item.points) }); setEditing(true) }
  return <div className="page"><PageHeading title="Pelanggan & loyalty" description="Kelola data pelanggan dan pantau poin loyalty dari setiap transaksi." /><div className="content-grid customer-grid"><section className="panel"><PanelHeading title={editing ? 'Edit pelanggan' : 'Tambah pelanggan'} /><form className="stack-form" onSubmit={submit}><label>Nama lengkap<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nama pelanggan" /></label><label>Nomor WhatsApp<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="08xxxxxxxxxx" /></label><label>Poin awal<input type="number" min="0" value={form.points} onChange={(event) => setForm({ ...form, points: event.target.value })} placeholder="0" /></label><div className="form-actions">{editing && <button type="button" className="secondary-button" onClick={() => { setEditing(false); setForm({ id: '', name: '', phone: '', points: '' }) }}>Batal</button>}<button className="primary-button" type="submit">{editing ? 'Simpan perubahan' : 'Simpan pelanggan'}</button></div></form></section><section className="panel customer-card-panel"><PanelHeading title="QR loyalty" /><div className="qr-stage">{customer && <CustomerQr customer={customer} />}</div><label>Pilih pelanggan<select value={selected} onChange={(event) => setSelected(event.target.value)}>{data.customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="customer-points"><span>Poin saat ini</span><strong>{customer?.points || 0}</strong><small>Terakumulasi otomatis saat checkout</small></div></section></div><section className="panel"><PanelHeading title="Daftar pelanggan" /><div className="table-wrap"><table><thead><tr><th>Pelanggan</th><th>Kontak</th><th>Poin</th><th>Gabung</th><th>Aksi</th></tr></thead><tbody>{data.customers.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.phone || '-'}</td><td><span className="points-pill"><QrCode size={14} />{item.points}</span></td><td>{new Date(item.joined).toLocaleDateString('id-ID')}</td><td><button className="text-button" onClick={() => edit(item)}>Edit</button></td></tr>)}</tbody></table></div></section></div>
}

function CustomerQr({ customer }) {
  const [url, setUrl] = useState('')
  useEffect(() => { QRCode.toDataURL(`LOYALTY:${customer.id}:${customer.name}`, { margin: 1, width: 180 }).then(setUrl).catch(() => setUrl('')) }, [customer])
  return <div className="qr-card"><div className="qr-code">{url ? <img src={url} alt={`QR loyalty ${customer.name}`} /> : <QrCode size={120} />}</div><strong>{customer.name}</strong><small>Scan untuk akumulasi poin</small></div>
}

function Reports({ data, exportCsv, onPrint }) {
  const [period, setPeriod] = useState('7')
  const [roleFilter, setRoleFilter] = useState('all')
  const startDate = new Date()
  if (period !== 'all') {
    startDate.setDate(startDate.getDate() - Number(period) + 1)
    startDate.setHours(0, 0, 0, 0)
  } else {
    startDate.setTime(0)
  }
  const filtered = data.transactions.filter((trx) => new Date(trx.createdAt) >= startDate)
  const revenue = filtered.reduce((sum, trx) => sum + trx.grandTotal, 0)
  const byProduct = Object.entries(filtered.reduce((acc, trx) => { trx.items.forEach((item) => { acc[item.productId] = { ...(acc[item.productId] || { name: item.name, qty: 0, revenue: 0 }), qty: (acc[item.productId]?.qty || 0) + item.qty, revenue: (acc[item.productId]?.revenue || 0) + item.price * item.qty } }); return acc }, {})).map(([id, item]) => ({ id, ...item })).sort((a, b) => b.revenue - a.revenue)
  const byPayment = ['Tunai', 'QRIS', 'Transfer', 'Kartu'].map((method) => ({ method, total: filtered.filter((trx) => trx.paymentMethod === method).reduce((sum, trx) => sum + trx.grandTotal, 0), count: filtered.filter((trx) => trx.paymentMethod === method).length }))
  const maxRevenue = Math.max(1, ...byProduct.map((item) => item.revenue))
  const logs = data.accessLogs.filter((entry) => roleFilter === 'all' || entry.role === roleFilter).slice(0, 30)
  return <div className="page"><PageHeading title="Laporan & analytics" description="Analisis penjualan, produk teratas, pembayaran, dan aktivitas pengguna." /><div className="report-controls"><label>Periode<select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="7">7 hari terakhir</option><option value="30">30 hari terakhir</option><option value="90">90 hari terakhir</option><option value="all">Semua transaksi</option></select></label><label>Log role<select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="all">Semua role</option><option value="admin">Admin</option><option value="kasir">Kasir</option><option value="inventory">Inventory</option></select></label><div className="toolbar-actions"><button className="secondary-button" onClick={() => exportCsv(`top-seller-${period}.csv`, byProduct, [{ key: 'name', label: 'Produk' }, { key: 'qty', label: 'Terjual' }, { key: 'revenue', label: 'Revenue' }])}><Download size={16} />Top seller CSV</button><button className="primary-button" onClick={onPrint}><Printer size={16} />Cetak laporan</button></div></div><div className="stat-grid compact"><StatCard label="Revenue periode" value={money(revenue)} detail={`${filtered.length} transaksi`} tone="blue" /><StatCard label="Produk terjual" value={filtered.reduce((sum, trx) => sum + trx.items.reduce((part, item) => part + item.qty, 0), 0)} detail="Unit" tone="green" /><StatCard label="Diskon diberikan" value={money(filtered.reduce((sum, trx) => sum + trx.discount + trx.pointsDiscount, 0))} detail="Termasuk poin" tone="amber" /><StatCard label="Pelanggan belanja" value={new Set(filtered.map((trx) => trx.customerId).filter(Boolean)).size} detail="Pelanggan unik" tone="purple" /></div><div className="dashboard-grid"><section className="panel"><PanelHeading title="Top seller" /><div className="top-list">{byProduct.length ? byProduct.slice(0, 7).map((item) => <div className="top-row" key={item.id}><span className="rank">●</span><div><strong>{item.name}</strong><small>{item.qty} terjual · {money(item.revenue)}</small></div><div className="bar"><span style={{ width: `${Math.max(8, item.revenue / maxRevenue * 100)}%` }} /></div></div>) : <EmptyState title="Belum ada data" description="Transaksi akan muncul setelah checkout." />}</div></section><section className="panel"><PanelHeading title="Metode pembayaran" /><div className="payment-chart">{byPayment.map((item) => <div key={item.method}><div><span>{item.method}</span><strong>{money(item.total)}</strong></div><div className="bar"><span style={{ width: `${Math.max(5, item.total / Math.max(1, revenue) * 100)}%` }} /></div><small>{item.count} transaksi</small></div>)}</div></section></div><section className="panel"><PanelHeading title="Log akses pengguna" /><div className="log-list two-col">{logs.map((entry) => <div className="log-row" key={entry.id}><span className={`role-badge ${entry.role}`}>{entry.role}</span><div><strong>{entry.userName}</strong><small>{entry.action}</small></div><time>{entry.time}</time></div>)}</div>{!logs.length && <EmptyState title="Belum ada log" description="Aktivitas login dan transaksi akan tercatat di sini." />}</section></div>
}

function SettingsPage({ data, updateData, notify, log, onLogin }) {
  const [settings, setSettings] = useState(data.settings)
  const [newUser, setNewUser] = useState({ name: '', role: 'kasir', pin: '1234' })
  function saveSettings() { updateData({ settings: { ...settings, taxRate: Number(settings.taxRate || 0), lowStock: Number(settings.lowStock || 0), pointsPerRp: Number(settings.pointsPerRp || 10000), pointValue: Number(settings.pointValue || 100) } }); log('Mengubah pengaturan toko'); notify('Pengaturan toko disimpan.') }
  function addUser(event) { event.preventDefault(); if (!newUser.name) return notify('Nama pengguna wajib diisi.', 'error'); updateData({ users: [...data.users, { id: uid('u'), ...newUser, pin: newUser.pin || '1234' }] }); log(`Menambahkan pengguna ${newUser.name}`); notify('Pengguna ditambahkan.'); setNewUser({ name: '', role: 'kasir', pin: '1234' }) }
  return <div className="page settings-page"><PageHeading title="Pengaturan & role" description="Kelola profil toko, aturan poin, dan pengguna berdasarkan hierarki role." /><div className="settings-grid"><section className="panel"><PanelHeading title="Profil toko" /><div className="stack-form"><label>Nama toko<input value={settings.storeName} onChange={(event) => setSettings({ ...settings, storeName: event.target.value })} /></label><label>Pajak (%)<input type="number" min="0" value={settings.taxRate} onChange={(event) => setSettings({ ...settings, taxRate: event.target.value })} /></label><label>Batas stok rendah<input type="number" min="0" value={settings.lowStock} onChange={(event) => setSettings({ ...settings, lowStock: event.target.value })} /></label><label>Poin per Rp<input type="number" min="1" value={settings.pointsPerRp} onChange={(event) => setSettings({ ...settings, pointsPerRp: event.target.value })} /></label><label>Nilai tukar 1 poin (Rp)<input type="number" min="1" value={settings.pointValue} onChange={(event) => setSettings({ ...settings, pointValue: event.target.value })} /></label><button className="primary-button full" onClick={saveSettings}>Simpan pengaturan</button></div></section><section className="panel"><PanelHeading title="Tambah pengguna" /><form className="stack-form" onSubmit={addUser}><label>Nama pengguna<input value={newUser.name} onChange={(event) => setNewUser({ ...newUser, name: event.target.value })} placeholder="Nama pengguna" /></label><label>Role<select value={newUser.role} onChange={(event) => setNewUser({ ...newUser, role: event.target.value })}><option value="admin">Admin — akses penuh</option><option value="kasir">Kasir — transaksi & pelanggan</option><option value="inventory">Inventory — stok & produk</option></select></label><label>PIN<input value={newUser.pin} onChange={(event) => setNewUser({ ...newUser, pin: event.target.value })} placeholder="1234" /></label><button className="primary-button full" type="submit">Tambah pengguna</button></form><div className="role-cards"><RoleCard role="admin" title="Admin" text="Akses dashboard, kasir, stok, pelanggan, laporan, dan pengaturan." /><RoleCard role="kasir" title="Kasir" text="Fokus checkout, struk, pelanggan, dan transaksi harian." /><RoleCard role="inventory" title="Inventory" text="Kelola produk, stok, dan riwayat pergerakan barang." /></div></section></div><section className="panel sync-panel"><div className="sync-copy"><span className="status-dot" /><div><h3>Sinkronisasi offline-ke-online</h3><p>Data transaksi disimpan di browser saat offline. Ketika koneksi kembali tersedia, gunakan tombol sinkronisasi untuk mengirim antrean ke backend/API toko Anda. Versi ini menyiapkan antrean dan status sync tanpa server cloud.</p></div></div><button className="secondary-button" onClick={() => { if (data.syncQueue.length) { updateData({ syncQueue: [] }); notify('Antrean sinkronisasi dibersihkan.') } else notify('Tidak ada antrean.') }}><RefreshCw size={16} />Kelola antrean</button></section></div>
}

function StatCard({ label, value, detail, tone }) { return <div className={`stat-card ${tone}`}><span className="stat-icon"><Store size={18} /></span><div><small>{label}</small><strong>{value}</strong><span>{detail}</span></div></div> }
function PageHeading({ title, description }) { return <div className="page-heading"><div><h1>{title}</h1><p>{description}</p></div></div> }
function PanelHeading({ title, action }) { return <div className="panel-heading"><h2>{title}</h2>{action}</div> }
function EmptyState({ title, description }) { return <div className="empty-state"><Box size={24} /><strong>{title}</strong><small>{description}</small></div> }
function Modal({ title, children, onClose }) { return <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={(event) => event.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Tutup"><X size={18} /></button></div>{children}</div></div> }
function RoleCard({ role, title, text }) { return <div className={`role-card ${role}`}><span>{title}</span><p>{text}</p></div> }
function ReceiptModal({ receipt, onClose, onPrint }) { return <Modal title="Struk transaksi" onClose={onClose}><div className="receipt-preview"><div className="receipt-store"><strong>Kasir Toko Mobile</strong><small>Terima kasih atas kunjungan Anda</small></div><hr /><div className="receipt-meta"><span>{receipt.id}</span><span>{new Date(receipt.createdAt).toLocaleString('id-ID')}</span></div>{receipt.items.map((item) => <div className="receipt-line" key={item.productId}><span>{item.name} x{item.qty}</span><strong>{money(item.price * item.qty)}</strong></div>)}<hr /><div className="receipt-line"><span>Subtotal</span><strong>{money(receipt.subtotal)}</strong></div>{receipt.discount > 0 && <div className="receipt-line"><span>Diskon</span><strong>-{money(receipt.discount)}</strong></div>}{receipt.pointsDiscount > 0 && <div className="receipt-line"><span>Poin ditukar</span><strong>-{money(receipt.pointsDiscount)}</strong></div>}{receipt.tax > 0 && <div className="receipt-line"><span>Pajak</span><strong>{money(receipt.tax)}</strong></div>}<div className="receipt-total"><span>Total</span><strong>{money(receipt.grandTotal)}</strong></div>{receipt.paymentMethod === 'Tunai' && <div className="receipt-line"><span>Bayar</span><strong>{money(receipt.cashReceived)}</strong></div>}{receipt.change > 0 && <div className="receipt-line"><span>Kembalian</span><strong>{money(receipt.change)}</strong></div>}{receipt.customerName && <div className="receipt-line"><span>Pelanggan</span><strong>{receipt.customerName}</strong></div>}{receipt.pointsEarned > 0 && <div className="receipt-points">+{receipt.pointsEarned} poin loyalty ditambahkan</div>}<div className="receipt-footer">Powered by Kasir Toko Mobile</div></div><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Tutup</button><button className="primary-button" onClick={onPrint}><Printer size={16} />Cetak struk</button></div></Modal> }

function DashboardPlaceholder() { return null }
createRoot(document.getElementById('root')).render(<App />)
