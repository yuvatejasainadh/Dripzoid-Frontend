// src/pages/admin/AdminCertificates.jsx
import React, { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { Eye, Download, X, RotateCcw, Printer, Mail } from "lucide-react";

const API_BASE = process.env.REACT_APP_API_BASE || "";

/**
 * AdminCertificates
 *
 * - Hidden capture canvas: 800x600
 * - Uploads compressed JPEG to backend (backend uploads to Cloudinary)
 * - Generates local PDF (from JPEG) for preview/download/print
 * - If application.certificate_generated === 1, fetch certificate and show Preview instead of Generate
 * - Adds "Send Email" button to trigger MSG91 email route: POST /api/email/send-certificate
 */

export default function AdminCertificates() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  // generatedCert: holds either fetched backend cert or locally generated
  // shape: { id, imageUrl, certificate_download_url, downloadPdfUrl (local blob url), pdfBlob, htmlString }
  const [generatedCert, setGeneratedCert] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [previewQr, setPreviewQr] = useState(null);

  const [form, setForm] = useState({
    internName: "",
    role: "QA Tester Intern",
    startDate: "",
    endDate: "",
    issueDate: new Date().toISOString().slice(0, 10),
  });

  // live preview html that updates as form changes
  const [previewHtml, setPreviewHtml] = useState("");

  const captureRef = useRef(null);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    fetchApplications();
  }, []);

  async function fetchApplications() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/jobs/applications/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setApps(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch applications:", err);
      setApps([]);
    } finally {
      setLoading(false);
    }
  }

  // -----------------------
  // Helpers
  // -----------------------
  function escapeHtml(str = "") {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDateToDDMMMYYYY(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d)) return escapeHtml(dateStr);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const dd = String(d.getDate()).padStart(2, "0");
    const m = months[d.getMonth()];
    const yyyy = d.getFullYear();
    return `${dd}-${m}-${yyyy}`;
  }

  function computeDurationText(startStr, endStr) {
    if (!startStr || !endStr) return "-";
    const s = new Date(startStr);
    const e = new Date(endStr);
    if (isNaN(s) || isNaN(e) || e < s) return "-";
    const msDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round((e - s) / msDay) + 1;
    if (diffDays <= 1) return diffDays === 1 ? "1 day" : `${diffDays} days`;
    if (diffDays < 7) return `${diffDays} days`;
    if (diffDays === 7) return `1 week`;
    if (diffDays % 7 === 0 && diffDays / 7 < 5) {
      const w = diffDays / 7;
      return `${w} ${w === 1 ? "week" : "weeks"}`;
    }
    if (diffDays >= 28 && diffDays < 60) return `1 month`;
    if (diffDays >= 60 && diffDays < 365) {
      const months = Math.round(diffDays / 30);
      return `${months} ${months === 1 ? "month" : "months"}`;
    }
    return `${diffDays} days`;
  }

  function dataURLtoFile(dataurl, filename) {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  }

  function waitForImagesToLoad(container, timeout = 4000) {
    const imgs = Array.from(container.querySelectorAll("img"));
    if (imgs.length === 0) return Promise.resolve();
    return new Promise((resolve) => {
      let loaded = 0;
      let done = false;
      const onLoad = () => {
        loaded++;
        if (!done && loaded >= imgs.length) {
          done = true;
          resolve();
        }
      };
      imgs.forEach((img) => {
        if (img.complete && img.naturalWidth !== 0) {
          onLoad();
        } else {
          img.addEventListener("load", onLoad, { once: true });
          img.addEventListener("error", onLoad, { once: true });
        }
      });
      setTimeout(() => {
        if (!done) {
          done = true;
          resolve();
        }
      }, timeout);
    });
  }

  // -----------------------
  // RAW HTML template (canvas inside has CSS set to 800x600)
  // -----------------------
  const RAW_TEMPLATE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>QA Tester — Certificate (4:3)</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#ffffff;--accent:#0f172a;--muted:#4b5563;--padding:20px;--canvas-w:800px;--canvas-h:600px;
}
*{box-sizing:border-box}html,body{height:100%;margin:0;font-family:Inter, system-ui, -apple-system, 'Segoe UI', Roboto,Arial}
body{background:var(--bg);display:flex;align-items:center;justify-content:center;padding:0}
.certificate{width:var(--canvas-w);height:var(--canvas-h);aspect-ratio:4/3;position:relative;overflow:hidden;background:#fff;display:flex;align-items:stretch;border:1px solid rgba(0,0,0,0.04)}
.certificate__bg{position:absolute;inset:0;background-repeat:no-repeat;background-position:center;background-size:cover;opacity:0.8}
.certificate__panel{position:relative;z-index:2;display:flex;flex-direction:column;flex:1;padding:var(--padding);gap:10px}
header.certificate__header{display:flex;align-items:center;justify-content:center}
.brand__logo{width:320px;max-width:72%;height:auto;object-fit:contain;margin:0 auto}
main.certificate__body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:6px 12px}
.eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:2px;color:var(--muted)}
.headline{font-family:'Playfair Display',serif;font-size:18px;margin:6px 0;color:var(--accent)}
.recipient{display:inline-block;margin:8px 0;padding:4px 10px;font-size:16px;font-weight:800;border-bottom:2px solid rgba(0,0,0,0.08);font-family:'Playfair Display',serif}
.description{max-width:92%;color:var(--muted);line-height:1.4;font-size:12px;margin-top:6px}
.meta{display:flex;gap:10px;margin-top:8px;flex-wrap:wrap;justify-content:center}
.meta__item{font-size:11px;color:var(--muted)}
.meta__label{display:block;font-weight:600;color:var(--accent);font-size:10px}
footer.certificate__footer{display:flex;align-items:flex-end;justify-content:space-between;margin-top:auto;padding-top:8px;gap:12px}
.sign{display:flex;flex-direction:column;align-items:flex-start;gap:4px}
.sign__img{width:110px;height:auto;object-fit:contain}
.sign__title{font-size:12px;font-weight:700;color:var(--accent)}
.sign__role{font-size:10px;color:var(--muted)}
.qr-wrap{display:flex;flex-direction:column;align-items:center;gap:6px}
.qr{width:72px;height:72px;border:4px solid #fff;padding:4px;border-radius:6px;background:#fff;box-shadow:0 4px 10px rgba(2,6,23,0.06)}
.verify{font-size:9px;color:var(--muted);text-align:center}
@media print{body{background:#fff}.certificate{box-shadow:none;border-radius:0}.certificate__panel{padding:18mm}.qr{border:2px solid #000}}
</style>
</head>
<body>
<article class="certificate" role="document" aria-label="Certificate of Completion">
  <div class="certificate__bg" style="background-image:url('{{BG_URL}}')" aria-hidden="true"></div>
  <section class="certificate__panel">
    <header class="certificate__header">
      <img class="brand__logo" src="{{LOGO_URL}}" alt="Dripzoid logo" />
    </header>
    <main class="certificate__body">
      <div class="eyebrow">Internship Completion Certificate</div>
      <h2 class="headline"><span class="role">{{Role}}</span> Internship</h2>
      <div class="recipient">{{Intern_Name}}</div>
      <p class="description">
        This certifies that the above named individual has successfully completed the
        <strong>{{Role}}</strong> internship for <strong>{{DURATION}}</strong>, demonstrating dedication to software testing, defect reporting, and quality assurance practices.
      </p>
      <div class="meta">
        <div class="meta__item"><span class="meta__label">Start Date</span>{{Start_Date}}</div>
        <div class="meta__item"><span class="meta__label">End Date</span>{{End_Date}}</div>
        <div class="meta__item"><span class="meta__label">Issue Date</span>{{Issue_Date}}</div>
      </div>
    </main>
    <footer class="certificate__footer">
      <div class="sign">
        <img class="sign__img" src="{{SIGN_URL}}" alt="Signature" />
        <div class="sign__title">K. Yuvateja Sainadh</div>
        <div class="sign__role">Co-Founder &amp; Developer</div>
      </div>
      <div class="qr-wrap">
        <div class="qr">
          <img src="{{QR_CODE_URL}}" alt="QR code" style="width:100%;height:100%;object-fit:contain;display:block;border-radius:4px"/>
        </div>
        <div class="verify">Scan to verify certificate</div>
      </div>
    </footer>
  </section>
</article>
</body>
</html>`;

  const DEFAULTS = {
    LOGO_URL:
      "https://res.cloudinary.com/dvid0uzwo/image/upload/v1770982044/my_project/uoxelupwgfbxxmdojmew.png",
    BG_URL:
      "https://res.cloudinary.com/dvid0uzwo/image/upload/v1770982024/my_project/euvrfnqjwxbahchozdyn.png",
    SIGN_URL:
      "https://res.cloudinary.com/dvid0uzwo/image/upload/v1770984343/my_project/nothmuye0kigv7dm8gnd.png",
  };

  function buildPopulatedHtml(values = {}) {
    const startFormatted = formatDateToDDMMMYYYY(values.startDate || "");
    const endFormatted = formatDateToDDMMMYYYY(values.endDate || "");
    const issueFormatted = formatDateToDDMMMYYYY(values.issueDate || "");
    const durationText = computeDurationText(values.startDate, values.endDate);

    const filled = RAW_TEMPLATE
      .replace(/{{Intern_Name}}/g, escapeHtml(values.internName || ""))
      .replace(/{{Role}}/g, escapeHtml(values.role || ""))
      .replace(/{{Start_Date}}/g, escapeHtml(startFormatted))
      .replace(/{{End_Date}}/g, escapeHtml(endFormatted))
      .replace(/{{Issue_Date}}/g, escapeHtml(issueFormatted))
      .replace(/{{DURATION}}/g, escapeHtml(durationText))
      .replace(/{{LOGO_URL}}/g, escapeHtml(values.logo || DEFAULTS.LOGO_URL))
      .replace(/{{BG_URL}}/g, escapeHtml(values.bg || DEFAULTS.BG_URL))
      .replace(/{{SIGN_URL}}/g, escapeHtml(values.sign || DEFAULTS.SIGN_URL))
      .replace(/{{QR_CODE_URL}}/g, escapeHtml(values.qr || ""));
    return filled;
  }

  // update live preview HTML whenever form or preview QR changes
  useEffect(() => {
    if (!selected) return;
    const html = buildPopulatedHtml({
      internName: form.internName || selected.name || "",
      role: form.role,
      startDate: form.startDate,
      endDate: form.endDate,
      issueDate: form.issueDate,
      qr: previewQr || "",
    });
    setPreviewHtml(html);
  }, [form, previewQr, selected]);

  // -----------------------
  // Fetch existing certificate for application (ADMIN)
  // -----------------------
  async function fetchCertificateForApplication(applicationId) {
    try {
      const res = await fetch(`${API_BASE}/api/certificates/application/${applicationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Failed to fetch certificate (${res.status})`);
      }
      const data = await res.json();
      // set generatedCert from backend
      setGeneratedCert({
        id: data.id,
        imageUrl: data.certificate_url || null,
        certificate_download_url: data.certificate_download_url || null,
        // no local pdf yet
        downloadPdfUrl: null,
        pdfBlob: null,
        htmlString: null,
      });
    } catch (err) {
      console.error("Fetch certificate error:", err);
      alert("Failed to fetch certificate: " + (err.message || err));
      setGeneratedCert(null);
    }
  }

  // -----------------------
  // Main: generate, upload image, keep local pdf
  // -----------------------
  async function handleGenerateAndUpload() {
    if (!selected) return;
    if (!form.internName) return alert("Please fill intern name");

    setGenerating(true);
    setGeneratedCert(null);

    try {
      const certId = `CERT-${new Date().getFullYear()}-${Date.now()}`;

      // QR pointing to verification page (api.dripzoid.com)
      const verifyUrl = `https://api.dripzoid.com/api/certificates/public/view/${certId}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl);
      setPreviewQr(qrDataUrl);

      // Build HTML
      const html = buildPopulatedHtml({
        internName: form.internName,
        role: form.role,
        startDate: form.startDate,
        endDate: form.endDate,
        issueDate: form.issueDate,
        qr: qrDataUrl,
      });

      // Inject into hidden capture node
      if (!captureRef.current) throw new Error("Capture node missing");
      captureRef.current.style.width = "800px";
      captureRef.current.style.height = "600px";
      captureRef.current.innerHTML = html;

      // ensure fonts and images
      if (document.fonts) await document.fonts.ready;
      await waitForImagesToLoad(captureRef.current, 5000);

      const node = captureRef.current.querySelector("article.certificate") || captureRef.current;

      const canvas = await html2canvas(node, {
        scale: 1.4,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });

      const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.85);
      const certImageFile = dataURLtoFile(jpegDataUrl, `${certId}.jpg`);
      const qrFile = dataURLtoFile(qrDataUrl, `${certId}-qr.png`);

      // Build local PDF for admin preview/download/print
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(jpegDataUrl, "JPEG", 0, 0, canvas.width, canvas.height);
      const pdfBlob = pdf.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);

      // Upload to backend
      const uploadForm = new FormData();
      uploadForm.append("application_id", selected.id);
      uploadForm.append("certificate_id", certId);
      uploadForm.append("intern_name", form.internName);
      uploadForm.append("role", form.role);
      uploadForm.append("start_date", form.startDate || "");
      uploadForm.append("end_date", form.endDate || "");
      uploadForm.append("issue_date", form.issueDate || "");
      uploadForm.append("certificate", certImageFile);
      uploadForm.append("qr", qrFile);

      const res = await fetch(`${API_BASE}/api/certificates`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadForm,
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.error("Upload failed:", result);
        // still set local pdf for admin to download
        setGeneratedCert({
          id: certId,
          imageUrl: null,
          certificate_download_url: null,
          downloadPdfUrl: pdfUrl,
          pdfBlob,
          htmlString: html,
        });
        throw new Error(result.message || "Upload to server failed");
      }

      const backendImageUrl = result.certificate_url || null;
      const backendDownloadUrl = result.certificate_download_url || null;

      setGeneratedCert({
        id: certId,
        imageUrl: backendImageUrl,
        certificate_download_url: backendDownloadUrl || null,
        downloadPdfUrl: pdfUrl,
        pdfBlob,
        htmlString: html,
      });

      // Refresh application list to reflect certificate_generated flag
      await fetchApplications();

      alert("Certificate uploaded and PDF generated. Use Preview / Download / Print / Send Email.");
    } catch (err) {
      console.error("Generation/upload error:", err);
      alert("Certificate generation or upload failed: " + (err.message || err));
    } finally {
      setGenerating(false);
    }
  }

  // -----------------------
  // Send certificate email (admin action)
  // -----------------------
 async function handleSendEmail() {
  if (!selected) return alert("No application selected");
  if (!generatedCert?.id) {
    return alert("Certificate ID not available");
  }

  setSendingEmail(true);
  try {
    // Always construct public PDF URL
    const publicDownloadUrl = `https://api.dripzoid.com/api/certificates/${generatedCert.id}/download-pdf`;

    const payload = {
      to: selected.email,
      internName: form.internName || selected.name,
      role: form.role,
      certificateImageUrl: generatedCert.imageUrl || null,
      certificateDownloadUrl: publicDownloadUrl, // 🔥 always valid
    };

    const res = await fetch(`${API_BASE}/api/email/send-certificate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || `Email failed (${res.status})`);
    }

    alert("Certificate email sent successfully.");
  } catch (err) {
    console.error("Send email error:", err);
    alert("Failed to send email: " + (err.message || err));
  } finally {
    setSendingEmail(false);
  }
}


  function handleOpenImagePreview() {
    if (generatedCert?.imageUrl) {
      window.open(generatedCert.imageUrl, "_blank");
    } else if (generatedCert?.downloadPdfUrl) {
      window.open(generatedCert.downloadPdfUrl, "_blank");
    } else {
      alert("No preview available");
    }
  }

  function handleDownloadPdf() {
    if (!generatedCert?.id) {
      return alert("Certificate ID not available");
    }

    const downloadUrl = `https://api.dripzoid.com/api/certificates/${generatedCert.id}/download-pdf`;

    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `${generatedCert.id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function handlePrint() {
    if (!generatedCert?.id) return alert("Certificate ID not available");

    const url = `https://api.dripzoid.com/api/certificates/${generatedCert.id}/download-pdf`;
    const w = window.open(url, "_blank");
    if (!w) return alert("Popup blocked. Allow popups to print.");

    w.onload = () => {
      setTimeout(() => {
        try {
          w.print();
        } catch (e) {
          console.warn("Print failed", e);
        }
      }, 600);
    };
  }

  function resetGenerated() {
    if (generatedCert?.downloadPdfUrl) {
      try {
        URL.revokeObjectURL(generatedCert.downloadPdfUrl);
      } catch (e) {}
    }
    setGeneratedCert(null);
    setPreviewQr(null);
  }

  // -----------------------
  // UI handlers: open modal for app
  // - if certificate_generated === 1 -> fetch certificate
  // - else -> open modal ready to generate
  // -----------------------
  async function openForApp(app) {
    setSelected(app);
    resetGenerated();
    setForm((f) => ({ ...f, internName: app.name, role: app.job_title || f.role }));

    if (app.certificate_generated === 1) {
      // fetch existing certificate for preview
      await fetchCertificateForApplication(app.id);
    } else {
      // nothing uploaded yet — admin can generate & upload
      setGeneratedCert(null);
    }
  }

  if (loading) return <div className="p-10">Loading applications...</div>;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 p-8">
      <h1 className="text-3xl font-extrabold mb-8">Certificate Dashboard</h1>

      <div className="overflow-x-auto border rounded-2xl mb-8 bg-white dark:bg-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 dark:bg-slate-700">
            <tr>
              <th className="p-4 text-left">Name</th>
              <th>Email</th>
              <th>Job</th>
              <th>Status</th>
              <th>Resume</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {apps.map((app) => (
              <tr key={app.id} className="border-t">
                <td className="p-4 font-medium">{app.name}</td>
                <td>{app.email}</td>
                <td>{app.job_id}</td>
                <td>{app.status}</td>
                <td>
                  {app.resume_url && (
                    <a href={`${API_BASE}${app.resume_url}`} target="_blank" rel="noreferrer" className="text-indigo-600 underline">
                      View
                    </a>
                  )}
                </td>
                <td className="space-x-2">
                  {app.certificate_generated === 1 ? (
                    <button
                      onClick={() => openForApp(app)}
                      className="px-3 py-1 rounded bg-green-600 text-white text-xs inline-flex items-center gap-2"
                    >
                      <Eye size={14} /> Preview Certificate
                    </button>
                  ) : (
                    <button
                      onClick={() => openForApp(app)}
                      className="px-3 py-1 rounded bg-black text-white text-xs inline-flex items-center gap-2"
                    >
                      <Eye size={14} /> Generate
                    </button>
                  )}

                  <button
                    onClick={async () => {
                      try {
                        await fetch(`${API_BASE}/api/jobs/applications/${app.id}/status`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ status: "Rejected" }),
                        });
                        await fetchApplications();
                      } catch (e) {
                        console.error(e);
                        alert("Failed to update status");
                      }
                    }}
                    className="px-3 py-1 rounded border text-xs inline-flex items-center gap-2"
                  >
                    <X size={14} /> Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
            <div className="w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl">
              {/* header */}
              <div className="flex items-center justify-between bg-black text-white px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold">Certificate — {selected.name}</h2>
                  <div className="text-xs opacity-80">{selected.email} • Job: {selected.job_id}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={resetGenerated} title="Reset" className="inline-flex items-center gap-2 px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-sm">
                    <RotateCcw size={16} /> Reset
                  </button>

                  <button
                    onClick={() => {
                      setSelected(null);
                      resetGenerated();
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-sm"
                  >
                    <X size={16} /> Close
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* left: form */}
                <div className="md:col-span-1 space-y-4">
                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Intern Name</label>
                    <input
                      className="w-full px-3 py-2 border rounded bg-white dark:bg-slate-900"
                      placeholder="Intern Name"
                      value={form.internName}
                      onChange={(e) => setForm({ ...form, internName: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Role</label>
                    <input
                      className="w-full px-3 py-2 border rounded bg-white dark:bg-slate-900"
                      placeholder="Role"
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-slate-500">Start</label>
                      <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full px-2 py-2 border rounded bg-white dark:bg-slate-900" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">End</label>
                      <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full px-2 py-2 border rounded bg-white dark:bg-slate-900" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Issue</label>
                      <input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} className="w-full px-2 py-2 border rounded bg-white dark:bg-slate-900" />
                    </div>
                  </div>

                  <div className="text-xs text-slate-500">
                    Note: This will upload the certificate image to the server (Cloudinary) and also generate a compact PDF locally for preview/download/print. Use "Send Email" to send the certificate to the intern.
                  </div>
                </div>

                {/* right: preview area (iframe live preview) */}
                <div className="md:col-span-2 flex flex-col items-center gap-3">
                  <div className="border rounded-lg overflow-hidden h-[420px] w-full flex items-center justify-center bg-slate-50">
                    {/* Live preview iframe centered and full-size */}
                    <iframe
                      title="certificate-preview"
                      srcDoc={generatedCert?.htmlString || previewHtml}
                      style={{ width: "100%", height: "100%", border: "0", display: "block" }}
                      sandbox="allow-same-origin allow-popups allow-forms"
                    />
                  </div>

                  <div className="w-full flex items-center justify-center gap-3">
                    {/* Action buttons moved here (below iframe) */}
                    {selected.certificate_generated === 1 ? (
                      <>
                        <button onClick={handleOpenImagePreview} className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded">
                          <Eye size={16} /> Preview
                        </button>

                        <button onClick={handleDownloadPdf} className="inline-flex items-center gap-2 px-3 py-2 bg-white border rounded">
                          <Download size={14} /> Download PDF
                        </button>

                        <button onClick={handlePrint} className="inline-flex items-center gap-2 px-3 py-2 border rounded">
                          <Printer size={14} /> Print
                        </button>

                        <button onClick={handleSendEmail} disabled={sendingEmail} className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded">
                          <Mail size={14} /> {sendingEmail ? "Sending..." : "Send Email"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleGenerateAndUpload}
                          disabled={generating}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded"
                        >
                          {generating ? "Generating..." : <><Eye size={16} /> Generate & Upload</>}
                        </button>

                        {/* If we've generated a local PDF but didn't upload, show download/print too */}
                        {generatedCert?.downloadPdfUrl && (
                          <>
                            <button onClick={() => window.open(generatedCert.downloadPdfUrl, "_blank")} className="inline-flex items-center gap-2 px-3 py-2 bg-white border rounded">
                              <Download size={14} /> Download PDF
                            </button>
                            <button onClick={() => window.open(generatedCert.downloadPdfUrl, "_blank")} className="inline-flex items-center gap-2 px-3 py-2 border rounded">
                              <Printer size={14} /> Print
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>

                  <div className="mt-1 w-full text-sm text-slate-500 text-center">
                    The preview area shows a live certificate preview (updates as you edit). After generating, the uploaded certificate image will replace the live preview.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hidden capture node (800x600) */}
          <div style={{ position: "fixed", left: -99999, top: -99999, width: 800, height: 600, overflow: "hidden", zIndex: -9999 }}>
            <div ref={captureRef} />
          </div>
        </>
      )}
    </main>
  );
}
