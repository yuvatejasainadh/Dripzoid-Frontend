// src/components/QandA.jsx
import React, { useEffect, useState, useContext } from "react";
import { Avatar } from "@mui/material";
import { MessageCircle, Send, ThumbsUp, ThumbsDown } from "lucide-react";
import { UserContext } from "../contexts/UserContext";

const API_BASE = process.env.REACT_APP_API_BASE || "";

export default function QandA({ productId, showToast }) {
  const { user: currentUser } = useContext(UserContext) || {};
  const [questions, setQuestions] = useState([]);
  const [questionText, setQuestionText] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [answerInputs, setAnswerInputs] = useState({});
  const [answerLoading, setAnswerLoading] = useState({});
  const [userVotes, setUserVotes] = useState({});

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/qa/${encodeURIComponent(productId)}`);
        if (!res.ok) {
          // fallback try global
          const fallback = await fetch(`${API_BASE}/api/qa?productId=${encodeURIComponent(productId)}`);
          if (!fallback.ok) return;
          const json2 = await fallback.json();
          if (mounted) setQuestions(Array.isArray(json2) ? json2 : json2.questions || []);
          return;
        }
        const json = await res.json();
        if (mounted) setQuestions(Array.isArray(json) ? json : json.questions || json.data || []);
      } catch (err) {
        console.warn("Q&A load failed", err);
      }
    }
    load();
    return () => (mounted = false);
  }, [productId]);

  const postQuestion = async () => {
    if (!questionText.trim()) return showToast?.("Type your question first");
    setIsAsking(true);
    try {
      const payload = { productId, text: questionText.trim(), userId: currentUser?.id || null };
      const res = await fetch(`${API_BASE}/api/qa`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Failed to post");
      const saved = await res.json();
      const inserted = {
        id: saved.id || saved._id || Date.now(),
        text: saved.text || payload.text,
        userName: saved.userName || currentUser?.name || "You",
        avatar: saved.avatar || currentUser?.avatar || null,
        createdAt: saved.createdAt || new Date().toISOString(),
        answers: saved.answers || [],
      };
      setQuestions((prev) => [inserted, ...(Array.isArray(prev) ? prev : [])]);
      setQuestionText("");
      showToast?.("Question posted");
    } catch (err) {
      console.error("post question failed", err);
      showToast?.("Could not post question");
    } finally {
      setIsAsking(false);
    }
  };

  const handlePostAnswer = async (questionId, text) => {
    if (!text || !text.trim()) return;
    setAnswerLoading((s) => ({ ...s, [questionId]: true }));
    try {
      const res = await fetch(`${API_BASE}/api/qa/${encodeURIComponent(questionId)}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Could not post answer");
      const saved = await res.json();
      const answerObj = { id: saved.id || Date.now(), text: saved.text || text, userName: saved.userName || "You", avatar: saved.avatar || null, createdAt: saved.createdAt || new Date().toISOString(), likes: saved.likes || 0, dislikes: saved.dislikes || 0 };
      setQuestions((prev) => (Array.isArray(prev) ? prev.map((q) => (String(q.id) === String(questionId) ? { ...q, answers: [...(q.answers || []), answerObj] } : q)) : prev));
      setAnswerInputs((s) => ({ ...s, [questionId]: "" }));
      showToast?.("Answer posted");
    } catch (err) {
      console.error("post answer failed", err);
      showToast?.("Could not post answer");
      throw err;
    } finally {
      setAnswerLoading((s) => ({ ...s, [questionId]: false }));
    }
  };

  const handleVote = async (entityId, entityType, voteType) => {
    try {
      const res = await fetch(`${API_BASE}/api/votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        body: JSON.stringify({ entityId, entityType, vote: voteType }),
      });
      if (!res.ok) throw new Error("Vote failed");
      const data = await res.json();
      setUserVotes((prev) => ({ ...prev, [String(entityId)]: voteType }));
      return data;
    } catch (err) {
      console.error("Vote failed", err);
      showToast?.("Could not submit vote");
      throw err;
    }
  };

  return (
    <section className="rounded-2xl shadow-xl bg-white/98 dark:bg-gray-900/98 p-4 md:p-6 border border-gray-200/60 dark:border-gray-700/60">
      <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">Questions & Answers</h3>

      <div className="mb-4 flex gap-3">
        <input value={questionText} onChange={(e) => setQuestionText(e.target.value)} placeholder="Ask a question." className="flex-1 p-3 border rounded-lg bg-white dark:bg-gray-900 text-black dark:text-white" />
        <button onClick={postQuestion} disabled={isAsking || !questionText.trim()} className={`px-4 py-2 rounded-lg ${isAsking || !questionText.trim() ? "opacity-60 cursor-not-allowed bg-gray-200 dark:bg-gray-800" : "bg-black text-white"}`}>
          <MessageCircle size={16} /> {isAsking ? "Posting..." : "Ask"}
        </button>
      </div>

      {Array.isArray(questions) && questions.length > 0 ? (
        <ul className="space-y-6">
          {questions.map((q) => {
            const qid = q.id || q._id;
            const displayName = q.userName || q.name || "Anonymous";
            const initials = (displayName || "A").split(" ").map((p) => p?.[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "A";
            return (
              <li key={qid} className="space-y-3">
                <div className="flex items-start gap-3">
                  <AvatarPlaceholder name={displayName} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-black dark:text-white">{displayName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{q.createdAt ? new Date(q.createdAt).toLocaleString() : ""}</p>
                      </div>
                    </div>

                    <div className="mt-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-sm text-gray-900 dark:text-gray-100">{q.text}</p>
                    </div>

                    {(q.answers || []).length > 0 && (
                      <div className="ml-12 mt-3 space-y-3">
                        {q.answers.map((a, idx) => (
                          <div key={a.id || idx} className="flex items-start gap-3">
                            <AvatarPlaceholder name={a.userName || "A"} size={36} />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-black dark:text-white">{a.userName || "Anonymous"}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">{a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}</p>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <button onClick={() => handleVote(a.id || idx, "answer", "like")} className={`flex items-center gap-1 px-2 py-1 rounded ${userVotes[a.id] === "like" ? "bg-black/10 dark:bg-white/10" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`} type="button" aria-label="Like answer">
                                    <ThumbsUp size={14} /> <span>{a.likes || 0}</span>
                                  </button>
                                  <button onClick={() => handleVote(a.id || idx, "answer", "dislike")} className={`flex items-center gap-1 px-2 py-1 rounded ${userVotes[a.id] === "dislike" ? "bg-black/10 dark:bg-white/10" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`} type="button" aria-label="Dislike answer">
                                    <ThumbsDown size={14} /> <span>{a.dislikes || 0}</span>
                                  </button>
                                </div>
                              </div>
                              <div className="mt-1 bg-gray-50 dark:bg-gray-800/70 rounded-lg p-3">
                                <p className="text-sm text-gray-900 dark:text-gray-100">{a.text}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="ml-12 mt-2 flex gap-2 items-start">
                      <input value={answerInputs[qid] || ""} onChange={(e) => setAnswerInputs((prev) => ({ ...prev, [qid]: e.target.value }))} placeholder="Write an answer." className="flex-1 p-2 border rounded-lg bg-white dark:bg-gray-900 text-sm text-black dark:text-white" />
                      <button onClick={async () => {
                        const text = (answerInputs[qid] || "").trim();
                        if (!text) return showToast?.("Type an answer first");
                        try {
                          await handlePostAnswer(qid, text);
                        } catch {}
                      }} disabled={Boolean(answerLoading[qid]) || !(answerInputs[qid] && answerInputs[qid].trim())} className={`px-3 py-2 rounded-full border ${answerLoading[qid] ? "opacity-60 cursor-not-allowed" : "bg-black text-white"}`} type="button">
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-gray-600 dark:text-gray-300">No questions yet.</p>
      )}
    </section>
  );
}

/* tiny avatar placeholder used in QandA */
function AvatarPlaceholder({ name = "A", size = 40 }) {
  const initials =
    (String(name || "A").split(" ").map((p) => p?.[0]).filter(Boolean).slice(0, 2).join("") || "A").toUpperCase();
  const bg = stringToHslColor(name || initials);
  return (
    <div style={{ width: size, height: size, borderRadius: 8, background: bg, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>
      {initials}
    </div>
  );
}

/* small helper — matches product page util */
function stringToHslColor(str = "", s = 65, l = 45) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h} ${s}% ${l}%)`;
}
