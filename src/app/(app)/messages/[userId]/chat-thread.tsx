"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ChatMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
};

function fmtTime(ts: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Manila",
  }).format(new Date(ts));
}

export function ChatThread({
  meId,
  contactId,
  initialMessages,
}: {
  meId: string;
  contactId: string;
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  // Live delivery + mark incoming messages read while the thread is open.
  useEffect(() => {
    const supabase = supabaseRef.current;

    const markRead = () => {
      supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("sender_id", contactId)
        .eq("recipient_id", meId)
        .is("read_at", null)
        .then(() => {});
    };
    markRead();

    const channel = supabase
      .channel(`chat-${meId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${meId}`,
        },
        (payload) => {
          const msg = payload.new as ChatMessage;
          if (msg.sender_id !== contactId) return;
          setMessages((cur) =>
            cur.some((m) => m.id === msg.id) ? cur : [...cur, msg],
          );
          markRead();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meId, contactId]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const supabase = supabaseRef.current;
    const { data, error: err } = await supabase
      .from("messages")
      .insert({ sender_id: meId, recipient_id: contactId, body })
      .select("id, sender_id, recipient_id, body, created_at")
      .single();
    if (err) {
      setError(`Could not send: ${err.message}`);
    } else if (data) {
      setMessages((cur) => [...cur, data as ChatMessage]);
      setDraft("");
    }
    setSending(false);
  }

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] flex-col lg:h-[calc(100dvh-4rem)]">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="pt-8 text-center text-sm text-gray-400">
            No messages yet — say hello! 👋
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === meId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
                  mine
                    ? "rounded-br-md bg-brand-green text-white"
                    : "rounded-bl-md bg-gray-100 text-gray-900"
                }`}
              >
                <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
                <p
                  className={`mt-0.5 text-right text-[10px] ${
                    mine ? "text-white/70" : "text-gray-400"
                  }`}
                >
                  {fmtTime(m.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="mx-4 mb-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-end gap-2 border-t border-gray-200 bg-white p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Type a message…"
          className="max-h-32 flex-1 resize-none rounded-2xl border border-gray-300 px-4 py-2.5 text-base focus:border-brand-green focus:outline-none"
        />
        <button
          onClick={send}
          disabled={sending || !draft.trim()}
          className="rounded-full bg-brand-green px-5 py-2.5 text-sm font-bold text-white active:bg-brand-green-dark disabled:opacity-40"
        >
          {sending ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
