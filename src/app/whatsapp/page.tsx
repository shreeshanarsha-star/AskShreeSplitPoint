"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";

type ChatMessage = {
  id: string;
  sender: "candidate" | "shree";
  text: string;
  timestamp: string;
  isQuickReply?: boolean;
};

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "m1",
    sender: "shree",
    text: "👋 Hi Alex! This is Shree, your AI Talent Acquisition Partner representing AskShree.\n\nThank you for applying to the Senior Full-Stack Engineer role! I'm here 24/7 on WhatsApp to give you transparent updates and help you schedule your interviews with zero friction.",
    timestamp: "10:30 AM",
  },
  {
    id: "m2",
    sender: "shree",
    text: "What would you like to do?\n\n1️⃣ Check Application Status\n2️⃣ Schedule Technical Interview\n3️⃣ Ask About Team & Culture",
    timestamp: "10:30 AM",
  },
];

export default function WhatsAppBotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  function handleSend(userMessage: string) {
    if (!userMessage.trim()) return;

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "candidate",
      text: userMessage,
      timestamp: time,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
    setIsTyping(true);

    // Call WhatsApp Bot Logic
    setTimeout(async () => {
      let replyText = "";
      const lower = userMessage.toLowerCase();

      if (lower.includes("status") || lower === "1" || lower.includes("application")) {
        replyText = "📊 *Application Status Update:*\n\n• *Role:* Senior Full-Stack Engineer (#R-2208261)\n• *Current Stage:* Hiring Manager Review\n• *Shree Fit Score:* 94% (High Confidence)\n• *Next Step:* 45-min Technical Architecture Deep-Dive with David Miller (VP Eng) & Priya Patel.\n\nType *SCHEDULE* or *2* to pick an interview time slot!";
      } else if (lower.includes("schedule") || lower === "2" || lower.includes("interview")) {
        replyText = "📅 *Available Interview Windows This Week:*\n\n1️⃣ *Tuesday, Sep 15* • 2:00 PM – 3:00 PM PST\n2️⃣ *Wednesday, Sep 16* • 11:00 AM – 12:00 PM PST\n3️⃣ *Thursday, Sep 17* • 2:00 PM – 3:00 PM PST\n\nReply with *1*, *2*, or *3* to confirm, or tap here to pick custom times: https://askshree.com/schedule/demo";
      } else if (lower === "1" || lower === "2" || lower === "3") {
        const slots = [
          "Tuesday, Sep 15 • 2:00 PM – 3:00 PM PST",
          "Wednesday, Sep 16 • 11:00 AM – 12:00 PM PST",
          "Thursday, Sep 17 • 2:00 PM – 3:00 PM PST",
        ];
        const chosen = slots[parseInt(lower, 10) - 1] || slots[0];
        replyText = `🎉 *Interview Confirmed!*\n\n• *Date & Time:* ${chosen}\n• *Panel:* David Miller (VP Eng) & Priya Patel\n• *Meeting Link:* meet.google.com/ask-shree-sync\n\nWe've sent a calendar invite and interview prep brief to your email. You're all set! 🚀`;
      } else if (lower.includes("culture") || lower === "3" || lower.includes("tech") || lower.includes("salary")) {
        replyText = "💡 *AskShree Engineering Culture & Details:*\n\n• *Stack:* TypeScript, Next.js 15, PostgreSQL on Supabase, OpenAI gpt-4o-mini agent loops.\n• *Work Mode:* 100% Remote-friendly with async collaboration.\n• *Transparent Compensation:* $160,000 – $210,000 base + equity.\n• *Zero-Ghosting Promise:* You receive transparent updates at every single stage.";
      } else {
        replyText = "Got it! I've noted that for the recruiting team. You can type:\n• *STATUS* — to see where your application stands\n• *SCHEDULE* — to book or reschedule your interview\n• *CULTURE* — to learn about our engineering standards";
      }

      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `shree-${Date.now()}`,
          sender: "shree",
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }, 1200);
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col justify-center py-6 px-4">
      {/* Top Breadcrumb */}
      <div className="max-w-md w-full mx-auto mb-3 flex items-center justify-between">
        <Link href="/" className="group">
          <Logo height={24} showPunchline={true} />
        </Link>
        <Link
          href="/recruiter"
          className="text-xs text-slate-500 hover:text-brand flex items-center gap-1"
        >
          <Icon name="chevronLeft" size={14} />
          Back to Recruiter Console
        </Link>
      </div>

      {/* Phone Mockup Container */}
      <div className="max-w-md w-full mx-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-300 dark:border-slate-800 overflow-hidden flex flex-col h-[680px]">
        
        {/* WhatsApp Header */}
        <div className="bg-[#075E54] text-white p-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/askshree-emblem.png"
                alt="Shree AI Recruiter"
                className="w-10 h-10 rounded-full border-2 border-white/40 shadow-xs"
              />
              <span className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#075E54] absolute bottom-0 right-0" />
            </div>
            <div>
              <div className="font-bold text-sm flex items-center gap-1.5">
                <span>Shree AI Recruiter</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-800 text-emerald-200">
                  Official
                </span>
              </div>
              <div className="text-[11px] text-emerald-200">
                {isTyping ? "typing..." : "online • AskShree Talent OS"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-white/80">
            <Link href="/candidate/status" target="_blank" className="p-1 hover:text-white" title="View Status Hub">
              <Icon name="external" size={16} />
            </Link>
          </div>
        </div>

        {/* Chat Messages Area (WhatsApp Pattern Background) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#ECE5DD] dark:bg-[#0b141a]">
          
          <div className="text-center my-1">
            <span className="text-[10px] px-2.5 py-1 rounded-md bg-white/80 dark:bg-slate-800/80 text-slate-500 shadow-2xs">
              TODAY • END-TO-END ENCRYPTED
            </span>
          </div>

          {messages.map((msg) => {
            const isMe = msg.sender === "candidate";
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs relative ${
                    isMe
                      ? "bg-[#DCF8C6] dark:bg-[#005c4b] text-slate-900 dark:text-white rounded-tr-none"
                      : "bg-white dark:bg-[#202c33] text-slate-900 dark:text-white rounded-tl-none"
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                  <span
                    className={`text-[9px] block text-right mt-1 ${
                      isMe ? "text-emerald-800 dark:text-emerald-200" : "text-slate-400"
                    }`}
                  >
                    {msg.timestamp} {isMe && "✓✓"}
                  </span>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-[#202c33] rounded-2xl rounded-tl-none p-3 shadow-xs text-xs text-slate-400 italic">
                Shree is typing...
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Prompt Chips */}
        <div className="p-2 bg-slate-50 dark:bg-[#111b21] border-t border-slate-200 dark:border-slate-800 flex gap-1.5 overflow-x-auto text-[11px]">
          <button
            onClick={() => handleSend("Where do I stand in my application?")}
            className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 whitespace-nowrap hover:border-emerald-500 text-slate-700 dark:text-slate-200"
          >
            📊 Check Status
          </button>
          <button
            onClick={() => handleSend("Schedule my interview")}
            className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 whitespace-nowrap hover:border-emerald-500 text-slate-700 dark:text-slate-200"
          >
            📅 Schedule Interview
          </button>
          <button
            onClick={() => handleSend("What is the tech stack & salary band?")}
            className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 whitespace-nowrap hover:border-emerald-500 text-slate-700 dark:text-slate-200"
          >
            💡 Tech Stack & Comp
          </button>
        </div>

        {/* Message Input Bar */}
        <div className="p-2.5 bg-slate-100 dark:bg-[#202c33] flex items-center gap-2 border-t border-slate-200 dark:border-slate-800">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend(inputText)}
            placeholder="Type a message or number..."
            className="flex-1 text-xs px-3 py-2 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#2a3942] text-slate-900 dark:text-white focus:outline-none"
          />
          <button
            onClick={() => handleSend(inputText)}
            disabled={!inputText.trim()}
            className="w-8 h-8 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-white flex items-center justify-center transition-colors disabled:opacity-40"
          >
            <Icon name="arrowUp" size={14} />
          </button>
        </div>

      </div>
    </div>
  );
}
