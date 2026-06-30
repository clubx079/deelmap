'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useBuyerPageTitle } from '@/context/BuyerPageTitleContext';
import { MessageSquare, Search, DollarSign, Home, Pin, Flag, X, Check, Loader2, MoreVertical } from 'lucide-react';
import ChatWindow from '@/components/buyer/ChatWindow';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { createClient } from '@supabase/supabase-js';

const AVATAR_PAIRS = [
  { bg: '#FEF0EF', text: '#D03839' },
  { bg: '#E4F5EC', text: '#0F6E56' },
  { bg: '#FEF3E2', text: '#B5620A' },
  { bg: '#F3F3F0', text: '#1A1816' },
  { bg: '#F3F3F0', text: '#1A1816' },
];

function getAvatarPair(seed = '') {
  const str = String(seed || 'chat');
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) hash = (hash * 31 + str.charCodeAt(i)) | 0;
  return AVATAR_PAIRS[Math.abs(hash) % AVATAR_PAIRS.length];
}

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].substring(0, 2).toUpperCase();
}

export default function InboxPage() {
  const { user } = useAuth();
  const { setPageTitle } = useBuyerPageTitle();
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [reportConv, setReportConv] = useState(null);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [toast, setToast] = useState(null);
  const searchParams = useSearchParams();

  const sellerIdFromUrl = searchParams.get('seller_id');
  const dealIdFromUrl = searchParams.get('deal_id');

  useEffect(() => {
    setPageTitle('Messages');
    return () => setPageTitle('');
  }, [setPageTitle]);

  useEffect(() => {
    if (user?.id) {
      fetchConversations();
      // Fast refresh of the list/preview — reliable even if the realtime websocket
      // can't connect in this browser. fetchConversations(false) is silent (no spinner).
      const interval = setInterval(() => fetchConversations(false), 3000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Realtime: refresh the conversation list (last-message preview + unread) the instant
  // any of this buyer's conversations changes. One table per channel.
  useEffect(() => {
    if (!user?.id) return;
    const url = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_MARKETPLACE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    const sb = createClient(url, key);
    const refresh = () => fetchConversations(false);
    const channel = sb
      .channel(`buyer-inbox-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations', filter: `buyer_uuid=eq.${user.id}` }, refresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `buyer_uuid=eq.${user.id}` }, refresh)
      .subscribe((status) => console.log('[buyer-inbox realtime]', status));
    return () => { sb.removeChannel(channel); };
  }, [user?.id]);

  // Heartbeat for presence
  useEffect(() => {
    if (!user?.id || typeof document === 'undefined') return;
    let intervalId = null;
    const sendHeartbeat = () => {
      if (document.visibilityState === 'visible') {
        fetch('/api/buyer/chat', {
          method: 'POST',
          headers: { Authorization: `Bearer ${user.id}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'heartbeat' })
        }).catch(() => {});
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
        intervalId = setInterval(sendHeartbeat, 30000);
      } else {
        if (intervalId) clearInterval(intervalId);
        intervalId = null;
      }
    };
    if (document.visibilityState === 'visible') {
      sendHeartbeat();
      intervalId = setInterval(sendHeartbeat, 30000);
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (intervalId) clearInterval(intervalId);
    };
  }, [user?.id]);

  // Auto-select conversation from URL
  useEffect(() => {
    const conversationId = searchParams.get('conversation');
    if (conversationId && conversations.length > 0) {
      const conversation = conversations.find(c => String(c.id) === String(conversationId));
      if (conversation) setSelectedConversation(conversation);
    }
  }, [searchParams, conversations]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = conversations.filter(conv => {
        const businessName = (conv.lenders?.business_name || '').toLowerCase();
        const contactName = (conv.lenders?.contact_person_name || '').toLowerCase();
        const email = (conv.lenders?.email || '').toLowerCase();
        const address = (conv.property_address || '').toLowerCase();
        const lastMessage = (conv.last_message_preview || '').toLowerCase();
        return businessName.includes(query) || contactName.includes(query) ||
               email.includes(query) || address.includes(query) || lastMessage.includes(query);
      });
      setFilteredConversations(filtered);
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchQuery, conversations]);

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const fetchConversations = async (openId = null) => {
    if (!user?.id) return;
    try {
      let url = '/api/buyer/chat?action=get_conversations';
      if (sellerIdFromUrl) url += `&seller_id=${encodeURIComponent(sellerIdFromUrl)}`;
      if (dealIdFromUrl) url += `&deal_id=${encodeURIComponent(dealIdFromUrl)}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${user.id}` }
      });
      const data = await response.json();
      if (response.ok) {
        const list = data.conversations || [];
        setConversations(list);
        setFilteredConversations(list);
        if (openId !== false && (data.openConversationId != null || openId != null)) {
          const id = data.openConversationId ?? openId;
          const conv = list.find(c => c.id === id);
          if (conv) setSelectedConversation(conv);
        }
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (text, kind = 'success') => { setToast({ text, kind }); setTimeout(() => setToast(null), 3000); };

  const submitReport = async () => {
    if (!reportConv) return;
    setSubmittingReport(true);
    try {
      const res = await fetch('/api/buyer/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.id}` },
        body: JSON.stringify({ action: 'report_user', conversationId: reportConv.id, reason: reportReason, details: reportDetails.trim() || null }),
      });
      const data = await res.json();
      if (data.success) { setReportConv(null); setReportDetails(''); setReportReason('spam'); showToast(data.already ? 'You already reported this person — our team is reviewing it.' : 'Reported — our team will review it.'); }
      else showToast(data.error || 'Could not submit report.', 'error');
    } catch { showToast('Could not submit report.', 'error'); }
    finally { setSubmittingReport(false); }
  };

  const updateConversationPref = async (conversationId, patch) => {
    if (!user?.id) return;
    if (patch.is_blocked && selectedConversation?.id === conversationId) setSelectedConversation(null);
    const updateFn = (prev) => {
      if (patch.is_blocked) return prev.filter((c) => c.id !== conversationId);
      return prev.map((c) => {
        if (c.id !== conversationId) return c;
        if (patch.is_pinned !== undefined) return { ...c, is_pinned: !!patch.is_pinned };
        if (patch.mark_unread !== undefined) return { ...c, mark_unread: true, has_unread: true, unread_count: Math.max(c.unread_count || 0, 1) };
        return c;
      });
    };
    setConversations(updateFn);
    setFilteredConversations(updateFn);
    await fetch('/api/buyer/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.id}` },
      body: JSON.stringify({ action: 'update_conversation_pref', conversationId, ...patch })
    });
    fetchConversations(false);
  };

  const deleteConversation = async (conversationId) => {
    if (!user?.id) return;
    const res = await fetch('/api/buyer/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.id}` },
      body: JSON.stringify({ action: 'delete_conversation', conversationId })
    });
    if (res.ok) {
      if (selectedConversation?.id === conversationId) setSelectedConversation(null);
      fetchConversations(false);
    }
  };

  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setTimeout(() => fetchConversations(false), 500);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const diff = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return 'Yesterday';
  };

  const displayedConversations = (filteredConversations || [])
    .sort((a, b) => {
      if (!!a.is_pinned !== !!b.is_pinned) return a.is_pinned ? -1 : 1;
      return new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0);
    });

  const getDisplayName = (conv) => {
    if (conv.financing_requests) return conv.lenders?.business_name || 'Lender';
    return conv.lenders?.contact_person_name || conv.lenders?.business_name || 'Seller';
  };

  return (
    <div className="flex h-full overflow-hidden bg-white" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
      {/* Left Panel — Conversation List */}
      <div className={`${selectedConversation ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[320px] border-r border-[#E8E8E4] bg-white`}>
        {/* Header */}
        <div className="px-5 pt-5 pb-4">
          <h1 className="text-[20px] font-bold text-[#1A1816] tracking-[-0.66px] mb-4">All Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A8A4]" />
            <input
              type="text"
              placeholder="Search conversations"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#FAFAF8] border border-[#E8E8E4] rounded text-[14px] text-[#1A1816] placeholder-[#A8A8A4] focus:outline-none focus:border-[#D03839] focus:ring-1 focus:ring-[rgba(208,56,57,.12)] transition-all duration-200"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#E8E8E4] border-t-[#1A1816]"></div>
            </div>
          ) : displayedConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center px-6">
              <MessageSquare className="w-8 h-8 text-[#A8A8A4] mb-3" />
              <p className="text-[14px] font-medium text-[#444441]">
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </p>
            </div>
          ) : (
            <div>
              {displayedConversations.map((conversation) => {
                const name = getDisplayName(conversation);
                const initials = getInitials(name);
                const isActive = selectedConversation?.id === conversation.id;
                const hasUnread = conversation.has_unread || (conversation.unread_count ?? 0) > 0;

                return (
                  <div
                    key={conversation.id}
                    onClick={() => handleSelectConversation(conversation)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, conversation });
                    }}
                    className={`group flex items-start gap-3 px-5 py-3.5 cursor-pointer transition-colors duration-200 border-l-2 ${
                      isActive
                        ? 'bg-[#FAFAF8] border-l-[#D03839]'
                        : 'border-l-transparent hover:bg-[#FAFAF8]'
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold flex-shrink-0"
                      style={{ backgroundColor: getAvatarPair(name).bg, color: getAvatarPair(name).text }}
                    >
                      {initials}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className={`text-[14px] truncate ${hasUnread ? 'font-bold text-[#1A1816]' : 'font-medium text-[#1A1816]'}`}>
                          {name}
                        </h3>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {conversation.is_pinned && (
                            <Pin className="w-3 h-3 text-[#A8A8A4]" />
                          )}
                          <span className="text-[11px] text-[#A8A8A4]">
                            {formatTimeAgo(conversation.last_message_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className={`text-[12px] truncate ${hasUnread ? 'text-[#444441] font-medium' : 'text-[#737370]'}`}>
                          {conversation.last_message_preview || 'No messages yet'}
                        </p>
                        {hasUnread && (
                          <span className="w-2.5 h-2.5 rounded-full bg-[#D03839] flex-shrink-0"></span>
                        )}
                      </div>
                    </div>

                    {/* Options button — touch-reachable equivalent of right-click */}
                    <button
                      type="button"
                      aria-label="Conversation options"
                      onClick={(e) => {
                        e.stopPropagation();
                        const r = e.currentTarget.getBoundingClientRect();
                        const x = Math.min(r.right - 176, window.innerWidth - 184);
                        setContextMenu({ x: Math.max(8, x), y: r.bottom + 4, conversation });
                      }}
                      className="flex-shrink-0 -mr-1 p-1.5 rounded text-[#A8A8A4] hover:bg-[#F3F3F0] hover:text-[#1A1816] transition-colors duration-200 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Center + Right Panel — Chat Window */}
      <div className={`${selectedConversation ? 'flex' : 'hidden lg:flex'} flex-1 flex-col`}>
        {selectedConversation ? (
          <ChatWindow
            conversation={selectedConversation}
            lender={selectedConversation.lenders}
            financingRequest={selectedConversation.financing_requests}
            onBack={() => setSelectedConversation(null)}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-[#FAFAF8]">
            <div className="text-center">
              <MessageSquare className="w-10 h-10 text-[#A8A8A4] mx-auto mb-3" />
              <h3 className="text-[14px] font-semibold text-[#1A1816] mb-1">Select a conversation</h3>
              <p className="text-[13px] text-[#737370]">Choose a conversation to view messages</p>
            </div>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu?.conversation && (
        <div
          className="fixed z-[90] w-44 rounded border border-[#E8E8E4] bg-white shadow-lg p-1"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="w-full text-left text-[13px] px-3 py-2 rounded text-[#444441] hover:bg-[#FAFAF8] transition-colors duration-200" onClick={() => { updateConversationPref(contextMenu.conversation.id, { is_pinned: !contextMenu.conversation.is_pinned }); setContextMenu(null); }}>
            {contextMenu.conversation.is_pinned ? 'Unpin' : 'Pin conversation'}
          </button>
          <button className="w-full text-left text-[13px] px-3 py-2 rounded text-[#444441] hover:bg-[#FAFAF8] transition-colors duration-200" onClick={() => { updateConversationPref(contextMenu.conversation.id, { mark_unread: true }); setContextMenu(null); }}>
            Mark as unread
          </button>
          <div className="my-1 border-t border-[#E8E8E4]" />
          <button className="w-full text-left text-[13px] px-3 py-2 rounded text-[#D03839] hover:bg-[#FEF0EF] transition-colors duration-200" onClick={() => { setConfirmAction({ kind: 'delete', conversationId: contextMenu.conversation.id }); setContextMenu(null); }}>
            Delete chat
          </button>
          <button className="w-full text-left text-[13px] px-3 py-2 rounded text-[#D03839] hover:bg-[#FEF0EF] transition-colors duration-200" onClick={() => { setConfirmAction({ kind: 'block', conversationId: contextMenu.conversation.id }); setContextMenu(null); }}>
            Block user
          </button>
          <button className="w-full text-left text-[13px] px-3 py-2 rounded text-[#D03839] hover:bg-[#FEF0EF] transition-colors duration-200" onClick={() => { setReportConv(contextMenu.conversation); setContextMenu(null); }}>
            Report user
          </button>
        </div>
      )}
      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (!confirmAction) { setConfirmAction(null); return; }
          if (confirmAction.kind === 'delete') deleteConversation(confirmAction.conversationId);
          else if (confirmAction.kind === 'block') updateConversationPref(confirmAction.conversationId, { is_blocked: true });
          setConfirmAction(null);
        }}
        title={confirmAction?.kind === 'delete' ? 'Delete this chat?' : 'Block this user?'}
        message={confirmAction?.kind === 'delete' ? 'This will remove the conversation from your inbox. You can’t undo this.' : 'You won’t receive new messages from this user until you unblock them.'}
        confirmText={confirmAction?.kind === 'delete' ? 'Delete chat' : 'Block user'}
        danger
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded shadow-lg text-[13px] font-medium text-white flex items-center gap-2"
          style={{ background: toast.kind === 'error' ? '#D03839' : '#1A1816' }}>
          {toast.kind === 'error' ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast.text}
        </div>
      )}

      {/* Report-user dialog */}
      {reportConv && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={() => !submittingReport && setReportConv(null)}>
          <div className="bg-white rounded w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-[#E8E8E4] flex items-center gap-2">
              <Flag className="w-4 h-4 text-[#D03839]" />
              <h3 className="text-[16px] font-bold text-[#1A1816]">Report this person</h3>
            </div>
            <div className="px-5 py-4 space-y-4">
              <p className="text-[13px] text-[#737370]">Our team will review this conversation. Reports help us keep DeelMap safe from scams and abuse.</p>
              <div>
                <label className="block text-[12px] font-semibold text-[#444441] mb-1.5">Reason</label>
                <div className="grid grid-cols-2 gap-2">
                  {[['spam', 'Spam'], ['scam', 'Scam / fraud'], ['abuse', 'Abusive'], ['other', 'Other']].map(([val, lbl]) => (
                    <button key={val} type="button" onClick={() => setReportReason(val)}
                      className={`h-9 px-3 rounded border text-[13px] font-medium transition-colors ${reportReason === val ? 'border-[#D03839] bg-[#FEF0EF] text-[#D03839]' : 'border-[#E8E8E4] text-[#444441] hover:border-[#1A1816]'}`}>{lbl}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#444441] mb-1.5">Details <span className="font-normal text-[#A8A8A4]">(optional)</span></label>
                <textarea value={reportDetails} onChange={e => setReportDetails(e.target.value)} rows={3} placeholder="Add anything that helps us review this…"
                  className="w-full px-3 py-2 border border-[#E8E8E4] rounded text-[13px] text-[#1A1816] placeholder-[#A8A8A4] focus:outline-none focus:border-[#D03839] resize-none" />
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-[#E8E8E4] flex justify-end gap-2">
              <button type="button" onClick={() => setReportConv(null)} disabled={submittingReport} className="h-9 px-4 border border-[#E8E8E4] text-[#444441] text-[13px] font-semibold rounded hover:bg-[#FAFAF8] transition-colors disabled:opacity-50">Cancel</button>
              <button type="button" onClick={submitReport} disabled={submittingReport} className="h-9 px-4 bg-[#D03839] hover:bg-[#E0493B] text-white text-[13px] font-semibold rounded transition-colors disabled:opacity-50 flex items-center gap-1.5">{submittingReport && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Submit report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
