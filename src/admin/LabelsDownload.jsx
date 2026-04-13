// src/admin/LabelsDownload.jsx
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import ShippingLabel from '../components/admin/ShippingLabel';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { FileText, Printer, Download, RefreshCw, CheckSquare } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_BASE;

export default function LabelsDownload() {
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(new Set()); // stores order.id (numbers)
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt_desc');
  const [previewOrder, setPreviewOrder] = useState(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const searchTimeout = useRef(null);

  // Debounced fetch when filters change
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchOrders(), 350);
    return () => clearTimeout(searchTimeout.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, sortBy, page]);

  const templateFormats = useMemo(() => ({
    default: [400, 250],
  }), []);

  const themeButtonStyle = {
    backgroundColor: document.documentElement.classList.contains('dark') ? 'white' : 'black',
    color: document.documentElement.classList.contains('dark') ? 'black' : 'white'
  };

  // normalize an order coming from the API to the shape used throughout the UI
  function normalizeOrder(o) {
    // shipping_address_full is sometimes a JSON string - try to parse safely
    let parsedAddress = '';
    try {
      if (o.shipping_address_full && typeof o.shipping_address_full === 'string') {
        // attempt JSON parse
        const maybe = JSON.parse(o.shipping_address_full);
        if (maybe && typeof maybe === 'object') {
          // construct a one-line address if fields exist
          parsedAddress = [maybe.name, maybe.address, maybe.city, maybe.state, maybe.pincode, maybe.country]
            .filter(Boolean)
            .join(', ');
        } else {
          parsedAddress = o.shipping_address_full;
        }
      } else if (typeof o.shipping_address_full === 'object') {
        const obj = o.shipping_address_full;
        parsedAddress = [obj.name, obj.address, obj.city, obj.state, obj.pincode, obj.country].filter(Boolean).join(', ');
      } else {
        parsedAddress = o.shipping_address_full || '';
      }
    } catch (e) {
      parsedAddress = o.shipping_address_full || '';
    }

    return {
      id: o.id,
      orderId: String(o.id),
      customerName: o.user_name || o.customerName || '',
      deliveryDate: o.expected_delivery_from || o.created_at || '',
      items: [], // API doesn't return items array in this endpoint; items_count is present
      items_count: o.items_count ?? 0,
      status: o.status || '',
      total_amount: o.total_amount,
      shipping_address: parsedAddress,
      barcode: o.barcode || '', // may be undefined on backend - keep empty if not present
      raw: o, // keep original object in case more fields are needed
    };
  }

  // Fetch orders and normalize
  async function fetchOrders() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page, limit, search, status, sortBy });
      const token = localStorage.getItem('token'); // ensure auth token is present if needed
      const res = await fetch(`${API_BASE}/api/admin/orders?${qs.toString()}`, {
        headers: token ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } : { 'Content-Type': 'application/json' },
        credentials: token ? undefined : 'include', // keep if cookie-based
      });

      if (res.status === 401) {
        throw new Error('Unauthorized. Please login.');
      }
      if (!res.ok) {
        throw new Error(`Failed fetching orders: ${res.status}`);
      }

      const data = await res.json();
      const rawList = data.data || data || [];
      const normalized = rawList.map(normalizeOrder);
      setOrders(normalized);
      setTotal(data.total ?? rawList.length);
      // If selection currently contains ids that no longer exist, clean them
      setSelected(prev => {
        const next = new Set([...prev].filter(id => normalized.some(o => o.id === id)));
        return next;
      });
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }

  // Selection helpers (use numeric id)
  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(orders.map(o => o.id)));
  const deselectAll = () => setSelected(new Set());
  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setSortBy('createdAt_desc');
    setPage(1);
    // fetch will be triggered by useEffect (debounced)
  };

  const isSelected = (id) => selected.has(id);
  const openPreview = (order) => setPreviewOrder(order);
  const closePreview = () => setPreviewOrder(null);

  // Batch PDF download (uses default template)
  const batchDownload = async () => {
    if (!selected.size) return alert('Select at least one order');
    setBatchProcessing(true);
    try {
      const selectedOrders = orders.filter(o => selected.has(o.id));
      const fmt = templateFormats.default;
      const doc = new jsPDF({ unit: 'pt', format: fmt });

      async function renderOrderToImage(order) {
        return new Promise(async (resolve, reject) => {
          try {
            const container = document.createElement('div');
            container.style.width = `${fmt[0]}px`;
            container.style.position = 'fixed';
            container.style.left = '-2000px';
            document.body.appendChild(container);
            const root = createRoot(container);
            // pass normalized order to ShippingLabel so it can render (component should handle these fields)
            root.render(<ShippingLabel order={order} />);
            // give the component a short time to render images/barcodes
            await new Promise(r => setTimeout(r, 600));
            const canvas = await html2canvas(container, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            root.unmount();
            document.body.removeChild(container);
            resolve(imgData);
          } catch (err) {
            reject(err);
          }
        });
      }

      for (let i = 0; i < selectedOrders.length; i++) {
        const img = await renderOrderToImage(selectedOrders[i]);
        const w = doc.internal.pageSize.getWidth();
        const h = doc.internal.pageSize.getHeight();
        if (i > 0) doc.addPage();
        doc.addImage(img, 'PNG', 0, 0, w, h);
      }
      doc.save(`labels_batch_${Date.now()}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Batch export failed: ' + (err.message || err));
    } finally {
      setBatchProcessing(false);
    }
  };

  // Print selected (simple HTML print)
  const printSelected = () => {
    if (!selected.size) return alert('Select at least one order');
    const selectedOrders = orders.filter(o => selected.has(o.id));
    const w = window.open('', 'PRINT', 'height=800,width=600');
    if (!w) return;
    w.document.write('<html><head><title>Print Labels</title></head><body>');
    selectedOrders.forEach(order => {
      w.document.write('<div style="margin-bottom:8px">');
      w.document.write('<div style="padding:8px;border:1px solid #000;width:400px;font-family:Arial,Helvetica,sans-serif;color:#000;background:#fff">');
      w.document.write(`<div style='display:flex;justify-content:space-between;align-items:center'><div>${order.customerName}</div><div>${order.barcode}</div></div>`);
      w.document.write(`<div style='margin-top:6px'>Items: ${order.items_count ?? 0}</div>`);
      w.document.write(`<div style='margin-top:6px'>Address: ${order.shipping_address || ''}</div>`);
      w.document.write('</div></div>');
    });
    w.document.write('</body></html>');
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 600);
  };

  return (
    <div className="p-6 bg-white dark:bg-black min-h-screen text-black dark:text-white">
      <h2 className="text-2xl font-bold mb-4">Labels / Batch Printing</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <input
          placeholder="Search orders (id or customer)"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="border px-3 py-2 rounded w-64 bg-white dark:bg-gray-800 text-black dark:text-white"
        />

        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="border px-2 py-2 rounded bg-white dark:bg-gray-800 text-black dark:text-white">
          <option value="">All status</option>
          <option value="Pending">Pending</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Shipped">Shipped</option>
          <option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="border px-2 py-2 rounded bg-white dark:bg-gray-800 text-black dark:text-white">
          <option value="createdAt_desc">Newest</option>
          <option value="createdAt_asc">Oldest</option>
          <option value="deliveryDate_asc">Delivery date ↑</option>
          <option value="deliveryDate_desc">Delivery date ↓</option>
        </select>

        <button onClick={() => fetchOrders()} className="px-3 py-2 rounded flex items-center gap-1 hover:opacity-80 transition-colors" style={themeButtonStyle}>
          <RefreshCw size={16} /> Refresh
        </button>

        <button onClick={clearFilters} className="px-3 py-2 border rounded hover:opacity-80 transition-colors">
          Clear Filters
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <button onClick={selectAll} className="px-3 py-2 border rounded flex items-center gap-1 hover:opacity-80 transition-colors">
          <CheckSquare size={16} /> Select All
        </button>

        <button onClick={deselectAll} className="px-3 py-2 border rounded flex items-center gap-1 hover:opacity-80 transition-colors">
          Deselect All
        </button>

        <button onClick={batchDownload} disabled={batchProcessing} className="px-3 py-2 rounded flex items-center gap-1 hover:opacity-80 transition-colors" style={themeButtonStyle}>
          <Download size={16} /> {batchProcessing ? 'Processing...' : 'Download Selected (PDF)'}
        </button>

        <button onClick={printSelected} className="px-3 py-2 border rounded flex items-center gap-1 hover:opacity-80 transition-colors">
          <Printer size={16} /> Print Selected
        </button>

        <span className="ml-auto font-semibold">{selected.size} order(s) selected</span>
      </div>

      {/* Orders Table */}
      <div className="border rounded overflow-x-auto">
        <table className="min-w-full table-auto text-sm">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
              <th className="p-2 text-left">Select</th>
              <th className="p-2 text-left">Order ID</th>
              <th className="p-2 text-left">Customer</th>
              <th className="p-2 text-left">Delivery Date</th>
              <th className="p-2 text-left">Items</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-4 text-center">Loading...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} className="p-4 text-center">No orders</td></tr>
            ) : orders.map(order => (
              <tr key={order.id} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    checked={isSelected(order.id)}
                    onChange={() => toggleSelect(order.id)}
                  />
                </td>

                <td className="p-2">{order.orderId}</td>
                <td className="p-2">{order.customerName}</td>
                <td className="p-2">{order.deliveryDate}</td>
                <td className="p-2">{order.items_count}</td>
                <td className="p-2">{order.status}</td>
                <td className="p-2">
                  <button onClick={() => openPreview(order)} className="px-2 py-1 border rounded hover:opacity-80 transition-colors flex items-center gap-1">
                    <FileText size={16} /> Preview
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-2 mt-3">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1 border rounded hover:opacity-80 transition-colors">Prev</button>
        <div>Page {page}</div>
        <button onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded hover:opacity-80 transition-colors">Next</button>
        <div className="ml-auto">Total: {total}</div>
      </div>

      {/* Preview Modal */}
      {previewOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 p-4 rounded max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold">Label Preview — {previewOrder.orderId}</h3>
              <div className="flex gap-2">
                <button onClick={() => toggleSelect(previewOrder.id)} className="px-3 py-1 border rounded hover:opacity-80 transition-colors flex items-center gap-1">
                  <CheckSquare size={16} /> Toggle Select
                </button>
                <button onClick={closePreview} className="px-3 py-1 rounded hover:opacity-80 transition-colors flex items-center gap-1" style={themeButtonStyle}>
                  Close
                </button>
              </div>
            </div>
            <div className="border p-3">
              <ShippingLabel order={previewOrder} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
