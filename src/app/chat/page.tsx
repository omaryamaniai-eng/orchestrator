"use client";

import { useEffect, useState } from "react";
import ChatInterface from "@/components/ChatInterface";

export default function Home() {
  const [hasMounted, setHasMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [orgId, setOrgId] = useState("");
  const [openKey, setOpenKey] = useState("");

  useEffect(() => {
    // Wait until client-side mount
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;

    const storedApiKey = sessionStorage.getItem("WORKFLOW_ID");
    const storedOrgId = sessionStorage.getItem("ZAPIER_TOKEN");
    const storedOpenAI = sessionStorage.getItem("OPENAI_API_KEY");

    if (storedApiKey && storedOrgId && storedOpenAI) {
      setIsReady(true);
    } else {
      setShowModal(true);
    }
  }, [hasMounted]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Save values
    sessionStorage.setItem("WORKFLOW_ID", apiKey);
    sessionStorage.setItem("ZAPIER_TOKEN", orgId);
    sessionStorage.setItem("OPENAI_API_KEY", openKey);

    // Hide modal and show app
    setShowModal(false);
    setIsReady(true);
  };

  // Prevent render during SSR
  if (!hasMounted) return null;

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <form
            onSubmit={handleSubmit}
            className="bg-black text-white p-8 rounded-lg shadow-lg space-y-6 w-[500px] max-w-full"
          >
            <h2 className="text-2xl font-bold text-center">Enter Config Values</h2>

            <input
              type="text"
              placeholder="Enter OpenAI API Key"
              value={openKey}
              onChange={(e) => setOpenKey(e.target.value)}
              className="w-full border border-white bg-black text-white p-3 rounded placeholder-white focus:outline-none focus:ring-2 focus:ring-white"
              required
            />

            <input
              type="text"
              placeholder="Enter Workflow ID"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full border border-white bg-black text-white p-3 rounded placeholder-white focus:outline-none focus:ring-2 focus:ring-white"
              required
            />

            <input
              type="text"
              placeholder="Enter ZAPIER Token"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="w-full border border-white bg-black text-white p-3 rounded placeholder-white focus:outline-none focus:ring-2 focus:ring-white"
              required
            />

            <button
              type="submit"
              className="w-full bg-white text-black py-3 rounded font-semibold hover:bg-gray-200 transition"
            >
              Save & Continue
            </button>
          </form>
        </div>
      )}

      {isReady && <ChatInterface />}
    </>
  );
}