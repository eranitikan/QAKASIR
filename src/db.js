const DB_NAME = 'qakasir-db'
const DB_VERSION = 1
const STORES = ['users', 'products', 'customers', 'transactions', 'inventoryLogs', 'accessLogs', 'syncQueue', 'settings']

export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      STORES.forEach((store) => {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: 'id' })
      })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function allFrom(db, store) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(store, 'readonly').objectStore(store).getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

function putMany(db, store, records) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, 'readwrite')
    const objectStore = transaction.objectStore(store)
    records.forEach((record) => objectStore.put(record))
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function loadDatabase() {
  const db = await openDatabase()
  const entries = await Promise.all(STORES.map(async (store) => [store, await allFrom(db, store)]))
  db.close()
  return Object.fromEntries(entries)
}

export async function saveDatabase(data) {
  const db = await openDatabase()
  await Promise.all(STORES.map((store) => putMany(db, store, data[store] || [])))
  db.close()
}

export async function hashPassword(password) {
  if (window.crypto?.subtle) {
    const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
    return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, '0')).join('')
  }
  let hash = 0
  for (let index = 0; index < password.length; index += 1) hash = (hash * 31 + password.charCodeAt(index)) | 0
  return `fallback-${hash.toString(36)}`
}

export async function verifyPassword(password, expectedHash) {
  return (await hashPassword(password)) === expectedHash
}

export async function seedDatabase() {
  const db = await openDatabase()
  const users = await allFrom(db, 'users')
  if (!users.length) {
    const adminHash = await hashPassword('Admin123!')
    await putMany(db, 'users', [{
      id: 'user-admin-seed',
      name: 'Admin QAKASIR',
      email: 'admin@qakasir.id',
      role: 'admin',
      passwordHash: adminHash,
      createdAt: new Date().toISOString(),
    }])
    await putMany(db, 'products', [
      { id: 'p1', barcode: '8991234500017', name: 'Kopi Susu Gula Aren', category: 'Minuman', price: 18000, stock: 24, minStock: 8, sku: 'KOP-001' },
      { id: 'p2', barcode: '8991234500024', name: 'Teh Tarik Original', category: 'Minuman', price: 15000, stock: 18, minStock: 6, sku: 'TEH-001' },
      { id: 'p3', barcode: '8991234500031', name: 'Roti Bakar Coklat', category: 'Makanan', price: 22000, stock: 12, minStock: 5, sku: 'ROT-001' },
      { id: 'p4', barcode: '8991234500048', name: 'Nasi Goreng Spesial', category: 'Makanan', price: 28000, stock: 9, minStock: 4, sku: 'NAS-001' },
      { id: 'p5', barcode: '8991234500055', name: 'Air Mineral 600ml', category: 'Minuman', price: 5000, stock: 40, minStock: 12, sku: 'AIR-001' },
      { id: 'p6', barcode: '8991234500062', name: 'Kentang Goreng', category: 'Snack', price: 16000, stock: 15, minStock: 5, sku: 'KEN-001' },
      { id: 'p7', barcode: '8991234500079', name: 'Pisang Keju', category: 'Snack', price: 14000, stock: 10, minStock: 4, sku: 'PIS-001' },
      { id: 'p8', barcode: '8991234500086', name: 'Mie Goreng Jawa', category: 'Makanan', price: 25000, stock: 7, minStock: 4, sku: 'MIE-001' },
    ])
    await putMany(db, 'customers', [
      { id: 'c1', name: 'Ahmad Fauzi', phone: '081234567890', points: 1250, joined: '2025-01-12' },
      { id: 'c2', name: 'Siti Nurhaliza', phone: '081298765432', points: 840, joined: '2025-02-03' },
      { id: 'c3', name: 'Budi Santoso', phone: '081345678901', points: 320, joined: '2025-03-18' },
    ])
    await putMany(db, 'settings', [{ id: 'store', storeName: 'QAKASIR', taxRate: 0, lowStock: 8, pointsPerRp: 10000, pointValue: 100, sheetSyncUrl: '' }])
    await putMany(db, 'accessLogs', [{ id: `log-${Date.now()}`, time: new Date().toLocaleString('id-ID'), userId: 'user-admin-seed', userName: 'Admin QAKASIR', role: 'admin', action: 'Database lokal dibuat' }])
  }
  db.close()
}
